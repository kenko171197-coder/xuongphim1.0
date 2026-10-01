// Dựng yêu cầu viết đầu vào cho một beat (LÕI Bước 3) từ dữ liệu dự án.
// Dùng chung cho bước "Từng beat" và cho Trợ lý khi người dùng bấm "Áp dụng".
import type { BeatInput, Project } from '../types';
import { usableFrame, usableImage } from '../types';
import { projectLibrary } from './refs';
import { getImage, shrinkDataUrl, splitDataUrl } from './images';
import { writeBeatInput } from '../services/api';
import { markdownForBeat } from './script';

export const beatNum = (id: string) => parseInt(id.replace(/\D/g, ''), 10) || 0;

export function stateTagsOf(p: Project) {
  return (p.script?.props || []).flatMap((x) => (x.stateTags || []).map((t) => ({ tag: t, parent: x.tag, note: x.note })));
}

export async function runBeatInput(p: Project, beatId: string, feedback = '', withPrevious = false): Promise<BeatInput> {
  const allBeats = p.script?.beats || [];
  const idx = allBeats.findIndex((b) => b.id === beatId);
  if (idx < 0) throw new Error(`Không có beat ${beatId} trong kịch bản.`);

  // Beat liền trước: đầu vào 3.10 đầy đủ (vị trí, frame, ghi chú hậu kỳ).
  // Hai beat xa hơn: chỉ ô Script — đủ giữ mạch mà nhẹ hơn nhiều.
  const previousBeats = allBeats
    .slice(Math.max(0, idx - 3), idx)
    .reverse()
    .map((b, i) => {
      const inp = p.beats?.[b.id]?.input;
      // markdown 3.10 không còn chép ô Script (bỏ phần lặp) → ghép ô Script vào cho beat liền trước
      return { beatId: b.id, markdown: !inp ? '' : i === 0 ? `${inp.markdown}\n\nÔ Script của ${b.id}:\n${inp.script}` : `Ô Script của ${b.id}:\n${inp.script}` };
    })
    .filter((b) => b.markdown);

  // Nhịp 3: gửi kèm ảnh thật của tối đa 3 frame gần nhất từ các beat trước
  const assets = p.assets || [];
  const priorFrames = assets
    .filter((a) => usableFrame(a) && a.beatId && beatNum(a.beatId) < beatNum(beatId))
    .sort((a, b) => beatNum(b.beatId!) - beatNum(a.beatId!) || b.tag.localeCompare(a.tag))
    .slice(0, 3);
  const frameImages: { tag: string; mime: string; data: string }[] = [];
  for (const f of priorFrames) {
    const url = await getImage(f.imageId!);
    // 768px = đúng một ô ảnh của Gemini (~260 token), vẫn đủ rõ để đọc vị trí và tư thế
    if (url) frameImages.push({ tag: f.tag, ...splitDataUrl(await shrinkDataUrl(url, 768)) });
  }

  const scene = (p.scenes || []).find((s) => s.beats.includes(beatId)) || null;
  const current = p.beats?.[beatId]?.input;

  return writeBeatInput(p, {
    beatId,
    scene,
    library: projectLibrary(p)
      .filter((a) => a.kind !== 'frame' || usableFrame(a))
      .map((a) => ({ tag: a.tag, kind: a.kind, note: a.note, seen: a.seen, beatId: a.beatId, hasImage: usableImage(a) })),
    stateTags: stateTagsOf(p),
    previousBeats,
    frameImages,
    feedback,
    previousOutput: withPrevious && current ? current.markdown : '',
    borrowed: allBeats[idx]?.borrowed || p.borrowPlan?.[beatId]?.module || '',
    scriptMarkdown: markdownForBeat(p, beatId),
  });
}
