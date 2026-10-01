import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Music, Loader2, Play } from 'lucide-react';
import { generateSunoPrompts, SunoPrompt } from '../services/ai';

interface SunoPromptModalProps {
  textContext: string;
  onClose: () => void;
  onGenerated?: (prompts: SunoPrompt[]) => void;
}

export function SunoPromptModal({ textContext, onClose, onGenerated }: SunoPromptModalProps) {
  const [loading, setLoading] = useState(true);
  const [prompts, setPrompts] = useState<SunoPrompt[]>([]);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    generateSunoPrompts(textContext)
      .then((data) => {
        setPrompts(data);
        setLoading(false);
        if (onGenerated) onGenerated(data);
      })
      .catch((err) => {
        console.error("Error generating SUNO prompts:", err);
        setLoading(false);
      });
  }, [textContext]);

  const allTags = Array.from(new Set(prompts.flatMap((p) => p.tags)));
  const filteredPrompts = filterTag ? prompts.filter(p => p.tags.includes(filterTag)) : prompts;

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1c1800] border border-[#ffdd00]/30 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#ffdd00]/30 bg-black/40">
          <h2 className="text-xl font-bold text-[#ffdd00] flex items-center gap-2">
            <Music className="w-6 h-6" />
            SUNO Prompts
          </h2>
          <button onClick={onClose} className="p-2 text-[#ffdd00]/50 hover:text-[#ffdd00] hover:bg-[#ffdd00]/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-black/20">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="w-10 h-10 text-[#ffdd00] animate-spin mb-4" />
              <p className="text-[#ffdd00] text-sm">Đang phân tích kịch bản và sáng tác âm nhạc...</p>
            </div>
          ) : (
            <>
              {/* Tags Filter */}
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setFilterTag(null)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${!filterTag ? 'bg-[#ffdd00] text-black' : 'bg-black/40 text-[#ffdd00] hover:bg-[#ffdd00]/20 border border-[#ffdd00]/30'}`}
                >
                  Tất cả
                </button>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setFilterTag(tag)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${filterTag === tag ? 'bg-[#ffdd00] text-black' : 'bg-black/40 text-[#ffdd00] hover:bg-[#ffdd00]/20 border border-[#ffdd00]/30'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Context Block */}
              <div className="bg-black/40 border border-[#ffdd00]/30 p-5 rounded-xl mb-8">
                <p className="text-xs text-[#ffdd00]/70 mb-2 uppercase tracking-wider font-bold">Đoạn kịch bản:</p>
                <p className="text-sm text-gray-300 italic leading-relaxed">"{textContext}"</p>
                <p className="text-[10px] text-[#ffdd00]/50 mt-3 flex justify-between">
                  <span>Tạo lúc: {new Date().toLocaleTimeString()} {new Date().toLocaleDateString('vi')}</span>
                </p>
              </div>

              {/* Prompts List */}
              <div className="space-y-6">
                {filteredPrompts.map((prompt, idx) => (
                  <div key={idx} className="border border-[#ffdd00]/30 bg-black/40 rounded-xl p-5 hover:border-[#ffdd00]/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold text-white">{prompt.title}</h3>
                      <button
                        onClick={() => handleCopy(prompt.prompt, idx)}
                        className="p-2 bg-[#ffdd00]/10 hover:bg-[#ffdd00]/20 text-[#ffdd00] rounded-lg transition-colors border border-[#ffdd00]/30"
                        title="Copy Prompt"
                      >
                       {copiedIndex === idx ? <Check className="w-4 h-4 text-[#ffdd00]" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {prompt.tags.map(t => (
                         <span key={t} className="px-2.5 py-1 bg-black/50 text-[#ffdd00] text-[10px] font-bold rounded uppercase border border-[#ffdd00]/30">
                           {t}
                         </span>
                      ))}
                    </div>

                    <div className="bg-black/60 border border-[#ffdd00]/20 rounded-lg p-4 font-mono text-sm text-gray-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                      {prompt.prompt}
                    </div>

                    {/* MP3 Input stub */}
                    <div className="mt-4 flex items-center relative">
                      <input 
                        type="text" 
                        placeholder="Dán link Drive MP3 vào đây để nghe trực tiếp..." 
                        className="w-full bg-black/50 border border-[#ffdd00]/30 rounded-lg py-3 px-4 text-xs text-white placeholder-[#ffdd00]/30 focus:outline-none focus:border-[#ffdd00]/50 transition-colors"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
