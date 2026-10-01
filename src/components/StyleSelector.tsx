import React, { useState } from 'react';
import { Project } from '../types';
import { Sparkles, Check, Info, RefreshCw, Copy, Edit3, CheckCircle, X } from 'lucide-react';
import { generateGlobalStylePrompt, refineGlobalStylePrompt } from '../services/ai';
import { STYLE_CATEGORIES } from '../constants';

interface StyleSelectorProps {
  project: Project;
  onUpdateProject: (project: Project) => void;
}

export function StyleSelector({ project, onUpdateProject }: StyleSelectorProps) {
  const [selectedStyle, setSelectedStyle] = useState<string | null>(project.globalStyleCategory || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [localPrompts, setLocalPrompts] = useState<{ characterName: string, prompt: string, isConfirmed?: boolean }[]>(
    project.globalStylePrompts || (project.globalStylePrompt ? [{ characterName: 'Chung', prompt: project.globalStylePrompt, isConfirmed: project.isStyleConfirmed }] : [])
  );
  const [isRefining, setIsRefining] = useState<number | null>(null);
  const [refineRequest, setRefineRequest] = useState('');
  const [showRefineModal, setShowRefineModal] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleStyleSelect = (styleId: string) => {
    setSelectedStyle(styleId);
    const styleName = STYLE_CATEGORIES.flatMap(c => c.subcategories).find(s => s.id === styleId)?.name || styleId;
    const generalStylePrompt = `${styleName} style image of [A]. High quality, detailed textures, consistent aesthetic, professional lighting.`;
    
    onUpdateProject({
      ...project,
      globalStyleCategory: styleId,
      globalStylePrompt: generalStylePrompt,
      isStyleConfirmed: false
    });
  };

  const handleGeneratePrompt = async () => {
    if (!selectedStyle) return;
    
    setIsGenerating(true);
    try {
      // Extract the full script text to send to AI
      let fullScript = `Tiêu đề: ${project.title}\nÝ tưởng: ${project.idea}\n\n`;
      project.acts.forEach((act, actIndex) => {
        fullScript += `Hồi ${actIndex + 1}: ${act.title}\n`;
        act.events.forEach(ev => {
          if (ev.scriptVersions && ev.scriptVersions.length > 0 && ev.currentVersionIndex >= 0) {
            const scriptContent = ev.scriptVersions[ev.currentVersionIndex].content;
            scriptContent.forEach(el => {
              fullScript += `${el.text}\n`;
            });
          }
        });
      });

      const styleName = STYLE_CATEGORIES.flatMap(c => c.subcategories).find(s => s.id === selectedStyle)?.name || selectedStyle;
      
      const prompts = await generateGlobalStylePrompt(fullScript, styleName, project.characters);
      setLocalPrompts(prompts);
      
      onUpdateProject({
        ...project,
        globalStylePrompts: prompts,
      });
    } catch (error) {
      console.error('Failed to generate character design prompt:', error);
      alert('Có lỗi xảy ra khi tạo prompt tạo hình nhân vật. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefinePrompt = async () => {
    if (showRefineModal === null || !refineRequest.trim()) return;
    const index = showRefineModal;
    const currentPrompt = localPrompts[index].prompt;
    
    setIsRefining(index);
    try {
      const refinedPrompt = await refineGlobalStylePrompt(currentPrompt, refineRequest);
      const newPrompts = [...localPrompts];
      newPrompts[index] = { ...newPrompts[index], prompt: refinedPrompt, isConfirmed: false };
      
      setLocalPrompts(newPrompts);
      onUpdateProject({
        ...project,
        globalStylePrompts: newPrompts,
        isStyleConfirmed: newPrompts.every(p => p.isConfirmed)
      });
      setShowRefineModal(null);
      setRefineRequest('');
    } catch (error) {
      console.error('Failed to refine style prompt:', error);
      alert('Có lỗi xảy ra khi tinh chỉnh prompt. Vui lòng thử lại.');
    } finally {
      setIsRefining(null);
    }
  };

  const handleCopy = (index: number) => {
    const prompt = localPrompts[index].prompt;
    if (prompt) {
      navigator.clipboard.writeText(prompt);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const handleConfirmStyle = (index: number) => {
    const newPrompts = [...localPrompts];
    newPrompts[index] = { ...newPrompts[index], isConfirmed: true };
    setLocalPrompts(newPrompts);
    onUpdateProject({
      ...project,
      globalStylePrompts: newPrompts,
      isStyleConfirmed: newPrompts.every(p => p.isConfirmed)
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-white custom-scrollbar text-gray-900">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-black mb-2">Chọn Phong Cách Chung</h2>
        <p className="text-gray-500 mb-8">
          Lựa chọn này sẽ được áp dụng làm phong cách mặc định cho tất cả bối cảnh và nhân vật trong dự án.
        </p>

        <div className="space-y-8 mb-8">
          {STYLE_CATEGORIES.map(category => (
            <div key={category.id} className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-black mb-4 pb-2 border-b border-gray-200">
                {category.name}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {category.subcategories.map(sub => (
                  <div
                    key={sub.id}
                    onClick={() => handleStyleSelect(sub.id)}
                    className={`relative p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedStyle === sub.id 
                        ? 'bg-primary-50 border-primary-400 shadow-sm' 
                        : 'bg-white border-gray-200 hover:border-primary-400/50 hover:bg-primary-50/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-bold ${selectedStyle === sub.id ? 'text-primary-700' : 'text-gray-700'}`}>
                        {sub.name}
                      </span>
                      {selectedStyle === sub.id && <Check className="w-5 h-5 text-primary-600" />}
                    </div>
                    
                    <div className="group relative inline-block">
                      <div className="flex items-center text-xs text-gray-400 hover:text-gray-600">
                        <Info className="w-3 h-3 mr-1" />
                        Gợi ý thể loại
                      </div>
                      <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-xl">
                        {sub.tooltip}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center">
          <button
            onClick={handleGeneratePrompt}
            disabled={!selectedStyle || isGenerating}
            className={`flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all ${
              !selectedStyle 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : isGenerating
                  ? 'bg-primary-200 text-primary-700 cursor-wait'
                  : 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-600/20'
            }`}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-6 h-6 animate-spin" />
                Đang phân tích kịch bản & viết prompt...
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6" />
                Viết prompt tạo hình nhân vật
              </>
            )}
          </button>
        </div>

        {localPrompts.length > 0 && (
          <div className="mt-12 space-y-8">
            {localPrompts.map((item, index) => (
              <div key={index} className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-black flex items-center gap-2">
                    <Check className="w-5 h-5 text-primary-600" />
                    Prompt tạo hình: {item.characterName}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(index)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-100 text-gray-600 text-sm font-bold transition-colors border border-gray-200"
                    >
                      {copiedIndex === index ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedIndex === index ? 'Đã copy' : 'Copy'}
                    </button>
                    <button
                      onClick={() => setShowRefineModal(index)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-100 text-gray-600 text-sm font-bold transition-colors border border-gray-200"
                    >
                      <Edit3 className="w-4 h-4" />
                      Tinh chỉnh
                    </button>
                    <button
                      onClick={() => handleConfirmStyle(index)}
                      disabled={item.isConfirmed}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                        item.isConfirmed
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-600/20'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      {item.isConfirmed ? 'Đã chốt prompt' : 'Chốt prompt'}
                    </button>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-gray-200 font-mono text-sm text-gray-700 whitespace-pre-wrap min-h-[200px] max-h-[400px] overflow-y-auto custom-scrollbar">
                  {item.prompt}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Refine Modal */}
        {showRefineModal !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-2xl shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-black flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-primary-600" />
                  Tinh chỉnh Prompt: {localPrompts[showRefineModal]?.characterName}
                </h3>
                <button
                  onClick={() => setShowRefineModal(null)}
                  className="p-2 text-gray-400 hover:text-black rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-gray-500 text-sm mb-4">
                Nhập yêu cầu chỉnh sửa của bạn (ví dụ: "Đổi tông màu sang u tối hơn", "Thêm chi tiết về ánh sáng neon"). AI sẽ chỉ sửa những phần bạn yêu cầu và giữ nguyên các phần khác.
              </p>
              
              <textarea
                value={refineRequest}
                onChange={(e) => setRefineRequest(e.target.value)}
                placeholder="Nhập yêu cầu tinh chỉnh..."
                className="w-full h-32 bg-gray-50 border border-gray-200 rounded-xl p-4 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none mb-6"
              />
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowRefineModal(null)}
                  className="px-4 py-2 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleRefinePrompt}
                  disabled={!refineRequest.trim() || isRefining !== null}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all ${
                    !refineRequest.trim() || isRefining !== null
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-600/20'
                  }`}
                >
                  {isRefining !== null ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Đang tinh chỉnh...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Thực hiện
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
