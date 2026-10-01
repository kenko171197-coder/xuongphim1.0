// ============================================================================
// RÀ SOÁT CUỐI BƯỚC — dùng chung cho cả 5 bước.
// Mỗi bước: AI rà soát ĐỘC LẬP (không tin lời tự kiểm của người viết) → danh sách lỗi có mức độ + cách sửa
// viết sẵn → app hiện nút sửa → lỗi mức "cao" phải xử lý (sửa hoặc chấp nhận rủi ro) trước khi sang bước sau.
// Luật rà của từng bước nằm ở knowledge/<bước>/90_ra-soat.md (nạp qua _nap.json, tác vụ "ra-soat").
// ============================================================================
import { Type } from '@google/genai';
import { nap, stripChecklist, StepDir } from '../knowledge';
import { ProjectPayload, projectContext, ctxOf } from '../project';
import { toTag, str } from '../util';
import { IDEA_ITEM, normalizeIdeas } from './1-y-tuong';
import { DIRECTIONS_SCHEMA, normalizeDirections } from './2-huong';

export const REVIEW_KINDS = ['vat-ly-co-che', 'khong-gian', 'nhan-qua', 'dao-cu', 'qua-tai', 'lien-tuc', 'veo-kho', 'khung-truyen', 'thiet-ke', 'lech-kich-ban', 'khac'] as const;

export const REVIEW_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    issues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          target: { type: Type.STRING, description: 'Đích cần sửa (xem danh sách đích hợp lệ)' },
          beat: { type: Type.STRING, description: 'Mã beat liên quan, hoặc rỗng' },
          loai: { type: Type.STRING, enum: [...REVIEW_KINDS] },
          mucDo: { type: Type.STRING, enum: ['cao', 'vua', 'thap'] },
          moTa: { type: Type.STRING },
          cachSua: { type: Type.STRING },
        },
        required: ['target', 'beat', 'loai', 'mucDo', 'moTa', 'cachSua'],
      },
    },
    tongQuan: { type: Type.STRING, description: 'Một câu nhận xét chung' },
  },
  required: ['issues', 'tongQuan'],
};

const ROLE = `VAI TRÒ
Bạn là NGƯỜI RÀ SOÁT độc lập trong hệ thống FILM 2.0 (tạo phim bằng Veo). Kết quả bạn rà do một AI khác làm; bạn KHÔNG tin lời tự kiểm của họ. Việc của bạn: tìm những chỗ sẽ làm VIDEO RA SAI hoặc làm HỎNG CÁC BƯỚC SAU, TRƯỚC khi người dùng sang bước tiếp theo. Chạy trong app có nút bấm: không chào hỏi, không hỏi lại.`;

/** Kết quả lần rà trước (để lần rà sau HỘI TỤ, không soi lại từ đầu và bới thêm lỗi vụn). */
function previousBlock(body: any): string {
  const prev = (Array.isArray(body?.previous) ? body.previous : []).slice(0, 20);
  if (!prev.length) return '';
  const label = (s: string) => (s === 'da-sua' ? 'ĐÃ GỬI SỬA' : s === 'bo-qua' ? 'NGƯỜI DÙNG CHẤP NHẬN RỦI RO' : 'CHƯA XỬ LÝ');
  return `
===== LẦN RÀ TRƯỚC =====
${prev.map((i: any) => `- [${label(str(i?.status, 20))}] (${str(i?.mucDo, 10)}) ${str(i?.moTa, 800)}`).join('\n')}

CÁCH DÙNG KẾT QUẢ LẦN TRƯỚC (bắt buộc):
- Lỗi "ĐÃ GỬI SỬA": kiểm nội dung hiện tại đã hết lỗi đó chưa. Hết rồi thì KHÔNG báo lại. Còn thì báo lại, ghi rõ "chưa hết:" ở đầu mô tả.
- Lỗi "NGƯỜI DÙNG CHẤP NHẬN RỦI RO": KHÔNG báo lại dưới bất kỳ cách diễn đạt nào.
- Lỗi MỚI chỉ báo khi mức "cao" hoặc "vừa" và thật sự làm video sai / hỏng bước sau. KHÔNG bới thêm lỗi vụn mức "thap" ở lần rà lại.
- Mục tiêu là hội tụ: bản đã sửa đúng thì kết quả phải ít lỗi hơn lần trước.
`;
}

