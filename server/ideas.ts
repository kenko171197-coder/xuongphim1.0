// Phòng Ý tưởng (thiết kế lại): chọn KIỂU KỊCH BẢN + thời lượng (ngắn / trung bình / dài),
// AI tự quyết module, số beat, thoại, hình thức, tỉ lệ khung. Hai chế độ: gợi ý, và ý tưởng tự nhập.
import { Type } from '@google/genai';
import {
  getModule, loiForIdeas, isModuleCode, ModuleCode, moduleIndex, loadedModules, getScriptType,
} from './knowledge';

export type DurationKey = 'ngan' | 'trung-binh' | 'dai';

export interface IdeaRequest {
  mode: 'suggest' | 'custom' | 'variations';
  scriptType: string;
  duration: DurationKey;
  idea: string;
  baseIdea: string;
  aspect: 'auto' | '9:16' | '16:9';
  extra: string;
  disliked: { title: string; logline: string }[];
  count: number;
}

// Mốc tham khảo khi file kiểu kịch bản không ghi riêng. Là KHOẢNG, không phải trần cứng.
const DEFAULT_DURATION: Record<DurationKey, string> = {
  ngan: 'phim ngắn, dưới 2 phút',
  'trung-binh': 'phim vừa, khoảng 2–8 phút',
  dai: 'phim dài, trên 8 phút, nhiều hồi',
};
const DURATION_LABEL: Record<DurationKey, string> = { ngan: 'Ngắn', 'trung-binh': 'Trung bình', dai: 'Dài' };
// Khoảng giây bắt buộc của từng mức (người dùng chốt: ngắn < 2 phút, trung bình 2–8 phút, dài > 8 phút)
const DURATION_RANGE: Record<DurationKey, [number, number]> = { ngan: [20, 119], 'trung-binh': [120, 480], dai: [481, 1800] };

export function validateIdeaRequest(body: any): IdeaRequest {
  const t = getScriptType(String(body?.scriptType || ''));
  if (!t) throw new Error('Chưa chọn kiểu kịch bản (hoặc file kiểu kịch bản không còn trong knowledge/kieu-kich-ban/).');
  const mode = ['suggest', 'custom', 'variations'].includes(body?.mode) ? body.mode : 'suggest';
  const duration: DurationKey = ['ngan', 'trung-binh', 'dai'].includes(body?.duration) ? body.duration : 'trung-binh';
  const idea = String(body?.idea || '').trim();
  const baseIdea = String(body?.baseIdea || '').trim();
  if (mode === 'custom' && !idea) throw new Error('Hãy nhập ý tưởng của bạn.');
  if (mode === 'variations' && !baseIdea) throw new Error('Thiếu ý tưởng gốc.');
  const disliked = Array.isArray(body?.disliked)
    ? body.disliked
        .filter((d: any) => d && d.title)
        .slice(-40)
        .map((d: any) => ({ title: String(d.title), logline: String(d.logline || '') }))
    : [];
  const fallbackCount = mode === 'custom' ? 3 : 6;
  return {
    mode,
    scriptType: t.id,
    duration,
    idea,
    baseIdea,
    aspect: ['9:16', '16:9'].includes(body?.aspect) ? body.aspect : 'auto',
    extra: String(body?.extra || '').trim(),
    disliked,
    count: Math.min(Math.max(Number(body?.count) || fallbackCount, 2), 8),
  };
}

