// Gắn STYLE CỦA PHIM vào mọi prompt tạo ảnh tham chiếu (nhân vật, đạo cụ, tham chiếu mới).
// Làm ở app (không nhờ AI) để: (1) mọi ảnh cùng MỘT chuỗi style y hệt → ảnh đồng nhất; (2) đổi style ở bước 3
// thì mọi prompt ảnh tự đổi theo, không phải tạo lại thiết kế.

/** Câu cấm chữ của đạo cụ (LÕI 2.2) — luôn nằm cuối prompt đạo cụ. */
export const PROP_SUFFIX = 'no text, no letters, no logos, no engraving or writing on the surface';

export function withStyle(prompt: string, style: string): string {
  const p = (prompt || '').trim();
  const s = (style || '').trim().replace(/[.\s]+$/, '');
  if (!p || !s) return p;
  // Bỏ câu "Art style: …" cũ (nếu có) để luôn chỉ còn đúng style hiện tại
  const clean = p.replace(/\s*Art style:[^\n]*?(?=\.\s|\.$|$)\.?/gi, '').trim();
  const line = `Art style: ${s}.`;
  // Đạo cụ: style đứng TRƯỚC câu cấm chữ để câu cấm chữ vẫn ở cuối
  const i = clean.toLowerCase().lastIndexOf(PROP_SUFFIX);
  if (i >= 0) {
    const head = clean.slice(0, i).replace(/[,.\s]+$/, '');
    return `${head}. ${line} ${clean.slice(i)}`;
  }
  return `${clean.replace(/[.\s]+$/, '')}. ${line}`;
}
