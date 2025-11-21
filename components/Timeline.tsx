
import React, { useRef, useState, useEffect } from 'react';
import { Track, Clip, MediaType, DragState } from '../types';
import { Video, Mic, Lock, Eye, Image as ImageIcon, GripVertical, Wand2, Play, ArrowRight, RefreshCw, Scissors, AlignLeft } from 'lucide-react';

interface TimelineProps {
  tracks: Track[];
  clips: Clip[];
  currentTime: number;
  zoomLevel: number;
  selectedClipIds: string[];
  onSeek: (time: number) => void;
  onClipChange: (clip: Clip) => void;
  onClipSelect: (clipId: string, multi: boolean) => void;
  onClipContextMenu: (e: React.MouseEvent, clip: Clip) => void;
  onDrawClip: (trackId: string, startTime: number, duration: number) => void;
  onContextAction: (action: string, clip: Clip) => void;
}

const Ruler: React.FC<{ zoomLevel: number; duration: number }> = ({ zoomLevel, duration }) => {
  const ticks = [];
  const majorInterval = 5;
  const step = zoomLevel < 5 ? 10 : 1;

  for (let i = 0; i <= duration; i += step) {
    const isMajor = i % majorInterval === 0;
    ticks.push(
      <div
        key={i}
        className={`absolute top-0 border-l border-zinc-700 ${isMajor ? 'h-4' : 'h-2'} pointer-events-none`}
        style={{ left: `${i * zoomLevel}px` }}
      >
        {isMajor && (
          <span className="absolute top-4 left-1 text-[10px] text-zinc-500 font-mono select-none">
            {new Date(i * 1000).toISOString().substr(14, 5)}
          </span>
        )}
      </div>
    );
  }
  return <div className="relative h-8 bg-zinc-900 border-b border-zinc-800 w-full min-w-[2000px]">{ticks}</div>;
};