export function buildIdeasPrompt(req: IdeaRequest): string {
  const t = getScriptType(req.scriptType)!;
  const available = loadedModules();
  const mainModule = t.modules.find((m) => available.includes(m));
  const mainBlock = mainModule
    ? `\n===== MODULE CHÍNH ĐỀ XUẤT CỦA KIỂU NÀY (${mainModule}) — NGUYÊN VĂN =====\n${getModule(mainModule)}\n`
    : '';
  const durationHint = t.durations[req.duration] || DEFAULT_DURATION[req.duration];
  const aspectText =
    req.aspect === 'auto'
      ? `Để biên kịch chọn${t.aspect ? ` (mặc định của kiểu này: ${t.aspect})` : ''}.`
      : `${req.aspect} (người dùng đã chọn, giữ nguyên).`;

  let task = '';
  if (req.mode === 'suggest') {
    task = `Đề xuất ${req.count} ý tưởng phim hoàn toàn mới đúng kiểu kịch bản trên. Người dùng chỉ chọn kiểu và thời lượng, bạn tự quyết mọi thứ còn lại.`;
  } else if (req.mode === 'custom') {
    task = `Người dùng có ý tưởng:
"""
${req.idea}
"""
1. Trường "assessment": đánh giá thẳng thắn ý tưởng này (3–5 câu): có hợp kiểu kịch bản không, điểm mạnh, rủi ro Veo lớn nhất, nên chỉnh gì.
2. Phát triển thành ${req.count} thẻ, giữ tinh thần ý tưởng của người dùng; mỗi thẻ một cách khai thác KHÁC NHAU về bản chất (khác cú Lật, ưu tiên khác khung truyện). Đã chỉnh sẵn những chỗ rủi ro vừa nêu.`;
  } else {
    task = `Người dùng thích ý tưởng này và muốn xem biến thể:
"""
${req.baseIdea}
"""
Tạo ${req.count} biến thể. Giữ hạt nhân hấp dẫn của ý tưởng gốc, mỗi biến thể đổi ít nhất một trong: khung truyện, cú Lật, nhân vật chính, bối cảnh.`;
  }

  const dislikedBlock = req.disliked.length
    ? `\nNGƯỜI DÙNG ĐÃ LOẠI những ý tưởng sau của kiểu kịch bản này. Tự suy ra vì sao họ không thích (nhàm, dễ đoán, khó quay…) và KHÔNG đề xuất ý tưởng tương tự:\n${req.disliked.map((d) => `- ${d.title}: ${d.logline}`).join('\n')}\n`
    : '';

  return `VAI TRÒ
Bạn là Biên kịch trong hệ thống FILM 2.0 — pipeline tạo phim AI bằng Veo. Lúc này bạn làm việc của PHÒNG Ý TƯỞNG: đưa ra thẻ ý tưởng để người dùng chọn. Chưa viết kịch bản, chưa chia beat chi tiết, chưa viết prompt.

===== LÕI — PHẦN 0 VÀ BƯỚC 1 (1.1, 1.2a) — NGUYÊN VĂN, BẮT BUỘC TUÂN THỦ =====
${loiForIdeas()}

===== KIỂU KỊCH BẢN: ${t.name} — NGUYÊN VĂN (cách viết riêng của dòng phim này) =====
${t.text}
${mainBlock}
===== CÁC MODULE CÓ SẴN (được chọn) =====
${moduleIndex([])}

===== THIẾT LẬP CỦA NGƯỜI DÙNG =====
- Kiểu kịch bản: ${t.name}
- Thời lượng: ${DURATION_LABEL[req.duration]} — ${durationHint}. "seconds" BẮT BUỘC nằm trong khoảng ${DURATION_RANGE[req.duration][0]}–${DURATION_RANGE[req.duration][1]} giây.
- Tỉ lệ khung: ${aspectText}${req.extra ? `\n- Yêu cầu thêm: ${req.extra}` : ''}
${dislikedBlock}
===== NHIỆM VỤ =====
${task}

LUẬT CHO THẺ Ý TƯỞNG
1. Viết đúng CÁCH VIẾT của kiểu kịch bản: chất, công thức ý tưởng, cấu trúc theo thời lượng, tuýp nhân vật, và tuyệt đối tránh mục "Không được làm".
2. Tự chọn module chính trong các mã: ${available.join(', ')}. Ưu tiên module đề xuất của kiểu kịch bản (${t.modules.join(', ') || 'không ghi'}). Chỉ thêm module phụ khi phim thật sự lai hai thể loại.
3. THỜI LƯỢNG: ý tưởng phải có ĐỦ CHẤT LIỆU cho mức đã chọn. Phim trung bình và dài cần nhiều hồi, nhiều tình huống, tuyến phụ, mục tiêu lớn xuyên suốt — không phải một gag kéo dài. Trong khoảng giây của mức đó, tự quyết thời lượng để câu chuyện trọn vẹn; không cắt cụt, không độn beat rỗng. Mỗi beat 4, 6 hoặc 8 giây; "seconds" là tổng ước tính, "beats" ≈ seconds / 6.
4. Khung truyện lấy từ mục "Khung truyện" của module chính hoặc công thức của kiểu kịch bản; ghi đúng tên khung.
5. Mỗi ý tưởng qua được "Kiểm tra khung truyện" 1.2a: câu hỏi thật ở Móc, điều khán giả không đoán được, hình ảnh khung cuối cụ thể. Móc nằm trong 2 giây đầu.
6. Chơi vào điểm MẠNH của Veo, né điểm yếu (Phần 0 và module). Cấu trúc có trong bảng rủi ro của module thì ghi rủi ro và cách bù.
7. Không dùng hồi tưởng, giấc mơ, mạch song song trừ khi module hoặc kiểu kịch bản có sẵn. Mọi thứ phải quay được; điểm mấu chốt không được là chữ trên hình.
8. Các thẻ KHÁC NHAU VỀ BẢN CHẤT, không phải một ý đổi tên nhân vật.
9. Không dùng nhân vật, tên, hình dáng của phim có bản quyền; không dùng người nổi tiếng có thật.
10. Viết toàn bộ bằng tiếng Việt, câu ngắn, cụ thể, tả thứ nhìn thấy và nghe thấy được.`;
}

