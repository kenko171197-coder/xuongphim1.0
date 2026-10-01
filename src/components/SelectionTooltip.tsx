import React, { useEffect, useState, useRef } from 'react';
import { Send, X, Edit3, Film, Trash2, ImagePlus, Maximize2, Eye, Music, Target } from 'lucide-react';
import { MultishotComplexity } from '../services/ai';

interface SelectionTooltipProps {
  onEdit?: (text: string, prompt: string, image: { data: string, mimeType: string } | null) => void;
  onDelete?: (text: string) => void;
  onPrompting?: (text: string) => void;
  onExpand?: (text: string, direction: string) => void;
  onShowDontTell?: (text: string) => void;
  onSuno?: (text: string) => void;
}

export function SelectionTooltip({ onEdit, onDelete, onPrompting, onExpand, onShowDontTell, onSuno }: SelectionTooltipProps) {
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);
  const [activePanel, setActivePanel] = useState<'edit' | 'expand' | null>(null);
  const [prompt, setPrompt] = useState('');
  const [expandPrompt, setExpandPrompt] = useState('');
  const [attachedImage, setAttachedImage] = useState<{ data: string, mimeType: string, previewUrl: string } | null>(null);
  const [selectedComplexity, setSelectedComplexity] = useState<MultishotComplexity>('medium');
  const tooltipRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      
      if (tooltipRef.current && tooltipRef.current.contains(document.activeElement)) {
        return;
      }

      if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        const text = sel.toString().trim();
        if (text.length > 0) {
          const range = sel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setSelection({
            text,
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
          });
          setActivePanel(null);
          setPrompt('');
          setExpandPrompt('');
          setAttachedImage(null);
          return;
        }
      }
      setSelection(null);
      setActivePanel(null);
      setPrompt('');
      setExpandPrompt('');
      setAttachedImage(null);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  if (!selection) return null;

  const lines = selection.text.split('\n').reduce((acc: number, line: string) => {
    return acc + Math.ceil(line.length / 50) + 1;
  }, 0);
  
  const minutes = lines / 55;
  const seconds = Math.round(minutes * 60);

  let displayTime = '';
  if (seconds < 60) {
    displayTime = `~${seconds} giây`;
  } else {
    displayTime = `~${minutes.toFixed(1)} phút`;
  }

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && onEdit) {
      const imgPayload = attachedImage ? { data: attachedImage.data, mimeType: attachedImage.mimeType } : null;
      onEdit(selection.text, prompt, imgPayload);
      handleClose();
    }
  };

  const handleExpandSubmit = (dir: string) => {
    if (onExpand) {
      onExpand(selection.text, dir);
      handleClose();
    }
  };

  const handleMultishotSelect = (duration: number) => {
    if (onMultishot) {
      onMultishot(selection.text, duration, selectedComplexity);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelection(null);
    setActivePanel(null);
    setPrompt('');
    setExpandPrompt('');
    setAttachedImage(null);
    window.getSelection()?.removeAllRanges();
  };

  const actionButtonClass = "text-[#ffdd00] hover:text-[#fff188] hover:bg-[#ffdd00]/10 text-xs flex items-center gap-1.5 cursor-pointer font-bold px-2 py-1 rounded transition-colors";

  return (
    <div
      ref={tooltipRef}
      onMouseDown={(e) => { if (activePanel) e.preventDefault(); }}
      className={`fixed z-50 bg-[#1c1800] text-[#ffdd00] rounded-xl shadow-2xl text-sm font-medium transform -translate-x-1/2 -translate-y-full backdrop-blur-md border border-[#ffdd00]/30 transition-all ${activePanel ? 'w-80 p-4' : 'p-2 pointer-events-auto'}`}
      style={{ left: selection.x, top: selection.y, minWidth: activePanel ? '320px' : 'max-content' }}
    >
      {!activePanel ? (
        <div className="flex flex-col">
          <div className="flex items-center gap-1 pb-2 border-b border-[#ffdd00]/20 mb-2 px-1">
            <span className="font-bold text-white px-2 whitespace-nowrap">{displayTime}</span>
            <div className="w-px h-4 bg-[#ffdd00]/30 mx-1"></div>
            {onEdit && (
              <button onClick={(e) => { e.stopPropagation(); setActivePanel('edit'); }} className={actionButtonClass}>
                <Edit3 className="w-3.5 h-3.5" /> Sửa
              </button>
            )}
            {onExpand && (
              <button onClick={(e) => { e.stopPropagation(); setActivePanel('expand'); }} className={actionButtonClass}>
                <Maximize2 className="w-3.5 h-3.5" /> Mở rộng
              </button>
            )}
            {onShowDontTell && (
              <button onClick={(e) => { e.stopPropagation(); onShowDontTell(selection.text); handleClose(); }} className={actionButtonClass}>
                <Eye className="w-3.5 h-3.5" /> Show don't tell
              </button>
            )}
             {onDelete && (
                <button onClick={(e) => { e.stopPropagation(); onDelete(selection.text); handleClose(); }} className={`${actionButtonClass} !text-red-400 hover:!text-red-300 hover:!bg-red-400/10`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
          </div>
          <div className="flex items-center gap-1 px-1">
            {onPrompting && (
              <button onClick={(e) => { e.stopPropagation(); onPrompting(selection.text); handleClose(); }} className={actionButtonClass}>
                <Film className="w-3.5 h-3.5" /> Prompting
              </button>
            )}
            {onSuno && (
              <button onClick={(e) => { e.stopPropagation(); onSuno(selection.text); handleClose(); }} className={actionButtonClass}>
                <Music className="w-3.5 h-3.5" /> SUNO
              </button>
            )}
          </div>
        </div>
      ) : activePanel === 'edit' ? (
        <form onSubmit={handleSubmitEdit} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#ffdd00] uppercase tracking-wider">Yêu cầu chỉnh sửa</span>
            <button type="button" onClick={handleClose} className="text-[#ffdd00]/50 hover:text-[#ffdd00]">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="text-xs text-[#ffdd00]/70 line-clamp-2 italic bg-black/40 p-2 rounded border border-[#ffdd00]/20">
            "{selection.text}"
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ví dụ: Làm đoạn này hài hước hơn (@ten_anh.jpg)..."
            className="w-full bg-black/50 border border-[#ffdd00]/30 rounded-lg p-2 text-white placeholder-[#ffdd00]/50 focus:outline-none focus:border-[#ffdd00] resize-none h-20 text-sm"
            autoFocus
          />
          {attachedImage && (
            <div className="relative inline-block w-max mt-1 mb-1">
              <img src={attachedImage.previewUrl} alt="Attached" className="h-16 rounded-md border border-[#ffdd00]/50" />
              <button type="button" onClick={() => setAttachedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const result = reader.result as string;
                  const [prefix, base64] = result.split(',');
                  const mimeType = prefix.match(/:(.*?);/)?.[1] || 'image/jpeg';
                  setAttachedImage({ data: base64, mimeType, previewUrl: result });
                };
                reader.readAsDataURL(file);
                e.target.value = '';
              }
            }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 bg-[#ffdd00]/10 hover:bg-[#ffdd00]/20 text-[#ffdd00] rounded-lg text-xs font-bold flex items-center gap-2 border border-[#ffdd00]/30 transition-colors shrink-0"
              title="Đính kèm ảnh"
            >
              <ImagePlus className="w-4 h-4" />
              Ảnh đính kèm
            </button>
            <button
              type="submit"
              disabled={!prompt.trim()}
              className="flex-1 py-2 bg-[#ffdd00] hover:bg-[#e6c700] text-black rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm"
            >
              <Send className="w-4 h-4" />
              Gửi yêu cầu
            </button>
          </div>
        </form>
      ) : activePanel === 'expand' ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#ffdd00] uppercase tracking-wider">Mở rộng chi tiết</span>
            <button type="button" onClick={handleClose} className="text-[#ffdd00]/50 hover:text-[#ffdd00]">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="text-xs text-[#ffdd00]/70 line-clamp-2 italic bg-black/40 p-2 rounded border border-[#ffdd00]/20">
            "{selection.text}"
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'biểu cảm khuôn mặt', label: 'Biểu cảm' },
              { id: 'ngôn ngữ cơ thể và tư thế', label: 'Ngôn ngữ cơ Thể' },
              { id: 'chi tiết bối cảnh xung quanh', label: 'Bối cảnh' },
              { id: 'nội tâm và cảm xúc', label: 'Nội tâm' },
              { id: 'âm thanh và ánh sáng', label: 'Âm thanh/Ánh sáng' },
              { id: 'tương tác với vật thể', label: 'Tương tác' },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => handleExpandSubmit(option.id)}
                className="py-1.5 px-2 bg-black/30 hover:bg-[#ffdd00]/10 text-[#ffdd00] text-xs font-semibold rounded border border-[#ffdd00]/20 transition-colors text-left truncate"
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center mt-1">
            <input
              type="text"
              value={expandPrompt}
              onChange={(e) => setExpandPrompt(e.target.value)}
              placeholder="Hướng mở rộng khác..."
              className="flex-1 bg-black/50 border border-[#ffdd00]/30 rounded-lg px-3 py-2 text-sm text-white placeholder-[#ffdd00]/50 focus:outline-none focus:border-[#ffdd00] transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && expandPrompt.trim()) {
                  handleExpandSubmit(expandPrompt);
                }
              }}
            />
            <button
              onClick={() => {
                if (expandPrompt.trim()) {
                  handleExpandSubmit(expandPrompt);
                }
              }}
              disabled={!expandPrompt.trim()}
              className="p-2 bg-[#ffdd00] hover:bg-[#e6c700] text-black rounded-lg transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
