import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from './store/useStore';
import { Timeline } from './components/Timeline';
import { Player } from './components/Player';
import { InspectorPanel } from './components/InspectorPanel';
import { GenerationModal } from './components/GenerationModal';
import { ExportPanel } from './components/ExportPanel';
import { MediaType, Clip, ExportConfig } from './types';
import { ExportManager } from './services/ExportService';
import { Layers, Plus, Upload, Play, Pause, SkipBack, MonitorPlay, Share, Download, Zap } from 'lucide-react';

export default function App() {
  const { 
    hasProject, createNewProject, isPlaying, togglePlayback, 
    setPlayheadTime, playheadTime, addClip 
  } = useStore();
  
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [genModalType, setGenModalType] = useState<MediaType>(MediaType.IMAGE);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [activeView, setActiveView] = useState<'edit' | 'ai'>('edit');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- ACTIONS ---

  const handleProjectClick = () => {
    if (window.confirm("Start a new project? Any unsaved changes will be lost.")) {
      createNewProject();
    }
  };

  const handleEditClick = () => {
    setActiveView('edit');
  };

  const handleAIToolsClick = () => {
    setGenModalType(MediaType.IMAGE);
    setIsGenModalOpen(true);
    setActiveView('ai');
  };

  const handleStartExport = (config: ExportConfig) => {
    // Calculate total duration based on last clip end time or at least 10s
    const clips = useStore.getState().clips;
    const duration = Math.max(...clips.map(c => c.startTime + c.duration), 10);
    
    ExportManager.getInstance().createJob(config, clips, duration);
  };

  // --- GLOBAL DRAG AND DROP ---
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!hasProject) return;

    const files = Array.from(e.dataTransfer.files);
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      const type = file.type.startsWith('video') ? MediaType.VIDEO 
                 : file.type.startsWith('audio') ? MediaType.AUDIO 
                 : MediaType.IMAGE;
      
      const trackId = type === MediaType.AUDIO ? 'A1' : 'V1';
      const duration = type === MediaType.IMAGE ? 5 : 10; 

      const newClip: Clip = {
        id: `clip_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,
        assetId: 'local_file',
        name: file.name,
        type,
        trackId,
        startTime: playheadTime,
        duration,
        offset: 0,
        color: type === MediaType.VIDEO ? 'blue' : 'green',
        url: url
      };
      
      addClip(newClip);
    });
  }, [hasProject, playheadTime, addClip]);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        // Mock drop event
        const mockDrop = {
            preventDefault: () => {},
            dataTransfer: { files: e.target.files }
        } as unknown as React.DragEvent;
        handleDrop(mockDrop);
    }
  };

  // --- KEYBOARD & LOOP ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && hasProject && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        togglePlayback();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    let animationFrame: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      if (isPlaying) {
        const delta = (time - lastTime) / 1000;
        setPlayheadTime(playheadTime + delta);
      }
      lastTime = time;
      animationFrame = requestAnimationFrame(loop);
    };

    if (isPlaying) {
      lastTime = performance.now();
      animationFrame = requestAnimationFrame(loop);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(animationFrame);
    };
  }, [hasProject, isPlaying, playheadTime, togglePlayback, setPlayheadTime]);

  // --- WELCOME SCREEN ---
  if (!hasProject) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white select-none">
        <div className="relative mb-8">
            <div className="absolute -inset-4 bg-blue-500/20 blur-xl rounded-full" />
            <Layers size={64} className="text-blue-500 relative z-10" />
        </div>
        <h1 className="text-5xl font-bold mb-3 tracking-tighter">Illumi<span className="text-zinc-600">.ai</span></h1>
        <p className="text-zinc-500 mb-8 font-light">The AI-Native Non-Linear Editor</p>
        <button 
          onClick={createNewProject}
          className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-zinc-200 transition flex items-center gap-2 shadow-lg shadow-white/10"
        >
          <Plus size={20} /> New Project
        </button>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col h-screen bg-black text-zinc-300 font-sans overflow-hidden"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* HEADER */}
      <header className="h-12 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-4 z-50 select-none">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Layers className="text-blue-500" size={20}/>
            <span className="font-bold text-white tracking-tight">Illumi Project</span>
          </div>
          
          {/* Navigation Buttons */}
          <nav className="flex gap-1 text-sm font-medium text-zinc-400 border-l border-zinc-800 pl-6 h-6 items-center">
             <button 
                onClick={handleProjectClick} 
                className="hover:text-white px-3 py-1 rounded hover:bg-zinc-800 transition-colors"
             >
                Project
             </button>
             <button 
                onClick={handleEditClick} 
                className={`px-3 py-1 rounded transition-colors ${activeView === 'edit' ? 'text-white bg-zinc-800' : 'hover:text-white hover:bg-zinc-800'}`}
             >
                Edit
             </button>
             <button 
                onClick={handleAIToolsClick} 
                className={`px-3 py-1 rounded transition-colors flex items-center gap-1 ${activeView === 'ai' ? 'text-accent-400 bg-zinc-800' : 'hover:text-accent-400 hover:bg-zinc-800'}`}
             >
                <Zap size={12} /> AI Tools
             </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsExportOpen(true)}
            className="text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded border border-zinc-700 font-medium transition flex items-center gap-2"
          >
            <Share size={14} /> Export
          </button>
          <button 
            onClick={() => { setGenModalType(MediaType.IMAGE); setIsGenModalOpen(true); }}
            className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded font-bold transition flex items-center gap-2 shadow-lg shadow-blue-900/20"
          >
            <MonitorPlay size={14} /> Generate Media
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: Tools */}
        <div className="w-16 border-r border-zinc-800 bg-zinc-900 flex flex-col items-center py-4 gap-6 z-20">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 cursor-pointer transition-all" 
            title="Import Media"
          >
             <Upload size={20} />
             <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
          </div>
        </div>

        {/* Center: Player & Transport */}
        <div className="flex-1 flex flex-col bg-zinc-950 relative border-r border-zinc-800">
          <div className="flex-1 flex items-center justify-center p-8 bg-zinc-950/50">
             <div className="aspect-video bg-black w-full max-w-4xl border border-zinc-800 shadow-2xl relative ring-1 ring-zinc-900 overflow-hidden">
                 <Player />
             </div>
          </div>
          
          {/* Transport Controls */}
          <div className="h-14 border-t border-zinc-800 flex items-center justify-center gap-6 bg-zinc-900 z-20">
             <button onClick={() => setPlayheadTime(0)} className="text-zinc-500 hover:text-white transition"><SkipBack size={20} /></button>
             <button onClick={togglePlayback} className="bg-white text-black rounded-full p-3 hover:bg-zinc-200 transition transform active:scale-95 shadow-lg">
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
             </button>
             <div className="font-mono text-sm text-zinc-500 w-24 text-center bg-zinc-950 py-1 rounded border border-zinc-800">
                {new Date(playheadTime * 1000).toISOString().substr(11, 8)}
             </div>
          </div>
        </div>

        {/* Right: Inspector */}
        <div className="w-80 bg-zinc-900 flex flex-col z-20 shadow-xl">
           <InspectorPanel onOpenGenModal={(type) => { setGenModalType(type); setIsGenModalOpen(true); }} />
        </div>
      </div>

      {/* Bottom: Timeline */}
      <div className="h-[300px] border-t border-zinc-800 bg-zinc-950 relative shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-30">
         <Timeline />
      </div>

      {/* Modals */}
      <GenerationModal 
        isOpen={isGenModalOpen} 
        onClose={() => setIsGenModalOpen(false)} 
        initialType={genModalType}
      />
      
      <ExportPanel 
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onStartExport={handleStartExport}
      />
    </div>
  );
}