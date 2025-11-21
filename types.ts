
export enum MediaType {
  VIDEO = 'VIDEO',
  IMAGE = 'IMAGE',
  AUDIO = 'AUDIO',
  EMPTY = 'EMPTY', // For placeholder clips
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
  duration?: number; // in seconds
  createdVia?: AIBackendType;
  file?: File; // For local files
}

export interface Clip {
  id: string;
  assetId: string;
  trackId: string;
  startTime: number; // timeline position in seconds
  duration: number; // duration in seconds
  offset: number; // offset into the source media
  name: string;
  type: MediaType;
  color: string;
  isSelected?: boolean;
  
  // AI Metadata
  prompt?: string;
  seed?: number;
  motionSetting?: string;
  aiParams?: Record<string, any>;
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

export interface ProjectState {
  settings: ProjectSettings;
  currentTime: number; // in seconds
  zoomLevel: number; // pixels per second
  tracks: Track[];
  clips: Clip[];
  assets: Asset[];
  selection: string[]; // clip IDs
  isPlaying: boolean;
}

// Drag and Drop State
export interface DragState {
  isDragging: boolean;
  clipId: string | null;
  type: 'MOVE' | 'RESIZE_START' | 'RESIZE_END' | 'DRAW'; // Added DRAW
  startX: number;
  originalStartTime: number;
  originalDuration: number;
  originalOffset: number;
  
  // For Drawing
  trackId?: string;
}

// --- EXPORT ARCHITECTURE TYPES ---

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

export const MOCK_ASSETS: Asset[] = [
  { id: 'a1', name: 'Demo_Drone_Footage.mp4', type: MediaType.VIDEO, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', thumbnail: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg', duration: 596 },
  { id: 'a2', name: 'Demo_Cyberpunk_Still.png', type: MediaType.IMAGE, url: 'https://picsum.photos/seed/cyberpunk/1280/720', thumbnail: 'https://picsum.photos/seed/cyberpunk/320/180', duration: 5 },
  { id: 'a3', name: 'Background_Ambience.mp3', type: MediaType.AUDIO, url: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg', duration: 120 },
];
