// Ghép "kịch bản" của dự án từ đề cương + các scene đã viết.
// Các bước sau (thiết kế, từng beat, PDF) vẫn đọc project.script / project.scenes như cũ.
import type { Direction, Idea, Outline, OutlineScene, Project, Scene, Script, SceneScript } from '../types';
import { effectiveStyle } from './styles';

export interface FlatScene extends OutlineScene {
  actId: string;
  actName: string;
  index: number;
}

export function flatScenes(o?: Outline): FlatScene[] {
  if (!o) return [];
  const out: FlatScene[] = [];
  o.acts.forEach((a) => a.scenes.forEach((s) => out.push({ ...s, actId: a.id, actName: `${a.id} · ${a.name}`, index: out.length })));
  return out;
}

/** Beat đầu tiên của scene thứ i = tổng số beat các scene trước + 1 (các scene trước phải đã viết). */
export function startBeatFor(p: Project, index: number): number | null {
  const scenes = flatScenes(p.outline);
  let n = 1;
  for (let i = 0; i < index; i++) {
    const s = p.sceneScripts?.[scenes[i].id];
    if (!s || s.stale) return null;
    n += s.beats.length;
  }
  return n;
}

/** Ghép script + scenes từ đề cương và các scene đã viết. */
export function assemble(p: Project): Pick<Project, 'script' | 'scenes'> {
  const o = p.outline;
  if (!o) return { script: p.script, scenes: p.scenes };
  const scenes = flatScenes(o);
  const written = scenes.map((s) => ({ s, sc: p.sceneScripts?.[s.id] })).filter((x) => x.sc && !x.sc.stale) as {
    s: FlatScene;
    sc: SceneScript;
  }[];
  const beats = written.flatMap((x) => x.sc.beats);
  const script: Script = {
    markdown: [o.markdown, ...written.map((x) => x.sc.markdown)].join('\n\n---\n\n'),
    style: effectiveStyle(p),
    totalSeconds: beats.reduce((t, b) => t + b.duration, 0),
    targetSeconds: o.targetSeconds,
    beats,
    characters: o.characters,
    props: o.props,
    gate: written.flatMap((x) => x.sc.gate),
    createdAt: o.createdAt,
  };
  const sceneList: Scene[] = written.map((x) => ({
    id: x.s.id,
    location: x.s.location,
    time: x.s.time,
    light: x.s.light,
    beats: x.sc.beats.map((b) => b.id),
  }));
  return { script, scenes: sceneList };
}

/** Kịch bản gửi kèm khi viết một beat: đề cương + đúng scene chứa beat (thay vì cả phim). */
export function markdownForBeat(p: Project, beatId: string): string {
  if (!p.outline) return p.script?.markdown || '';
  const b = p.script?.beats.find((x) => x.id === beatId);
  const sc = b?.sceneId ? p.sceneScripts?.[b.sceneId] : undefined;
  return sc ? `${p.outline.markdown}\n\n---\n\n${sc.markdown}` : p.outline.markdown;
}

/** Kịch bản gửi cho bước thiết kế: đề cương đã có đủ nhân vật (1.3) và đạo cụ (1.5) của cả phim. */
export function markdownForDesign(p: Project): string {
  return p.outline ? p.outline.markdown : p.script?.markdown || '';
}

/** Thẻ ý tưởng đã có khung truyện → dùng thẳng làm hướng A (không bắt chọn thêm lần nữa). */
export function directionFromIdea(i: Idea): Direction {
  return {
    key: 'A',
    name: i.title,
    core: i.logline,
    frame: i.frame,
    hook: i.hook,
    turn: i.turn,
    ending: i.ending,
    structure: `khoảng ${i.beats} beat${i.seconds ? ` (~${i.seconds} giây)` : ''}`,
    why: 'Khung truyện của thẻ ý tưởng đã chọn',
    feeling: i.message,
    fitsFor: '',
    veoRisk: i.veoNote,
  };
}
