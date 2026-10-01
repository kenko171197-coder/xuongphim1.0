// Bước 1 của LÕI trong app: câu hỏi đào sâu (tuỳ chọn), 1.2 ba hướng, 1.3–1.7 kịch bản chia beat.
import { Type } from '@google/genai';
import { nap } from '../knowledge';
import { ProjectPayload, projectContext, ctxOf } from '../project';

const ROLE = `VAI TRÒ
Bạn là Biên kịch trong hệ thống FILM 2.0 — pipeline tạo phim AI bằng Veo. Bạn đang chạy BÊN TRONG một app có nút bấm, nên:
- Không hỏi lại người dùng bằng chữ, không chào hỏi, không kết bằng câu hỏi. App tự hiển thị lựa chọn và nút bấm.
- Những chỗ LÕI bảo "dừng lại hỏi" thì trả kết quả của mục đó rồi dừng; người dùng sẽ bấm nút ở bước kế.
- Viết tiếng Việt. Riêng chuỗi Style giữ tiếng Anh như ví dụ trong module.`;

/* ============ Câu hỏi đào sâu (tuỳ chọn) ============ */

export function buildQuestionsPrompt(p: ProjectPayload): string {
  return `${ROLE}

${nap('buoc-2-huong', 'cau-hoi', ctxOf(p))}

${projectContext(p, !!p.direction)}

===== NHIỆM VỤ =====
Đặt 3 đến 5 câu hỏi trắc nghiệm giúp người dùng đào sâu ý tưởng TRƯỚC khi viết kịch bản${p.direction ? ' theo hướng đã chọn' : ''}.
- Hỏi đúng thứ module này cần quyết định sớm (VD M01: gag chính và ai "không hề hay biết"; M03: xung đột và đồ vật neo cảm xúc; M12: "điều sai sai" và thứ bị giấu). Không hỏi chung chung.
- Không hỏi lại những gì hồ sơ đã có.
- Mỗi câu 3–4 đáp án cụ thể, khác nhau rõ, đều quay được trên Veo. Không đưa đáp án dựa vào hồi tưởng, giấc mơ, mạch song song hay chữ trên hình, trừ khi module cho phép.
- Câu hỏi và đáp án ngắn gọn.`;
}

export const QUESTIONS_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      question: { type: Type.STRING },
      options: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ['question', 'options'],
  },
};

/* ============ 1.2 — Ba hướng khai thác ============ */

export function buildDirectionsPrompt(p: ProjectPayload, note: string): string {
  return `${ROLE}

${nap('buoc-2-huong', 'huong', ctxOf(p))}

${projectContext(p, false)}
${note ? `\nGHI CHÚ CỦA NGƯỜI DÙNG CHO LẦN NÀY: ${note}\n` : ''}
===== NHIỆM VỤ =====
Làm đúng mục 1.2: trình bày 3 hướng A, B, C khai thác ý tưởng trên, khác nhau về bản chất.
- Dòng Khung truyện lấy từ 1.2a và mục "Khung truyện" của module; có Móc, Lật, Chốt cụ thể.
- Dòng Rủi ro Veo lấy từ bảng rủi ro cấu trúc của module đang dùng (module không có bảng thì suy từ Phần 0), viết dạng "[điểm yếu kỹ thuật] → [cách bù]".
- Mỗi hướng phải qua "Kiểm tra khung truyện" của 1.2a.
- Nếu có KIỂU KỊCH BẢN: cả 3 hướng đều đúng chất và cách viết của kiểu đó, khác nhau ở cách khai thác.
- Chưa viết kịch bản.`;
}

export const DIRECTIONS_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      key: { type: Type.STRING, enum: ['A', 'B', 'C'] },
      name: { type: Type.STRING, description: 'Tên hướng' },
      core: { type: Type.STRING, description: 'Câu chuyện cốt lõi' },
      frame: { type: Type.STRING, description: 'Tên khung truyện' },
      hook: { type: Type.STRING },
      turn: { type: Type.STRING },
      ending: { type: Type.STRING },
      structure: { type: Type.STRING, description: 'Cấu trúc' },
      why: { type: Type.STRING, description: 'Vì sao cấu trúc này hợp' },
      feeling: { type: Type.STRING, description: 'Cảm giác' },
      fitsFor: { type: Type.STRING, description: 'Hợp với (khán giả, nền tảng, dịp)' },
      veoRisk: { type: Type.STRING, description: '[điểm yếu kỹ thuật] → [cách bù]' },
    },
    required: ['key', 'name', 'core', 'frame', 'hook', 'turn', 'ending', 'structure', 'why', 'feeling', 'fitsFor', 'veoRisk'],
  },
};

/* ============ Chuẩn hoá kết quả ============ */


const str = (v: unknown) => String(v ?? '').trim();

export function normalizeQuestions(raw: any) {
  if (!Array.isArray(raw)) throw new Error('Gemini không trả về câu hỏi.');
  return raw
    .filter((q) => q && q.question && Array.isArray(q.options))
    .slice(0, 5)
    .map((q) => ({ question: str(q.question), options: q.options.map(str).filter(Boolean).slice(0, 4) }));
}

export function normalizeDirections(raw: any) {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('Gemini không trả về hướng khai thác.');
  return raw.slice(0, 3).map((d: any, i: number) => ({
    key: ['A', 'B', 'C'][i],
    name: str(d.name),
    core: str(d.core),
    frame: str(d.frame),
    hook: str(d.hook),
    turn: str(d.turn),
    ending: str(d.ending),
    structure: str(d.structure),
    why: str(d.why),
    feeling: str(d.feeling),
    fitsFor: str(d.fitsFor),
    veoRisk: str(d.veoRisk),
  }));
}
