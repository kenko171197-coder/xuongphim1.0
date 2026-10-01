import React, { useState, useEffect, useRef } from 'react';
import { X, Copy, Image as ImageIcon, Loader2, Check, Sparkles, ChevronDown, ChevronUp, RefreshCw, Upload, Download, Settings } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { formatApiError } from '../utils/error';
import { useFakeProgress } from '../hooks/useFakeProgress';
import { ScriptCharacter } from '../types';

export interface CharacterPromptData {
  prompts: CharacterPrompt[];
  generatedImages: Record<number, string>;
  imageSources?: Record<number, 'ai' | 'upload'>;
  promptHistory?: string[];
  selectedPromptIndex?: number; // The "chốt" character
}

interface CharacterPromptModalProps {
  character: ScriptCharacter;
  scriptContext: string;
  globalStylePrompt?: string;
  onClose: () => void;
  initialData?: CharacterPromptData;
  onSave?: (data: CharacterPromptData) => void;
}

interface PromptDetails {
  subject: string;
  clothing: string;
  poseExpression: string;
  lighting: string;
  atmosphere: string;
  colors: string;
  cameraAngle: string;
  environment: string;
}

interface CharacterPrompt {
  nameEn: string;
  nameVi: string;
  detailsEn: PromptDetails;
  detailsVi: PromptDetails;
  rawPrompt: string;
  rawPromptVi: string;
}