function buildReviewPrompt(step: StepDir, p: ProjectPayload, context: string, focus: string, targets: string[], body?: any): string {
  return `${ROLE}

${nap(step, 'ra-soat', ctxOf(p))}

${projectContext(p, true)}

${context}
${previousBlock(body)}
===== NHIỆM VỤ =====
${focus}

Dùng đúng luật rà soát của bước này (file 90_ra-soat ở trên) và LÕI đi kèm. Mỗi lỗi:
- "target": đích cần sửa, CHỈ được là một trong: ${targets.join(', ')}.
- "beat": mã beat liên quan (VD B05), hoặc rỗng.
- "loai": nhóm lỗi.
- "mucDo": "cao" = chắc chắn làm video sai hoặc làm hỏng bước sau → phải xử lý trước khi sang bước sau; "vua" = rủi ro đáng kể; "thap" = nên cải thiện.
- "moTa": chỉ thẳng chi tiết / câu nào sai và vì sao (luật nào).
- "cachSua": yêu cầu sửa CỤ THỂ, viết sẵn để gửi thẳng cho bước viết lại (đổi câu nào thành gì, thêm / bớt gì). Viết câu khẳng định.
Không bịa lỗi cho có — ổn thì trả mảng rỗng. Tối đa 12 lỗi, mức "cao" trước.`;
}

export function normalizeReview(raw: any, targets: string[], fallback: string) {
  const valid = new Set(targets);
  const issues = (Array.isArray(raw?.issues) ? raw.issues : [])
    .map((i: any, n: number) => {
      let target = str(i?.target, 40);
      if (!valid.has(target)) {
        const up = target.toUpperCase();
        const low = toTag(target);
        target = valid.has(up) ? up : valid.has(low) ? low : fallback;
      }
      return {
        id: `rv_${Date.now().toString(36)}_${n}`,
        target,
        beat: str(i?.beat, 20).toUpperCase(),
        loai: (REVIEW_KINDS as readonly string[]).includes(i?.loai) ? i.loai : 'khac',
        mucDo: ['cao', 'vua', 'thap'].includes(i?.mucDo) ? i.mucDo : 'vua',
        moTa: str(i?.moTa, 2000),
        cachSua: str(i?.cachSua, 2000),
      };
    })
    .filter((i: any) => i.moTa)
    .slice(0, 12);
  return { issues, tongQuan: str(raw?.tongQuan, 500) };
}

/* ============================ Ngữ cảnh rà của từng bước ============================ */

export interface ReviewJob {
  prompt: any; // string hoặc parts (có ảnh)
  targets: string[];
  fallback: string;
}

/** Bước 1 — thẻ ý tưởng của dự án. */
export function reviewIdea(p: ProjectPayload, body?: any): ReviewJob {
  const context = `===== THẺ Ý TƯỞNG CẦN RÀ =====\n${JSON.stringify(p.idea, null, 2)}`;
  const focus = 'Rà thẻ ý tưởng của dự án (đã nằm trong hồ sơ dự án ở trên và bản đầy đủ ngay trên) theo luật rà soát Bước 1.';
  return { prompt: buildReviewPrompt('buoc-1-y-tuong', p, context, focus, ['y-tuong'], body), targets: ['y-tuong'], fallback: 'y-tuong' };
}

/** Bước 2 — hướng đang chọn. */
export function reviewDirection(p: ProjectPayload, body?: any): ReviewJob {
  if (!p.direction) throw new Error('Chưa chọn hướng.');
  const context = `===== HƯỚNG ĐANG CHỌN =====\n${JSON.stringify(p.direction, null, 2)}`;
  const focus = 'Rà hướng khai thác đang chọn theo luật rà soát Bước 2, đối chiếu với thẻ ý tưởng.';
  return { prompt: buildReviewPrompt('buoc-2-huong', p, context, focus, ['huong'], body), targets: ['huong'], fallback: 'huong' };
}

