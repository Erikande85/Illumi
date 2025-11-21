
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Settings, Share, FolderOpen, Upload, Maximize2, X, Wand2, Layers, MonitorPlay, Download, Plus } from 'lucide-react';
import { Timeline } from './components/Timeline';
import { AICopilot } from './components/AICopilot';
import { WebGLRenderer } from './components/WebGLRenderer';
import { ExportPanel } from './components/ExportPanel';
import { InspectorPanel } from './components/InspectorPanel';
import { MOCK_ASSETS, Asset, Track, Clip, MediaType, AIBackendType, ProjectState, ExportConfig, ProjectSettings } from './types';
import { ExportManager } from './services/ExportService';
import { generateImageComponent, generateNextShot, generateRemix } from './services/geminiService';

// Initial State Configuration
const INITIAL_TRACKS: Track[] = [
  { id: 'V2', name: 'Overlay / FX', type: 'video', isMuted: false, isLocked: false },
  { id: 'V1', name: 'Main Camera', type: 'video', isMuted: false, isLocked: false },
  { id: 'A1', name: 'Dialogue', type: 'audio', isMuted: false, isLocked: false },
  { id: 'A2', name: 'Music', type: 'audio', isMuted: false, isLocked: false },
];

const DEFAULT_SETTINGS: ProjectSettings = {
    resolution: { width: 1920, height: 1080 },
    fps: 24,
    aspectRatio: '16:9'
};

