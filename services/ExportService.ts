
import { Asset, Clip, EncoderType, ExportConfig, JobStatus, RenderJob } from "../types";
import { OfflineRenderEngine } from "./RenderEngine";

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
    private chunks: EncodedVideoChunk[] = []; // In real app, stream to Muxer
    private config: ExportConfig | null = null;

    async init(config: ExportConfig): Promise<void> {
        this.config = config;
        this.chunks = [];

        if (typeof VideoEncoder === 'undefined') {
            throw new Error("WebCodecs API not supported in this browser.");
        }

        this.encoder = new VideoEncoder({
            output: (chunk, meta) => {
                // In a real app, we would pipe this to 'mp4box.js' or 'webm-muxer'
                // Since we can't load external libraries in this specific env, we store chunks.
                this.chunks.push(chunk);
                // console.log(`[WebCodecs] Encoded Chunk: ${chunk.timestamp}`);
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
            // Keyframe every 2 seconds
            const keyFrame = (frame.timestamp! / 1000000) % 2 === 0; 
            this.encoder.encode(frame, { keyFrame });
        }
        frame.close(); // Important: Release resource
    }

    async finalize(): Promise<string> {
        if (this.encoder) {
            await this.encoder.flush();
        }
        
        // SIMULATED MUXING STEP
        // In production, use mp4box.file.addSample() here.
        // Returning a fake container for demonstration because we lack the JS Muxer lib.
        const blob = new Blob(["[Simulated MP4 Container Content]"], { type: 'video/mp4' });
        return URL.createObjectURL(blob);
    }
}

/**
 * Tier 0: MediaRecorder Encoder (Quick Preview)
 * Fallback for simple timeline renders.
 */
class MediaRecorderEncoder implements IEncoder {
    private recorder: MediaRecorder | null = null;
    private chunks: Blob[] = [];
    private streamDestination: MediaStream | null = null;

    constructor(private canvas: HTMLCanvasElement) {}

    async init(config: ExportConfig): Promise<void> {
        this.chunks = [];
        this.streamDestination = this.canvas.captureStream(config.fps);
        
        // Note: codecs supported depend on browser (vp9, h264)
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
        // MediaRecorder captures the canvas automatically in real-time.
        // However, for offline sync, we might need to draw the frame and wait.
        // This implementation is hybrid: it relies on the render loop drawing to the canvas.
        frame.close();
        await new Promise(resolve => setTimeout(resolve, 0)); // tick
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
 * Orchestrates the Render -> Encode loop.
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

  public createJob(config: ExportConfig, clips: Clip[], assets: Asset[], duration: number): string {
    const id = `job_${Date.now()}`;
    const job: RenderJob = {
      id, projectId: 'default', config, status: JobStatus.PENDING,
      progress: 0, startTime: Date.now(), logs: ['Job Queued'],
    };
    this.jobs.push(job);
    this.notify();
    
    // Defer execution to not block UI immediately
    setTimeout(() => this.processJob(id, clips, assets, duration), 100);
    return id;
  }

  private async processJob(jobId: string, clips: Clip[], assets: Asset[], duration: number) {
    const jobIndex = this.jobs.findIndex(j => j.id === jobId);
    if (jobIndex === -1) return;
    
    const job = this.jobs[jobIndex];
    this.updateJob(jobId, { status: JobStatus.RENDERING, logs: [...job.logs, "Starting Render Loop..."] });

    try {
        // 1. Setup Canvas & Engine
        let canvas: OffscreenCanvas | HTMLCanvasElement;
        let isOffscreen = false;
        
        if (job.config.encoderType === EncoderType.WEBCODECS && typeof OffscreenCanvas !== 'undefined') {
            canvas = new OffscreenCanvas(job.config.width, job.config.height);
            isOffscreen = true;
        } else {
            canvas = document.createElement('canvas');
            canvas.width = job.config.width;
            canvas.height = job.config.height;
        }

        const engine = new OfflineRenderEngine(canvas);
        
        // 2. Setup Encoder
        let encoder: IEncoder;
        if (job.config.encoderType === EncoderType.WEBCODECS) {
            encoder = new WebCodecsEncoder();
        } else if (job.config.encoderType === EncoderType.MEDIA_RECORDER) {
            // MediaRecorder needs a visible-ish canvas usually, but element works
            if (isOffscreen) throw new Error("MediaRecorder requires DOM Canvas");
            encoder = new MediaRecorderEncoder(canvas as HTMLCanvasElement);
        } else {
            throw new Error("FFmpeg WASM not implemented in this demo");
        }

        await encoder.init(job.config);

        // 3. The Render Loop (Deterministic)
        const totalFrames = Math.ceil(duration * job.config.fps);
        const frameDuration = 1 / job.config.fps;

        for (let i = 0; i < totalFrames; i++) {
            // Check Cancellation
            if (this.getJob(jobId)?.status === JobStatus.CANCELLED) {
                engine.dispose();
                return;
            }

            const time = i * frameDuration;

            // A. Render (Waits for Seek)
            await engine.renderFrame(time, clips, assets);

            // B. Create VideoFrame from Canvas
            let frame: VideoFrame;
            if (canvas instanceof OffscreenCanvas) {
                 frame = new VideoFrame(canvas, { timestamp: time * 1000000 });
            } else {
                 frame = new VideoFrame(canvas as HTMLCanvasElement, { timestamp: time * 1000000 });
            }

            // C. Encode
            await encoder.encodeFrame(frame);

            // D. Progress
            if (i % 5 === 0) {
                const progress = Math.round((i / totalFrames) * 100);
                this.updateJob(jobId, { progress });
                // Allow UI to breathe
                await new Promise(r => setTimeout(r, 0));
            }
        }

        // 4. Finalize
        this.updateJob(jobId, { status: JobStatus.ENCODING, progress: 100, logs: [...this.getJob(jobId)!.logs, "Finalizing Container..."] });
        
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
