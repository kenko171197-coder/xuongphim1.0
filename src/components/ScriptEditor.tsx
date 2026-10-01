import React, { useState, useRef, useEffect } from 'react';
import { Project, Event, ScriptVersion, ScriptElement } from '../types';
import { generateScript, generateMultishotPrompt, editScriptSegment, MultishotShot, MultishotComplexity } from '../services/ai';
import { ChevronLeft, Loader2, Send, RotateCcw, RotateCw, Save, History, Edit3, X, Film, Copy, Check, ImagePlus } from 'lucide-react';
import { SelectionTooltip } from './SelectionTooltip';
import { formatApiError } from '../utils/error';
import { useFakeProgress } from '../hooks/useFakeProgress';
import { SunoPromptModal } from './SunoPromptModal';
import { VideoPromptCreationModal } from './VideoPromptCreationModal';
import { SunoPromptStoreModal } from './SunoPromptStoreModal';
import { VideoPromptStoreModal } from './VideoPromptStoreModal';
import { DownloadDialogueModal } from './DownloadDialogueModal';

interface ScriptEditorProps {
  project: Project;
  actId: string;
  event: Event;
  onSave: (event: Event) => void;
  onSaveProject: (project: Project) => void;
  onBack: () => void;
}

export default function ScriptEditor({ project, actId, event, onSave, onSaveProject, onBack }: ScriptEditorProps) {
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [currentVersionIndex, setCurrentVersionIndex] = useState(event.currentVersionIndex);
  const [versions, setVersions] = useState<ScriptVersion[]>(event.scriptVersions);
  const [selectedText, setSelectedText] = useState('');
  const [multishotLoadingDuration, setMultishotLoadingDuration] = useState<number | null>(null);
  const [multishotShots, setMultishotShots] = useState<MultishotShot[]>([]);
  const [multishotComplexity, setMultishotComplexity] = useState<MultishotComplexity>('medium');
  const [copied, setCopied] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{ data: string, mimeType: string, previewUrl: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [sunoContextText, setSunoContextText] = useState<string | null>(null);
  const [inlineLoadingIndices, setInlineLoadingIndices] = useState<{start: number, end: number} | null>(null);
  const [highlightedIndices, setHighlightedIndices] = useState<{start: number, end: number} | null>(null);

  const [videoPromptContextText, setVideoPromptContextText] = useState<string | null>(null);
  const videoPromptsStore = project.videoPromptsStore || [];
  const sunoPromptsStore = project.sunoPromptsStore || [];
  const [showVideoPromptStore, setShowVideoPromptStore] = useState(false);
  const [showSunoStore, setShowSunoStore] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [generatingVideoPrompt, setGeneratingVideoPrompt] = useState(false);

  const loadingProgress = useFakeProgress(loading, 20000);

  const handleUpdateVideoStore = (newStore: any[]) => {
    onSaveProject({
        ...project,
        videoPromptsStore: newStore
    });
  };

  const handleUpdateSunoStore = (newStore: any[]) => {
    onSaveProject({
        ...project,
        sunoPromptsStore: newStore
    });
  };

  const handleDownloadDialogs = () => {
    const script = versions[currentVersionIndex]?.content;
    if (!script) {
        alert("Chưa có kịch bản để tải.");
        return;
    }
    setShowDownloadModal(true);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [versions, currentVersionIndex]);

  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) {
        const text = sel.toString().trim();
        if (text.length > 0) {
          setSelectedText(text);
          return;
        }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const normalizeText = (s: string) => s.replace(/\s+/g, '').toLowerCase();

  const handleTargetedEdit = async (isDelete: boolean, customPrompt: string, selectedTextToUse: string, image: { data: string, mimeType: string } | null = null) => {
    if (!currentScript) return;
    setLoading(true);

    try {
      let bestStart = -1;
      let bestEnd = -1;
      let fullRendered = '';
      const elementSpans: {start: number, end: number}[] = [];
      
      for (let i = 0; i < currentScript.length; i++) {
          let el = currentScript[i];
          let renderedText = '';
          if (el.type === 'parenthetical') {
              renderedText = `(${el.text.replace(/^\(|\)$/g, '')})`;
          } else if (el.type === 'dialogue') {
              renderedText = el.text.split(' | ')[0];
          } else {
              renderedText = el.text;
          }
          
          let elNorm = normalizeText(renderedText);
          let start = fullRendered.length;
          let end = start + elNorm.length;
          elementSpans.push({start, end});
          fullRendered += elNorm;
      }
      
      const selNorm = normalizeText(selectedTextToUse);
      const matchStart = fullRendered.indexOf(selNorm);
      
      if (matchStart !== -1) {
          const matchEnd = matchStart + selNorm.length;
          for (let i = 0; i < elementSpans.length; i++) {
              if (elementSpans[i].end > matchStart && bestStart === -1) {
                  bestStart = i;
              }
              if (elementSpans[i].start < matchEnd) {
                  bestEnd = i;
              }
          }
      }

      let newScript: ScriptElement[] = [];
      let newHighlightStart = -1;
      let newHighlightEnd = -1;

      if (bestStart !== -1 && bestEnd !== -1) {
        if (!isDelete) {
          setInlineLoadingIndices({ start: bestStart, end: bestEnd });
        }
        if (isDelete) {
          newScript = [...currentScript.slice(0, bestStart), ...currentScript.slice(bestEnd + 1)];
        } else {
          const contextBefore = currentScript.slice(0, bestStart);
          const targetElements = currentScript.slice(bestStart, bestEnd + 1);
          const contextAfter = currentScript.slice(bestEnd + 1);
          
          const editedSegment = await editScriptSegment(contextBefore, targetElements, contextAfter, customPrompt, image);
          newScript = [...contextBefore, ...editedSegment, ...contextAfter];
          newHighlightStart = contextBefore.length;
          newHighlightEnd = contextBefore.length + editedSegment.length - 1;
        }
      } else {
        // Fallback or full rewrite
        if (isDelete) {
          alert('Không tìm thấy nội dung đã chọn để xóa một cách chính xác.');
          setLoading(false);
          return;
        } else {
           // For fallback we also pass the image
          handleGenerate(true, customPrompt, selectedTextToUse, image); // Full fallback
          return;
        }
      }

      const newVersion: ScriptVersion = {
        id: `v-${Date.now()}`,
        createdAt: Date.now(),
        content: newScript,
        prompt: isDelete ? `Đã xóa một phần kịch bản: "${selectedTextToUse}"` : customPrompt,
      };

      const newVersions = [...versions.slice(0, currentVersionIndex + 1), newVersion];
      setVersions(newVersions);
      setCurrentVersionIndex(newVersions.length - 1);
      setPrompt('');
      setSelectedText('');
      
      if (newHighlightStart !== -1 && newHighlightEnd !== -1) {
        setHighlightedIndices({ start: newHighlightStart, end: newHighlightEnd });
        setTimeout(() => setHighlightedIndices(null), 5000); // Clear highlight after 5 seconds
      }

      onSave({
        ...event,
        scriptVersions: newVersions,
        currentVersionIndex: newVersions.length - 1,
      });

    } catch (err) {
      console.error(err);
      alert('Lỗi khi chỉnh sửa đoạn này. ' + formatApiError(err));
    } finally {
      setLoading(false);
      setInlineLoadingIndices(null);
    }
  };

  const handleGenerate = async (isEdit: boolean = false, customPrompt?: string, customSelectedText?: string, image?: { data: string, mimeType: string } | null) => {
    const textToUse = customSelectedText || selectedText;
    if (isEdit && textToUse) {
      await handleTargetedEdit(false, customPrompt || prompt, textToUse, image);
      return;
    }

    setLoading(true);
    try {
      const fullSummary = project.acts.map(a => `${a.title}: ${a.summary}`).join('\n');
      
      let previousScripts = '';
      for (const act of project.acts) {
        for (const ev of act.events) {
          if (ev.id === event.id) break;
          if (ev.scriptVersions.length > 0) {
            const latest = ev.scriptVersions[ev.currentVersionIndex];
            previousScripts += `\n--- Event: ${ev.description} ---\n`;
            previousScripts += latest.content.map(c => c.text).join('\n');
          }
        }
      }

      const elements = await generateScript(
        event.description,
        event.duration,
        fullSummary,
        previousScripts,
        project.scriptLanguage,
        project.dialogueLanguage,
        isEdit ? (customPrompt || prompt) : undefined,
        undefined, // Explicitly undefined since targeted edit handles selections now
        project.globalInstructions,
        event.approvedPrompts,
        project.openingStyle,
        project.endingStyle,
        project.messageStyle,
        image
      );

      const newVersion: ScriptVersion = {
        id: `v-${Date.now()}`,
        createdAt: Date.now(),
        content: elements,
        prompt: isEdit ? (customPrompt || prompt) : undefined,
      };

      const newVersions = [...versions.slice(0, currentVersionIndex + 1), newVersion];
      setVersions(newVersions);
      setCurrentVersionIndex(newVersions.length - 1);
      setPrompt('');
      setSelectedText('');
      
      onSave({
        ...event,
        scriptVersions: newVersions,
        currentVersionIndex: newVersions.length - 1,
      });

    } catch (err) {
      console.error(err);
      alert('Lỗi khi tạo kịch bản. ' + formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateVideoPrompt = async (promptType: any, complexity: any, pacing: any) => {
    if (!videoPromptContextText) return;
    setGeneratingVideoPrompt(true);
    try {
      const { generateVideoPrompts } = await import('../services/ai');
      const shots = await generateVideoPrompts(videoPromptContextText, promptType, complexity, pacing);
      const newPrompt = {
         id: Date.now().toString(),
         text: videoPromptContextText,
         shots
      };
      handleUpdateVideoStore([newPrompt, ...videoPromptsStore]);
      setVideoPromptContextText(null);
      setShowVideoPromptStore(true);
    } catch (err) {
      console.error(err);
      alert('Lỗi khi tạo video prompt. ' + formatApiError(err));
    } finally {
      setGeneratingVideoPrompt(false);
    }
  };

  const currentScript = currentVersionIndex >= 0 ? versions[currentVersionIndex].content : null;

  const renderScriptElement = (el: ScriptElement, idx: number) => {
    // If this element is being replaced/loaded inline
    if (inlineLoadingIndices && idx >= inlineLoadingIndices.start && idx <= inlineLoadingIndices.end) {
      if (idx === inlineLoadingIndices.start) {
         return (
           <div key={`loading-${idx}`} className="bg-[#fff9d6] p-6 rounded-xl flex flex-col items-center justify-center my-4 opacity-90 border border-[#ffdd00]/50 relative z-10 w-full animate-pulse shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin text-[#d4b700] mb-2" />
              <p className="text-[#d4b700] font-bold text-sm tracking-wide">Đang sửa đoạn kịch bản...</p>
           </div>
         );
      }
      return null; // hide other elements being edited
    }

    const isHighlighted = highlightedIndices && idx >= highlightedIndices.start && idx <= highlightedIndices.end;
    const highlightClass = isHighlighted ? 'bg-[#fff9d6] p-2 -mx-2 rounded transition-colors duration-500 shadow-sm border border-[#ffdd00]/50' : 'transition-colors duration-500';

    switch (el.type) {
      case 'scene_heading':
        return <div key={idx} className={`uppercase font-bold mt-6 mb-2 ${highlightClass}`}>{el.text}</div>;
      case 'action':
        return <div key={idx} className={`mb-4 ${highlightClass}`}>{el.text}</div>;
      case 'character':
        return <div key={idx} className={`uppercase ml-[20%] mt-4 mb-0 ${highlightClass}`}>{el.text}</div>;
      case 'parenthetical':
        return <div key={idx} className={`ml-[15%] mr-[20%] mb-0 ${highlightClass}`}>({el.text.replace(/^\(|\)$/g, '')})</div>;
      case 'dialogue':
        const parts = el.text.split(' | ');
        if (parts.length > 1) {
          return (
            <div key={idx} className={`ml-[10%] mr-[15%] mb-4 relative group cursor-help ${highlightClass}`}>
              <span>{parts[0]}</span>
              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-900 text-primary-300 text-sm p-3 rounded-lg shadow-xl z-50 whitespace-pre-wrap w-max max-w-md border border-primary-700/50">
                {parts.slice(1).join(' | ')}
              </div>
            </div>
          );
        }
        return <div key={idx} className={`ml-[10%] mr-[15%] mb-4 ${highlightClass}`}>{el.text}</div>;
      case 'transition':
        return <div key={idx} className={`uppercase text-right mt-4 mb-4 ${highlightClass}`}>{el.text}</div>;
      default:
        return <div key={idx} className={`mb-2 ${highlightClass}`}>{el.text}</div>;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-primary-600 hover:text-white transition-colors shadow-sm"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-black">Viết kịch bản chi tiết</h2>
            <p className="text-gray-500 text-sm mt-1 line-clamp-1">{event.description}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadDialogs}
            className="px-4 py-2 bg-[#ffdd00]/10 text-[#d4b700] hover:bg-[#ffdd00]/20 rounded-lg text-sm font-bold transition-colors border border-[#ffdd00]/30 shadow-sm"
          >
            Tải lời thoại
          </button>
          <div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200">
            <button
               onClick={() => setShowVideoPromptStore(true)}
               className="px-4 py-1.5 text-sm font-bold text-gray-700 hover:bg-white hover:text-black rounded-md transition-colors"
            >
              Prompt Store {videoPromptsStore.length > 0 && `(${videoPromptsStore.length})`}
            </button>
            <button
               onClick={() => setShowSunoStore(true)}
               className="px-4 py-1.5 text-sm font-bold text-gray-700 hover:bg-white hover:text-black rounded-md transition-colors"
            >
              SUNO Store {sunoPromptsStore.length > 0 && `(${sunoPromptsStore.length})`}
            </button>
          </div>

          {versions.length > 0 && (
            <div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200">
              <button
                onClick={() => {
                  const newIndex = Math.max(0, currentVersionIndex - 1);
                  setCurrentVersionIndex(newIndex);
                  onSave({ ...event, currentVersionIndex: newIndex });
                }}
                disabled={currentVersionIndex <= 0}
                className="p-1.5 text-gray-600 hover:text-white hover:bg-primary-600 rounded-md disabled:opacity-30 transition-colors"
                title="Phiên bản trước"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-black px-2">
                v{currentVersionIndex + 1}/{versions.length}
              </span>
              <button
                onClick={() => {
                  const newIndex = Math.min(versions.length - 1, currentVersionIndex + 1);
                  setCurrentVersionIndex(newIndex);
                  onSave({ ...event, currentVersionIndex: newIndex });
                }}
                disabled={currentVersionIndex >= versions.length - 1}
                className="p-1.5 text-gray-600 hover:text-white hover:bg-primary-600 rounded-md disabled:opacity-30 transition-colors"
                title="Phiên bản sau"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Script Paper View */}
        <div className="flex-1 bg-gray-50 rounded-3xl border border-gray-200 overflow-hidden flex flex-col relative shadow-sm">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-8 scroll-smooth selection:bg-primary-200"
          >
            {currentScript ? (
              <div className="max-w-3xl mx-auto bg-[#fdfdfd] text-gray-900 p-12 min-h-[800px] shadow-2xl rounded-sm font-mono text-[12pt] leading-tight flex flex-col gap-4" style={{ fontFamily: '"Courier Prime", "Courier New", Courier, monospace' }}>
                <SelectionTooltip
                  onEdit={(text, p, img) => handleTargetedEdit(false, p, text, img)}
                  onDelete={(text) => handleTargetedEdit(true, "Xóa đoạn kịch bản này", text)}
                  onExpand={(text, dir) => handleTargetedEdit(false, "Hãy mở rộng đoạn văn này chi tiết hơn, tập trung vào: " + dir, text)}
                  onShowDontTell={(text) => handleTargetedEdit(false, "Hãy viết lại đoạn văn này theo quy tắc 'Show, Don't Tell', mô tả chi tiết hình dáng, hành động, nét mặt, cảnh vật thay vì kể lể cảm xúc hay nội dung trực tiếp.", text)}
                  onSuno={(text) => setSunoContextText(text)}
                  onPrompting={(text) => {
                    if (window.getSelection()) {
                      const sel = window.getSelection();
                      if (sel) sel.removeAllRanges();
                    }
                    setVideoPromptContextText(text);
                  }}
                />
                {currentScript.map((el, idx) => renderScriptElement(el, idx))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-primary-500/50">
                <History className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg mb-6">Chưa có kịch bản cho sự kiện này.</p>
                <button
                  onClick={() => handleGenerate(false)}
                  disabled={loading}
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-primary-600/20"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Viết kịch bản ngay
                </button>
              </div>
            )}
          </div>
          
          {/* Loading Overlay */}
          {loading && !inlineLoadingIndices && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-3xl">
              <Loader2 className="w-12 h-12 text-[#ffdd00] animate-spin mb-4" />
              <p className="text-black font-bold animate-pulse text-lg">AI đang chắp bút viết kịch bản... {loadingProgress}%</p>
            </div>
          )}
          {generatingVideoPrompt && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-[200]">
              <Loader2 className="w-12 h-12 text-[#ffdd00] animate-spin mb-4" />
              <p className="text-[#ffdd00] font-bold animate-pulse text-lg">Đang tạo Prompt Video...</p>
            </div>
          )}
        </div>

        {/* Edit Panel */}
        {versions.length > 0 && (
          <div className="w-96 shrink-0 flex flex-col gap-4 min-h-0 overflow-y-auto custom-scrollbar pb-4">
            {/* Current Version Info */}
            {versions[currentVersionIndex].prompt && (
              <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm shrink-0">
                <h3 className="text-sm font-bold text-black mb-2 uppercase tracking-wider">
                  Yêu cầu của phiên bản này:
                </h3>
                <p className="text-sm text-gray-700 italic mb-4">
                  "{versions[currentVersionIndex].prompt}"
                </p>
                
                <label className="flex items-start gap-2 mb-4 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input
                      type="checkbox"
                      checked={(event.approvedPrompts || []).includes(versions[currentVersionIndex].prompt!)}
                      onChange={(e) => {
                        const currentPrompt = versions[currentVersionIndex].prompt!;
                        let newApproved = [...(event.approvedPrompts || [])];
                        if (e.target.checked) {
                          if (!newApproved.includes(currentPrompt)) newApproved.push(currentPrompt);
                        } else {
                          newApproved = newApproved.filter(p => p !== currentPrompt);
                        }
                        onSave({ ...event, approvedPrompts: newApproved });
                      }}
                      className="peer appearance-none w-4 h-4 border border-gray-300 rounded bg-white checked:bg-primary-600 checked:border-primary-700 transition-colors cursor-pointer"
                    />
                    <Check className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                  </div>
                  <span className="text-xs text-gray-500 group-hover:text-black transition-colors leading-tight">
                    Giữ yêu cầu này cho các lần chỉnh sửa sau của phân đoạn này
                  </span>
                </label>

                <button
                  onClick={() => {
                    const currentPrompt = versions[currentVersionIndex].prompt;
                    if (currentPrompt) {
                      const currentGlobal = project.globalInstructions || [];
                      if (!currentGlobal.includes(currentPrompt)) {
                        const newGlobal = [...currentGlobal, currentPrompt];
                        onSaveProject({ ...project, globalInstructions: newGlobal });
                        // alert('Đã thêm vào yêu cầu chung cho tất cả phân đoạn!');
                      } else {
                        // alert('Yêu cầu này đã có trong danh sách yêu cầu chung.');
                      }
                    }
                  }}
                  className="w-full py-2 bg-gray-100 hover:bg-primary-600 text-gray-600 hover:text-white text-xs font-bold rounded-lg transition-colors border border-gray-200"
                >
                  Áp dụng yêu cầu này cho tất cả phân đoạn
                </button>
              </div>
            )}

            {/* Approved Prompts for this event */}
            {event.approvedPrompts && event.approvedPrompts.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm shrink-0">
                <h3 className="text-sm font-bold text-black mb-3 uppercase tracking-wider flex items-center justify-between">
                  <span>Yêu cầu đã lưu (Phân đoạn này)</span>
                  <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full border border-primary-200">{event.approvedPrompts.length}</span>
                </h3>
                <ul className="space-y-2 mb-4">
                  {event.approvedPrompts.map((inst, idx) => (
                    <li key={idx} className="text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-100 flex justify-between items-start gap-2">
                      <span className="flex-1 italic">"{inst}"</span>
                      <button
                        onClick={() => {
                          const newApproved = event.approvedPrompts!.filter((_, i) => i !== idx);
                          onSave({ ...event, approvedPrompts: newApproved });
                        }}
                        className="text-red-500 hover:text-red-600 p-0.5"
                        title="Xóa yêu cầu này"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] text-gray-400 leading-tight">
                  Các yêu cầu này sẽ được giữ nguyên khi bạn chỉnh sửa phân đoạn này trong tương lai.
                </p>
              </div>
            )}

            {/* Global Instructions */}
            {project.globalInstructions && project.globalInstructions.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm shrink-0">
                <h3 className="text-sm font-bold text-black mb-3 uppercase tracking-wider flex items-center justify-between">
                  <span>Yêu cầu chung</span>
                  <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full border border-primary-200">{project.globalInstructions.length}</span>
                </h3>
                <ul className="space-y-2 mb-4">
                  {project.globalInstructions.map((inst, idx) => (
                    <li key={idx} className="text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-100 flex justify-between items-start gap-2">
                      <span className="flex-1 italic">"{inst}"</span>
                      <button
                        onClick={() => {
                          const newGlobal = project.globalInstructions!.filter((_, i) => i !== idx);
                          onSaveProject({ ...project, globalInstructions: newGlobal });
                        }}
                        className="text-red-500 hover:text-red-600 p-0.5"
                        title="Xóa yêu cầu này"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] text-gray-400 leading-tight">
                  Các yêu cầu này sẽ tự động được áp dụng khi bạn tạo hoặc chỉnh sửa bất kỳ phân đoạn nào.
                </p>
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex-1 flex flex-col min-h-0 shrink-0">
              <h3 className="text-lg font-bold text-black mb-4 flex items-center gap-2 shrink-0">
                <Edit3 className="w-5 h-5 text-primary-600" />
                Chỉnh sửa kịch bản
              </h3>
              <p className="text-sm text-gray-500 mb-4 shrink-0">
                Nhập yêu cầu chỉnh sửa của bạn. AI sẽ đọc lại toàn bộ kịch bản và viết lại phiên bản mới dựa trên yêu cầu này.
              </p>

              {selectedText && (
                <div className="mb-4 bg-primary-50 border border-primary-200 rounded-xl p-3 relative group shrink-0">
                  <div className="text-xs font-bold text-primary-700 mb-1 uppercase tracking-wider">Đoạn văn bản đã chọn:</div>
                  <div className="text-sm text-gray-700 line-clamp-3 italic">"{selectedText}"</div>
                  <button
                    onClick={() => setSelectedText('')}
                    className="absolute top-2 right-2 p-1 bg-white/60 hover:bg-white text-gray-400 hover:text-black rounded-full transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
                    title="Bỏ chọn"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              
              <div className="relative mb-4">
                 <textarea
                   value={prompt}
                   onChange={(e) => setPrompt(e.target.value)}
                   placeholder="Ví dụ: Thêm một đoạn hội thoại hài hước giữa hai nhân vật..."
                   className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 pb-14 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-y transition-all min-h-[120px]"
                 />
                 
                 <div className="absolute bottom-2 left-2 flex items-center gap-2">
                   {attachedImage && (
                     <div className="relative inline-block mt-1">
                       <img src={attachedImage.previewUrl} alt="Attached" className="h-8 rounded border border-gray-300" />
                       <button type="button" onClick={() => setAttachedImage(null)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-md">
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
                   <button
                     type="button"
                     onClick={() => fileInputRef.current?.click()}
                     className="px-2 py-1 bg-white hover:bg-gray-100 text-gray-600 rounded-md text-xs font-bold flex items-center gap-1 border border-gray-200 transition-colors"
                     title="Đính kèm ảnh"
                   >
                     <ImagePlus className="w-4 h-4" />
                     Ảnh
                   </button>
                 </div>
              </div>
              
              <button
                onClick={() => {
                  handleGenerate(true, undefined, undefined, attachedImage ? { data: attachedImage.data, mimeType: attachedImage.mimeType } : null);
                  setAttachedImage(null);
                }}
                disabled={loading || !prompt.trim()}
                className="w-full py-4 bg-[#ffdd00] hover:bg-[#d4b700] text-black rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-[#ffdd00]/20 shrink-0 border border-[#ffdd00]/30"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Gửi yêu cầu
              </button>
            </div>
          </div>
        )}
      </div>

      {sunoContextText && (
        <SunoPromptModal
          textContext={sunoContextText}
          onClose={() => setSunoContextText(null)}
          onGenerated={(prompts) => {
             const newSuno = { id: Date.now().toString(), text: sunoContextText, prompts };
             handleUpdateSunoStore([newSuno, ...sunoPromptsStore]);
             setShowSunoStore(true);
          }}
        />
      )}

      {videoPromptContextText && (
        <VideoPromptCreationModal
          selectedText={videoPromptContextText}
          onClose={() => setVideoPromptContextText(null)}
          onGenerate={handleGenerateVideoPrompt}
        />
      )}
      
      {/* Stores */}
      {showSunoStore && (
        <SunoPromptStoreModal
           store={sunoPromptsStore}
           onClose={() => setShowSunoStore(false)}
        />
      )}

      {showVideoPromptStore && (
        <VideoPromptStoreModal
           store={videoPromptsStore}
           onClose={() => setShowVideoPromptStore(false)}
        />
      )}

      {showDownloadModal && currentScript && (
        <DownloadDialogueModal
          script={currentScript}
          onClose={() => setShowDownloadModal(false)}
        />
      )}
    </div>
  );
}
