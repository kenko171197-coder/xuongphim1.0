import React, { useState } from 'react';
import { X, Film } from 'lucide-react';
import { PromptType, MultishotComplexity, CinematicPacing } from '../services/ai';

interface VideoPromptCreationModalProps {
  selectedText: string;
  onClose: () => void;
  onGenerate: (promptType: PromptType, complexity: MultishotComplexity, pacing: CinematicPacing) => void;
}

export function VideoPromptCreationModal({ selectedText, onClose, onGenerate }: VideoPromptCreationModalProps) {
  const [promptType, setPromptType] = useState<PromptType>('multishot');
  const [complexity, setComplexity] = useState<MultishotComplexity>('medium');
  const [pacing, setPacing] = useState<CinematicPacing>('medium');

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1c1800] border border-[#ffdd00]/30 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#ffdd00]/30 bg-black/40">
          <h2 className="text-xl font-bold text-[#ffdd00] flex items-center gap-2">
            <Film className="w-6 h-6" />
            Tạo Prompt
          </h2>
          <button onClick={onClose} className="p-2 text-[#ffdd00]/50 hover:text-[#ffdd00] hover:bg-[#ffdd00]/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[80vh] custom-scrollbar bg-black/20">
          {/* Prompt Type */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-[#ffdd00] mb-3">Loại Prompt</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setPromptType('multishot')}
                className={`p-3 rounded-lg border flex flex-col items-center justify-center text-center transition-colors ${promptType === 'multishot' ? 'bg-[#ffdd00] text-black border-[#ffdd00]' : 'bg-black/40 text-gray-300 border-[#ffdd00]/30 hover:border-[#ffdd00]/60'}`}
              >
                <span className="font-bold text-sm">Multishot</span>
                <span className="text-[10px] opacity-80 mt-1">Nhiều shot cắt cảnh</span>
              </button>
              <button
                onClick={() => setPromptType('continuous')}
                className={`p-3 rounded-lg border flex flex-col items-center justify-center text-center transition-colors ${promptType === 'continuous' ? 'bg-[#ffdd00] text-black border-[#ffdd00]' : 'bg-black/40 text-gray-300 border-[#ffdd00]/30 hover:border-[#ffdd00]/60'}`}
              >
                <span className="font-bold text-sm">Continuous</span>
                <span className="text-[10px] opacity-80 mt-1">Long take, không cắt</span>
              </button>
              <button
                onClick={() => setPromptType('off')}
                className={`p-3 rounded-lg border flex flex-col items-center justify-center text-center transition-colors ${promptType === 'off' ? 'bg-[#ffdd00] text-black border-[#ffdd00]' : 'bg-black/40 text-gray-300 border-[#ffdd00]/30 hover:border-[#ffdd00]/60'}`}
              >
                <span className="font-bold text-sm">OFF Prompt</span>
                <span className="text-[10px] opacity-80 mt-1">Open-Following-Final</span>
              </button>
            </div>
          </div>

          {/* Selected Text */}
          <div className="mb-6 bg-black/40 border border-[#ffdd00]/30 p-4 rounded-xl">
            <label className="block text-xs font-bold text-[#ffdd00]/70 mb-2 uppercase">Đoạn kịch bản đã chọn</label>
            <p className="text-sm text-gray-300 italic leading-relaxed">"{selectedText}"</p>
          </div>

          {/* Complexity & Pacing */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-bold text-[#ffdd00] mb-3">Mức độ điện ảnh</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setComplexity('simple')}
                  className={`py-2 px-1 text-xs font-bold rounded border transition-colors ${complexity === 'simple' ? 'bg-[#ffdd00] text-black border-[#ffdd00]' : 'bg-black/40 text-gray-300 border-[#ffdd00]/30 hover:border-[#ffdd00]/60'}`}
                >
                  Đơn giản
                </button>
                <button
                  onClick={() => setComplexity('medium')}
                  className={`py-2 px-1 text-xs font-bold rounded border transition-colors ${complexity === 'medium' ? 'bg-[#ffdd00] text-black border-[#ffdd00]' : 'bg-black/40 text-gray-300 border-[#ffdd00]/30 hover:border-[#ffdd00]/60'}`}
                >
                  Trung bình
                </button>
                <button
                  onClick={() => setComplexity('complex')}
                  className={`py-2 px-1 text-xs font-bold rounded border transition-colors ${complexity === 'complex' ? 'bg-[#ffdd00] text-black border-[#ffdd00]' : 'bg-black/40 text-gray-300 border-[#ffdd00]/30 hover:border-[#ffdd00]/60'}`}
                >
                  Phức tạp
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#ffdd00] mb-3">Nhịp độ (Pacing)</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setPacing('slow')}
                  className={`py-2 px-1 text-xs font-bold rounded border transition-colors ${pacing === 'slow' ? 'bg-[#ffdd00] text-black border-[#ffdd00]' : 'bg-black/40 text-gray-300 border-[#ffdd00]/30 hover:border-[#ffdd00]/60'}`}
                >
                  Chậm
                </button>
                <button
                  onClick={() => setPacing('medium')}
                  className={`py-2 px-1 text-xs font-bold rounded border transition-colors ${pacing === 'medium' ? 'bg-[#ffdd00] text-black border-[#ffdd00]' : 'bg-black/40 text-gray-300 border-[#ffdd00]/30 hover:border-[#ffdd00]/60'}`}
                >
                  Trung bình
                </button>
                <button
                  onClick={() => setPacing('fast')}
                  className={`py-2 px-1 text-xs font-bold rounded border transition-colors ${pacing === 'fast' ? 'bg-[#ffdd00] text-black border-[#ffdd00]' : 'bg-black/40 text-gray-300 border-[#ffdd00]/30 hover:border-[#ffdd00]/60'}`}
                >
                  Nhanh
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#ffdd00]/30 bg-black/40 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg font-bold text-gray-300 hover:text-white transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={() => onGenerate(promptType, complexity, pacing)}
            className="px-6 py-2 bg-[#ffdd00] text-black rounded-lg font-bold flex items-center gap-2 hover:bg-[#d4b700] transition-colors"
          >
            <Film className="w-5 h-5" />
            Bắt đầu viết prompt
          </button>
        </div>
      </div>
    </div>
  );
}
