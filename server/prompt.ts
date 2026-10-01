// Ghép prompt cho một bước: luật chung → lời dặn của bước → mục kịch bản → module → mô hình → dữ liệu dự án → việc lần này.
// Phần nào được gửi do KHỐI ĐẦU của file buoc/<bước>.md quyết định (kich-ban-muc, module, mo-hinh).
import { activeModel, library, metaList, metaStr, moduleHalf, moduleIndex, scriptTypeDoc, section } from './knowledge';
import type { Assets, Idea, Outline, ProjectSettings } from '../shared/types';
import { LENGTH_LABEL } from '../shared/types';

export interface StepPromptInput {
  step: string;
  scriptType: string;
  /** Dữ liệu dự án đã viết thành chữ (describe*) */
  project: string;
  /** Việc cụ thể lần gọi này */
  task: string;
  /** Module của clip (chỉ dùng cho bước khai báo module: khi-viet-*) */
  modules?: string[];
}

export function buildStepPrompt(input: StepPromptInput): string {
  const lib = library();
  const step = lib.steps.get(input.step);
  if (!lib.chung) throw new Error('Thiếu file knowledge/buoc/0-chung.md.');
  if (!step) throw new Error(`Thiếu file knowledge/buoc/${input.step}.md.`);
  const type = scriptTypeDoc(input.scriptType);
  if (!type) throw new Error(`Không tìm thấy thể loại "${input.scriptType}" trong knowledge/kich-ban/.`);

  const blocks: string[] = [];
  blocks.push(`===== LUẬT CHUNG =====\n${lib.chung.body}`);
  blocks.push(`===== LỜI DẶN CỦA BƯỚC NÀY: ${metaStr(step, 'ten', step.id)} =====\n${step.body}`);

  const keys = metaList(step, 'kich-ban-muc');
  if (keys.length) {
    const parts = keys.map((k) => section(type.body, k)).filter(Boolean);
    blocks.push(`===== THỂ LOẠI: ${metaStr(type, 'ten', type.id)} — các mục ${keys.join(', ')} =====\n${parts.join('\n\n')}`);
  }

  const moduleMode = metaStr(step, 'module', 'khong');
  if (moduleMode !== 'khong') {
    blocks.push(`===== MỤC LỤC MODULE TÌNH HUỐNG =====\n${moduleIndex()}`);
    const half = moduleMode === 'khi-viet-shot-list' ? 'shot' : moduleMode === 'khi-viet-prompt' ? 'prompt' : null;
    // Không chỉ định module → gửi mọi module (thư viện còn nhỏ). Thư viện lớn hơn ~15 module thì nên chọn trước.
    const ids = input.modules ?? lib.modules.map((m) => m.id);
    if (half && ids.length) {
      const texts = ids.map((id) => moduleHalf(id, half)).filter(Boolean);
      if (texts.length) blocks.push(`===== MODULE CỦA CLIP NÀY (nguyên văn) =====\n${texts.join('\n\n')}`);
    }
  }

  if (metaStr(step, 'mo-hinh', 'khong') === 'co') {
    const model = activeModel();
    if (model) blocks.push(`===== MÔ HÌNH VIDEO: ${metaStr(model, 'ten', model.id)} =====\n${model.body}`);
  }

  blocks.push(`===== DỮ LIỆU DỰ ÁN =====\n${input.project}`);
  blocks.push(`===== VIỆC LẦN NÀY =====\n${input.task}\n\nTrả đúng khuôn JSON app yêu cầu. Chữ cho người đọc bằng tiếng Việt; prompt cho công cụ ảnh/video bằng tiếng Anh.`);
  return blocks.join('\n\n');
}

/* ======================= Viết dữ liệu dự án thành chữ ======================= */

export function describeSettings(s: ProjectSettings): string {
  const type = scriptTypeDoc(s.scriptType);
  const dur = type ? metaStr(type, `thoi-luong-${s.length}`) : '';
  return [
    `Thể loại: ${type ? metaStr(type, 'ten', type.id) : s.scriptType}`,
    `Độ dài: ${LENGTH_LABEL[s.length] || s.length}${dur ? ` (${dur})` : ''}`,
    `Tỉ lệ khung: ${s.aspect}`,
    `Thoại: ${type && metaStr(type, 'thoai') === 'khong' ? 'không thoại' : 'có thoại'}`,
  ].join('\n');
}