export function CharacterPromptModal({ character, scriptContext, globalStylePrompt, onClose, initialData, onSave }: CharacterPromptModalProps) {
  const [isLoading, setIsLoading] = useState(!initialData);
  const [prompts, setPrompts] = useState<CharacterPrompt[]>(initialData?.prompts || []);
  const [drawingPromptIndex, setDrawingPromptIndex] = useState<number | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Record<number, string>>(initialData?.generatedImages || {});
  const [imageSources, setImageSources] = useState<Record<number, 'ai' | 'upload'>>(initialData?.imageSources || {});
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedPromptIndex, setExpandedPromptIndex] = useState<number | null>(null);
  const [viewingImageIndex, setViewingImageIndex] = useState<number | null>(null);
  const [promptHistory, setPromptHistory] = useState<string[]>(initialData?.promptHistory || []);
  const [resettingPromptIndex, setResettingPromptIndex] = useState<number | null>(null);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState<number | undefined>(initialData?.selectedPromptIndex);

  const loadingProgress = useFakeProgress(isLoading, 135000);
  const drawingProgress = useFakeProgress(drawingPromptIndex !== null, 25000);

  const onSaveRef = useRef(onSave);
  const promptRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    if (prompts.length > 0 && onSaveRef.current) {
      onSaveRef.current({ prompts, generatedImages, imageSources, promptHistory, selectedPromptIndex });
    }
  }, [prompts, generatedImages, imageSources, promptHistory, selectedPromptIndex]);

  useEffect(() => {
    if (!initialData) {
      generatePrompts();
    }
  }, []);

  const generatePrompts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const cleanStylePrompt = globalStylePrompt?.replace(' of [A]', '').replace(' [A]', '').replace('[A]', '') || 'Không có phong cách cụ thể';

      const promptText = `
        Bạn là một chuyên gia thiết kế nhân vật (Character Designer) và kỹ sư prompt AI.
        Dựa vào thông tin nhân vật:
        Tên: "${character.name}"
        Mô tả/Vai trò: "${character.description}"
        Mối quan hệ: "${character.relationship}"
        
        Và nội dung kịch bản liên quan:
        """
        ${scriptContext}
        """
        
        Phong cách chung của dự án (Global Style):
        """
        ${cleanStylePrompt}
        """

        LƯU Ý QUAN TRỌNG: Mục đích của prompt này là để tạo ra các bức ảnh THIẾT KẾ NHÂN VẬT (Character Concept Art) làm tài liệu tham khảo. 
        BẮT BUỘC: Nền trắng (White background).
        BẮT BUỘC: Nhân vật luôn đứng thẳng, mặt nghiêm túc, không biểu cảm (standing straight, serious expression, no expression).
        BẮT BUỘC: 6 góc độ bao gồm: front view medium shot, side view, top view, extreme close the eyes, backview, full view front view.
        Trong prompt tạo ảnh (rawPrompt), BẮT BUỘC phải áp dụng phong cách chung (Global Style) đã được cung cấp ở trên để đảm bảo tính nhất quán của toàn bộ dự án.

        Hãy viết ra 5 lựa chọn prompt mô tả chi tiết ngoại hình nhân vật này. Mỗi lựa chọn cần có tên song ngữ, chi tiết 8 mục (Chủ thể, Trang phục, Dáng điệu/Biểu cảm, Ánh sáng, Không khí, Màu sắc, Góc máy (BẮT BUỘC 6 góc đã nêu), Môi trường (BẮT BUỘC nền trắng)) bằng cả tiếng Anh và tiếng Việt, và một đoạn rawPrompt bằng tiếng Anh hoàn chỉnh để đưa vào AI vẽ ảnh, CÙNG VỚI bản dịch rawPromptVi sang tiếng Việt.
        
        CRITICAL: 
        - Trong rawPrompt phải nhấn mạnh "white background, character design sheet, standing straight, serious expression, no expression". 
        - Đặc biệt yêu cầu 6 góc máy cụ thể cho 6 tấm ảnh: "1. front view medium shot, 2. side view, 3. top view, 4. extreme close up of the eyes, 5. backview, 6. full view front view".
        - BẮT BUỘC phải kết hợp phong cách chung (Global Style) vào phần mô tả của rawPrompt.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: promptText,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            required: ["prompts"],
            properties: {
              prompts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: ["nameEn", "nameVi", "detailsEn", "detailsVi", "rawPrompt", "rawPromptVi"],
                  properties: {
                    nameEn: { type: Type.STRING },
                    nameVi: { type: Type.STRING },
                    detailsEn: {
                      type: Type.OBJECT,
                      required: ["subject", "clothing", "poseExpression", "lighting", "atmosphere", "colors", "cameraAngle", "environment"],
                      properties: {
                        subject: { type: Type.STRING, description: "Subject/Focus" },
                        clothing: { type: Type.STRING, description: "Clothing/Costume" },
                        poseExpression: { type: Type.STRING, description: "Pose/Expression" },
                        lighting: { type: Type.STRING, description: "Lighting" },
                        atmosphere: { type: Type.STRING, description: "Atmosphere/Mood" },
                        colors: { type: Type.STRING, description: "Color palette" },
                        cameraAngle: { type: Type.STRING, description: "Camera angle/Shot type" },
                        environment: { type: Type.STRING, description: "Environment/Background" }
                      }
                    },
                    detailsVi: {
                      type: Type.OBJECT,
                      required: ["subject", "clothing", "poseExpression", "lighting", "atmosphere", "colors", "cameraAngle", "environment"],
                      properties: {
                        subject: { type: Type.STRING, description: "Chủ thể/Trọng tâm" },
                        clothing: { type: Type.STRING, description: "Trang phục" },
                        poseExpression: { type: Type.STRING, description: "Dáng điệu/Biểu cảm" },
                        lighting: { type: Type.STRING, description: "Ánh sáng" },
                        atmosphere: { type: Type.STRING, description: "Không khí/Cảm xúc" },
                        colors: { type: Type.STRING, description: "Màu sắc" },
                        cameraAngle: { type: Type.STRING, description: "Góc máy" },
                        environment: { type: Type.STRING, description: "Môi trường/Nền" }
                      }
                    },
                    rawPrompt: { type: Type.STRING, description: "Đoạn prompt tiếng Anh hoàn chỉnh gộp các chi tiết trên" },
                    rawPromptVi: { type: Type.STRING, description: "Bản dịch tiếng Việt của rawPrompt" }
                  }
                }
              }
            }
          }
        }
      });

      let jsonStr = response.text || '';
      if (!jsonStr) {
        throw new Error("Không nhận được phản hồi từ AI (có thể do vi phạm chính sách an toàn).");
      }
      
      jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      
      const data = JSON.parse(jsonStr);
      if (data.prompts) {
        setPrompts(data.prompts);
        setPromptHistory(prev => [...new Set([...prev, ...data.prompts.map((p: any) => p.nameEn)])]);
      } else {
        throw new Error("Dữ liệu trả về không hợp lệ: Thiếu prompts");
      }
    } catch (err: any) {
      console.error("Generate Prompts Error:", err);
      setError(formatApiError(err) || "Có lỗi xảy ra khi tạo prompt");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (prompt: CharacterPrompt, index: number) => {
    const characterDetails = `Subject: ${prompt.detailsEn.subject}, Clothing: ${prompt.detailsEn.clothing}, Pose/Expression: ${prompt.detailsEn.poseExpression}, Lighting: ${prompt.detailsEn.lighting}, Atmosphere: ${prompt.detailsEn.atmosphere}, Colors: ${prompt.detailsEn.colors}, Camera Angle: ${prompt.detailsEn.cameraAngle}, Environment: ${prompt.detailsEn.environment}. Raw Prompt: ${prompt.rawPrompt}`;

    let imagePrompt = `A 2x3 grid showing 6 different camera angles of the EXACT SAME CHARACTER. WHITE BACKGROUND ONLY. Character design sheet.
    Character details: ${characterDetails}. 
    The image MUST be a grid of 6 panels (2 rows, 3 columns). 
    Each panel MUST show one of these 6 specific angles in order: 
    1. front view medium shot, 
    2. side view, 
    3. top view, 
    4. extreme close up of the eyes, 
    5. backview, 
    6. full view front view. 
    Showcase the character's design from these 6 perspectives on a pure white background.`;

    let textToCopy = imagePrompt;
    if (globalStylePrompt) {
      textToCopy = globalStylePrompt.replace('[A]', imagePrompt);
    }

    navigator.clipboard.writeText(textToCopy);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleExpandPrompt = (idx: number) => {
    if (expandedPromptIndex === idx) {
      setExpandedPromptIndex(null);
    } else {
      setExpandedPromptIndex(idx);
      setTimeout(() => {
        const el = promptRefs.current[idx];
        const container = scrollContainerRef.current;
        if (el && container) {
          const containerTop = container.getBoundingClientRect().top;
          const elTop = el.getBoundingClientRect().top;
          const scrollTop = container.scrollTop + (elTop - containerTop) - 20; // 20px padding
          container.scrollTo({ top: scrollTop, behavior: 'smooth' });
        }
      }, 100);
    }
  };

  const handleDraw = async (promptIndex: number) => {
    setViewingImageIndex(promptIndex);
    if (generatedImages[promptIndex] && imageSources[promptIndex] === 'ai') return;

    setDrawingPromptIndex(promptIndex);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const promptData = prompts[promptIndex];

      const characterDetails = `Subject: ${promptData.detailsEn.subject}, Clothing: ${promptData.detailsEn.clothing}, Pose/Expression: ${promptData.detailsEn.poseExpression}, Lighting: ${promptData.detailsEn.lighting}, Atmosphere: ${promptData.detailsEn.atmosphere}, Colors: ${promptData.detailsEn.colors}, Camera Angle: ${promptData.detailsEn.cameraAngle}, Environment: ${promptData.detailsEn.environment}. Raw Prompt: ${promptData.rawPrompt}`;

      let imagePrompt = `A 2x3 grid showing 6 different camera angles of the EXACT SAME CHARACTER. WHITE BACKGROUND ONLY. Character design sheet.
      Character details: ${characterDetails}. 
      The image MUST be a grid of 6 panels (2 rows, 3 columns). 
      Each panel MUST show one of these 6 specific angles in order: 
      1. front view medium shot, 
      2. side view, 
      3. top view, 
      4. extreme close up of the eyes, 
      5. backview, 
      6. full view front view. 
      Showcase the character's design from these 6 perspectives on a pure white background.`;

      if (globalStylePrompt) {
        imagePrompt = globalStylePrompt.replace('[A]', imagePrompt);
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: imagePrompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: "1K"
          }
        }
      });

      let imageUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        setGeneratedImages(prev => ({ ...prev, [promptIndex]: imageUrl }));
        setImageSources(prev => ({ ...prev, [promptIndex]: 'ai' }));
      } else {
        throw new Error("Không nhận được ảnh từ AI");
      }
    } catch (err: any) {
      console.error(err);
      alert("Lỗi khi vẽ ảnh: " + formatApiError(err));
    } finally {
      setDrawingPromptIndex(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, promptIndex: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setGeneratedImages(prev => ({ ...prev, [promptIndex]: base64String }));
        setImageSources(prev => ({ ...prev, [promptIndex]: 'upload' }));
        setViewingImageIndex(promptIndex);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadImage = (promptIndex: number) => {
    const imageUrl = generatedImages[promptIndex];
    if (!imageUrl) return;
    
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `character_${character.name.replace(/\s+/g, '_')}_prompt_${promptIndex + 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePromptChange = (index: number, field: 'rawPrompt' | 'rawPromptVi', value: string) => {
    setPrompts(prev => {
      const newPrompts = [...prev];
      newPrompts[index] = { ...newPrompts[index], [field]: value };
      return newPrompts;
    });
  };

  const resetPrompt = async (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setResettingPromptIndex(index);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const cleanStylePrompt = globalStylePrompt?.replace(' of [A]', '').replace(' [A]', '').replace('[A]', '') || 'Không có phong cách cụ thể';

      const promptText = `
        Bạn là một chuyên gia thiết kế nhân vật (Character Designer) và kỹ sư prompt AI.
        Dựa vào thông tin nhân vật: "${character.name}" - "${character.description}"
        Và nội dung kịch bản liên quan:
        """
        ${scriptContext}
        """
        
        Phong cách chung của dự án (Global Style):
        """
        ${cleanStylePrompt}
        """

        Các lựa chọn nhân vật hiện tại: ${prompts.map(p => p.nameEn).join(', ')}
        Các lựa chọn nhân vật đã từng tạo (lịch sử): ${promptHistory.join(', ')}

        Hãy viết ra 1 lựa chọn prompt MỚI, KHÁC BIỆT hoàn toàn với các lựa chọn hiện tại và lịch sử ở trên, mô tả chi tiết ngoại hình nhân vật này. 
        Lựa chọn cần có tên song ngữ, chi tiết 8 mục (Chủ thể, Trang phục, Dáng điệu/Biểu cảm, Ánh sáng, Không khí, Màu sắc, Góc máy (BẮT BUỘC 6 góc: front view medium shot, side view, top view, extreme close the eyes, backview, full view front view), Môi trường (BẮT BUỘC nền trắng)) bằng cả tiếng Anh và tiếng Việt, và một đoạn rawPrompt bằng tiếng Anh hoàn chỉnh để đưa vào AI vẽ ảnh, CÙNG VỚI bản dịch rawPromptVi sang tiếng Việt.
        
        CRITICAL: 
        - Trong rawPrompt phải nhấn mạnh "white background, character design sheet, standing straight, serious expression, no expression".
        - Đặc biệt yêu cầu 6 góc máy cụ thể cho 6 tấm ảnh.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: promptText,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            required: ["nameEn", "nameVi", "detailsEn", "detailsVi", "rawPrompt", "rawPromptVi"],
            properties: {
              nameEn: { type: Type.STRING },
              nameVi: { type: Type.STRING },
              detailsEn: {
                type: Type.OBJECT,
                required: ["subject", "clothing", "poseExpression", "lighting", "atmosphere", "colors", "cameraAngle", "environment"],
                properties: {
                  subject: { type: Type.STRING, description: "Subject/Focus" },
                  clothing: { type: Type.STRING, description: "Clothing/Costume" },
                  poseExpression: { type: Type.STRING, description: "Pose/Expression" },
                  lighting: { type: Type.STRING, description: "Lighting" },
                  atmosphere: { type: Type.STRING, description: "Atmosphere/Mood" },
                  colors: { type: Type.STRING, description: "Color palette" },
                  cameraAngle: { type: Type.STRING, description: "Camera angle/Shot type" },
                  environment: { type: Type.STRING, description: "Environment/Background" }
                }
              },
              detailsVi: {
                type: Type.OBJECT,
                required: ["subject", "clothing", "poseExpression", "lighting", "atmosphere", "colors", "cameraAngle", "environment"],
                properties: {
                  subject: { type: Type.STRING, description: "Chủ thể/Trọng tâm" },
                  clothing: { type: Type.STRING, description: "Trang phục" },
                  poseExpression: { type: Type.STRING, description: "Dáng điệu/Biểu cảm" },
                  lighting: { type: Type.STRING, description: "Ánh sáng" },
                  atmosphere: { type: Type.STRING, description: "Không khí/Cảm xúc" },
                  colors: { type: Type.STRING, description: "Màu sắc" },
                  cameraAngle: { type: Type.STRING, description: "Góc máy" },
                  environment: { type: Type.STRING, description: "Môi trường/Nền" }
                }
              },
              rawPrompt: { type: Type.STRING, description: "Đoạn prompt tiếng Anh hoàn chỉnh gộp các chi tiết trên" },
              rawPromptVi: { type: Type.STRING, description: "Bản dịch tiếng Việt của rawPrompt" }
            }
          }
        }
      });

      let jsonStr = response.text || '';
      jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      const newPrompt = JSON.parse(jsonStr);

      setPrompts(prev => {
        const newPrompts = [...prev];
        newPrompts[index] = newPrompt;
        return newPrompts;
      });
      setPromptHistory(prev => [...new Set([...prev, newPrompt.nameEn])]);
      
      setGeneratedImages(prev => {
        const newImages = { ...prev };
        delete newImages[index];
        return newImages;
      });
    } catch (err: any) {
      console.error("Reset Prompt Error:", err);
      alert("Lỗi khi tạo lại nhân vật: " + formatApiError(err));
    } finally {
      setResettingPromptIndex(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-bold text-black flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-600" />
            Thiết kế Nhân vật: {character.name}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-primary-700 gap-4">
              <Loader2 className="w-12 h-12 animate-spin" />
              <p className="font-medium animate-pulse">Đang phân tích và sáng tạo nhân vật... {loadingProgress}%</p>
            </div>
          ) : error ? (
            <div className="text-red-600 bg-red-50 p-6 rounded-xl border border-red-100 text-center">
              <p className="font-medium mb-4">{error}</p>
              <button onClick={generatePrompts} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-bold shadow-lg shadow-red-600/20">
                Thử lại
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Prompts Section */}
              <section>
                <h3 className="text-lg font-bold text-black mb-4 flex items-center gap-2">
                  <span className="bg-primary-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  Các lựa chọn Nhân vật
                </h3>
                <div className="space-y-4">
                  {prompts.map((prompt, idx) => (
                    <div 
                      key={idx} 
                      ref={(el) => { promptRefs.current[idx] = el; }}
                      className={`bg-white border ${selectedPromptIndex === idx ? 'border-primary-400 ring-2 ring-primary-400/20 shadow-lg' : 'border-gray-200'} rounded-xl overflow-hidden transition-all hover:border-primary-400/50`}
                    >
                      <div 
                        onClick={() => handleExpandPrompt(idx)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleExpandPrompt(idx);
                          }
                        }}
                        className="w-full p-4 border-b border-gray-100 bg-gray-50/50 hover:bg-primary-50/50 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <h4 className="font-bold text-black text-lg flex items-center gap-2">
                            Lựa chọn {idx + 1}: {prompt.nameVi} <span className="text-sm font-normal text-gray-500">| {prompt.nameEn}</span>
                          </h4>
                          {selectedPromptIndex === idx && (
                            <span className="bg-primary-600 text-white text-xs px-2 py-1 rounded border border-primary-700/50 flex items-center gap-1 font-bold">
                              <Check className="w-3 h-3" /> Đã chốt
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => resetPrompt(idx, e)}
                            disabled={resettingPromptIndex !== null}
                            className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-md transition-colors"
                            title="Tạo lại nhân vật khác"
                          >
                            {resettingPromptIndex === idx ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          </button>
                          {expandedPromptIndex === idx ? <ChevronUp className="w-5 h-5 text-primary-600" /> : <ChevronDown className="w-5 h-5 text-primary-600" />}
                        </div>
                      </div>
                      
                      {expandedPromptIndex === idx && (
                        <div className="p-4 flex flex-col gap-6 bg-white">
                          <div className="flex items-center justify-between gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPromptIndex(idx);
                              }}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${selectedPromptIndex === idx ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                              <Check className="w-4 h-4" />
                              {selectedPromptIndex === idx ? 'Đang chọn' : 'Chốt nhân vật này'}
                            </button>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleCopy(prompt, idx)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors font-medium"
                              >
                                {copiedIndex === idx ? <Check className="w-4 h-4 text-primary-600" /> : <Copy className="w-4 h-4" />}
                                {copiedIndex === idx ? 'Đã copy' : 'Copy Prompt'}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              <h5 className="font-bold text-gray-900 border-b border-gray-100 pb-2">English Details</h5>
                              <h5 className="font-bold text-gray-900 border-b border-gray-100 pb-2 hidden lg:block">Chi tiết Tiếng Việt</h5>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                              {/* Subject */}
                              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col h-full">
                                <span className="text-primary-700 font-bold text-xs mb-2 uppercase tracking-wider bg-primary-100 px-2 py-1 rounded w-fit">Subject</span>
                                <span className="text-gray-800 font-serif leading-relaxed">{prompt.detailsEn.subject}</span>
                              </div>
                              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col h-full">
                                <span className="text-primary-700 font-bold text-xs mb-2 uppercase tracking-wider bg-primary-100 px-2 py-1 rounded w-fit">Chủ thể</span>
                                <span className="text-gray-800 font-sans leading-relaxed">{prompt.detailsVi.subject}</span>
                              </div>

                              {/* Clothing */}
                              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col h-full">
                                <span className="text-primary-700 font-bold text-xs mb-2 uppercase tracking-wider bg-primary-100 px-2 py-1 rounded w-fit">Clothing</span>
                                <span className="text-gray-800 font-serif leading-relaxed">{prompt.detailsEn.clothing}</span>
                              </div>
                              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col h-full">
                                <span className="text-primary-700 font-bold text-xs mb-2 uppercase tracking-wider bg-primary-100 px-2 py-1 rounded w-fit">Trang phục</span>
                                <span className="text-gray-800 font-sans leading-relaxed">{prompt.detailsVi.clothing}</span>
                              </div>

                              {/* Pose/Expression */}
                              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col h-full">
                                <span className="text-primary-700 font-bold text-xs mb-2 uppercase tracking-wider bg-primary-100 px-2 py-1 rounded w-fit">Pose/Expression</span>
                                <span className="text-gray-800 font-serif leading-relaxed">{prompt.detailsEn.poseExpression}</span>
                              </div>
                              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col h-full">
                                <span className="text-primary-700 font-bold text-xs mb-2 uppercase tracking-wider bg-primary-100 px-2 py-1 rounded w-fit">Dáng điệu/Biểu cảm</span>
                                <span className="text-gray-800 font-sans leading-relaxed">{prompt.detailsVi.poseExpression}</span>
                              </div>

                              {/* Lighting */}
                              <div className="bg-gray-50 p-3 rounded-lg border border-primary-100 flex flex-col h-full">
                                <span className="text-primary-700 font-bold text-xs mb-2 uppercase tracking-wider bg-primary-100 px-2 py-1 rounded w-fit">Lighting</span>
                                <span className="text-gray-800 font-serif leading-relaxed">{prompt.detailsEn.lighting}</span>
                              </div>
                              <div className="bg-gray-50 p-3 rounded-lg border border-primary-100 flex flex-col h-full">
                                <span className="text-primary-700 font-bold text-xs mb-2 uppercase tracking-wider bg-primary-100 px-2 py-1 rounded w-fit">Ánh sáng</span>
                                <span className="text-gray-800 font-sans leading-relaxed">{prompt.detailsVi.lighting}</span>
                              </div>

                              {/* Atmosphere */}
                              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col h-full">
                                <span className="text-primary-700 font-bold text-xs mb-2 uppercase tracking-wider bg-primary-100 px-2 py-1 rounded w-fit">Atmosphere</span>
                                <span className="text-gray-800 font-serif leading-relaxed">{prompt.detailsEn.atmosphere}</span>
                              </div>
                              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col h-full">
                                <span className="text-primary-700 font-bold text-xs mb-2 uppercase tracking-wider bg-primary-100 px-2 py-1 rounded w-fit">Không khí</span>
                                <span className="text-gray-800 font-sans leading-relaxed">{prompt.detailsVi.atmosphere}</span>
                              </div>

                              {/* Colors */}
                              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col h-full">
                                <span className="text-primary-700 font-bold text-xs mb-2 uppercase tracking-wider bg-primary-100 px-2 py-1 rounded w-fit">Colors</span>
                                <span className="text-gray-800 font-serif leading-relaxed">{prompt.detailsEn.colors}</span>
                              </div>
                              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col h-full">
                                <span className="text-primary-700 font-bold text-xs mb-2 uppercase tracking-wider bg-primary-100 px-2 py-1 rounded w-fit">Màu sắc</span>
                                <span className="text-gray-800 font-sans leading-relaxed">{prompt.detailsVi.colors}</span>
                              </div>

                              {/* Camera Angle */}
                              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col h-full">
                                <span className="text-primary-700 font-bold text-xs mb-2 uppercase tracking-wider bg-primary-100 px-2 py-1 rounded w-fit">Camera Angle</span>
                                <span className="text-gray-800 font-serif leading-relaxed">{prompt.detailsEn.cameraAngle}</span>
                              </div>
                              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col h-full">
                                <span className="text-primary-700 font-bold text-xs mb-2 uppercase tracking-wider bg-primary-100 px-2 py-1 rounded w-fit">Góc máy</span>
                                <span className="text-gray-800 font-sans leading-relaxed">{prompt.detailsVi.cameraAngle}</span>
                              </div>

                              {/* Environment */}
                              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col h-full">
                                <span className="text-primary-700 font-bold text-xs mb-2 uppercase tracking-wider bg-primary-100 px-2 py-1 rounded w-fit">Environment</span>
                                <span className="text-gray-800 font-serif leading-relaxed">{prompt.detailsEn.environment}</span>
                              </div>
                              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col h-full">
                                <span className="text-primary-700 font-bold text-xs mb-2 uppercase tracking-wider bg-primary-100 px-2 py-1 rounded w-fit">Môi trường</span>
                                <span className="text-gray-800 font-sans leading-relaxed">{prompt.detailsVi.environment}</span>
                              </div>

                              {/* Raw Prompt */}
                              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col h-full col-span-1">
                                <span className="text-primary-700 font-bold text-xs mb-2 uppercase tracking-wider bg-primary-100 px-2 py-1 rounded w-fit">Raw Prompt (English) - Có thể chỉnh sửa</span>
                                <textarea 
                                  className="text-gray-800 font-mono text-sm leading-relaxed bg-transparent border-none outline-none resize-y min-h-[100px] w-full custom-scrollbar"
                                  value={prompt.rawPrompt}
                                  onChange={(e) => handlePromptChange(idx, 'rawPrompt', e.target.value)}
                                />
                              </div>
                              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col h-full col-span-1">
                                <span className="text-primary-700 font-bold text-xs mb-2 uppercase tracking-wider bg-primary-100 px-2 py-1 rounded w-fit">Raw Prompt (Tiếng Việt) - Có thể chỉnh sửa</span>
                                <textarea 
                                  className="text-gray-800 font-sans text-sm leading-relaxed bg-transparent border-none outline-none resize-y min-h-[100px] w-full custom-scrollbar"
                                  value={prompt.rawPromptVi || ""}
                                  onChange={(e) => handlePromptChange(idx, 'rawPromptVi', e.target.value)}
                                  placeholder="Đang cập nhật..."
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {/* Image Viewer Modal */}
      {viewingImageIndex !== null && generatedImages[viewingImageIndex] && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
          <div className="relative w-full max-w-7xl max-h-screen flex flex-col items-center justify-center">
            <button 
              onClick={() => setViewingImageIndex(null)}
              className="absolute top-4 right-4 p-3 bg-black/50 hover:bg-red-500 text-white rounded-full transition-all z-10"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="absolute top-4 left-4 flex gap-2 z-10">
              <span className={`px-3 py-1.5 rounded-full text-sm font-bold border shadow-lg backdrop-blur-md ${
                imageSources[viewingImageIndex] === 'upload' 
                  ? 'bg-black text-white border-gray-700' 
                  : 'bg-primary-600 text-white border-primary-700'
              }`}>
                {imageSources[viewingImageIndex] === 'upload' ? 'Ảnh tải lên' : 'AI Tạo'}
              </span>
              
              <button
                onClick={() => handleDownloadImage(viewingImageIndex)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/90 hover:bg-white text-black rounded-full text-sm font-bold border border-gray-200 backdrop-blur-md transition-colors shadow-lg"
                title="Tải ảnh về máy"
              >
                <Download className="w-4 h-4" />
                Tải về
              </button>
            </div>
            
            <img 
              src={generatedImages[viewingImageIndex]} 
              alt="Generated Character" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border-4 border-white"
            />
            <div className="mt-4 text-center text-white max-w-3xl bg-black/50 p-4 rounded-xl backdrop-blur-sm">
              <p className="font-bold text-primary-400 mb-1">{prompts[viewingImageIndex].nameVi}</p>
              <p className="text-sm opacity-90">{prompts[viewingImageIndex].rawPrompt}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