export default function App() {
  const [project, setProject] = useState<ProjectState>({
    settings: DEFAULT_SETTINGS,
    currentTime: 0,
    zoomLevel: 20,
    tracks: INITIAL_TRACKS,
    clips: [],
    assets: MOCK_ASSETS,
    selection: [],
    isPlaying: false
  });

  const [exportPanelOpen, setExportPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'media' | 'effects'>('media');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current selection object
  const selectedClip = project.clips.find(c => project.selection.includes(c.id)) || null;

  // High-Frequency Playback Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      if (project.isPlaying) {
        const delta = (time - lastTime) / 1000;
        setProject(p => {
            if (p.currentTime >= 300) return { ...p, isPlaying: false };
            return { ...p, currentTime: p.currentTime + delta };
        });
      }
      lastTime = time;
      animationFrameId = requestAnimationFrame(loop);
    };

    if (project.isPlaying) {
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(loop);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [project.isPlaying]);

  // --- HANDLERS ---

  const handleStartExport = (config: ExportConfig) => {
      ExportManager.getInstance().createJob(config, project.clips, project.assets, 30);
  };

  const handleClipChange = (updatedClip: Clip) => {
      setProject(prev => ({
          ...prev,
          clips: prev.clips.map(c => c.id === updatedClip.id ? updatedClip : c)
      }));
  };

  const handleClipSelect = (clipId: string, multi: boolean) => {
      setProject(prev => ({
          ...prev,
          selection: multi ? [...prev.selection, clipId] : [clipId]
      }));
  };

  const handleDrawClip = (trackId: string, startTime: number, duration: number) => {
      const newClip: Clip = {
          id: `empty_${Date.now()}`,
          assetId: '',
          trackId,
          startTime,
          duration,
          offset: 0,
          name: 'Generative Shot',
          type: MediaType.EMPTY,
          color: 'zinc',
          prompt: ''
      };
      setProject(prev => ({
          ...prev,
          clips: [...prev.clips, newClip],
          selection: [newClip.id] // Auto select to open Inspector
      }));
  };

  const handleGenerateFirstFrame = async (prompt: string, style: string) => {
      if (!selectedClip) return;
      
      // 1. Call API
      const result = await generateImageComponent(prompt + ", " + style, AIBackendType.CLOUD);
      
      // 2. Create Asset
      const newAsset: Asset = {
          id: `gen_${Date.now()}`,
          name: prompt.substring(0, 15),
          type: MediaType.IMAGE,
          url: result.url,
          duration: selectedClip.duration
      };

      // 3. Update Clip from EMPTY to IMAGE
      const updatedClip: Clip = {
          ...selectedClip,
          type: MediaType.IMAGE,
          assetId: newAsset.id,
          name: newAsset.name,
          prompt: prompt
      };

      setProject(prev => ({
          ...prev,
          assets: [newAsset, ...prev.assets],
          clips: prev.clips.map(c => c.id === selectedClip.id ? updatedClip : c)
      }));
  };

  const handleGenerateVideo = async (clipId: string, settings: any) => {
      // Mock Video Generation Flow
      alert(`Generating Video with prompt: ${settings.prompt}`);
      // Logic would transform IMAGE clip to VIDEO clip here after async job
  };

  const handleContextAction = async (action: string, clip: Clip) => {
      if (action === 'next_shot') {
           const result = await generateNextShot(clip.id);
           const newClip: Clip = {
               id: `next_${Date.now()}`,
               trackId: clip.trackId,
               startTime: clip.startTime + clip.duration,
               duration: 4,
               offset: 0,
               name: 'Next Shot',
               type: MediaType.IMAGE,
               assetId: 'pending',
               color: 'purple'
           };
           // In real app, we'd add the asset too
           setProject(prev => ({...prev, clips: [...prev.clips, newClip]}));
      } else if (action === 'remix') {
           await generateRemix(clip.id);
           alert("Remix variants generated in Media Pool");
      } else if (action === 'make_video') {
           // Trigger inspector mode switch or modal
      }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-zinc-300 font-sans overflow-hidden">
      
      {/* HEADER */}
      <header className="h-12 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-4 select-none z-50">
        <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-white tracking-tighter flex items-center gap-1">
                <Layers className="text-accent-500" size={20}/> Illumi<span className="text-zinc-500 font-light">.ai</span>
            </h1>
            <nav className="flex gap-4 text-sm font-medium text-zinc-400">
                <span className="hover:text-white cursor-pointer">Project</span>
                <span className="hover:text-white cursor-pointer">Edit</span>
                <span className="hover:text-white cursor-pointer text-accent-400">AI Tools</span>
            </nav>
        </div>
        <div className="flex items-center gap-4">
            <div className="text-xs text-zinc-500 flex gap-2">
                <span className="bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">{project.settings.resolution.width}x{project.settings.resolution.height}</span>
                <span className="bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">{project.settings.fps} FPS</span>
            </div>
            <button 
                onClick={() => setExportPanelOpen(true)}
                className="bg-white hover:bg-zinc-200 text-black px-4 py-1.5 rounded-full text-sm font-bold transition-colors flex items-center gap-2"
            >
                <Share size={14} /> Export
            </button>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANEL: Media */}
        <div className="w-72 flex flex-col border-r border-zinc-800 bg-zinc-900 flex-shrink-0">
            <div className="p-3 border-b border-zinc-800">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Media Bin</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                <div className="grid grid-cols-2 gap-3">
                     <div onClick={() => fileInputRef.current?.click()} className="aspect-square border-2 border-dashed border-zinc-700 hover:border-accent-500 rounded flex flex-col items-center justify-center text-zinc-500 hover:text-accent-500 cursor-pointer bg-zinc-900/50 transition-all">
                        <Upload size={20} />
                        <span className="text-[10px] font-bold mt-2 uppercase">Import</span>
                        <input type="file" ref={fileInputRef} className="hidden" />
                    </div>
                    {project.assets.map(asset => (
                        <div key={asset.id} className="aspect-square bg-black rounded border border-zinc-800 overflow-hidden relative group cursor-grab active:cursor-grabbing">
                            <img src={asset.thumbnail || asset.url} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                            <span className="absolute bottom-1 left-1 text-[9px] text-white font-medium drop-shadow">{asset.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* CENTER: Viewer */}
        <div className="flex-1 flex flex-col bg-zinc-950 relative">
             <div className="flex-1 flex items-center justify-center p-8">
                <div className="aspect-video bg-black w-full max-w-4xl border border-zinc-800 shadow-2xl relative ring-1 ring-zinc-900 overflow-hidden group">
                     <WebGLRenderer currentTime={project.currentTime} clips={project.clips} assets={project.assets} isPlaying={project.isPlaying} />
                     {/* Controls Overlay */}
                     <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-zinc-900/80 backdrop-blur px-6 py-2 rounded-full border border-zinc-700 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                        <SkipBack size={18} className="cursor-pointer hover:text-white" onClick={() => setProject(p => ({...p, currentTime: 0}))}/>
                        <button onClick={() => setProject(p => ({ ...p, isPlaying: !p.isPlaying }))}>
                            {project.isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                        </button>
                        <SkipForward size={18} className="cursor-pointer hover:text-white" />
                     </div>
                </div>
            </div>
        </div>

        {/* RIGHT PANEL: Inspector / AI Brain */}
        <div className="w-80 flex flex-col border-l border-zinc-800 bg-zinc-900 flex-shrink-0">
             <InspectorPanel 
                selectedClip={selectedClip}
                onUpdateClip={handleClipChange}
                onGenerateFirstFrame={handleGenerateFirstFrame}
                onGenerateVideo={handleGenerateVideo}
                onLipsync={() => alert("Lipsync job started")}
             />
        </div>

      </div>

      {/* BOTTOM: Timeline */}
      <div className="h-[320px] border-t border-zinc-800 flex flex-col bg-zinc-950 relative shadow-[0_-10px_30px_rgba(0,0,0,0.3)] z-40">
         <Timeline 
            tracks={project.tracks} 
            clips={project.clips} 
            currentTime={project.currentTime} 
            zoomLevel={project.zoomLevel}
            selectedClipIds={project.selection}
            onSeek={(t) => setProject(p => ({ ...p, currentTime: t }))}
            onClipChange={handleClipChange}
            onClipSelect={handleClipSelect}
            onClipContextMenu={(e, clip) => {}}
            onDrawClip={handleDrawClip}
            onContextAction={handleContextAction}
         />
      </div>

      {/* EXPORT MODAL */}
      <ExportPanel isOpen={exportPanelOpen} onClose={() => setExportPanelOpen(false)} onStartExport={handleStartExport} />

    </div>
  );
}
