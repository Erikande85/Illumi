
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Cpu, Cloud, Image as ImageIcon, Loader2, Clapperboard } from 'lucide-react';
import { AIBackendType, ChatMessage, MediaType } from '../types';
import { generateAssistantResponse, generateImageComponent, generateScriptOrCutList } from '../services/geminiService';

interface AICopilotProps {
  onGenerateAsset: (url: string, type: MediaType, name: string) => void;
  onApplyCutList: (shots: any[]) => void;
}

export const AICopilot: React.FC<AICopilotProps> = ({ onGenerateAsset, onApplyCutList }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '0', role: 'system', content: 'Illumi AI Online. Ready for creative tasks.', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [backend, setBackend] = useState<AIBackendType>(AIBackendType.CLOUD);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
        const lowerInput = input.toLowerCase();

        // 1. Image Generation Intent
        if (lowerInput.includes('generate image') || lowerInput.includes('create a picture') || lowerInput.startsWith('gen ')) {
            const prompt = input.replace(/generate image|create a picture|gen /gi, '').trim();
            const result = await generateImageComponent(prompt, backend);
            
            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                content: `Generated asset based on: "${prompt}"`,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, aiMsg]);
            onGenerateAsset(result.url, MediaType.IMAGE, `AI_${prompt.substring(0,10)}.png`);

        // 2. Cut List / Storyboard Intent
        } else if (lowerInput.includes('cut list') || lowerInput.includes('storyboard') || lowerInput.includes('plan shots')) {
             const shots = await generateScriptOrCutList(input);
             if (shots.length > 0) {
                 const aiMsg: ChatMessage = {
                     id: (Date.now() + 1).toString(),
                     role: 'model',
                     content: `Generated a cut list with ${shots.length} shots. Check the Media Pool or Timeline.`,
                     timestamp: Date.now()
                 };
                 setMessages(prev => [...prev, aiMsg]);
                 onApplyCutList(shots);
             } else {
                 throw new Error("Failed to generate cut list");
             }

        // 3. General Chat
        } else {
            const responseText = await generateAssistantResponse(messages, input, backend);
            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                content: responseText,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, aiMsg]);
        }
    } catch (e) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'system', content: 'Error processing request. Please try again.', timestamp: Date.now() }]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800">
      {/* Header */}
      <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900">
        <div className="flex items-center gap-2 text-accent-500">
          <Sparkles size={16} />
          <span className="font-bold text-sm tracking-wide">ILLUMI ASSISTANT</span>
        </div>
        
        <div className="flex bg-zinc-950 rounded-lg p-0.5 border border-zinc-800">
            <button 
                onClick={() => setBackend(AIBackendType.CLOUD)}
                className={`p-1.5 rounded-md transition-all ${backend === AIBackendType.CLOUD ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="Cloud (Gemini)"
            >
                <Cloud size={14} />
            </button>
            <button 
                 onClick={() => setBackend(AIBackendType.LOCAL)}
                 className={`p-1.5 rounded-md transition-all ${backend === AIBackendType.LOCAL ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                 title="Local (On-Device)"
            >
                <Cpu size={14} />
            </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
             <div className={`max-w-[90%] rounded-lg p-3 text-sm shadow-md ${
                 msg.role === 'user' 
                 ? 'bg-accent-600 text-white rounded-br-none' 
                 : msg.role === 'system'
                 ? 'bg-zinc-800 text-zinc-400 italic text-xs border border-zinc-700'
                 : 'bg-zinc-800 text-zinc-200 rounded-bl-none border border-zinc-700'
             }`}>
                {msg.content}
             </div>
             <span className="text-[10px] text-zinc-600 mt-1 px-1">
                 {msg.role === 'model' && backend === AIBackendType.LOCAL ? 'Local • ' : ''}
                 {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
             </span>
          </div>
        ))}
        {isLoading && (
            <div className="flex items-center gap-2 text-zinc-500 text-xs px-2 py-2">
                <Loader2 size={12} className="animate-spin text-accent-500" />
                <span>{backend === AIBackendType.LOCAL ? 'Running Local Inference...' : 'Gemini is thinking...'}</span>
            </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-900">
        <div className="relative">
            <textarea 
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-3 pr-10 py-3 text-sm focus:outline-none focus:border-accent-500 resize-none h-20 placeholder-zinc-600 shadow-inner"
                placeholder={`Ask Illumi (${backend === AIBackendType.LOCAL ? 'Local' : 'Cloud'})...`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
            />
            <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="absolute right-2 bottom-2 p-2 bg-zinc-800 hover:bg-accent-600 text-zinc-400 hover:text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Send size={16} />
            </button>
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
             <button onClick={() => setInput("Generate a futuristic city background")} className="text-[10px] bg-zinc-800 border border-zinc-700 px-2 py-1 rounded text-zinc-400 hover:text-white whitespace-nowrap hover:border-accent-500 transition-colors">
                <ImageIcon size={10} className="inline mr-1"/> Gen Image
             </button>
             <button onClick={() => setInput("Plan shots for a coffee commercial")} className="text-[10px] bg-zinc-800 border border-zinc-700 px-2 py-1 rounded text-zinc-400 hover:text-white whitespace-nowrap hover:border-accent-500 transition-colors">
                <Clapperboard size={10} className="inline mr-1"/> Cut List
             </button>
        </div>
      </div>
    </div>
  );
};
