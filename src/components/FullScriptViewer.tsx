import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Project, ScriptElement, Event } from '../types';
import { ChevronLeft, FileText, Edit3, Download, Menu, List, MapPin, Sparkles, RefreshCw, Users, Palette } from 'lucide-react';
import { SelectionTooltip } from './SelectionTooltip';
import { BilingualText } from './BilingualText';
import { LocationPromptModal } from './LocationPromptModal';
import { CharacterPromptModal, CharacterPromptData } from './CharacterPromptModal';
import { STYLE_CATEGORIES } from '../constants';
import { StyleSelector } from './StyleSelector';
import { useFakeProgress } from '../hooks/useFakeProgress';


interface FullScriptViewerProps {
  project: Project;
  onClose: () => void;
  onEditEvent?: (actId: string, event: Event) => void;
  onUpdateProject?: (project: Project) => void;
}

type RenderItem = {
  id: string;
  type: 'act_heading' | 'event_placeholder' | 'script_element' | 'page_break';
  content: React.ReactNode;
  pageNumber?: number;
  actId?: string;
  eventId?: string;
  elementIndex?: number;
  isSceneHeading?: boolean;
  text?: string;
  hasLocationData?: boolean;
};

export default function FullScriptViewer({ project, onClose, onEditEvent, onUpdateProject }: FullScriptViewerProps) {
  const [activeActId, setActiveActId] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'toc' | 'style' | 'scenes' | 'characters'>('toc');
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeLocationPrompt, setActiveLocationPrompt] = useState<{ locationName: string, text: string, reset?: boolean } | null>(null);
  const [activeCharacterPrompt, setActiveCharacterPrompt] = useState<any | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const downloadingProgress = useFakeProgress(isDownloading, 5000);

  const allCharacters = useMemo(() => {
    const chars = new Map<string, any>();
    
    // Add characters from project creation
    project.characters.forEach(c => {
      chars.set(c.name.toLowerCase(), {
        id: c.id,
        name: c.name,
        relationship: c.relationships || '',
        description: `${c.role}. ${c.personality}. ${c.want}. ${c.need}`,
        isMain: true,
        promptData: project.scriptCharacters?.find(sc => sc.name.toLowerCase() === c.name.toLowerCase())?.promptData
      });
    });

    // Extract characters from script
    project.acts.forEach(act => {
      act.events.forEach(ev => {
        if (ev.scriptVersions && ev.scriptVersions.length > 0 && ev.currentVersionIndex >= 0) {
          const scriptContent = ev.scriptVersions[ev.currentVersionIndex].content;
          scriptContent.forEach(el => {
            if (el.type === 'character') {
              const name = el.text.replace(/\s*\(.*?\)\s*/g, '').trim(); // Remove parentheticals like (V.O.) or (O.S.)
              const lowerName = name.toLowerCase();
              if (!chars.has(lowerName)) {
                chars.set(lowerName, {
                  id: `char-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                  name: name,
                  relationship: 'Nhân vật phụ / Cameo',
                  description: 'Nhân vật xuất hiện trong kịch bản',
                  isMain: false,
                  promptData: project.scriptCharacters?.find(sc => sc.name.toLowerCase() === lowerName)?.promptData
                });
              }
            }
          });
        }
      });
    });

    return Array.from(chars.values());
  }, [project]);

  const uniqueLocations = useMemo(() => {
    const locationsMap = new Map<string, { name: string, scenes: { id: string, text: string, actId: string, eventId: string, elementIndex: number }[], promptData?: any }>();
    
    project.acts.forEach(act => {
      act.events.forEach(ev => {
        if (ev.scriptVersions && ev.scriptVersions.length > 0 && ev.currentVersionIndex >= 0) {
          const scriptContent = ev.scriptVersions[ev.currentVersionIndex].content;
          scriptContent.forEach((el, index) => {
            if (el.type === 'scene_heading') {
              let locName = el.text || '';
              // Remove INT., EXT., INT./EXT., NỘI, NGOẠI
              locName = locName.replace(/^(INT\.\/EXT\.|INT\.|EXT\.|NỘI|NGOẠI)\s+/i, '');
              // Remove time part
              locName = locName.replace(/\s*-\s*(DAY|NIGHT|CONTINUOUS|LATER|MOMENTS LATER|NGÀY|ĐÊM|LIÊN TỤC|SAU ĐÓ).*$/i, '');
              locName = locName.trim();
              
              if (!locationsMap.has(locName)) {
                locationsMap.set(locName, { 
                  name: locName, 
                  scenes: [],
                  promptData: project.locationPrompts?.find(lp => lp.locationName === locName)?.promptData
                });
              }
              locationsMap.get(locName)!.scenes.push({
                id: `scene-${act.id}-${ev.id}-${index}`,
                text: el.text,
                actId: act.id,
                eventId: ev.id,
                elementIndex: index
              });
            }
          });
        }
      });
    });
    
    return Array.from(locationsMap.values());
  }, [project]);

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setIsDownloading(true);
    
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${project.title || 'Kich_ban'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadTXT = (actId?: string) => {
    let content = '';

    if (actId) {
      const act = project.acts.find(a => a.id === actId);
      if (act) {
        content += `${act.title.toUpperCase()}\n\n`;
        act.events.forEach(ev => {
          if (ev.scriptVersions && ev.scriptVersions.length > 0 && ev.currentVersionIndex >= 0) {
            const scriptContent = ev.scriptVersions[ev.currentVersionIndex].content;
            scriptContent.forEach(el => {
              if (el.type === 'scene_heading') content += `\n${el.text.toUpperCase()}\n\n`;
              else if (el.type === 'character') content += `\n          ${el.text.toUpperCase()}\n`;
              else if (el.type === 'parenthetical') content += `          (${el.text.replace(/^\(|\)$/g, '')})\n`;
              else if (el.type === 'dialogue') {
                const parts = el.text.split(' | ');
                content += `          ${parts[0]}\n`;
              }
              else if (el.type === 'transition') content += `\n                                        ${el.text.toUpperCase()}\n`;
              else content += `${el.text}\n\n`;
            });
          }
        });
      }
    } else {
      content += `${project.title.toUpperCase()}\n\n`;
      project.acts.forEach(act => {
        content += `\n${act.title.toUpperCase()}\n\n`;
        act.events.forEach(ev => {
          if (ev.scriptVersions && ev.scriptVersions.length > 0 && ev.currentVersionIndex >= 0) {
            const scriptContent = ev.scriptVersions[ev.currentVersionIndex].content;
            scriptContent.forEach(el => {
              if (el.type === 'scene_heading') content += `\n${el.text.toUpperCase()}\n\n`;
              else if (el.type === 'character') content += `\n          ${el.text.toUpperCase()}\n`;
              else if (el.type === 'parenthetical') content += `          (${el.text.replace(/^\(|\)$/g, '')})\n`;
              else if (el.type === 'dialogue') {
                const parts = el.text.split(' | ');
                content += `          ${parts[0]}\n`;
              }
              else if (el.type === 'transition') content += `\n                                        ${el.text.toUpperCase()}\n`;
              else content += `${el.text}\n\n`;
            });
          }
        });
      });
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = actId 
      ? `${project.title}_${project.acts.find(a => a.id === actId)?.title}.txt`
      : `${project.title}_Full.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderScriptElement = (el: ScriptElement, idx: number, id?: string) => {
    switch (el.type) {
      case 'scene_heading':
        return <div key={idx} id={id} className="uppercase font-bold mt-8 mb-4 text-red-600">{el.text}</div>;
      case 'action':
        return <div key={idx} id={id} className="mb-4 text-gray-900 leading-relaxed">{el.text}</div>;
      case 'character':
        return <div key={idx} id={id} className="uppercase ml-[20%] mt-6 mb-0 text-gray-900 font-bold tracking-wide">{el.text}</div>;
      case 'parenthetical':
        return <div key={idx} id={id} className="ml-[15%] mr-[20%] mb-0 text-gray-700 italic">({el.text.replace(/^\(|\)$/g, '')})</div>;
      case 'dialogue':
        const parts = el.text.split(' | ');
        if (parts.length > 1) {
          return (
            <div key={idx} id={id} className="ml-[10%] mr-[15%] mb-4 text-gray-900 leading-relaxed relative group cursor-help">
              <span>{parts[0]}</span>
              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-900 text-primary-400 text-sm p-3 rounded-lg shadow-xl z-50 whitespace-pre-wrap w-max max-w-md border border-primary-700/50">
                {parts.slice(1).join(' | ')}
              </div>
            </div>
          );
        }
        return <div key={idx} id={id} className="ml-[10%] mr-[15%] mb-4 text-gray-900 leading-relaxed">{el.text}</div>;
      case 'transition':
        return <div key={idx} id={id} className="uppercase text-right mt-6 mb-6 text-gray-900 font-bold">{el.text}</div>;
      default:
        return <div key={idx} id={id} className="mb-2 text-gray-900">{el.text}</div>;
    }
  };

  const items = useMemo(() => {
    const result: RenderItem[] = [];
    let currentDuration = 0;
    let currentPage = 1;

    const checkPageBreak = () => {
      while (currentDuration >= currentPage) {
        currentPage++;
        result.push({
          id: `page-break-${currentPage}`,
          type: 'page_break',
          pageNumber: currentPage,
          content: (
            <div className="flex items-center gap-4 my-12 opacity-50 select-none">
              <div className="flex-1 h-px bg-gray-400"></div>
              <div className="text-gray-500 font-mono text-sm">Trang {currentPage} (~{currentPage} phút)</div>
              <div className="flex-1 h-px bg-gray-400"></div>
            </div>
          )
        });
      }
    };

    project.acts.forEach((act, actIndex) => {
      result.push({
        id: act.id,
        type: 'act_heading',
        actId: act.id,
        content: (
          <div className="text-center mb-12 mt-8" id={act.id}>
            <div className="text-3xl font-bold text-gray-900 uppercase border-b-2 border-gray-300 pb-4 inline-block">
              Hồi {actIndex + 1}: <BilingualText text={act.title} secondaryClassName="text-gray-500" />
            </div>
          </div>
        )
      });

      act.events.forEach((ev) => {
        const hasScript = ev.scriptVersions && ev.scriptVersions.length > 0 && ev.currentVersionIndex >= 0;
        if (!hasScript) {
          result.push({
            id: `placeholder-${ev.id}`,
            type: 'event_placeholder',
            actId: act.id,
            eventId: ev.id,
            content: (
              <div className="bg-gray-100 border border-gray-300 p-6 rounded-xl text-center mb-8">
                <p className="text-gray-500 italic mb-2">[Chưa có kịch bản cho sự kiện này]</p>
                <div className="text-gray-700 text-sm"><BilingualText text={ev.description} secondaryClassName="text-gray-500" /></div>
              </div>
            )
          });
          currentDuration += ev.duration;
          checkPageBreak();
        } else {
          const scriptContent = ev.scriptVersions[ev.currentVersionIndex].content;
          
          let totalLines = 0;
          const elementLines = scriptContent.map(el => {
            let lines = 1;
            switch (el.type) {
              case 'scene_heading': lines = 3; break;
              case 'action': lines = Math.ceil(el.text.length / 60) + 1; break;
              case 'character': lines = 2; break;
              case 'parenthetical': lines = 1; break;
              case 'dialogue': lines = Math.ceil(el.text.length / 35) + 1; break;
              case 'transition': lines = 2; break;
            }
            totalLines += lines;
            return lines;
          });

          scriptContent.forEach((el, idx) => {
            const isSceneHeading = el.type === 'scene_heading';
            const elId = isSceneHeading ? `scene-${act.id}-${ev.id}-${idx}` : `el-${act.id}-${ev.id}-${idx}`;
            
            result.push({
              id: elId,
              type: 'script_element',
              actId: act.id,
              eventId: ev.id,
              elementIndex: idx,
              isSceneHeading,
              text: el.text,
              hasLocationData: !!el.locationData,
              content: renderScriptElement(el, idx, elId)
            });

            const durationFraction = totalLines > 0 ? (elementLines[idx] / totalLines) * ev.duration : 0;
            currentDuration += durationFraction;
            checkPageBreak();
          });
        }
      });
    });

    return result;
  }, [project]);

  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;
      
      const containerTop = contentRef.current.getBoundingClientRect().top;
      const scrollPosition = containerTop + 150; // Offset for header
      
      let currentActId = '';
      for (const act of project.acts) {
        const element = document.getElementById(act.id);
        if (element && element.getBoundingClientRect().top <= scrollPosition) {
          currentActId = act.id;
        }
      }
      
      if (currentActId && currentActId !== activeActId) {
        setActiveActId(currentActId);
      }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll);
      // Trigger once to set initial state
      handleScroll();
    }

    return () => {
      if (contentElement) {
        contentElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, [project.acts, activeActId]);

  const scrollToElement = (id: string) => {
    const element = document.getElementById(id);
    if (element && contentRef.current) {
      const containerTop = contentRef.current.getBoundingClientRect().top;
      const elementTop = element.getBoundingClientRect().top;
      contentRef.current.scrollTo({
        top: contentRef.current.scrollTop + (elementTop - containerTop) - 40,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] relative">
      <SelectionTooltip />
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-primary-600 hover:text-white transition-colors shadow-sm"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-full transition-colors shadow-sm ${isSidebarOpen ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-primary-600 hover:text-white'}`}
            title="Ẩn/Hiện mục lục"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-black flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary-600" />
              Toàn bộ kịch bản: {project.title}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownloadTXT()}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 text-gray-600 font-bold rounded-xl transition-colors border border-gray-200 shadow-sm"
          >
            <Download className="w-5 h-5" />
            Tải TXT
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-primary-600/20 disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            {isDownloading ? `Đang tạo PDF... ${downloadingProgress}%` : 'Tải PDF'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {/* Sidebar TOC */}
        {isSidebarOpen && (
          <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col shrink-0">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setSidebarTab('toc')}
                className={`flex-1 py-3 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors ${sidebarTab === 'toc' ? 'bg-white text-black border-b-2 border-primary-600' : 'text-gray-500 hover:text-black hover:bg-white/50'}`}
              >
                <List className="w-4 h-4" />
                Mục lục
              </button>
              <button
                onClick={() => setSidebarTab('style')}
                className={`flex-1 py-3 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors ${sidebarTab === 'style' ? 'bg-white text-black border-b-2 border-primary-600' : 'text-gray-500 hover:text-black hover:bg-white/50'}`}
              >
                <Palette className="w-4 h-4" />
                Style
              </button>
              <button
                onClick={() => setSidebarTab('scenes')}
                className={`flex-1 py-3 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors ${
                  sidebarTab === 'scenes' ? 'bg-white text-black border-b-2 border-primary-600' : 'text-gray-500 hover:text-black hover:bg-white/50'
                }`}
              >
                <MapPin className="w-4 h-4" />
                Bối cảnh
              </button>
              <button
                onClick={() => setSidebarTab('characters')}
                className={`flex-1 py-3 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors ${
                  sidebarTab === 'characters' ? 'bg-white text-black border-b-2 border-primary-600' : 'text-gray-500 hover:text-black hover:bg-white/50'
                }`}
              >
                <Users className="w-4 h-4" />
                Nhân vật
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1 custom-scrollbar">
              {sidebarTab === 'toc' ? (
                project.acts.map((act, index) => (
                  <div key={act.id} className="mb-4">
                    <div className="flex items-center justify-between group">
                      <div
                        onClick={() => scrollToElement(act.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            scrollToElement(act.id);
                          }
                        }}
                        className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                          activeActId === act.id
                            ? 'bg-primary-600 text-white font-bold shadow-md'
                            : 'text-gray-600 hover:bg-white hover:text-black'
                        }`}
                      >
                        <div className="font-bold mb-1">Hồi {index + 1}</div>
                        <div className="text-xs opacity-80 break-words"><BilingualText text={act.title} /></div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadTXT(act.id);
                        }}
                        className="p-2 text-gray-400 hover:text-black opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Tải TXT hồi này"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="mt-2 ml-4 flex flex-col gap-2 border-l border-gray-200 pl-3">
                      {act.events.map((ev, j) => (
                        <div key={ev.id} className="group flex items-start justify-between gap-2">
                          <div
                            onClick={() => scrollToElement(ev.scriptVersions?.length ? `el-${act.id}-${ev.id}-0` : `placeholder-${ev.id}`)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                scrollToElement(ev.scriptVersions?.length ? `el-${act.id}-${ev.id}-0` : `placeholder-${ev.id}`);
                              }
                            }}
                            className="text-left py-1 rounded text-xs text-gray-500 hover:text-black transition-colors break-words flex-1 cursor-pointer"
                          >
                            <BilingualText text={ev.description} prefix={<span className="font-bold mr-1">{j + 1}.</span>} />
                          </div>
                          {onEditEvent && ev.scriptVersions?.length > 0 && (
                            <button
                              onClick={() => onEditEvent(act.id, ev)}
                              className="p-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-black hover:bg-white rounded transition-all shrink-0 mt-0.5 border border-transparent hover:border-gray-200"
                              title="Chỉnh sửa sự kiện này"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : sidebarTab === 'scenes' ? (
                <div className="flex flex-col gap-3">
                  {uniqueLocations.map((location) => (
                    <div key={location.name} className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-black text-sm">{location.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{location.scenes.length} phân cảnh</div>
                        </div>
                        <div className="flex items-center">
                          {location.promptData && (
                            <button
                              onClick={() => setActiveLocationPrompt({ locationName: location.name, text: location.name, reset: true })}
                              className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-50 rounded transition-all shrink-0 ml-1 border border-transparent hover:border-gray-200"
                              title="Tạo lại Bối Cảnh (Reset)"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setActiveLocationPrompt({ locationName: location.name, text: location.name })}
                            className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-50 rounded transition-all shrink-0 ml-1 border border-transparent hover:border-gray-200"
                            title={location.promptData ? "Xem Bối Cảnh" : "Tạo Prompt Bối Cảnh"}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Xuất hiện tại:</div>
                        <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                          {location.scenes.map(scene => (
                            <div
                              key={scene.id}
                              onClick={() => scrollToElement(scene.id)}
                              className="text-left px-1.5 py-1 rounded text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors break-words font-mono cursor-pointer"
                            >
                              {scene.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {allCharacters.map((char) => (
                    <div key={char.id} className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-black text-sm">{char.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{char.relationship}</div>
                        </div>
                        <div className="flex items-center">
                          {char.promptData && (
                            <button
                              onClick={() => setActiveCharacterPrompt({ character: char, reset: true })}
                              className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-50 rounded transition-all shrink-0 ml-1 border border-transparent hover:border-gray-200"
                              title="Tạo lại Nhân vật (Reset)"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setActiveCharacterPrompt({ character: char })}
                            className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-50 rounded transition-all shrink-0 ml-1 border border-transparent hover:border-gray-200"
                            title={char.promptData ? "Xem Nhân vật" : "Tạo Prompt Nhân vật"}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        {sidebarTab === 'style' ? (
          <StyleSelector project={project} onUpdateProject={onUpdateProject} />
        ) : (
          <div 
            ref={contentRef}
            className="flex-1 overflow-y-auto p-8 md:p-12 bg-gray-100 relative custom-scrollbar"
          >
            <div ref={printRef} className="max-w-3xl mx-auto font-mono text-lg bg-[#fdfdfd] text-gray-900 p-12 min-h-[800px] shadow-2xl rounded-sm leading-tight" style={{ fontFamily: '"Courier Prime", "Courier New", Courier, monospace' }}>
              {/* Title Page */}
              <div className="min-h-[60vh] flex flex-col items-center justify-center text-center mb-24 border-b border-gray-300 pb-24">
                <h1 className="text-5xl font-bold text-gray-900 mb-8 uppercase tracking-widest">{project.title}</h1>
                <div className="text-gray-600 mb-12">
                  <p>Kịch bản được tạo bởi AI Studio</p>
                  <p>Thời lượng dự kiến: {project.duration} phút</p>
                </div>
              </div>

              {/* Script Content */}
              <div className="script-content">
                {items.map((item) => (
                  <React.Fragment key={item.id}>
                    {item.content}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {activeLocationPrompt && (() => {
        const initialData = activeLocationPrompt.reset ? undefined : project.locationPrompts?.find(lp => lp.locationName === activeLocationPrompt.locationName)?.promptData;
        
        // Ensure we have a style prompt, fallback to category name if needed
        let stylePrompt = project.globalStylePrompt;
        if (!stylePrompt && project.globalStyleCategory) {
          const styleName = STYLE_CATEGORIES.flatMap(c => c.subcategories).find(s => s.id === project.globalStyleCategory)?.name || project.globalStyleCategory;
          stylePrompt = `${styleName} style image of [A]. High quality, detailed textures, consistent aesthetic, professional lighting.`;
        }

        return (
          <LocationPromptModal
            sceneText={activeLocationPrompt.text}
            scriptContext={project.acts.map(act => act.events.map(ev => ev.description).join('\n')).join('\n')}
            globalStylePrompt={stylePrompt}
            onClose={() => setActiveLocationPrompt(null)}
            initialData={initialData}
            onSave={(locationData) => {
              if (!onUpdateProject) return;
              
              // Create a deep copy of the project to ensure React detects the change
              const newProject = JSON.parse(JSON.stringify(project)) as Project;
              if (!newProject.locationPrompts) {
                newProject.locationPrompts = [];
              }
              
              const existingIndex = newProject.locationPrompts.findIndex(lp => lp.locationName === activeLocationPrompt.locationName);
              if (existingIndex >= 0) {
                newProject.locationPrompts[existingIndex].promptData = locationData;
              } else {
                newProject.locationPrompts.push({
                  locationName: activeLocationPrompt.locationName,
                  promptData: locationData
                });
              }
              
              onUpdateProject(newProject);
            }}
          />
        );
      })()}

      {activeCharacterPrompt && (() => {
        let charStylePrompt = project.globalStylePrompts?.find(p => p.characterName.toLowerCase() === activeCharacterPrompt.character.name.toLowerCase())?.prompt || project.globalStylePrompt;
        
        // Ensure we have a style prompt, fallback to category name if needed
        if (!charStylePrompt && project.globalStyleCategory) {
          const styleName = STYLE_CATEGORIES.flatMap(c => c.subcategories).find(s => s.id === project.globalStyleCategory)?.name || project.globalStyleCategory;
          charStylePrompt = `${styleName} style image of [A]. High quality, detailed textures, consistent aesthetic, professional lighting.`;
        }
        
        return (
          <CharacterPromptModal
            character={activeCharacterPrompt.character}
            scriptContext={project.acts.map(act => act.events.map(ev => ev.description).join('\n')).join('\n')}
            globalStylePrompt={charStylePrompt}
            onClose={() => setActiveCharacterPrompt(null)}
            initialData={activeCharacterPrompt.reset ? undefined : activeCharacterPrompt.character.promptData}
            onSave={(promptData) => {
              if (!onUpdateProject) return;
              
              const newProject = JSON.parse(JSON.stringify(project)) as Project;
              
              // Initialize scriptCharacters array if it doesn't exist
              if (!newProject.scriptCharacters) {
                newProject.scriptCharacters = [];
              }
              
              const charNameLower = activeCharacterPrompt.character.name.toLowerCase();
              const existingCharIndex = newProject.scriptCharacters.findIndex(
                sc => sc.name.toLowerCase() === charNameLower
              );
              
              if (existingCharIndex >= 0) {
                newProject.scriptCharacters[existingCharIndex].promptData = promptData;
              } else {
                newProject.scriptCharacters.push({
                  ...activeCharacterPrompt.character,
                  promptData
                });
              }
              
              onUpdateProject(newProject);
            }}
          />
        );
      })()}
    </div>
  );
}
