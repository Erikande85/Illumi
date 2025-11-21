
import React, { useState } from 'react';
import { Clip, MediaType } from '../types';
import { Wand2, Image as ImageIcon, Play, Music, ArrowRight, RefreshCw, Layers, Check, Sparkles, Film } from 'lucide-react';

interface InspectorPanelProps {
  selectedClip: Clip | null;
  onUpdateClip: (clip: Clip) => void;
  onGenerateFirstFrame: (prompt: string, style: string) => void;
  onGenerateVideo: (clipId: string, settings: any) => void;
  onLipsync: (clipId: string) => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({ 
    selectedClip, onUpdateClip, onGenerateFirstFrame, onGenerateVideo, onLipsync 
}) => {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('Cinematic');
  
  if (!selectedClip) {
      return (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 p-8 text-center">
              <Layers size={48} className="mb-4 opacity-20" />
              <h3 className="text-lg font-bold text-zinc-500">No Selection</h3>
              <p className="text-xs mt-2">Select a clip to edit properties or draw an empty clip to start generating.</p>
          </div>
      );
  }

  // MODE 1: EMPTY CLIP -> FIRST FRAME GENERATOR
  if (selectedClip.type === MediaType.EMPTY) {
      return (
          <div className="h-full bg-zinc-900 p-4 flex flex-col overflow-y-auto">
              <div className="flex items-center gap-2 mb-6 text-accent-500">
                  <ImageIcon size={20} />
                  <h2 className="font-bold tracking-wide">CREATE FIRST FRAME</h2>
              </div>

              <div className="space-y-6">
                  <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Prompt</label>
                      <textarea 
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 h-32 focus:border-accent-500 outline-none resize-none"
                        placeholder="Describe the first shot of your scene..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                      />
                  </div>

                  <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Style Reference</label>
                      <select 
                        className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-zinc-300 outline-none"
                        value={style}
                        onChange={(e) => setStyle(e.target.value)}
                      >
                          <option>Cinematic</option>
                          <option>Anime</option>
                          <option>Photorealistic</option>
                          <option>Cyberpunk</option>
                          <option>Watercolor</option>
                      </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                      <div className="bg-zinc-800 p-2 rounded border border-zinc-700 flex flex-col items-center justify-center h-24 cursor-pointer hover:bg-zinc-700 hover:border-accent-500 transition-all">
                          <span className="text-xs font-bold text-zinc-400">16:9</span>
                          <span className="text-[10px] text-zinc-500">Landscape</span>
                      </div>
                      <div className="bg-zinc-800 p-2 rounded border border-zinc-700 flex flex-col items-center justify-center h-24 cursor-pointer hover:bg-zinc-700 hover:border-accent-500 transition-all">
                          <span className="text-xs font-bold text-zinc-400">9:16</span>
                          <span className="text-[10px] text-zinc-500">Portrait</span>
                      </div>
                  </div>
                  
                  <button 
                    onClick={() => onGenerateFirstFrame(prompt, style)}
                    className="w-full bg-accent-600 hover:bg-accent-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-accent-900/20 flex items-center justify-center gap-2 transition-all transform active:scale-95"
                  >
                      <Wand2 size={16} /> GENERATE PREVIEWS
                  </button>
              </div>
          </div>
      );
  }

  // MODE 2: IMAGE CLIP -> VIDEO GENERATOR
  if (selectedClip.type === MediaType.IMAGE) {
      return (
          <div className="h-full bg-zinc-900 p-4 flex flex-col overflow-y-auto">
              <div className="flex items-center gap-2 mb-6 text-purple-400">
                  <Play size={20} />
                  <h2 className="font-bold tracking-wide">MAKE VIDEO</h2>
              </div>

              <div className="bg-zinc-950 rounded-lg p-1 border border-zinc-800 mb-6">
                  <img src={selectedClip.assetId.startsWith('http') ? selectedClip.assetId : 'https://picsum.photos/seed/preview/300/160'} className="w-full rounded opacity-80" alt="preview" />
              </div>

              <div className="space-y-6">
                  <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Motion Prompt</label>
                      <textarea 
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 h-24 focus:border-purple-500 outline-none resize-none"
                        placeholder="Describe motion (e.g., 'Slow pan right', 'Camera zooms in')..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                      />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Duration</label>
                          <select className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-zinc-300">
                              <option>5s</option>
                              <option>10s</option>
                          </select>
                      </div>
                       <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Model</label>
                          <select className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-zinc-300">
                              <option>Gemini Veo</option>
                              <option>Kling</option>
                          </select>
                      </div>
                  </div>

                  <button 
                    onClick={() => onGenerateVideo(selectedClip.id, { prompt })}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 transition-all transform active:scale-95"
                  >
                      <Film size={16} /> GENERATE VIDEO
                  </button>
              </div>
          </div>
      );
  }

  // MODE 3: VIDEO CLIP -> PROPERTIES & TOOLS
  if (selectedClip.type === MediaType.VIDEO) {
      return (
          <div className="h-full bg-zinc-900 p-4 flex flex-col overflow-y-auto">
               <div className="flex items-center gap-2 mb-6 text-blue-400">
                  <Film size={20} />
                  <h2 className="font-bold tracking-wide">VIDEO PROPERTIES</h2>
              </div>
              
              <div className="space-y-4 mb-8">
                  <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1">Name</label>
                      <input 
                        className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-zinc-300 focus:border-blue-500 outline-none"
                        value={selectedClip.name}
                        onChange={(e) => onUpdateClip({...selectedClip, name: e.target.value})}
                      />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1">Start</label>
                          <input 
                            className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-zinc-300"
                            type="number"
                            step="0.1"
                            value={selectedClip.startTime.toFixed(2)}
                            onChange={(e) => onUpdateClip({...selectedClip, startTime: parseFloat(e.target.value)})}
                          />
                       </div>
                       <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1">Duration</label>
                          <input 
                            className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-zinc-300"
                            type="number"
                            step="0.1"
                            value={selectedClip.duration.toFixed(2)}
                            onChange={(e) => onUpdateClip({...selectedClip, duration: parseFloat(e.target.value)})}
                          />
                       </div>
                  </div>
              </div>

              <div className="h-[1px] bg-zinc-800 mb-6" />
              
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">AI Tools</h3>
              
              <div className="space-y-3">
                  <button className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-blue-500 text-zinc-300 p-3 rounded flex items-center gap-3 transition-all">
                      <ArrowRight size={18} className="text-blue-400"/>
                      <div className="text-left">
                          <div className="text-sm font-bold text-white">Make Next Shot</div>
                          <div className="text-[10px]">Continue this scene seamlessly</div>
                      </div>
                  </button>

                   <button className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-green-500 text-zinc-300 p-3 rounded flex items-center gap-3 transition-all">
                      <RefreshCw size={18} className="text-green-400"/>
                      <div className="text-left">
                          <div className="text-sm font-bold text-white">Remix Shot</div>
                          <div className="text-[10px]">Generate variants of this clip</div>
                      </div>
                  </button>
                  
                   <button onClick={() => onLipsync(selectedClip.id)} className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-pink-500 text-zinc-300 p-3 rounded flex items-center gap-3 transition-all">
                      <Music size={18} className="text-pink-400"/>
                      <div className="text-left">
                          <div className="text-sm font-bold text-white">Lipsync</div>
                          <div className="text-[10px]">Sync mouth to audio track</div>
                      </div>
                  </button>
              </div>
          </div>
      );
  }

  return null;
};
