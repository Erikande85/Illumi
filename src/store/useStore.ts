
import { create } from 'zustand';
import { Clip, Track, ProjectSettings } from '../types';

interface ProjectState {
  hasProject: boolean;
  clips: Clip[];
  tracks: Track[];
  playheadTime: number;
  zoom: number;
  isPlaying: boolean;
  selectedClipId: string | null;
  settings: ProjectSettings;

  // Actions
  createNewProject: () => void;
  addClip: (clip: Clip) => void;
  removeClip: (id: string) => void;
  updateClip: (id: string, updates: Partial<Clip>) => void;
  setPlayheadTime: (time: number) => void;
  setZoom: (zoom: number) => void;
  togglePlayback: () => void;
  setIsPlaying: (isPlaying: boolean) => void;
  selectClip: (id: string | null) => void;
}

const INITIAL_TRACKS: Track[] = [
  { id: 'V2', name: 'Overlay', type: 'video', isMuted: false, isLocked: false },
  { id: 'V1', name: 'Main', type: 'video', isMuted: false, isLocked: false },
  { id: 'A1', name: 'Audio 1', type: 'audio', isMuted: false, isLocked: false },
  { id: 'A2', name: 'Audio 2', type: 'audio', isMuted: false, isLocked: false },
];

export const useStore = create<ProjectState>((set) => ({
  hasProject: false,
  clips: [],
  tracks: INITIAL_TRACKS,
  playheadTime: 0,
  zoom: 50,
  isPlaying: false,
  selectedClipId: null,
  settings: { resolution: { width: 1920, height: 1080 }, fps: 24, aspectRatio: '16:9' },

  createNewProject: () => set({ 
    hasProject: true, 
    clips: [], 
    playheadTime: 0, 
    isPlaying: false,
    selectedClipId: null
  }),

  addClip: (clip) => set((state) => ({ 
    clips: [...state.clips, clip] 
  })),

  removeClip: (id) => set((state) => ({ 
    clips: state.clips.filter((c) => c.id !== id) 
  })),

  updateClip: (id, updates) => set((state) => ({
    clips: state.clips.map((c) => (c.id === id ? { ...c, ...updates } : c)),
  })),

  setPlayheadTime: (time) => set({ playheadTime: Math.max(0, time) }),
  
  setZoom: (zoom) => set({ zoom }),
  
  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
  
  setIsPlaying: (isPlaying) => set({ isPlaying }),

  selectClip: (id) => set({ selectedClipId: id }),
}));
