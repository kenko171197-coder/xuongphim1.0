// Ngữ cảnh dự án gửi kèm mỗi bước: thiết lập 1.1, thẻ ý tưởng, hướng đã chọn, câu trả lời đào sâu.
import { isModuleCode, ModuleCode, getScriptType } from './knowledge';

export interface ProjectPayload {
  settings: {
    module: ModuleCode;
    secondary?: ModuleCode | '';
    length: string;
    aspect: '9:16' | '16:9';
    dialogue: 'auto' | 'co' | 'khong';
    form: 'auto' | 'hoathinh' | 'nguoithat';
    extra?: string;
    /** Kiểu kịch bản (id file trong knowledge/kieu-kich-ban/) */
    scriptType?: string;
  };
  idea: Record<string, any>;
  direction?: Record<string, any> | null;
  answers?: { question: string; answer: string }[];
}

const LENGTH_LABEL: Record<string, string> = {
  '1beat': '1 beat',
  '2-3beat': '2–3 beat',
  '4-8beat': '4–8 beat',
  '8plus': 'trên 8 beat (2–3 hồi)',
  series: 'series nhiều tập (tính cho một tập)',
  ngan: 'ngắn',
  'trung-binh': 'trung bình',
  dai: 'dài',
};

export function validateProject(body: any): ProjectPayload {
  const p = body?.project;
  if (!p || typeof p !== 'object') throw new Error('Thiếu dữ liệu dự án.');
  const s = p.settings || {};
  if (!isModuleCode(s.module)) throw new Error('Dự án chưa có module chính.');
  if (s.secondary && !isModuleCode(s.secondary)) s.secondary = '';
  if (s.secondary === s.module) s.secondary = '';
  if (!p.idea || !p.idea.title) throw new Error('Dự án chưa có ý tưởng.');
  const answers = Array.isArray(p.answers)
    ? p.answers
        .filter((a: any) => a && a.question && a.answer)
        .map((a: any) => ({ question: String(a.question), answer: String(a.answer) }))
    : [];
  return { settings: s, idea: p.idea, direction: p.direction || null, answers };
}

const line = (label: string, v: unknown) => (v ? `${label}: ${v}` : '');

/** Khối "HỒ SƠ DỰ ÁN" — cùng nội dung với hồ sơ người dùng vẫn dán vào Gem. */
export function projectContext(p: ProjectPayload, withDirection = true): string {
  const { settings: s, idea: i, direction: d, answers = [] } = p;
  const parts = [
    '===== HỒ SƠ DỰ ÁN (mục 1.1 đã đủ) =====',
    line('Ý tưởng', `${i.title} — ${i.logline}`),
    line('Kiểu kịch bản', getScriptType(s.scriptType)?.name),
    line('Module', `lõi + ${s.module} (chính)${s.secondary ? ` + ${s.secondary} (phụ)` : ''}`),
    line('Thoại', i.dialogue || (s.dialogue === 'co' ? 'có thoại' : s.dialogue === 'khong' ? 'không thoại' : '')),
    line('Độ dài', `${LENGTH_LABEL[s.length] || s.length}, ước tính ${i.beats} beat${i.seconds ? ` (~${i.seconds} giây)` : ''}`),
    line('Hình thức', i.form),
    line('Tỉ lệ khung', s.aspect === '9:16' ? '9:16 dọc' : '16:9 ngang'),
    line('Khung truyện ở thẻ ý tưởng', i.frame),
    line('  Móc', i.hook),
    line('  Câu hỏi ở Móc', i.hookQuestion),
    line('  Lật', i.turn),
    line('  Chốt', i.ending),
    Array.isArray(i.characters) && i.characters.length ? `Nhân vật dự kiến:\n${i.characters.map((c: string) => `  - ${c}`).join('\n')}` : '',
    line('Cảm xúc đọng lại', i.message),
    line('Rủi ro Veo đã thấy', i.veoNote),
    line('Yêu cầu thêm của người dùng', s.extra),
  ];

  if (answers.length) {
    parts.push('', 'NGƯỜI DÙNG ĐÃ TRẢ LỜI CÂU HỎI ĐÀO SÂU:');
    answers.forEach((a) => parts.push(`- ${a.question} → ${a.answer}`));
  }

  if (withDirection && d) {
    parts.push(
      '',
      `HƯỚNG NGƯỜI DÙNG ĐÃ CHỌN (mục 1.2): ${d.key}. ${d.name} — ${d.core}`,
      line('  Khung truyện', `${d.frame} — Móc: ${d.hook} · Lật: ${d.turn} · Chốt: ${d.ending}`),
      line('  Cấu trúc', `${d.structure} — ${d.why}`),
      line('  Cảm giác', `${d.feeling} · Hợp với: ${d.fitsFor}`),
      line('  Rủi ro Veo', d.veoRisk)
    );
  }

  return parts.filter((x) => x !== '').join('\n');
}
