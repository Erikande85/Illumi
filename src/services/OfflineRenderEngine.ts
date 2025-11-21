import { Clip, MediaType } from "../types";

/**
 * OFFLINE RENDER ENGINE
 * 
 * Responsibilities:
 * 1. Headless rendering (no DOM interaction)
 * 2. Deterministic seeking (waits for video to load frame)
 * 3. Compositing (layers, transforms)
 * 4. Output to OffscreenCanvas (for WebCodecs)
 */
export class OfflineRenderEngine {
  private canvas: OffscreenCanvas;
  private ctx: OffscreenCanvasRenderingContext2D;
  
  // Cache video elements to prevent reloading source every frame
  // Key: AssetID -> HTMLVideoElement
  private elementCache: Map<string, HTMLVideoElement | HTMLImageElement> = new Map();

  constructor(width: number, height: number) {
    this.canvas = new OffscreenCanvas(width, height);
    // We use 2D context for composition because it's simpler to match CSS transforms
    // than raw WebGL for this specific use case. It is hardware accelerated.
    this.ctx = this.canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
  }

  /**
   * Renders a single frame at specific timestamp
   */
  public async renderFrame(time: number, clips: Clip[]): Promise<VideoFrame> {
    const { width, height } = this.canvas;
    
    // 1. Clear
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, width, height);

    // 2. Sort Clips (Z-Index)
    const activeClips = clips
        .filter(c => time >= c.startTime && time < c.startTime + c.duration)
        .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    // 3. Draw Layers
    for (const clip of activeClips) {
      await this.drawClip(clip, time);
    }

    // 4. Return VideoFrame
    return new VideoFrame(this.canvas, { timestamp: time * 1000000 }); // microseconds
  }

  private async drawClip(clip: Clip, globalTime: number) {
    const source = await this.getSource(clip);
    if (!source) return;

    const { width, height } = this.canvas;

    // Seek video if needed
    if (clip.type === MediaType.VIDEO) {
      const video = source as HTMLVideoElement;
      const localTime = (globalTime - clip.startTime) + clip.offset;
      video.currentTime = localTime;
      
      // CRITICAL: Wait for seek to complete to ensure frame accuracy
      // MediaRecorder doesn't need this, but frame-by-frame WebCodecs does.
      // We use a small poll because 'seeked' event can be tricky with detached elements.
      if (video.readyState < 2) { // HAVE_CURRENT_DATA
          await new Promise(r => {
              const check = () => {
                  if (video.readyState >= 2) r(null);
                  else requestAnimationFrame(check);
              };
              check();
          });
      }
    }

    // Geometric Transformations (Matching CSS logic in Player.tsx)
    this.ctx.save();

    const x = (clip.x ?? 0.5) * width;
    const y = (clip.y ?? 0.5) * height;
    
    this.ctx.translate(x, y);
    this.ctx.rotate((clip.rotation ?? 0) * Math.PI / 180);
    this.ctx.scale(clip.scale ?? 1, clip.scale ?? 1);
    this.ctx.globalAlpha = clip.opacity ?? 1.0;
    
    // Draw centered
    this.ctx.drawImage(source, -width/2, -height/2, width, height);

    this.ctx.restore();
  }

  private async getSource(clip: Clip): Promise<HTMLVideoElement | HTMLImageElement | null> {
    if (!clip.url) return null;

    if (this.elementCache.has(clip.assetId)) {
      return this.elementCache.get(clip.assetId)!;
    }

    if (clip.type === MediaType.VIDEO) {
      const vid = document.createElement('video');
      vid.crossOrigin = 'anonymous';
      vid.src = clip.url;
      vid.muted = true;
      vid.preload = 'auto';
      
      // Wait for metadata
      await new Promise((resolve, reject) => {
        vid.onloadedmetadata = resolve;
        vid.onerror = reject;
      });
      
      this.elementCache.set(clip.assetId, vid);
      return vid;
    } 
    
    if (clip.type === MediaType.IMAGE) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = clip.url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      this.elementCache.set(clip.assetId, img);
      return img;
    }

    return null;
  }

  public dispose() {
    this.elementCache.forEach((el) => {
      if (el instanceof HTMLVideoElement) {
        el.pause();
        el.removeAttribute('src');
        el.load();
      }
    });
    this.elementCache.clear();
  }
}