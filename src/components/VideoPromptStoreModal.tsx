import React, { useState } from 'react';
import { X, Film, Copy, Check } from 'lucide-react';

interface VideoPromptStoreModalProps {
  store: { id: string, text: string, shots: any[] }[];
  onClose: () => void;
}

export function VideoPromptStoreModal({ store, onClose }: VideoPromptStoreModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (shots: any[], id: string) => {
    const textToCopy = shots.map(s => `Shot ${s.number} (${s.duration}s)\n${s.englishPrompt}`).join('\n\n');
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1c1800] border border-[#ffdd00]/30 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#ffdd00]/30 bg-black/40">
          <h2 className="text-xl font-bold text-[#ffdd00] flex items-center gap-2">
            <Film className="w-6 h-6" />
            Kho lưu trữ Video Prompt
          </h2>
          <button onClick={onClose} className="p-2 text-[#ffdd00]/50 hover:text-[#ffdd00] hover:bg-[#ffdd00]/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-black/20">
          {store.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-[#ffdd00]/50 italic">
              Chưa có prompt nào được lưu.
            </div>
          ) : (
            <div className="space-y-6">
              {store.map((item) => (
                <div key={item.id} className="bg-black/40 border border-[#ffdd00]/20 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-3 pb-3 border-b border-[#ffdd00]/10">
                    <div className="text-xs text-[#ffdd00]/70 italic flex-1 mr-4">
                      "{item.text}"
                    </div>
                    <button
                      onClick={() => handleCopy(item.shots, item.id)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-[#ffdd00]/10 hover:bg-[#ffdd00]/20 text-[#ffdd00] border border-[#ffdd00]/30 rounded-lg text-sm transition-colors shrink-0"
                    >
                      {copiedId === item.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedId === item.id ? 'Đã Copy' : 'Copy Tất cả'}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {item.shots.map((shot: any, idx: number) => (
                      <div key={idx} className="bg-black/60 border border-[#ffdd00]/30 rounded-lg p-3 group relative overflow-hidden">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-[#ffdd00]">Shot {shot.number}</span>
                          <span className="text-xs font-mono text-gray-400">{shot.duration}s</span>
                        </div>
                        <p className="text-sm text-gray-300 font-mono leading-relaxed">
                          {shot.englishPrompt}
                        </p>
                        
                        {/* Vietnamese Translation Overlay */}
                        <div className="absolute inset-0 bg-[#1c1800]/95 backdrop-blur-sm p-3 flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-[#ffdd00]">Shot {shot.number} (Dịch)</span>
                            <span className="text-xs font-mono text-gray-400">{shot.duration}s</span>
                          </div>
                          <p className="text-sm text-gray-400 overflow-y-auto custom-scrollbar">
                            {shot.vietnamesePrompt}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
