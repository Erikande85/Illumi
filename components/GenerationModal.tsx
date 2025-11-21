
import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { MediaType, Clip } from '../types';
import { X, Wand2, Loader2 } from 'lucide-react';

interface GenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType: MediaType;
  initialPrompt?: string;
}

export const GenerationModal: React.FC<GenerationModalProps> = ({ isOpen, onClose, initialType, initialPrompt = '' }) => {
  const { addClip, playheadTime } = useStore();
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    // Simulate API call for prototype reliability
    setTimeout(() => {
        const mockUrl = initialType === MediaType.IMAGE 
            ? `https://picsum.photos/seed/${Date.now()}/1280/720`
            : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';
        
        const duration = initialType === MediaType.IMAGE ? 5 : 10;

        const newClip: Clip = {
            id: `gen_${Date.now()}`,
            assetId: 'generated_asset',
            name: `AI: ${prompt.substring(0, 12)}...`,
            type: initialType,
            trackId: 'V1',
            startTime: playheadTime,
            duration: duration,
            offset: 0,
            color: 'purple',
            prompt: prompt,
            url: mockUrl // Direct URL for Player
        };

        addClip(newClip);
        setIsGenerating(false);
        onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 w-[500px] rounded-xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Wand2 className="text-purple-500" /> 
                Generate {initialType === MediaType.IMAGE ? 'Image' : 'Video'}
            </h2>
            <button onClick={onClose}><X size={20} className="text-zinc-500 hover:text-white"/></button>
        </div>

        <div className="space-y-4">
            <div>
                <label className="text-xs font-bold text-zinc-500 uppercase">Prompt</label>
                <textarea 
                    className="w-full bg-black border border-zinc-700 rounded p-3 text-white mt-1 h-32 focus:border-purple-500 outline-none resize-none"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your vision..."
                    autoFocus
                />
            </div>
            
            <button 
                disabled={isGenerating}
                onClick={handleGenerate}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            >
                {isGenerating ? <Loader2 className="animate-spin" /> : <Wand2 size={18} />}
                {isGenerating ? 'Dreaming...' : 'Create Asset'}
            </button>
        </div>
      </div>
    </div>
  );
};
