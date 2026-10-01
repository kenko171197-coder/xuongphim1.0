import React, { useState, useEffect, useMemo } from 'react';
import { X, FileText, Loader2, Download } from 'lucide-react';
import { ScriptElement } from '../types';
import { translateText } from '../services/ai';

interface DownloadDialogueModalProps {
  script: ScriptElement[];
  onClose: () => void;
}

export function DownloadDialogueModal({ script, onClose }: DownloadDialogueModalProps) {
  const [targetLang, setTargetLang] = useState<'vi' | 'en'>('vi');
  const [downloadingChar, setDownloadingChar] = useState<string | null>(null);

  // Extract unique characters and check for narrator
  const characters = useMemo(() => {
    const chars = new Set<string>();
    let hasNarratorAction = false;
    
    script.forEach(el => {
      if (el.type === 'character') {
        const charName = el.text.trim().replace(/\s*\(.*\)/, ''); // Remove trailing parentheticals if any
        if (charName) chars.add(charName);
      } else if (el.type === 'action') {
        // Simple heuristic: if an action contains quotes or is very long, it might not be VO.
        // But often users use "NGƯỜI DẪN CHUYỆN" character. We'll just provide "NGƯỜI DẪN CHUYỆN" if they want all actions as VO,
        // or let's strictly look for narrator text.
        // For simplicity, let's always include a default "NGƯỜI DẪN CHUYỆN" that extracts Action blocks? No, let's just do characters and a separate "ALL".
      }
    });

    const uniqueChars = Array.from(chars);
    // Explicitly add narrator if it's not present but typical
    if (!uniqueChars.some(c => c.toLowerCase().includes('người dẫn chuyện') || c.toLowerCase().includes('narrator'))) {
        uniqueChars.unshift('NGƯỜI DẪN CHUYỆN');
    }

    return uniqueChars;
  }, [script]);

  const handleDownload = async (charName: string) => {
    setDownloadingChar(charName);
    try {
      let filteredText = `--- LỜI THOẠI: ${charName} ---\n\n`;
      let linesToTranslate: string[] = [];

      if (charName === 'NGƯỜI DẪN CHUYỆN' && !script.some(el => el.type === 'character' && el.text.includes(charName))) {
         // Fallback mechanism: extract action lines or voice-overs. 
         // But usually narrator character exists. If not, maybe just extract all actions.
         script.forEach(el => {
             if (el.type === 'action') {
                 linesToTranslate.push(el.text);
             }
         });
      } else {
         let isCurrentChar = false;
         script.forEach(el => {
           if (el.type === 'character') {
             isCurrentChar = el.text.includes(charName);
           } else if (isCurrentChar && (el.type === 'dialogue' || el.type === 'parenthetical')) {
             linesToTranslate.push(el.type === 'parenthetical' ? `[${el.text}]` : el.text);
           } else if (el.type === 'scene_heading' || el.type === 'action' || el.type === 'transition') {
             isCurrentChar = false;
           }
         });
      }

      if (linesToTranslate.length === 0) {
          alert('Không tìm thấy lời thoại cho nhân vật này.');
          setDownloadingChar(null);
          return;
      }

      let finalText = "";
      if (targetLang === 'vi') {
          finalText = filteredText + linesToTranslate.join('\n');
      } else {
          // Translate all lines
          const fullTextToTranslate = linesToTranslate.join('\n');
          const translatedFullText = await translateText(fullTextToTranslate, 'en');
          finalText = filteredText + translatedFullText;
      }

      const blob = new Blob([finalText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `loi_thoai_${charName.replace(/\s+/g, '_')}_${targetLang}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error(error);
      alert('Đã có lỗi xảy ra khi xử lý lời thoại.');
    } finally {
      setDownloadingChar(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1c1800] border border-[#ffdd00]/30 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#ffdd00]/20 bg-black/40">
          <h2 className="text-xl font-bold text-[#ffdd00] flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Tải lời thoại
          </h2>
          <button onClick={onClose} className="p-1.5 text-[#ffdd00]/50 hover:text-[#ffdd00] hover:bg-[#ffdd00]/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 flex flex-col gap-6">
          
          {/* Language Selection */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-bold text-[#ffdd00]/90">Chọn ngôn ngữ tải về:</label>
            <div className="flex bg-black/40 border border-[#ffdd00]/30 rounded-lg p-1">
              <button
                onClick={() => setTargetLang('vi')}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${
                  targetLang === 'vi' ? 'bg-[#ffdd00] text-black' : 'text-[#ffdd00]/70 hover:text-[#ffdd00] hover:bg-[#ffdd00]/10'
                }`}
              >
                Tiếng Việt
              </button>
              <button
                onClick={() => setTargetLang('en')}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${
                  targetLang === 'en' ? 'bg-[#ffdd00] text-black' : 'text-[#ffdd00]/70 hover:text-[#ffdd00] hover:bg-[#ffdd00]/10'
                }`}
              >
                Tiếng Anh
              </button>
            </div>
          </div>

          {/* Character Selection */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-bold text-[#ffdd00]/90">Chọn nhân vật để tải lời thoại:</label>
            
            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {characters.map((charName) => (
                <div key={charName} className="flex items-center justify-between bg-black/40 border border-[#ffdd00]/20 p-4 rounded-xl group hover:border-[#ffdd00]/50 transition-colors">
                  <span className="font-bold text-[#ffdd00]">{charName}</span>
                  <button
                    onClick={() => handleDownload(charName)}
                    disabled={downloadingChar === charName}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1c1800] border border-[#ffdd00]/30 text-[#ffdd00] hover:bg-[#ffdd00]/20 text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {downloadingChar === charName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Tải file
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
