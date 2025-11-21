
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

export interface ExportConfig {
  filename: string;
  width: number;
  height: number;
  fps: number;
}
