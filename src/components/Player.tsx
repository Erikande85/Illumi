import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { MediaType, Clip } from '../types';

/**
 * DOM-BASED INTERACTIVE PLAYER
 * Uses standard HTML5 Video elements for maximum performance and compatibility during editing.
 * 
 * Pros:
 * - Zero decoding overhead (browser handles it)
 * - Instant scrubbing
 * - CSS transforms mirror Canvas transforms easily
 */
export const Player: React.FC = () => {
  const { getFrameData, playheadTime, isPlaying, settings } = useStore();
  
  // Get currently visible clips
  const activeClips = getFrameData(playheadTime);

  return (
    <div 
      className="relative overflow-hidden bg-black shadow-2xl"
      style={{ 
        aspectRatio: `${settings.resolution.width}/${settings.resolution.height}`,
        width: '100%',
        height: '100%',
        maxHeight: '100%'
      }}
    >
      {activeClips.length === 0 ? (
         <div className="absolute inset-0 flex items-center justify-center text-zinc-800 font-mono text-sm">
            ILLUMI PLAYER
         </div>
      ) : (
        activeClips.map(clip => (
          <PlayerLayer 
            key={clip.id} 
            clip={clip} 
            globalTime={playheadTime} 
            isPlaying={isPlaying} 
          />
        ))
      )}
      
      {/* Debug Overlay */}
      <div className="absolute bottom-4 right-4 font-mono text-xs text-green-400 bg-black/80 px-2 py-1 rounded pointer-events-none z-50">
        {playheadTime.toFixed(2)}s | {activeClips.length} Layers
      </div>
    </div>
  );
};

/**
 * Individual Layer Component
 * Handles the specific video element logic (seeking vs playing)
 */
const PlayerLayer: React.FC<{ clip: Clip; globalTime: number; isPlaying: boolean }> = ({ clip, globalTime, isPlaying }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Calculate local time within the source clip
  const localTime = (globalTime - clip.startTime) + clip.offset;

  useEffect(() => {
    if (clip.type !== MediaType.VIDEO || !videoRef.current) return;
    
    const vid = videoRef.current;

    // If playing, we let the browser handle the flow, mostly only correcting if drift occurs
    if (isPlaying) {
       if (vid.paused) vid.play().catch(() => {});
       // Sync check: only seek if significantly off (> 0.3s) to avoid stutter
       if (Math.abs(vid.currentTime - localTime) > 0.3) {
          vid.currentTime = localTime;
       }
    } else {
       // If paused/scrubbing, we enforce the time strictly
       vid.pause();
       // Strict sync when scrubbing
       if (Math.abs(vid.currentTime - localTime) > 0.05) {
           vid.currentTime = localTime;
       }
    }
    
    vid.volume = clip.volume ?? 1.0;

  }, [globalTime, isPlaying, localTime, clip.volume]);

  // CSS Transform Logic
  // Maps normalized coordinates (0..1) to Percentage-based positioning
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${(clip.x ?? 0.5) * 100}%`,
    top: `${(clip.y ?? 0.5) * 100}%`,
    width: '100%', // Base width is container width, scaled down
    height: '100%',
    transform: `translate(-50%, -50%) rotate(${clip.rotation ?? 0}deg) scale(${clip.scale ?? 1})`,
    opacity: clip.opacity ?? 1.0,
    objectFit: 'contain',
    pointerEvents: 'none', // Click-through to container
    zIndex: clip.zIndex
  };

  if (clip.type === MediaType.VIDEO) {
    return <video ref={videoRef} src={clip.url} style={style} muted playsInline />;
  }

  if (clip.type === MediaType.IMAGE) {
    return <img src={clip.url} style={style} alt="layer" />;
  }

  return null;
};