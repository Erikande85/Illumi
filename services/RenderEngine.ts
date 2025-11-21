
import { Asset, Clip, MediaType } from '../types';

// Shader Sources
const VS_SOURCE = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0, 1);
    v_texCoord = a_texCoord;
  }
`;

const FS_SOURCE = `
  precision mediump float;
  uniform sampler2D u_image;
  varying vec2 v_texCoord;
  void main() {
    vec4 color = texture2D(u_image, v_texCoord);
    gl_FragColor = color;
  }
`;

/**
 * SHARED LOGIC: Render Graph Resolution
 * Ensures both Preview and Export output the EXACT same composition.
 */
export class RenderGraph {
  static resolve(time: number, clips: Clip[], assets: Asset[]): { clip: Clip; asset: Asset } | null {
    // Z-Index logic: V3 > V2 > V1
    // Filter active clips
    const activeClips = clips
      .filter(c => 
          c.trackId.startsWith('V') && 
          time >= c.startTime && 
          time < (c.startTime + c.duration)
      );

    if (activeClips.length === 0) return null;

    // Sort by track ID (descending)
    const topClip = activeClips.sort((a, b) => b.trackId.localeCompare(a.trackId))[0];
    const asset = assets.find(a => a.id === topClip.assetId);

    if (!topClip || !asset) return null;
    return { clip: topClip, asset };
  }
}

/**
 * Base class for WebGL management
 */
class BaseRenderEngine {
  protected gl: WebGL2RenderingContext;
  protected program: WebGLProgram | null = null;
  protected texture: WebGLTexture | null = null;
  protected videoCache: Map<string, HTMLVideoElement> = new Map();
  protected imageCache: Map<string, HTMLImageElement> = new Map();

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.initGL();
  }

  protected initGL() {
    const gl = this.gl;
    const program = this.createShaderProgram(VS_SOURCE, FS_SOURCE);
    if (!program) throw new Error("Failed to compile shaders");
    this.program = program;
    gl.useProgram(program);

    const vertices = new Float32Array([-1, -1, 0, 1, 1, -1, 1, 1, -1, 1, 0, 0, 1, 1, 1, 0]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);

    const texLoc = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 16, 8);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    this.texture = texture;
  }

  protected createShaderProgram(vsSource: string, fsSource: string): WebGLProgram | null {
    const vertexShader = this.loadShader(this.gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this.loadShader(this.gl.FRAGMENT_SHADER, fsSource);
    if (!vertexShader || !fragmentShader) return null;
    const program = this.gl.createProgram();
    if (!program) return null;
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    return program;
  }

  protected loadShader(type: number, source: string): WebGLShader | null {
    const shader = this.gl.createShader(type);
    if (!shader) return null;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
        console.error(this.gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
  }

  public dispose() {
    this.gl.deleteProgram(this.program);
    this.gl.deleteTexture(this.texture);
    this.videoCache.clear();
    this.imageCache.clear();
  }
}

/**
 * REAL-TIME PREVIEW ENGINE
 * Optimizes for playback speed. Skips precise seeking if laggy.
 */
export class RenderEngine extends BaseRenderEngine {
  public async render(time: number, clips: Clip[], assets: Asset[]): Promise<void> {
    const gl = this.gl;
    const result = RenderGraph.resolve(time, clips, assets);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (!result) return;

    let source: HTMLVideoElement | HTMLImageElement | null = null;

    if (result.asset.type === MediaType.VIDEO) {
      source = await this.prepareVideo(result.asset, result.clip, time);
    } else if (result.asset.type === MediaType.IMAGE) {
      source = await this.prepareImage(result.asset);
    }

    if (source && this.texture) {
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }

  private async prepareVideo(asset: Asset, clip: Clip, timelineTime: number): Promise<HTMLVideoElement> {
    let vid = this.videoCache.get(asset.id);
    if (!vid) {
      vid = document.createElement('video');
      vid.crossOrigin = 'anonymous';
      vid.muted = true;
      vid.preload = 'auto';
      this.videoCache.set(asset.id, vid);
    }

    if (vid.src !== asset.url) {
      vid.src = asset.url;
      await new Promise((resolve, reject) => { vid!.onloadeddata = resolve; vid!.onerror = reject; });
    }

    const clipTime = (timelineTime - clip.startTime) + clip.offset;
    // Real-time optimization: Only seek if drift is significant (>0.2s)
    if (Math.abs(vid.currentTime - clipTime) > 0.2) {
      vid.currentTime = clipTime;
      // Note: In preview, we might NOT await seeked for fluidity
    }
    return vid;
  }

  private async prepareImage(asset: Asset): Promise<HTMLImageElement> {
      let img = this.imageCache.get(asset.id);
      if (!img) {
          img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = asset.url;
          await new Promise((resolve) => { img!.onload = resolve; img!.onerror = resolve; });
          this.imageCache.set(asset.id, img!);
      }
      return img!;
  }
}

/**
 * OFFLINE RENDER ENGINE
 * Deterministic. Frame-Accurate.
 * - Waits for video seek completion per frame.
 * - Uses OffscreenCanvas (or hidden canvas).
 */
export class OfflineRenderEngine extends BaseRenderEngine {
    
    constructor(canvas: OffscreenCanvas | HTMLCanvasElement) {
        const gl = canvas.getContext('webgl2') as WebGL2RenderingContext;
        super(gl);
    }

    public async renderFrame(time: number, clips: Clip[], assets: Asset[]): Promise<void> {
        const gl = this.gl;
        const result = RenderGraph.resolve(time, clips, assets);

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        if (!result) return;

        let source: HTMLVideoElement | HTMLImageElement | null = null;

        if (result.asset.type === MediaType.VIDEO) {
            source = await this.prepareVideoStrict(result.asset, result.clip, time);
        } else {
            source = await this.prepareImageStrict(result.asset);
        }

        if (source && this.texture) {
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
    }

    // STRICT seek ensures frame accuracy
    private async prepareVideoStrict(asset: Asset, clip: Clip, timelineTime: number): Promise<HTMLVideoElement> {
        let vid = this.videoCache.get(asset.id);
        if (!vid) {
            vid = document.createElement('video');
            vid.crossOrigin = 'anonymous';
            vid.muted = true;
            vid.preload = 'auto';
            this.videoCache.set(asset.id, vid);
        }

        if (vid.src !== asset.url) {
            vid.src = asset.url;
            await new Promise((resolve) => { vid!.onloadeddata = resolve; });
        }

        const clipTime = (timelineTime - clip.startTime) + clip.offset;
        vid.currentTime = clipTime;
        
        // CRITICAL: Wait for seek to complete
        if (vid.seeking) {
            await new Promise(resolve => { vid!.onseeked = resolve; });
        }
        return vid;
    }

    private async prepareImageStrict(asset: Asset): Promise<HTMLImageElement> {
        let img = this.imageCache.get(asset.id);
        if (!img) {
            img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = asset.url;
            await new Promise((resolve) => { img!.onload = resolve; });
            this.imageCache.set(asset.id, img!);
        }
        return img!;
    }
}