export function describeIdea(i: Idea): string {
  return [
    `Ý TƯỞNG ĐÃ CHỌN: ${i.title}`,
    `Logline: ${i.logline}`,
    `Công thức: ${i.formula}`,
    `Móc: ${i.hook}`,
    `Lật: ${i.turn}`,
    `Chốt: ${i.ending}`,
    `Nhân vật dự kiến: ${i.characters.join('; ')}`,
    `Bối cảnh dự kiến: ${i.locations.join('; ')}`,
    `Thời lượng: khoảng ${i.seconds} giây, ước tính ${i.clips} clip`,
    `Rủi ro sản xuất đã biết: ${i.productionRisk}`,
  ].join('\n');
}

export function describeOutline(o: Outline): string {
  const chars = o.characters
    .map((c) => `- @${c.tag} (${c.role}): ${c.look}. Muốn: ${c.wants}. Phản xạ: ${c.reflex}. Điểm yếu: ${c.weakness}. Tỉ lệ: ${c.scale}`)
    .join('\n');
  const locs = o.locations.map((l) => `- @${l.tag}: ${l.description}. Mốc cố định: ${l.landmarks}. Dùng ở: ${l.scenes.join(', ')}`).join('\n');
  const props = o.props
    .map(
      (p) =>
        `- @${p.tag}: ${p.role}. Hình dạng cần có: ${p.shapeNeeded}` +
        (p.afterTag ? `. Trạng thái sau @${p.afterTag}: ${p.afterDescription} (từ ${p.afterFromScene})` : '')
    )
    .join('\n');
  const scenes = o.scenes
    .map(
      (s) =>
        `${s.id}${s.act ? ` [${s.act}]` : ''} · @${s.location} · ${s.timeOfDay} · ${s.role}\n` +
        `   Mục đích: ${s.purpose}\n   Chuyển biến: ${s.change}\n   Trạng thái cuối: ${s.endState}\n` +
        `   Nhân vật: ${s.characters.map((t) => '@' + t).join(' ')} · Đạo cụ: ${s.props.map((t) => '@' + t).join(' ') || '—'} · ~${s.clips} clip`
    )
    .join('\n');
  return [
    `OUTLINE: ${o.title}`,
    o.summary,
    `NHÂN VẬT\n${chars}`,
    `BỐI CẢNH\n${locs}`,
    `ĐẠO CỤ CHÍNH\n${props || '—'}`,
    `KHOÁ TRỤC: ${o.axisLock}`,
    `SCENE\n${scenes}`,
  ].join('\n\n');
}

/** images: tag → id ảnh; có thì ghi [có ảnh] / [chưa có ảnh] cạnh từng tag */
export function describeAssets(a: Assets, images?: Record<string, string>): string {
  const mark = (tag: string) => (images ? (images[tag] ? ' [có ảnh]' : ' [chưa có ảnh]') : '');
  const chars = a.characters.map((c) => `- @${c.tag} (${c.desc})${mark(c.tag)}: ${c.note}. Tỉ lệ: ${c.scale}`).join('\n');
  const props = a.props
    .map((p) => `- @${p.tag} (${p.desc})${mark(p.tag)}: ${p.note}` + p.variants.map((v) => `\n  · @${v.tag} (${v.desc})${mark(v.tag)}: ${v.state}`).join(''))
    .join('\n');
  const locs = a.locations
    .map(
      (l) =>
        `- @${l.tag} (${l.desc}): ${l.note}\n  Sơ đồ: ${l.layout}\n  Tỉ lệ: ${l.scale}\n` +
        l.angles.map((g) => `  · Góc ${g.id} (@${g.tag})${mark(g.tag)}: ${g.vi} | EN: ${g.en} | ${g.light}`).join('\n')
    )
    .join('\n');
  return [`STYLE: ${a.style}`, `NHÂN VẬT\n${chars}`, `ĐẠO CỤ\n${props || '—'}`, `BỐI CẢNH\n${locs}`].join('\n\n');
}
