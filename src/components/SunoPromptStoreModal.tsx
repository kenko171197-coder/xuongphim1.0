import React, { useState } from 'react';
import { X, Music, Copy, Check } from 'lucide-react';

interface SunoPromptStoreModalProps {
  store: { id: string, text: string, prompts: any[] }[];
  onClose: () => void;
}

export function SunoPromptStoreModal({ store, onClose }: SunoPromptStoreModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (promptText: string, id: string) => {
    navigator.clipboard.writeText(promptText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1c1800] border border-[#ffdd00]/30 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#ffdd00]/30 bg-black/40">
          <h2 className="text-xl font-bold text-[#ffdd00] flex items-center gap-2">
            <Music className="w-6 h-6" />
            Kho lưu trữ Prompt SUNO
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
                  <div className="text-xs text-[#ffdd00]/70 italic mb-3 pb-3 border-b border-[#ffdd00]/10">
                    "{item.text}"
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {item.prompts.map((prompt: any, idx: number) => (
                      <div key={idx} className="bg-black/60 border border-[#ffdd00]/30 rounded-lg p-4 group flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold px-2 py-1 bg-[#ffdd00]/20 text-[#ffdd00] rounded">
                            {prompt.tags[0] || 'Song'}
                          </span>
                          <button
                            onClick={() => handleCopy(prompt.prompt, `${item.id}-${idx}`)}
                            className="text-[#ffdd00]/50 hover:text-[#ffdd00] transition-colors"
                          >
                            {copiedId === `${item.id}-${idx}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-sm text-gray-300 font-mono whitespace-pre-wrap flex-1">
                          {prompt.prompt}
                        </p>
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