const IDEA_ITEM = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: 'Tên phim, ngắn, gợi hình' },
    logline: { type: Type.STRING, description: 'Một câu tóm tắt câu chuyện' },
    frame: { type: Type.STRING, description: 'Tên khung truyện' },
    hook: { type: Type.STRING, description: 'Móc: điều người xem thấy/nghe trong 2 giây đầu' },
    hookQuestion: { type: Type.STRING, description: 'Câu hỏi Móc đặt ra' },
    turn: { type: Type.STRING, description: 'Lật: điều khán giả không đoán trước' },
    ending: { type: Type.STRING, description: 'Chốt: hình ảnh khung cuối đứng yên' },
    characters: { type: Type.ARRAY, items: { type: Type.STRING }, description: '"Tên — vai trò, một nét nhận dạng"' },
    dialogue: { type: Type.STRING, description: 'Mô tả thoại ngắn gọn' },
    form: { type: Type.STRING, description: 'Hoạt hình hay người thật, kèm gợi ý style ngắn' },
    beats: { type: Type.INTEGER, description: 'Số beat ước tính' },
    seconds: { type: Type.INTEGER, description: 'Tổng thời lượng ước tính (giây)' },
    module: { type: Type.STRING, description: 'Mã module chính, VD M01' },
    secondary: { type: Type.STRING, description: 'Mã module phụ hoặc rỗng' },
    aspect: { type: Type.STRING, enum: ['9:16', '16:9'] },
    dialogueMode: { type: Type.STRING, enum: ['co', 'khong'] },
    formMode: { type: Type.STRING, enum: ['hoathinh', 'nguoithat'] },
    veoLevel: { type: Type.STRING, enum: ['de', 'vua', 'kho'] },
    veoNote: { type: Type.STRING, description: 'Rủi ro Veo chính → cách bù' },
    message: { type: Type.STRING, description: 'Cảm xúc hoặc thông điệp đọng lại, một câu' },
  },
  required: [
    'title', 'logline', 'frame', 'hook', 'hookQuestion', 'turn', 'ending', 'characters', 'dialogue', 'form',
    'beats', 'seconds', 'module', 'secondary', 'aspect', 'dialogueMode', 'formMode', 'veoLevel', 'veoNote', 'message',
  ],
};

export const IDEAS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    assessment: { type: Type.STRING, description: 'Chỉ chế độ ý tưởng tự nhập: đánh giá ý tưởng. Chế độ khác để rỗng.' },
    ideas: { type: Type.ARRAY, items: IDEA_ITEM },
  },
  required: ['assessment', 'ideas'],
};

const str = (v: unknown) => String(v ?? '').trim();

export function normalizeIdeas(raw: any, req: IdeaRequest) {
  const t = getScriptType(req.scriptType)!;
  const available = loadedModules();
  const fallback = (t.modules.find((m) => available.includes(m)) || available[0] || 'M01') as ModuleCode;
  const list = Array.isArray(raw?.ideas) ? raw.ideas : Array.isArray(raw) ? raw : [];
  const ideas = list
    .filter((i: any) => i && i.title)
    .map((i: any) => {
      const mod = str(i.module).toUpperCase().match(/M\d{2}/)?.[0] || '';
      const sec = str(i.secondary).toUpperCase().match(/M\d{2}/)?.[0] || '';
      const module = (isModuleCode(mod) && available.includes(mod) ? mod : fallback) as ModuleCode;
      const secondary = isModuleCode(sec) && available.includes(sec) && sec !== module ? sec : '';
      const [lo, hi] = DURATION_RANGE[req.duration];
      const seconds = Math.min(Math.max(Math.round(Number(i.seconds) || Number(i.beats) * 6 || lo), lo), hi);
      const beats = Math.min(Math.max(Math.round(Number(i.beats) || seconds / 6), Math.round(seconds / 8)), Math.round(seconds / 4));
      return {
        title: str(i.title),
        logline: str(i.logline),
        frame: str(i.frame),
        hook: str(i.hook),
        hookQuestion: str(i.hookQuestion),
        turn: str(i.turn),
        ending: str(i.ending),
        characters: Array.isArray(i.characters) ? i.characters.filter(Boolean).map(String) : [],
        dialogue: str(i.dialogue),
        form: str(i.form),
        beats,
        seconds,
        module,
        secondary,
        aspect: req.aspect !== 'auto' ? req.aspect : i.aspect === '16:9' ? '16:9' : i.aspect === '9:16' ? '9:16' : t.aspect || '9:16',
        dialogueMode: i.dialogueMode === 'co' ? 'co' : 'khong',
        formMode: i.formMode === 'nguoithat' ? 'nguoithat' : 'hoathinh',
        veoLevel: ['de', 'vua', 'kho'].includes(i.veoLevel) ? i.veoLevel : 'vua',
        veoNote: str(i.veoNote),
        message: str(i.message),
      };
    });
  if (!ideas.length) throw new Error('Gemini không trả về ý tưởng nào.');
  return { assessment: req.mode === 'custom' ? str(raw?.assessment) : '', ideas };
}
