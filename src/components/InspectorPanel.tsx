import React from 'react';
import { useStore } from '../store/useStore';
import { MediaType } from '../types';
import { Film, ArrowRight, Image as ImageIcon, Trash2, Clock } from 'lucide-react';

interface InspectorProps {
  onOpenGenModal: (type: MediaType) => void;
}

export const InspectorPanel: React.FC<InspectorProps> = ({ onOpenGenModal }) => {
  const { clips, selectedClipId, updateClip, removeClip, addClip } = useStore();
  
  const selectedClip = clips.find(c => c.id === selectedClipId);

  if (!selectedClip) {
    return (
       <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 p-6 text-center">
          <p>Select a clip to edit</p>
       </div>
    );
  }

  const handleNextShot = () => {
      // Create a continuation clip immediately
      const newClip = {
          ...selectedClip,
          id: `next_${Date.now()}`,
          startTime: selectedClip.startTime + selectedClip.duration,
          name: `${selectedClip.name} (Next)`,
          color: 'pink'
      };
      addClip(newClip);
  };

  return (
    <div className="flex-1 bg-zinc-900 p-4 overflow-y-auto border-l border-zinc-800">
       <div className="mb-6 flex items-center justify-between">
          <h3 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wider">
             {selectedClip.type === MediaType.VIDEO ? <Film size={16} className="text-blue-500" /> : <ImageIcon size={16} className="text-purple-500" />}
             Properties
          </h3>
          <button onClick={() => removeClip(selectedClip.id)} className="text-zinc-500 hover:text-red-500 transition-colors">
             <Trash2 size={16} />
          </button>
       </div>

       <div className="space-y-4">
          <div>
              <label className="text-[10px] text-zinc-500 uppercase font-bold">Name</label>
              <input 
                className="w-full bg-black border border-zinc-700 rounded p-2 text-white text-sm mt-1 focus:border-blue-500 outline-none"
                value={selectedClip.name}
                onChange={(e) => updateClip(selectedClip.id, { name: e.target.value })}
              />
          </div>

          <div className="grid grid-cols-2 gap-2">
              <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold flex items-center gap-1"><Clock size={10}/> Start</label>
                  <input 
                    type="number"
                    step="0.1"
                    className="w-full bg-black border border-zinc-700 rounded p-2 text-white text-sm mt-1 focus:border-blue-500 outline-none"
                    value={selectedClip.startTime.toFixed(2)}
                    onChange={(e) => updateClip(selectedClip.id, { startTime: parseFloat(e.target.value) })}
                  />
              </div>
              <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold flex items-center gap-1"><Clock size={10}/> Dur</label>
                  <input 
                    type="number"
                    step="0.1"
                    className="w-full bg-black border border-zinc-700 rounded p-2 text-white text-sm mt-1 focus:border-blue-500 outline-none"
                    value={selectedClip.duration.toFixed(2)}
                    onChange={(e) => updateClip(selectedClip.id, { duration: parseFloat(e.target.value) })}
                  />
              </div>
          </div>

          {selectedClip.type === MediaType.VIDEO && (
              <div className="pt-4 border-t border-zinc-800 mt-4">
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase mb-2">AI Actions</h4>
                  <button 
                    onClick={handleNextShot}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded flex items-center justify-center gap-2 border border-zinc-700 transition-all hover:border-blue-500"
                  >
                      <ArrowRight size={16} /> Make Next Shot
                  </button>
              </div>
          )}
       </div>
    </div>
  );
};