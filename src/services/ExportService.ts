import { Clip, EncoderType, ExportConfig, JobStatus, RenderJob } from "../types";
import { OfflineRenderEngine } from "./OfflineRenderEngine";

/**
 * ENCODER ABSTRACTION LAYER
 */
export interface IEncoder {
    init(config: ExportConfig): Promise<void>;
    encodeFrame(frame: VideoFrame): Promise<void>;
    finalize(): Promise<string>; // Returns Blob URL
}

/**
 * Tier 1: WebCodecs Encoder
 * Uses hardware accelerated VideoEncoder API.
 */
class WebCodecsEncoder implements IEncoder {
    private encoder: VideoEncoder | null = null;
    private chunks: EncodedVideoChunk[] = []; 
    private config: ExportConfig | null = null;

    async init(config: ExportConfig): Promise<void> {
        this.config = config;
        this.chunks = [];

        if (typeof VideoEncoder === 'undefined') {
            throw new Error("WebCodecs API not supported in this browser.");
        }

        this.encoder = new VideoEncoder({
            output: (chunk, meta) => {
                this.chunks.push(chunk);
            },
            error: (e) => console.error('[WebCodecs] Error:', e)
        });

        this.encoder.configure({
            codec: 'avc1.42001f', // Baseline H.264
            width: config.width,
            height: config.height,
            bitrate: config.bitrate,
            framerate: config.fps,
        });
    }

    async encodeFrame(frame: VideoFrame): Promise<void> {
        if (this.encoder) {
            const keyFrame = (frame.timestamp! / 1000000) % 2 === 0; 
            this.encoder.encode(frame, { keyFrame });
        }
        frame.close();
    }

    async finalize(): Promise<string> {
        if (this.encoder) {
            await this.encoder.flush();
        }
        
        // SIMULATED MUXING
        const blob = new Blob(["[Simulated MP4 Data]"], { type: 'video/mp4' });
        return URL.createObjectURL(blob);
    }
}

/**
 * Tier 0: MediaRecorder Encoder (Quick Preview)
 */
class MediaRecorderEncoder implements IEncoder {
    private recorder: MediaRecorder | null = null;
    private chunks: Blob[] = [];
    private streamDestination: MediaStream | null = null;

    constructor(private canvas: HTMLCanvasElement) {}

    async init(config: ExportConfig): Promise<void> {
        this.chunks = [];
        this.streamDestination = this.canvas.captureStream(config.fps);
        
        this.recorder = new MediaRecorder(this.streamDestination, {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: config.bitrate
        });

        this.recorder.ondataavailable = (e) => {
            if (e.data.size > 0) this.chunks.push(e.data);
        };

        this.recorder.start();
    }

    async encodeFrame(frame: VideoFrame): Promise<void> {
        frame.close();
        await new Promise(resolve => setTimeout(resolve, 0)); 
    }

    async finalize(): Promise<string> {
        return new Promise((resolve) => {
            if (!this.recorder) return resolve('');
            
            this.recorder.onstop = () => {
                const blob = new Blob(this.chunks, { type: 'video/webm' });
                resolve(URL.createObjectURL(blob));
            };
            this.recorder.stop();
        });
    }
}

/**
 * EXPORT MANAGER
 */
export class ExportManager {
  private jobs: RenderJob[] = [];
  private listeners: ((jobs: RenderJob[]) => void)[] = [];
  private static instance: ExportManager;

  public static getInstance(): ExportManager {
    if (!ExportManager.instance) ExportManager.instance = new ExportManager();
    return ExportManager.instance;
  }

  public subscribe(callback: (jobs: RenderJob[]) => void) {
    this.listeners.push(callback);
    callback([...this.jobs]);
    return () => { this.listeners = this.listeners.filter(l => l !== callback); };
  }

  private notify() { this.listeners.forEach(l => l([...this.jobs])); }

  public createJob(config: ExportConfig, clips: Clip[], duration: number): string {
    const id = `job_${Date.now()}`;
    const job: RenderJob = {
      id, projectId: 'default', config, status: JobStatus.PENDING,
      progress: 0, startTime: Date.now(), logs: ['Job Queued'],
    };
    this.jobs.push(job);
    this.notify();
    
    setTimeout(() => this.processJob(id, clips, duration), 100);
    return id;
  }

  private async processJob(jobId: string, clips: Clip[], duration: number) {
    const jobIndex = this.jobs.findIndex(j => j.id === jobId);
    if (jobIndex === -1) return;
    
    const job = this.jobs[jobIndex];
    this.updateJob(jobId, { status: JobStatus.RENDERING, logs: [...job.logs, "Starting Render Loop..."] });

    const engineWidth = job.config.width;
    const engineHeight = job.config.height;

    try {
        // 1. Setup Canvas & Engine
        let canvas: OffscreenCanvas | HTMLCanvasElement;
        let isOffscreen = false;
        
        if (job.config.encoderType === EncoderType.WEBCODECS && typeof OffscreenCanvas !== 'undefined') {
            canvas = new OffscreenCanvas(engineWidth, engineHeight);
            isOffscreen = true;
        } else {
            canvas = document.createElement('canvas');
            canvas.width = engineWidth;
            canvas.height = engineHeight;
        }

        const engine = new OfflineRenderEngine(engineWidth, engineHeight);
        
        // 2. Setup Encoder
        let encoder: IEncoder;
        if (job.config.encoderType === EncoderType.WEBCODECS) {
            encoder = new WebCodecsEncoder();
        } else if (job.config.encoderType === EncoderType.MEDIA_RECORDER) {
            if (isOffscreen) throw new Error("MediaRecorder requires DOM Canvas");
            encoder = new MediaRecorderEncoder(canvas as HTMLCanvasElement);
        } else {
            throw new Error("FFmpeg WASM not implemented in this demo");
        }

        await encoder.init(job.config);

        // 3. The Render Loop
        const totalFrames = Math.ceil(duration * job.config.fps);
        const frameDuration = 1 / job.config.fps;

        for (let i = 0; i < totalFrames; i++) {
            if (this.getJob(jobId)?.status === JobStatus.CANCELLED) {
                engine.dispose();
                return;
            }

            const time = i * frameDuration;
            
            // Render & Encode
            const frame = await engine.renderFrame(time, clips);
            await encoder.encodeFrame(frame);

            if (i % 5 === 0) {
                const progress = Math.round((i / totalFrames) * 100);
                this.updateJob(jobId, { progress });
                await new Promise(r => setTimeout(r, 0));
            }
        }

        // 4. Finalize
        this.updateJob(jobId, { status: JobStatus.ENCODING, progress: 100, logs: [...this.getJob(jobId)!.logs, "Finalizing..."] });
        const url = await encoder.finalize();
        
        this.updateJob(jobId, { 
            status: JobStatus.COMPLETED, 
            resultUrl: url,
            logs: [...this.getJob(jobId)!.logs, "Export Complete"] 
        });
        engine.dispose();

    } catch (e: any) {
        console.error(e);
        this.updateJob(jobId, { status: JobStatus.FAILED, error: e.message });
    }
  }

  private updateJob(id: string, updates: Partial<RenderJob>) {
    const index = this.jobs.findIndex(j => j.id === id);
    if (index !== -1) {
      this.jobs[index] = { ...this.jobs[index], ...updates };
      this.notify();
    }
  }

  private getJob(id: string) { return this.jobs.find(j => j.id === id); }
  
  public cancelJob(id: string) {
      this.updateJob(id, { status: JobStatus.CANCELLED });
  }
}