/** Bước 3 — một scene (kèm scene trước / sau để nối) hoặc cả phim. Kịch bản gửi đi đã bỏ bảng kiểm tự khai. */
export function reviewScript(p: ProjectPayload, body: any): ReviewJob {
  const scenes = (Array.isArray(body?.scenes) ? body.scenes : [])
    .map((s: any) => ({ id: str(s?.id, 10), title: str(s?.title, 300), markdown: str(s?.markdown) }))
    .filter((s: any) => /^S\d+$/.test(s.id) && s.markdown);
  const outline = str(body?.outlineMarkdown);
  if (!outline) throw new Error('Chưa có đề cương.');
  if (!scenes.length) throw new Error('Chưa có scene nào để rà soát.');
  const scope = body?.scope === 'film' ? 'film' : 'scene';
  const targetId = str(body?.targetId, 10);
  const context = `===== ĐỀ CƯƠNG =====\n${outline}\n\n===== KỊCH BẢN CẦN RÀ (đã bỏ bảng kiểm của người viết) =====\n${scenes
    .map((s: any) => `--- ${s.id} · ${s.title} ---\n${stripChecklist(s.markdown)}`)
    .join('\n\n')}`;
  const focus =
    scope === 'scene'
      ? `Rà KỸ scene ${targetId}. Scene khác (nếu có) chỉ để đối chiếu chỗ nối đầu / cuối.`
      : `Rà CẢ PHIM — ưu tiên lỗi TÍCH LUỸ QUA NHIỀU SCENE (xem mục "Rà cả phim"). Tổng thời lượng mong muốn: ${Number(body?.targetSeconds) || '?'} giây. Vẫn báo lỗi trong từng scene nếu thấy.`;
  const targets = [...scenes.map((s: any) => s.id), 'de-cuong'];
  return { prompt: buildReviewPrompt('buoc-3-kich-ban', p, context, focus, targets, body), targets, fallback: scope === 'scene' ? targetId : 'de-cuong' };
}

/** Bước 4 — bộ thiết kế so với đề cương. */
export function reviewDesign(p: ProjectPayload, body: any): ReviewJob {
  const outline = str(body?.outlineMarkdown);
  const design = body?.design;
  if (!design) throw new Error('Chưa có thiết kế.');
  const tags: string[] = [
    ...(Array.isArray(design.characters) ? design.characters : []).map((c: any) => toTag(c.tag)),
    ...(Array.isArray(design.props) ? design.props : []).map((x: any) => toTag(x.tag)),
  ].filter(Boolean);
  const assets = (Array.isArray(body?.assets) ? body.assets : [])
    .map((a: any) => `- @${toTag(a.tag)}: Note "${str(a.note, 600)}"${a.seen ? ` | AI thấy trong ảnh: ${str(a.seen, 600)}` : ''}${a.hasImage ? '' : ' | CHƯA CÓ ẢNH'}`)
    .join('\n');
  const context = `===== ĐỀ CƯƠNG (nhân vật, đạo cụ, scene) =====\n${stripChecklist(outline)}\n\n===== BỘ THIẾT KẾ CẦN RÀ =====\n${JSON.stringify(design, null, 2)}\n\n===== ẢNH ĐÃ GẮN =====\n${assets || '(chưa có ảnh nào)'}`;
  const focus = 'Rà bộ thiết kế nhân vật & đạo cụ theo luật rà soát Bước 4, đối chiếu với đề cương (mọi nhân vật / ★ đạo cụ / bộ phận cơ chế cần cho các scene).';
  const targets = [...tags, 'toan-bo'];
  return { prompt: buildReviewPrompt('buoc-4-nhan-vat', p, context, focus, targets, body), targets, fallback: 'toan-bo' };
}

