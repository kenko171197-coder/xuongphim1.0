// Rà soát cuối bước — tiện ích dùng chung: dấu vân tay nội dung, tình trạng, gộp cách sửa.
import type { Project, ReviewIssue, StepReviewResult } from '../types';

/** Dấu vân tay nội dung của một khoá rà soát: nội dung đổi sau khi rà → kết quả rà đã cũ. */
export function reviewBasis(p: Project, key: string): string {
  if (key === 'y-tuong') return JSON.stringify(p.idea);
  if (key === 'huong') return JSON.stringify(p.directions?.find((d) => d.key === p.chosenDirection) || null);
  if (key === 'kich-ban:film')
    return `${p.outline?.createdAt || 0}|${Object.entries(p.sceneScripts || {}).map(([k, v]) => `${k}:${v.createdAt}`).sort().join(',')}`;
  if (key.startsWith('kich-ban:')) return String(p.sceneScripts?.[key.slice(9)]?.createdAt || 0);
  if (key === 'nhan-vat') return JSON.stringify(p.design || null) + JSON.stringify((p.assets || []).filter((a) => a.kind !== 'frame').map((a) => [a.tag, a.note, a.imageId]));
  if (key.startsWith('beat:')) {
    const w = p.beats?.[key.slice(5)];
    return `${w?.inputAt || 0}|${w?.input?.script || ''}`;
  }
  return '';
}

export interface ReviewState {
  result?: StepReviewResult;
  reviewed: boolean;
  outdated: boolean;
  openHigh: ReviewIssue[];
  open: ReviewIssue[];
}

export function reviewState(p: Project, key: string): ReviewState {
  const result = p.reviews?.[key];
  const outdated = !!result && result.basis !== reviewBasis(p, key);
  const open = result && !outdated ? result.issues.filter((i) => !i.status) : [];
  return { result, reviewed: !!result && !outdated, outdated, open, openHigh: open.filter((i) => i.mucDo === 'cao') };
}

/** Gộp nhiều lỗi thành một yêu cầu sửa gửi cho tác vụ viết lại. */
export const fixText = (issues: ReviewIssue[]) =>
  'Sửa theo kết quả rà soát:\n' + issues.map((i) => `- ${i.beat ? `${i.beat}: ` : ''}${i.moTa} → ${i.cachSua}`).join('\n');

/** Kết quả lần rà trước gửi kèm lần rà sau (kể cả khi đã cũ) — để AI kiểm lỗi đã sửa, không báo lại lỗi đã bỏ qua. */
export interface PreviousIssue {
  moTa: string;
  mucDo: string;
  status: string;
}

export const previousOf = (p: Project, key: string): PreviousIssue[] =>
  (p.reviews?.[key]?.issues || []).map((i) => ({ moTa: i.moTa, mucDo: i.mucDo, status: i.status || '' }));