export const Timeline: React.FC<TimelineProps> = ({ 
    tracks, clips, currentTime, zoomLevel, selectedClipIds,
    onSeek, onClipChange, onClipSelect, onClipContextMenu, onDrawClip, onContextAction
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [drawing, setDrawing] = useState<{trackId: string, startX: number, currentX: number} | null>(null);

  // --- HANDLERS ---

  const handleMouseDown = (e: React.MouseEvent, clip: Clip, type: 'MOVE' | 'RESIZE_START' | 'RESIZE_END') => {
    e.stopPropagation();
    if (e.button !== 0) return; // Only left click
    
    onClipSelect(clip.id, e.ctrlKey || e.metaKey);
    
    setDragState({
      isDragging: true,
      clipId: clip.id,
      type,
      startX: e.clientX,
      originalStartTime: clip.startTime,
      originalDuration: clip.duration,
      originalOffset: clip.offset
    });
  };

  const handleTrackMouseDown = (e: React.MouseEvent, trackId: string) => {
      if (dragState) return;
      // Start Drawing Empty Clip
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left + (timelineRef.current?.scrollLeft || 0);
      setDrawing({ trackId, startX: x, currentX: x });
  };

  // Global Mouse Move/Up
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 1. Handle Dragging Clips
      if (dragState && dragState.isDragging && dragState.clipId) {
          const deltaX = e.clientX - dragState.startX;
          const deltaTime = deltaX / zoomLevel;
          const clip = clips.find(c => c.id === dragState.clipId);
          if (!clip) return;

          let newClip = { ...clip };
          if (dragState.type === 'MOVE') {
            newClip.startTime = Math.max(0, dragState.originalStartTime + deltaTime);
            // Snap to other clips? (omitted for brevity)
          } else if (dragState.type === 'RESIZE_END') {
            newClip.duration = Math.max(0.5, dragState.originalDuration + deltaTime);
          } else if (dragState.type === 'RESIZE_START') {
            const maxShift = dragState.originalDuration - 0.5;
            const shift = Math.min(maxShift, deltaTime);
            newClip.startTime = dragState.originalStartTime + shift;
            newClip.duration = dragState.originalDuration - shift;
            newClip.offset = dragState.originalOffset + shift;
          }
          onClipChange(newClip);
      }

      // 2. Handle Drawing Empty Clip
      if (drawing && timelineRef.current) {
           const rect = timelineRef.current.getBoundingClientRect(); // Rough approx, should be relative to container
           // But drawing state has internal coordinates
           // Actually we need to listen to movement to update visual feedback, handled by setDrawing
      }
    };

    const handleWindowMouseMove = (e: MouseEvent) => {
        if(drawing && timelineRef.current) {
             // Update drawing visual
             // This assumes we calculate relative to the viewport of the timeline container
             // Ideally we'd do this in the track container event, but global ensures no drop
             // Simplified: We rely on the specific track's onMouseMove for simpler logic or global if we map coordinates properly
        }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (dragState) {
        setDragState(null);
      }
      if (drawing) {
          // Create the clip
          const start = Math.min(drawing.startX, drawing.currentX) / zoomLevel;
          const width = Math.abs(drawing.currentX - drawing.startX);
          const duration = width / zoomLevel;
          
          if (duration > 0.5) { // Min duration check
              onDrawClip(drawing.trackId, start, duration);
          } else {
              // Treat as seek if drawing was tiny?
          }
          setDrawing(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, drawing, clips, zoomLevel, onClipChange, onDrawClip]);

  return (
    <div className="flex flex-col h-full bg-zinc-950 select-none relative">
      
      {/* SMART TOOLBAR (FLOATING) */}
      {selectedClipIds.length === 1 && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 flex gap-1 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 p-1 animate-in slide-in-from-bottom-2 fade-in">
              <button className="p-2 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white tooltip-trigger" title="Make Video" onClick={() => onContextAction('make_video', clips.find(c=>c.id===selectedClipIds[0])!)}>
                  <Video size={16} />
              </button>
              <button className="p-2 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white" title="Remix Shot" onClick={() => onContextAction('remix', clips.find(c=>c.id===selectedClipIds[0])!)}>
                  <RefreshCw size={16} />
              </button>
              <button className="p-2 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white" title="Next Shot" onClick={() => onContextAction('next_shot', clips.find(c=>c.id===selectedClipIds[0])!)}>
                  <ArrowRight size={16} />
              </button>
              <div className="w-[1px] bg-zinc-700 mx-1" />
              <button className="p-2 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white" title="Split">
                  <Scissors size={16} />
              </button>
          </div>
      )}

      {/* Toolbar */}
      <div className="h-10 border-b border-zinc-800 flex items-center px-4 gap-4 bg-zinc-900 z-40 relative">
        <span className="text-xs text-zinc-500 font-mono">{new Date(currentTime * 1000).toISOString().substr(11, 8)}:{Math.floor((currentTime % 1) * 24).toString().padStart(2, '0')}</span>
        <div className="h-4 w-[1px] bg-zinc-700" />
        <span className="text-xs text-zinc-600">Zoom: {Math.round(zoomLevel)}px/s</span>
        <div className="flex-1" />
        <div className="flex gap-2">
            <button className="p-1 hover:bg-zinc-800 rounded text-zinc-500"><AlignLeft size={14} /></button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Track Headers */}
        <div className="w-64 bg-zinc-900 border-r border-zinc-800 z-20 flex-shrink-0 shadow-xl">
          <div className="h-8 border-b border-zinc-800 bg-zinc-900" /> 
          {tracks.map(track => (
            <div key={track.id} className="h-24 border-b border-zinc-800 p-3 flex flex-col justify-between group hover:bg-zinc-800/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${track.id.startsWith('V') ? 'bg-blue-900/20 text-blue-400 border-blue-900/50' : 'bg-emerald-900/20 text-emerald-400 border-emerald-900/50'}`}>{track.id}</span>
                   <span className="text-zinc-300 text-xs font-medium">{track.name}</span>
                </div>
              </div>
              <div className="flex gap-3 text-zinc-500">
                <button className={`hover:text-white transition-colors ${track.isMuted ? 'text-red-500' : ''}`}><Eye size={14} /></button>
                <button className="hover:text-white transition-colors"><Lock size={14} /></button>
                <button className="hover:text-white transition-colors"><Mic size={14} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline Scroll Area */}
        <div 
          className="flex-1 overflow-x-auto overflow-y-hidden relative bg-zinc-950 custom-scrollbar" 
          ref={timelineRef}
        >
           <div 
             className="absolute top-0 left-0 min-w-full h-full" 
             style={{ width: Math.max(300 * zoomLevel, 5000) }}
             onClick={(e) => {
               if (dragState?.isDragging) return;
               const rect = e.currentTarget.getBoundingClientRect();
               const clickX = e.clientX - rect.left;
               onSeek(clickX / zoomLevel);
             }}
           >
             <Ruler zoomLevel={zoomLevel} duration={300} />
             
             {/* Tracks Container */}
             <div className="relative">
                {tracks.map(track => {
                  const trackClips = clips.filter(c => c.trackId === track.id);
                  return (
                    <div 
                        key={track.id} 
                        className="h-24 border-b border-zinc-800/40 relative group track-lane"
                        onMouseDown={(e) => {
                            if (e.target === e.currentTarget) handleTrackMouseDown(e, track.id);
                        }}
                        onMouseMove={(e) => {
                            if (drawing && drawing.trackId === track.id) {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setDrawing({ ...drawing, currentX: e.clientX - rect.left });
                            }
                        }}
                    >
                       <div className="absolute inset-0 bg-zinc-900/20 group-hover:bg-zinc-900/10 pointer-events-none" />
                       
                       {/* Drawing Ghost */}
                       {drawing && drawing.trackId === track.id && (
                           <div 
                                className="absolute top-1 bottom-1 bg-white/10 border border-white/30 rounded"
                                style={{
                                    left: Math.min(drawing.startX, drawing.currentX),
                                    width: Math.abs(drawing.currentX - drawing.startX)
                                }}
                           />
                       )}

                       {trackClips.map(clip => {
                         const isSelected = selectedClipIds.includes(clip.id);
                         return (
                         <div
                            key={clip.id}
                            className={`absolute top-1 bottom-1 rounded-md overflow-hidden group/clip cursor-pointer shadow-lg
                              ${isSelected ? 'z-50 ring-2 ring-white scale-[1.01]' : 'z-10 hover:brightness-110'}
                              transition-transform duration-75
                              ${clip.type === MediaType.EMPTY ? 'bg-zinc-800/50 border-dashed border-2 border-zinc-600' : ''}
                            `}
                            style={{
                              left: `${clip.startTime * zoomLevel}px`,
                              width: `${Math.max(clip.duration * zoomLevel, 10)}px`,
                              backgroundColor: clip.type === MediaType.VIDEO ? '#1e3a8a' : clip.type === MediaType.AUDIO ? '#064e3b' : clip.type === MediaType.EMPTY ? 'transparent' : '#581c87',
                              border: clip.type === MediaType.EMPTY ? undefined : '1px solid rgba(255,255,255,0.1)'
                            }}
                            onMouseDown={(e) => handleMouseDown(e, clip, 'MOVE')}
                            onClick={(e) => { e.stopPropagation(); onClipSelect(clip.id, e.ctrlKey || e.metaKey); }}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                onClipContextMenu(e, clip);
                            }}
                          >
                            {/* Clip Content */}
                            {clip.type === MediaType.EMPTY ? (
                                <div className="flex items-center justify-center w-full h-full text-zinc-500 gap-2">
                                    <Wand2 size={16} />
                                    <span className="text-xs font-bold">Generate</span>
                                </div>
                            ) : (
                                <div className="px-2 py-1 text-[10px] text-white/90 truncate font-medium flex items-center gap-1.5 relative z-20">
                                    {clip.type === MediaType.VIDEO ? <Video size={10} /> : clip.type === MediaType.AUDIO ? <Mic size={10} /> : <ImageIcon size={10} />}
                                    <span className="drop-shadow-md">{clip.name}</span>
                                </div>
                            )}
                            
                            {/* Thumbnails (Mock) */}
                            {clip.type !== MediaType.AUDIO && clip.type !== MediaType.EMPTY && (
                                <div className="flex opacity-40 absolute top-0 left-0 right-0 bottom-0 overflow-hidden z-0 grayscale hover:grayscale-0 transition-all">
                                    {[...Array(Math.ceil(clip.duration / 5))].map((_, i) => (
                                        <div key={i} className="flex-1 border-r border-black/20 bg-black/20" />
                                    ))}
                                </div>
                            )}

                            {/* Contextual Overlay Buttons (The "Illumi" Magic) */}
                            {isSelected && clip.type === MediaType.IMAGE && (
                                <div className="absolute bottom-2 right-2 z-30 flex gap-1">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onContextAction('make_video', clip); }}
                                        className="bg-accent-600 hover:bg-accent-500 text-white text-[9px] px-2 py-1 rounded shadow-lg flex items-center gap-1 font-bold animate-in fade-in zoom-in"
                                    >
                                        <Play size={8} /> MAKE VIDEO
                                    </button>
                                </div>
                            )}
                            {isSelected && clip.type === MediaType.VIDEO && (
                                <div className="absolute bottom-2 right-2 z-30 flex gap-1">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onContextAction('next_shot', clip); }}
                                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[9px] px-2 py-1 rounded shadow-lg border border-zinc-600 flex items-center gap-1 font-bold"
                                    >
                                        <ArrowRight size={8} /> NEXT SHOT
                                    </button>
                                </div>
                            )}

                            {/* Resize Handles */}
                            <div 
                                className="absolute top-0 bottom-0 left-0 w-3 hover:bg-white/40 cursor-w-resize flex items-center justify-center opacity-0 group-hover/clip:opacity-100 transition-opacity z-40"
                                onMouseDown={(e) => handleMouseDown(e, clip, 'RESIZE_START')}
                            >
                                <div className="w-[1px] h-4 bg-white/50" />
                            </div>
                            <div 
                                className="absolute top-0 bottom-0 right-0 w-3 hover:bg-white/40 cursor-e-resize flex items-center justify-center opacity-0 group-hover/clip:opacity-100 transition-opacity z-40"
                                onMouseDown={(e) => handleMouseDown(e, clip, 'RESIZE_END')}
                            >
                                <div className="w-[1px] h-4 bg-white/50" />
                            </div>
                          </div>
                       )}})}
                    </div>
                  )
                })}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};