/** Bước 5 — đầu vào của một beat trước khi tạo prompt (kèm ảnh frame nối nếu có). */
export function reviewBeat(p: ProjectPayload, body: any): ReviewJob {
  const beatId = str(body?.beatId, 10).toUpperCase();
  const script = str(body?.script);
  if (!/^B\d+$/.test(beatId) || !script) throw new Error('Beat chưa có ô Script.');
  const frames = (Array.isArray(body?.frames) ? body.frames : [])
    .map((f: any) => `- @${toTag(f.tag)}: ${str(f.seen, 800)}${f.warning ? ` | CẢNH BÁO KHI CHẤM: ${str(f.warning, 400)}` : ''}`)
    .join('\n');
  const plan = body?.plan?.links?.length ? `${body.plan.shots} shot · ${body.plan.links.join(' → ')}` : '(không có)';
  const context = `===== KỊCH BẢN LIÊN QUAN (đề cương + scene chứa beat, đã bỏ bảng kiểm) =====
${stripChecklist(str(body?.sceneMarkdown))}

===== KẾ HOẠCH CỦA KỊCH BẢN CHO ${beatId} =====
${plan}

===== FRAME NỐI / ẢNH TỪ BEAT TRƯỚC =====
${frames || '(không có)'}

===== Ô SCRIPT CẦN RÀ (${beatId}) =====
${script}

Thiết lập: ${str(body?.settings, 200)}
Ảnh nạp: ${str(body?.refs, 600) || '(không có)'}`;
  const focus = `Rà đầu vào của ${beatId} theo luật rà soát Bước 5: đối chiếu ô Script với kịch bản, kế hoạch shot, frame nối (ảnh đính kèm nếu có).`;
  const text = buildReviewPrompt('buoc-5-beat', p, context, focus, [beatId], body);
  const img = body?.frameImage;
  const prompt =
    img && typeof img.data === 'string' && img.data.length > 100
      ? [{ text }, { text: 'Ảnh frame nối thật:' }, { inlineData: { mimeType: /^image\/(png|jpeg|webp)$/.test(img.mime) ? img.mime : 'image/jpeg', data: img.data } }]
      : text;
  return { prompt, targets: [beatId], fallback: beatId };
}

/* ======================= Sửa theo rà soát (bước 1 và 2) ======================= */
// Bước 3, 4, 5 sửa bằng chính tác vụ viết của bước đó (viết lại scene / thiết kế / đầu vào beat) kèm "cachSua".

const issuesText = (issues: any[]) =>
  (Array.isArray(issues) ? issues : []).map((i: any) => `- [${str(i?.mucDo, 10)}] ${str(i?.moTa, 1500)} → Sửa: ${str(i?.cachSua, 1500)}`).join('\n');

export function buildFixIdea(p: ProjectPayload, issues: any[]): string {
  return `VAI TRÒ
Bạn là Biên kịch của hệ thống FILM 2.0, sửa thẻ ý tưởng theo kết quả rà soát. Chạy trong app: không chào hỏi, không hỏi lại.

${nap('buoc-1-y-tuong', 'sua', ctxOf(p))}

===== THẺ Ý TƯỞNG HIỆN TẠI =====
${JSON.stringify(p.idea, null, 2)}

===== LỖI CẦN SỬA (từ rà soát) =====
${issuesText(issues)}

===== NHIỆM VỤ =====
Trả về MỘT thẻ ý tưởng đã sửa hết các lỗi trên. Giữ nguyên tinh thần, nhân vật và những gì không bị nêu lỗi. Giữ module, tỉ lệ, thoại, hình thức trừ khi lỗi yêu cầu đổi. Viết tiếng Việt, câu khẳng định.`;
}

export const FIX_IDEA_SCHEMA = IDEA_ITEM;

export function normalizeFixIdea(raw: any, p: ProjectPayload) {
  const duration = ['ngan', 'trung-binh', 'dai'].includes(p.settings.length) ? (p.settings.length as any) : 'trung-binh';
  const req: any = { mode: 'custom', scriptType: p.settings.scriptType, duration, idea: '', baseIdea: '', aspect: p.settings.aspect, extra: '', disliked: [], count: 1 };
  return normalizeIdeas({ ideas: [raw], assessment: '' }, req).ideas[0];
}

export function buildFixDirection(p: ProjectPayload, issues: any[]): string {
  return `VAI TRÒ
Bạn là Biên kịch của hệ thống FILM 2.0, sửa hướng khai thác đang chọn theo kết quả rà soát. Chạy trong app: không chào hỏi, không hỏi lại.

${nap('buoc-2-huong', 'sua', ctxOf(p))}

${projectContext(p, true)}

===== LỖI CẦN SỬA (từ rà soát) =====
${issuesText(issues)}

===== NHIỆM VỤ =====
Trả về MỘT hướng (mảng một phần tử) đã sửa hết các lỗi trên, giữ nguyên những gì không bị nêu lỗi.`;
}

export const FIX_DIRECTION_SCHEMA = DIRECTIONS_SCHEMA;

export function normalizeFixDirection(raw: any, key: string) {
  const d = normalizeDirections(Array.isArray(raw) ? raw.slice(0, 1) : [raw])[0];
  return { ...d, key };
}
