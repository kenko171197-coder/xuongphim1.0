// Ảnh chụp dự án gửi cho Trợ lý: đủ để hiểu mọi bước, không gửi ảnh (ảnh chỉ đi kèm tin nhắn).
import type { Project } from '../types';
import { usableImage } from '../types';
import { projectLibrary } from './refs';

export function buildSnapshot(p: Project, step: string, stepNumber: number, currentBeat: string) {
  const all = p.script?.beats || [];
  const cur = all.findIndex((b) => b.id === currentBeat);
  // Ô Script chỉ gửi cho beat đang mở và 2 beat mỗi bên; beat khác chỉ gửi tên + tóm tắt
  const near = (i: number) => cur < 0 || Math.abs(i - cur) <= 2;
  return {
    step,
    stepNumber,
    currentBeat,
    script: p.script
      ? { markdown: p.script.markdown, style: p.script.style, gate: p.script.gate }
      : null,
    scenes: p.scenes || [],
    library: projectLibrary(p).map((a) => ({
      tag: a.tag,
      kind: a.state ? 'trạng thái sau' : a.kind,
      note: a.note,
      seen: a.seen,
      score: a.score,
      fix: a.fix,
      hasImage: usableImage(a),
      beatId: a.beatId,
    })),
    beats: all.map((b, i) => {
      const w = p.beats?.[b.id];
      return {
        id: b.id,
        name: b.name,
        duration: b.duration,
        summary: b.summary,
        script: near(i) ? w?.input?.script : undefined,
        markdown: b.id === currentBeat ? w?.input?.markdown : undefined,
        missing: w?.acceptMissing ? [] : w?.input?.missing,
        blocked: w?.input?.blocked,
        warnings: w?.engine?.warnings,
        finalPrompt: b.id === currentBeat ? w?.engine?.finalPrompt : undefined,
      };
    }),
  };
}
