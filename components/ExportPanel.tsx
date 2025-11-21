
import React, { useEffect, useState } from 'react';
import { X, Film, Download, AlertCircle, CheckCircle, Clock, Activity, Cpu, Zap, Layers } from 'lucide-react';
import { Codec, Container, ExportConfig, JobStatus, RenderJob, EncoderType } from '../types';
import { ExportManager } from '../services/ExportService';

interface ExportPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onStartExport: (config: ExportConfig) => void;
}

const DEFAULT_CONFIG: ExportConfig = {
  filename: 'Illumi_Project_Master',
  width: 1920,
  height: 1080,
  fps: 30,
  codec: Codec.H264,
  container: Container.MP4,
  bitrate: 8000000,
  encoderType: EncoderType.WEBCODECS
};

export const ExportPanel: React.FC<ExportPanelProps> = ({ isOpen, onClose, onStartExport }) => {
  const [config, setConfig] = useState<ExportConfig>(DEFAULT_CONFIG);
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'queue'>('create');

  useEffect(() => {
    const unsubscribe = ExportManager.getInstance().subscribe((updatedJobs) => {
        setJobs(updatedJobs);
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center">
      <div className="bg-zinc-900 border border-zinc-700 w-[900px] h-[650px] rounded-xl shadow-2xl flex overflow-hidden">
        
        {/* Sidebar */}
        <div className="w-56 border-r border-zinc-800 bg-zinc-950 p-4 flex flex-col gap-2">
           <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2 px-2">
               <Film className="text-accent-500"/> Export Lab
           </h2>
           <button 
              onClick={() => setActiveTab('create')}
              className={`text-left px-4 py-3 rounded text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'create' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
           >
               <Zap size={16} /> New Render
           </button>
           <button 
              onClick={() => setActiveTab('queue')}
              className={`text-left px-4 py-3 rounded text-sm font-medium transition-colors flex justify-between items-center ${activeTab === 'queue' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
           >
               <div className="flex items-center gap-2"><Layers size={16} /> Job Queue</div>
               {jobs.some(j => j.status === JobStatus.RENDERING) && (
                   <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
               )}
           </button>
           
           <div className="flex-1" />
           <button onClick={onClose} className="text-zinc-500 hover:text-white text-sm flex items-center gap-2 px-2">
               <X size={14} /> Close Panel
           </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-y-auto bg-zinc-900">
            {activeTab === 'create' ? (
                <div className="space-y-8">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-1">Output Settings</h3>
                        <p className="text-xs text-zinc-500">Configure production delivery format and backend.</p>
                    </div>

                    {/* Backend Selection (The Core Update) */}
                    <div className="grid grid-cols-2 gap-4">
                         <div 
                            onClick={() => setConfig({...config, encoderType: EncoderType.WEBCODECS})}
                            className={`p-4 rounded border cursor-pointer transition-all ${config.encoderType === EncoderType.WEBCODECS ? 'bg-accent-900/20 border-accent-500 ring-1 ring-accent-500' : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500'}`}
                         >
                             <div className="flex items-center justify-between mb-2">
                                 <span className="text-sm font-bold text-white flex items-center gap-2"><Cpu size={16} /> WebCodecs (Tier 1)</span>
                                 {config.encoderType === EncoderType.WEBCODECS && <CheckCircle size={16} className="text-accent-500" />}
                             </div>
                             <p className="text-[10px] text-zinc-400 leading-relaxed">
                                 Hardware accelerated, frame-accurate offline render. Uses strict frame-by-frame buffering. The professional standard for web NLEs.
                             </p>
                         </div>

                         <div 
                            onClick={() => setConfig({...config, encoderType: EncoderType.MEDIA_RECORDER})}
                            className={`p-4 rounded border cursor-pointer transition-all ${config.encoderType === EncoderType.MEDIA_RECORDER ? 'bg-amber-900/20 border-amber-500 ring-1 ring-amber-500' : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500'}`}
                         >
                             <div className="flex items-center justify-between mb-2">
                                 <span className="text-sm font-bold text-amber-100 flex items-center gap-2"><Activity size={16} /> Quick Preview (Tier 0)</span>
                                 {config.encoderType === EncoderType.MEDIA_RECORDER && <CheckCircle size={16} className="text-amber-500" />}
                             </div>
                             <p className="text-[10px] text-zinc-400 leading-relaxed">
                                 Real-time canvas capture. Fast but non-deterministic. May drop frames on slower machines. Not for broadcast.
                             </p>
                         </div>
                    </div>

                    <div className="h-[1px] bg-zinc-800" />

                    {/* Detailed Settings */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Format / Container</label>
                            <select 
                                className="w-full bg-zinc-950 border border-zinc-700 rounded p-2.5 text-zinc-300 text-sm focus:border-accent-500 outline-none"
                                value={config.container}
                                onChange={(e) => setConfig({...config, container: e.target.value as Container})}
                            >
                                <option value={Container.MP4}>MP4 (MPEG-4)</option>
                                <option value={Container.WEBM}>WebM (VP9/Opus)</option>
                                <option value={Container.MOV}>MOV (QuickTime)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Codec</label>
                            <select 
                                className="w-full bg-zinc-950 border border-zinc-700 rounded p-2.5 text-zinc-300 text-sm focus:border-accent-500 outline-none"
                                value={config.codec}
                                onChange={(e) => setConfig({...config, codec: e.target.value as Codec})}
                            >
                                <option value={Codec.H264}>H.264 (AVC) - Compatibility</option>
                                <option value={Codec.H265}>H.265 (HEVC) - Efficiency</option>
                                <option value={Codec.VP9}>VP9 - Web Standard</option>
                            </select>
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Dimensions</label>
                             <div className="flex gap-2">
                                 <input type="number" className="w-full bg-zinc-950 border border-zinc-700 rounded p-2.5 text-zinc-300 text-sm" value={config.width} onChange={e => setConfig({...config, width: +e.target.value})} />
                                 <span className="self-center text-zinc-600">x</span>
                                 <input type="number" className="w-full bg-zinc-950 border border-zinc-700 rounded p-2.5 text-zinc-300 text-sm" value={config.height} onChange={e => setConfig({...config, height: +e.target.value})} />
                             </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Bitrate (Mbps)</label>
                            <input 
                                type="range" min="1" max="50" step="1"
                                className="w-full accent-accent-500 h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer"
                                value={config.bitrate / 1000000}
                                onChange={(e) => setConfig({...config, bitrate: Number(e.target.value) * 1000000})}
                            />
                            <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                                <span>Low (1)</span>
                                <span className="text-accent-400 font-mono">{(config.bitrate / 1000000).toFixed(0)} Mbps</span>
                                <span>High (50)</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-6 border-t border-zinc-800 flex justify-end">
                         <button 
                            onClick={() => {
                                onStartExport(config);
                                setActiveTab('queue');
                            }}
                            className="bg-white hover:bg-zinc-200 text-black px-8 py-3 rounded font-bold shadow-lg flex items-center gap-2 transition-colors"
                        >
                             <Download size={18} /> Render Output
                         </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                     <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                        <h3 className="text-xl font-bold text-white">Render Queue</h3>
                        <div className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded border border-zinc-700">{jobs.length} Jobs</div>
                    </div>
                    
                    {jobs.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-zinc-600 opacity-50">
                            <Film size={48} strokeWidth={1} />
                            <p className="mt-4 text-sm italic">Render queue is empty.</p>
                        </div>
                    )}

                    {jobs.slice().reverse().map(job => (
                        <div key={job.id} className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-5 flex flex-col gap-4 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-bold text-zinc-200 text-lg tracking-tight">{job.config.filename}</div>
                                    <div className="text-xs text-zinc-500 mt-1 flex gap-2">
                                        <span className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{job.config.encoderType === EncoderType.WEBCODECS ? 'WebCodecs' : 'Preview'}</span>
                                        <span>{job.config.width}x{job.config.height}</span>
                                        <span>{job.config.fps}fps</span>
                                        <span>{job.config.codec}</span>
                                    </div>
                                </div>
                                <StatusBadge status={job.status} />
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="space-y-1">
                                <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-300 ${job.status === JobStatus.FAILED ? 'bg-red-500' : job.status === JobStatus.COMPLETED ? 'bg-emerald-500' : 'bg-accent-500'}`} 
                                        style={{ width: `${job.progress}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                                    <span>{job.progress}% processed</span>
                                    <span>{job.status === JobStatus.RENDERING ? 'Encoding...' : job.status}</span>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center pt-2 border-t border-zinc-700/50">
                                <div className="text-[10px] font-mono text-zinc-600 max-w-[60%] truncate">
                                    {job.logs[job.logs.length - 1]}
                                </div>
                                
                                <div className="flex gap-3 text-xs font-medium">
                                    {job.status === JobStatus.RENDERING && (
                                        <button 
                                            onClick={() => ExportManager.getInstance().cancelJob(job.id)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            Cancel Job
                                        </button>
                                    )}
                                    {job.status === JobStatus.COMPLETED && job.resultUrl && (
                                        <a 
                                            href={job.resultUrl} 
                                            download={`${job.config.filename}.${job.config.container}`}
                                            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-900/20 px-3 py-1.5 rounded border border-emerald-900/50"
                                        >
                                            <Download size={14} /> Download Master
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{status: JobStatus}> = ({ status }) => {
    switch(status) {
        case JobStatus.PENDING: return <span className="px-2 py-0.5 rounded bg-zinc-700 text-zinc-300 text-[10px] font-bold flex items-center gap-1"><Clock size={10}/> QUEUED</span>;
        case JobStatus.RENDERING: return <span className="px-2 py-0.5 rounded bg-accent-900/40 text-accent-400 text-[10px] font-bold flex items-center gap-1"><Activity size={10} className="animate-spin"/> RENDER</span>;
        case JobStatus.ENCODING: return <span className="px-2 py-0.5 rounded bg-purple-900/40 text-purple-400 text-[10px] font-bold flex items-center gap-1"><Activity size={10}/> ENCODE</span>;
        case JobStatus.COMPLETED: return <span className="px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-400 text-[10px] font-bold flex items-center gap-1"><CheckCircle size={10}/> DONE</span>;
        case JobStatus.FAILED: return <span className="px-2 py-0.5 rounded bg-red-900/40 text-red-400 text-[10px] font-bold flex items-center gap-1"><AlertCircle size={10}/> FAILED</span>;
        default: return <span className="px-2 py-0.5 rounded bg-zinc-700 text-zinc-500 text-[10px]">CANCELLED</span>;
    }
};
