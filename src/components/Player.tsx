
import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { MediaType } from '../types';

export const Player: React.FC = () => {
  const { clips, playheadTime, isPlaying } = useStore();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Find the top-most visible clip at the current playhead time
  // Logic: V2 > V1
  const activeClip = clips
    .filter(c => (c.trackId === 'V1' || c.trackId === 'V2') && 
                 playheadTime >= c.startTime && 
                 playheadTime < (c.startTime + c.duration))
    .sort((a, b) => b.trackId.localeCompare(a.trackId))[0];

  // Sync Playback State & Time
  useEffect(() => {
    if (activeClip && activeClip.type === MediaType.VIDEO && videoRef.current) {
        const video = videoRef.current;
        const offsetTime = playheadTime - activeClip.startTime + activeClip.offset;
        
        // Only seek if drift is significant to avoid stutter
        if (Math.abs(video.currentTime - offsetTime) > 0.3) {
            video.currentTime = offsetTime;
        }

        if (isPlaying && video.paused) {
            video.play().catch(() => {});
        } else if (!isPlaying && !video.paused) {
            video.pause();
        }
    }
  }, [playheadTime, isPlaying, activeClip]);

  if (!activeClip) {
    return (
        <div className="text-zinc-600 font-mono text-sm flex items-center gap-2">
            <div className="w-3 h-3 bg-zinc-800 rounded-full animate-pulse" />
            No Media at Playhead
        </div>
    );
  }

  // Render Content
  return (
    <div className="w-full h-full flex items-center justify-center bg-black relative overflow-hidden">
        {activeClip.type === MediaType.VIDEO ? (
            <video 
                ref={videoRef}
                src={activeClip.url} // Uses the url property added to Clip interface
                className="max-h-full max-w-full object-contain"
                playsInline
                muted // Muted for auto-play policy compliance
            />
        ) : (
            <img 
                src={activeClip.url} 
                className="max-h-full max-w-full object-contain" 
                alt="Active Frame" 
            />
        )}
        
        {/* Debug Info Overlay */}
        <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-[10px] text-zinc-400 font-mono pointer-events-none">
            {activeClip.name} | {(playheadTime - activeClip.startTime).toFixed(2)}s
        </div>
    </div>
  );
};
