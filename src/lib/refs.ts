// Auto Map — cùng logic với app Đạo diễn (src/lib/refLibrary.ts):
// quét @tag trong ô Script theo thứ tự xuất hiện, lấy ảnh + Note từ thư viện, tối đa 10 ảnh.
import type { Asset } from '../types';
import { getImage } from './images';

export const MAX_REFS = 10;

/** Lấy mọi @tag trong văn bản, theo thứ tự xuất hiện, đã bỏ trùng. */
export function extractTags(script: string): string[] {
  const found = Array.from((script || '').matchAll(/@([a-zA-Z0-9]+)/g)).map((m) => m[1].toLowerCase());
  return Array.from(new Set(found));
}

export interface MappedRefs {
  refs: { name: string; note: string; base64: string }[];
  matched: string[];
  /** Tag có trong Script nhưng thư viện chưa có */
  unknown: string[];
  /** Tag có ảnh nhưng chưa gắn file ảnh */
  noImage: string[];
  /** Khớp nhưng bị cắt vì vượt 10 ảnh */
  overflow: string[];
}

export async function autoMap(script: string, library: Asset[]): Promise<MappedRefs> {
  const tags = extractTags(script);
  const byTag = new Map(library.filter((a) => a.tag).map((a) => [a.tag.toLowerCase(), a]));

  const matched: string[] = [];
  const unknown: string[] = [];
  const noImage: string[] = [];
  for (const tag of tags) {
    const a = byTag.get(tag);
    if (!a) unknown.push(tag);
    else if (!a.imageId) noImage.push(tag);
    else matched.push(tag);
  }

  const kept = matched.slice(0, MAX_REFS);
  const overflow = matched.slice(MAX_REFS);
  const refs: MappedRefs['refs'] = [];
  for (const tag of kept) {
    const a = byTag.get(tag)!;
    const base64 = await getImage(a.imageId!);
    if (base64) refs.push({ name: a.tag, note: a.note, base64 });
    else noImage.push(tag);
  }
  return { refs, matched: refs.map((r) => r.name), unknown, noImage, overflow };
}

/**
 * Thư viện ảnh đầy đủ của dự án: mọi nhân vật và ★ đạo cụ trong thiết kế (Bước 2),
 * kể cả tag chưa gắn ảnh, cộng các frame nối đã chụp. Note sửa tay được ưu tiên.
 */
export function projectLibrary(p: import('../types').Project): Asset[] {
  const assets = p.assets || [];
  const fromDesign: Asset[] = [
    ...(p.design?.characters || []).map((c) => ({ tag: c.tag, kind: 'character' as const, note: c.note })),
    ...(p.design?.props || []).map((x) => ({ tag: x.tag, kind: 'prop' as const, note: x.note })),
  ].map((d) => {
    const a = assets.find((x) => x.tag === d.tag);
    return a ? { ...d, ...a, kind: d.kind } : d;
  });
  const extra = assets.filter((a) => !fromDesign.some((d) => d.tag === a.tag));
  return [...fromDesign, ...extra];
}
