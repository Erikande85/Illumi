
export enum MediaType {
  VIDEO = 'VIDEO',
  IMAGE = 'IMAGE',
  AUDIO = 'AUDIO',
  EMPTY = 'EMPTY',
}

export enum AIBackendType {
  CLOUD = 'Cloud (Gemini)',
  LOCAL = 'Local (Safetensors)',
}

export interface ProjectSettings {
  resolution: { width: number; height: number };
  fps: number;
  aspectRatio: string;
}

export interface Asset {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  thumbnail?: string;
  duration?: number;
}

export interface Clip {
  id: string;
  assetId: string;
  trackId: string;
  startTime: number;
  duration: number;
  offset: number;
  name: string;
  type: MediaType;
  color: string;
  
  // Added for robust playback in the new engine
  url?: string; 
  
  // Audio Properties
  volume?: number; // 0.0 to 1.0 (Default 1.0)
  waveformData?: number[]; // Optional cache for real PCM data

  // AI Metadata
  prompt?: string;
  seed?: number;
}

export interface Track {
  id: string;
  name: string;
  type: 'video' | 'audio';
  isMuted: boolean;
  isLocked: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
}

export enum JobStatus {
  PENDING = 'PENDING',
  RENDERING = 'RENDERING',
  ENCODING = 'ENCODING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum Codec {
  H264 = 'avc1.4d002a', // Baseline
  H265 = 'hvc1.1.6.L93.B0',
  VP9 = 'vp09.00.10.08',
  AV1 = 'av01.0.04M.08'
}

export enum Container {
  MP4 = 'mp4',
  WEBM = 'webm',
  MOV = 'mov'
}

export enum EncoderType {
  WEBCODECS = 'Tier 1: WebCodecs (Frame Accurate)',
  MEDIA_RECORDER = 'Tier 0: Quick Preview (Real-time)',
  FFMPEG_WASM = 'Tier 2: FFmpeg WASM (Software)',
}

export interface ExportConfig {
  filename: string;
  width: number;
  height: number;
  fps: number;
  codec: Codec;
  container: Container;
  bitrate: number; // in bps
  encoderType: EncoderType;
}

export interface RenderJob {
  id: string;
  projectId: string;
  config: ExportConfig;
  status: JobStatus;
  progress: number; // 0 to 100
  startTime: number;
  error?: string;
  resultUrl?: string;
  logs: string[];
}
