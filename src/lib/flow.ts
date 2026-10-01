// Hướng dẫn chạy một beat trên Flow theo nền tảng video đã chọn — tính tại máy, không tốn token.
import type { BeatInput } from '../types';
import { videoProfile } from '../../shared/models';
import { loadVideoPrefs } from './videoPrefs';

/** Omni Flash tự chọn 16:9/9:16 theo ảnh đầu vào nếu prompt không ghi rõ → luôn thêm câu tỉ lệ ở đầu prompt. */
export function withAspect(prompt: string, aspect: string): string {
  if (!prompt) return prompt;
  if (/\b(9:16|16:9|vertical video|widescreen)\b/i.test(prompt.slice(0, 300))) return prompt;
  const line = aspect === '16:9' ? 'Widescreen 16:9 video.' : 'Vertical 9:16 video.';
  return prompt.startsWith('[') ? `[${line} ${prompt.slice(1)}` : `${line} ${prompt}`;
}

export interface FlowPlan {
  platform: string;
  duration: number;
  aspect: string;
  startFrame: string;
  refs: string[];
  maxRefs: number;
  overRefs: boolean;
  notes: string[];
}

export function flowPlan(input: BeatInput, mappedTags: string[], aspect: string): FlowPlan {
  const prefs = loadVideoPrefs();
  const v = videoProfile(prefs.platform);
  // Khung đầu: frame nối nhắc ở dòng đầu ô Script ("Sử dụng @frame3a làm khung hình bắt đầu…")
  const firstLine = input.script.split('\n')[0] || '';
  const startFrame = /khung\s*(hình)?\s*(bắt\s*đầu|đầu)|start/i.test(firstLine) ? (/@(frame\d+[a-z])/i.exec(firstLine)?.[1] || '') : '';
  const refs = mappedTags.filter((t) => t !== startFrame);
  const notes: string[] = [];

  if (startFrame && !v.frameWithRefs) {
    notes.push(`${v.name} không dùng chung khung đầu với ảnh tham chiếu: chọn chế độ Frames, nhận dạng nhân vật dựa vào chính khung đầu. Ảnh tham chiếu bên dưới chỉ dùng khi bỏ khung đầu.`);
  }
  if (v.maxRefs === 0 && refs.length) notes.push(`${v.name} không nhận ảnh tham chiếu (Ingredients).`);
  if (prefs.platform === 'veo-fast' && refs.length && input.duration !== 8) notes.push('Ingredients trên Veo 3.1 Fast/Lite chỉ tạo được 8 giây.');
  if (prefs.platform === 'omni-flash' && startFrame && input.promptType === 'continuous') {
    notes.push('Beat liền mạch với clip trước: trên Omni Flash có thể dùng Extend (kéo dài clip trước) thay cho khung đầu.');
  }
  return {
    platform: v.name,
    duration: input.duration,
    aspect,
    startFrame,
    refs,
    maxRefs: v.maxRefs,
    overRefs: refs.length > v.maxRefs,
    notes,
  };
}
