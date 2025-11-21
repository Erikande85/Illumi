
import React, { useRef } from 'react';
import { useStore } from '../store/useStore';
import { MediaType } from '../types';
import { Video, Image as ImageIcon, Mic } from 'lucide-react';

export const Timeline: React.FC = () => {
  const { 
    tracks, clips, playheadTime, zoom, selectedClipId,
    setPlayheadTime, selectClip 
  } = useStore();
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Ruler Click (Seek)
  const handleRulerClick = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    const rect = scrollRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left + scrollRef.current.scrollLeft;
    const newTime = offsetX / zoom;
    setPlayheadTime(newTime);
  };

  // Ruler Rendering
  const renderRuler = () => {
    const ticks = [];
    const totalSeconds = 600; // 10 minutes
    for (let i = 0; i < totalSeconds; i++) {
      if (i % 5 === 0) {
        ticks.push(
            <div key={i} className="absolute top-0 h-full border-l border-zinc-800 text-[9px] text-zinc-500 pl-1 select-none" 
                style={{ left: i * zoom }}>
            {new Date(i * 1000).toISOString().substr(14, 5)}
            </div>
        );
      } else {
         ticks.push(
            <div key={i} className="absolute bottom-0 h-2 border-l border-zinc-800/50" style={{ left: i * zoom }} />
         );
      }
    }
    return ticks;
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-300 select-none border-t border-zinc-800">
      
      {/* Toolbar */}
      <div className="h-8 border-b border-zinc-800 bg-zinc-900 flex items-center px-4 text-xs text-zinc-500 justify-between">
         <span>Timeline Sequence 1</span>
         <span>Zoom: {zoom}px/s</span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Track Headers */}
        <div className="w-32 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 z-20">
           <div className="h-8 border-b border-zinc-800 bg-zinc-900/50" /> {/* Ruler Spacer */}
           {tracks.map(track => (
             <div key={track.id} className="h-20 border-b border-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 bg-zinc-900/30">
               {track.name}
             </div>
           ))}
        </div>

        {/* Scrollable Timeline */}
        <div className="flex-1 overflow-x-auto relative custom-scrollbar bg-zinc-950" ref={scrollRef}>
           
           {/* Ruler */}
           <div 
             className="h-8 border-b border-zinc-800 bg-zinc-900/50 relative cursor-pointer min-w-[2000px]"
             onClick={handleRulerClick}
           >
             {renderRuler()}
           </div>

           {/* Tracks */}
           <div className="relative min-w-[2000px]">
              {/* Playhead */}
              <div 
                className="absolute top-0 bottom-0 w-[1px] bg-red-500 z-50 pointer-events-none"
                style={{ left: playheadTime * zoom, height: tracks.length * 80 }}
              >
                <div className="absolute -top-2 -left-1.5 w-3 h-3 bg-red-500 transform rotate-45" />
              </div>

              {tracks.map(track => {
                const trackClips = clips.filter(c => c.trackId === track.id);
                return (
                  <div key={track.id} className="h-20 border-b border-zinc-800/50 relative group">
                     <div className="absolute inset-0 pointer-events-none border-b border-zinc-900/50" />
                     
                     {trackClips.map(clip => (
                       <div
                         key={clip.id}
                         className={`absolute top-1 bottom-1 rounded-md overflow-hidden cursor-pointer border
                           ${selectedClipId === clip.id ? 'ring-2 ring-white z-10 shadow-xl' : 'border-white/10 opacity-90 hover:opacity-100'}
                         `}
                         style={{
                           left: clip.startTime * zoom,
                           width: Math.max(clip.duration * zoom, 2),
                           backgroundColor: clip.type === MediaType.VIDEO ? '#1e40af' : clip.type === MediaType.AUDIO ? '#065f46' : '#6b21a8'
                         }}
                         onClick={(e) => { e.stopPropagation(); selectClip(clip.id); }}
                       >
                         <div className="px-2 py-1 text-[10px] font-bold text-white truncate flex items-center gap-1 bg-black/20 h-full">
                            {clip.type === MediaType.VIDEO ? <Video size={10}/> : clip.type === MediaType.AUDIO ? <Mic size={10}/> : <ImageIcon size={10}/>}
                            {clip.name}
                         </div>
                       </div>
                     ))}
                  </div>
                );
              })}
           </div>
        </div>
      </div>
    </div>
  );
};
