
import React, { useEffect, useRef } from 'react';
import { Asset, Clip, MediaType } from '../types';
import { RenderEngine } from '../services/RenderEngine';

interface WebGLRendererProps {
  currentTime: number;
  clips: Clip[];
  assets: Asset[];
  isPlaying: boolean;
  onFrame?: (canvas: HTMLCanvasElement) => void;
}

export const WebGLRenderer: React.FC<WebGLRendererProps> = ({ 
  currentTime, 
  clips, 
  assets, 
  isPlaying,
  onFrame
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<RenderEngine | null>(null);
  
  // Initialize Engine
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const gl = canvasRef.current.getContext('webgl2');
    if (!gl) return;

    engineRef.current = new RenderEngine(gl);

    return () => {
        engineRef.current?.dispose();
        engineRef.current = null;
    };
  }, []);

  // Render Loop
  useEffect(() => {
    let animationFrameId: number;

    const loop = async () => {
      if (engineRef.current) {
          // Render using the shared Core Engine
          await engineRef.current.render(currentTime, clips, assets);

          // Optional: Callback for legacy MediaRecorder export if needed
          if (onFrame && canvasRef.current) {
              onFrame(canvasRef.current);
          }
      }
      // Only loop if playing, otherwise just render once when currentTime changes
      if (isPlaying) {
          animationFrameId = requestAnimationFrame(loop);
      }
    };

    loop();

    return () => cancelAnimationFrame(animationFrameId);
  }, [currentTime, clips, assets, isPlaying, onFrame]);

  return (
    <canvas 
        ref={canvasRef} 
        width={1920} 
        height={1080} 
        className="w-full h-full object-contain bg-black"
    />
  );
};
