import React, { useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { MediaType, Clip } from '../types';
import { Video, Image as ImageIcon, Mic, Wand2, Play, ArrowRight } from 'lucide-react';

/**
 * Waveform Renderer Component
 */
const ClipWaveform: React.FC<{ clip: Clip; width: number; height: number; color: string }> = ({ clip, width, height, color }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = color;
    ctx.beginPath();

    const peaks = Math.ceil(width / 2); 
    const centerY = height / 2;
    
    let hash = 0;
    for (let i = 0; i < clip.id.length; i++) {
        hash = (hash << 5) - hash + clip.id.charCodeAt(i);
        hash |= 0;
    }

    for (let i = 0; i < peaks; i++) {
       const x = i * 2;
       const noise = Math.abs(Math.sin((i + hash) * 0.2) * Math.cos((i + hash) * 0.7));
       const amplitude = noise * (height * 0.8); 
       const barHeight = Math.max(2, amplitude);
       ctx.fillRect(x, centerY - barHeight / 2, 1, barHeight);
    }
  }, [clip.id, width, height, color]);

  return <canvas ref={canvasRef} width={width} height={height} className="absolute top-0 left-0 w-full h-full opacity-60 pointer-events-none" />;
};

/**
 * Volume Automation Line
 */
const VolumeLine: React.FC<{ volume: number }> = ({ volume }) => {
    const topPct = 100 - (volume * 80 + 10); 
    return (
        <div className="absolute left-0 right-0 h-[2px] bg-yellow-400/70 z-20 pointer-events-none shadow-[0_1px_2px_rgba(0,0,0,0.8)] group-hover:bg-yellow-300 transition-colors">
            <div className="absolute left-0 -top-[3px] w-2 h-2 rounded-full bg-yellow-400 shadow-sm transform -translate-x-1/2 hidden group-hover:block" />
            <div className="absolute right-0 -top-[3px] w-2 h-2 rounded-full bg-yellow-400 shadow-sm transform translate-x-1/2 hidden group-hover:block" />
        </div>
    );
};

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
             <div key={track.id} className="h-20 border-b border-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 bg-zinc-900/30 relative">
               {track.name}
               {track.type === 'audio' && (
                   <div className="absolute bottom-2 right-2 text-[9px] text-zinc-600 flex items-center gap-1">
                       <Mic size={8} /> Stereo
                   </div>
               )}
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
                     
                     {trackClips.map(clip => {
                       const width = Math.max(clip.duration * zoom, 2);
                       
                       return (
                       <div
                         key={clip.id}
                         className={`absolute top-1 bottom-1 rounded-md overflow-hidden cursor-pointer border group
                           ${selectedClipId === clip.id ? 'ring-2 ring-white z-10 shadow-xl' : 'border-white/10 opacity-90 hover:opacity-100'}
                         `}
                         style={{
                           left: clip.startTime * zoom,
                           width: width,
                           backgroundColor: clip.type === MediaType.VIDEO ? '#1e40af' : clip.type === MediaType.AUDIO ? '#064e3b' : clip.type === MediaType.EMPTY ? 'transparent' : '#6b21a8',
                           border: clip.type === MediaType.EMPTY ? '1px dashed #52525b' : undefined
                         }}
                         onClick={(e) => { e.stopPropagation(); selectClip(clip.id); }}
                       >
                         {/* Waveform Visualization */}
                         {(clip.type === MediaType.AUDIO || clip.type === MediaType.VIDEO) && (
                            <ClipWaveform 
                                clip={clip} 
                                width={width} 
                                height={72} // Track height minus padding
                                color={clip.type === MediaType.AUDIO ? '#34d399' : '#93c5fd'} 
                            />
                         )}

                         {/* Volume Automation Line */}
                         {(clip.type === MediaType.AUDIO || (clip.type === MediaType.VIDEO && !track.isMuted)) && (
                             <div className="absolute inset-0 flex items-center" style={{ top: `${100 - ((clip.volume || 1.0) * 80 + 10)}%`, height: 0 }}>
                                 <VolumeLine volume={clip.volume || 1.0} />
                             </div>
                         )}

                         {/* Content Label */}
                         <div className="px-2 py-1 text-[10px] font-bold text-white truncate flex items-center gap-1 bg-black/40 h-full relative z-10 pointer-events-none">
                            {clip.type === MediaType.VIDEO ? <Video size={10}/> : clip.type === MediaType.AUDIO ? <Mic size={10}/> : clip.type === MediaType.EMPTY ? <Wand2 size={10}/> : <ImageIcon size={10}/>}
                            <span className="drop-shadow-md">{clip.name}</span>
                         </div>

                         {/* Empty Clip Generator UI */}
                         {clip.type === MediaType.EMPTY && (
                             <div className="absolute inset-0 flex items-center justify-center">
                                 <span className="text-xs text-zinc-400 font-mono">GENERATE SHOT</span>
                             </div>
                         )}

                         {/* Context Buttons */}
                         {selectedClipId === clip.id && clip.type === MediaType.IMAGE && (
                            <div className="absolute bottom-2 right-2 z-30 flex gap-1">
                                <button className="bg-blue-600 text-white text-[9px] px-2 py-1 rounded shadow flex items-center gap-1 font-bold">
                                    <Play size={8} /> MAKE VIDEO
                                </button>
                            </div>
                         )}
                         {selectedClipId === clip.id && clip.type === MediaType.VIDEO && (
                            <div className="absolute bottom-2 right-2 z-30 flex gap-1">
                                <button className="bg-zinc-800 text-zinc-200 text-[9px] px-2 py-1 rounded border border-zinc-600 flex items-center gap-1 font-bold">
                                    <ArrowRight size={8} /> NEXT SHOT
                                </button>
                            </div>
                         )}
                       </div>
                     )})}
                  </div>
                );
              })}
           </div>
        </div>
      </div>
    </div>
  );
};