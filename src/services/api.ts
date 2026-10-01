import type { Idea, IdeaSettings, Project, StudioSettings, ScriptTypeInfo, DeepQuestion, Direction, Script, CharacterDesign, PropDesign, Scene, BeatInput, EngineResult, Outline, SceneScript } from '../types';

import { recordUsage } from '../lib/usage';
import { modelPrefsHeader } from '../lib/modelPrefs';

import { keysHeader, hasAnyKey } from '../lib/apiKeys';

/** Còn giữ tên cũ cho các chỗ đang gọi. */
export const hasApiKey = hasAnyKey;

export const NO_API_KEY_MESSAGE = 'Chưa có API key. Vào tab Cài đặt để thêm key.';

async function post<T>(url: string, body: unknown, opts: { projectId?: string; skipKeyCheck?: boolean } = {}): Promise<T> {
  if (!opts.skipKeyCheck && !hasAnyKey()) throw new Error(NO_API_KEY_MESSAGE);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-gemini-keys': keysHeader(), 'x-gemini-models': modelPrefsHeader() },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `Lỗi máy chủ (${response.status}).`);
  if (data && typeof data === 'object' && 'usage' in data) {
    recordUsage(url, (data as any).usage, opts.projectId);
    delete (data as any).usage;
  }
  return data as T;
}

/** Kiểm tra một key: gọi thử Flash-Lite, và thử Pro để biết key có dùng được Pro không. */
export async function testApiKey(key: string): Promise<{ ok: boolean; message: string; pro?: string }> {
  try {
    const data = await post<{ ok: boolean; pro: string }>('/api/test-key', { key }, { skipKeyCheck: true });
    return { ok: true, message: 'Dùng được', pro: data.pro };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'Không kết nối được tới máy chủ.' };
  }
}

export interface IdeaCallOptions {
  mode: 'suggest' | 'custom' | 'variations';
  studio: StudioSettings;
  baseIdea?: string;
  disliked: { title: string; logline: string }[];
}

export async function generateIdeas(o: IdeaCallOptions): Promise<{ assessment: string; ideas: Idea[] }> {
  const data = await post<{ assessment: string; ideas: Idea[] }>('/api/ideas', {
    mode: o.mode,
    scriptType: o.studio.scriptType,
    duration: o.studio.duration,
    idea: o.studio.idea,
    aspect: o.studio.aspect,
    extra: o.studio.extra,
    baseIdea: o.baseIdea,
    disliked: o.disliked,
  });
  return { assessment: data.assessment || '', ideas: data.ideas || [] };
}

export async function getScriptTypes(): Promise<ScriptTypeInfo[]> {
  const response = await fetch('/api/script-types');
  if (!response.ok) throw new Error('Không đọc được danh sách kiểu kịch bản.');
  return (await response.json()).types || [];
}

export interface KnowledgeStatus {
  loi: string | null;
  modules: { code: string; file: string | null }[];
  scriptTypes?: { id: string; name: string }[];
}

export async function getKnowledgeStatus(): Promise<KnowledgeStatus> {
  const response = await fetch('/api/knowledge-status');
  if (!response.ok) throw new Error('Không đọc được trạng thái kho kiến thức.');
  return response.json();
}

/** Chuyển thẻ ý tưởng thành đoạn văn để làm "ý tưởng gốc" cho biến thể. */
export function ideaToText(i: Idea): string {
  return [
    `Tên: ${i.title}`,
    `Tóm tắt: ${i.logline}`,
    `Khung truyện: ${i.frame}`,
    `Móc: ${i.hook}`,
    `Lật: ${i.turn}`,
    `Chốt: ${i.ending}`,
    i.characters.length ? `Nhân vật: ${i.characters.join('; ')}` : '',
    `Thoại: ${i.dialogue}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/* ---------- Các bước của dự án ---------- */

/** Phần dự án gửi lên server: thiết lập, ý tưởng, hướng đã chọn, câu trả lời đào sâu. */
function payload(p: Project) {
  return {
    project: {
      settings: p.settings,
      idea: p.idea,
      direction: p.directions?.find((d) => d.key === p.chosenDirection) || null,
      answers: (p.questions || []).filter((q) => q.answer).map((q) => ({ question: q.question, answer: q.answer })),
    },
  };
}

export async function askQuestions(p: Project): Promise<DeepQuestion[]> {
  const data = await post<{ questions: { question: string; options: string[] }[] }>('/api/questions', payload(p), { projectId: p.id });
  return data.questions.map((q) => ({ ...q, answer: '' }));
}

export async function askDirections(p: Project, note: string): Promise<Direction[]> {
  const data = await post<{ directions: Direction[] }>('/api/directions', { ...payload(p), note }, { projectId: p.id });
  return data.directions;
}

/* ---------- Kịch bản: đề cương + từng scene ---------- */

export async function writeOutline(
  p: Project,
  r: { targetSeconds: number; feedback?: string; previousMarkdown?: string; style?: string }
): Promise<Outline> {
  const data = await post<{ outline: Omit<Outline, 'targetSeconds' | 'createdAt'> }>('/api/outline', { ...payload(p), ...r }, { projectId: p.id });
  return { ...data.outline, targetSeconds: r.targetSeconds, createdAt: Date.now() };
}

export interface SceneCall {
  outlineMarkdown: string;
  scene: unknown;
  actName: string;
  startBeat: number;
  prevScene: { id: string; endState: string; tail: string } | null;
  nextScene: { id: string; summary: string } | null;
  style: string;
  feedback?: string;
  previousMarkdown?: string;
  waived?: string[];
}

export async function writeScene(p: Project, r: SceneCall): Promise<SceneScript> {
  const data = await post<{ scene: Omit<SceneScript, 'createdAt'> }>('/api/scene', { ...payload(p), ...r }, { projectId: p.id });
  return { ...data.scene, createdAt: Date.now() };
}

export async function makeDesign(p: Project): Promise<{ characters: CharacterDesign[]; props: PropDesign[] }> {
  if (!p.script) throw new Error('Chưa có kịch bản.');
  const data = await post<{ design: { characters: CharacterDesign[]; props: PropDesign[] } }>('/api/design', {
    ...payload(p),
    scriptMarkdown: p.outline ? p.outline.markdown : p.script.markdown,
    style: p.script.style,
  }, { projectId: p.id });
  return data.design;
}

export interface ImageMatch {
  index: number;
  tag: string;
  confidence: number;
  seen: string;
  warning: string;
}

export async function matchImages(
  images: { mime: string; data: string }[],
  tags: { tag: string; kind: 'character' | 'prop'; note: string; description: string }[],
  projectId?: string
): Promise<ImageMatch[]> {
  const data = await post<{ matches: ImageMatch[] }>('/api/match-images', { images, tags }, { projectId });
  return data.matches;
}

/* ---------- Bước 3: từng beat ---------- */

export interface BeatInputRequest {
  beatId: string;
  scene: Scene | null;
  library: { tag: string; kind: string; note: string; seen?: string; beatId?: string; hasImage?: boolean }[];
  previousBeats: { beatId: string; markdown: string }[];
  frameImages: { tag: string; mime: string; data: string }[];
  feedback?: string;
  previousOutput?: string;
  stateTags: { tag: string; parent: string; note: string }[];
  /** Module mượn cho beat này (biên kịch đã đánh dấu khi viết scene) */
  borrowed?: string;
  /** Kịch bản liên quan: đề cương + scene chứa beat */
  scriptMarkdown: string;
}

export async function writeBeatInput(p: Project, r: BeatInputRequest): Promise<BeatInput> {
  if (!p.script) throw new Error('Chưa có kịch bản.');
  const data = await post<{ input: BeatInput }>('/api/beat-input', {
    ...payload(p),
    ...r,
    style: p.script.style,
  }, { projectId: p.id });
  return data.input;
}

export interface FrameRead {
  seen: string;
  note: string;
  stable: boolean;
  criteria: { name: string; points: number; comment: string }[];
  score: number;
  fix: 'ok' | 'chup-lai' | 'tao-lai-video';
  warning: string;
}

export async function readFrame(r: {
  beatId: string;
  tag: string;
  planned: string;
  beatScript: string;
  aspect: string;
  image: { mime: string; data: string };
  kind?: 'frame' | 'state';
}, projectId?: string): Promise<FrameRead> {
  return post('/api/read-frame', r, { projectId });
}

export interface EngineRequest {
  script: string;
  duration: number;
  referenceImages: { name: string; note: string; base64?: string }[];
  cinematicLevel: string;
  promptType: string;
  pacing: string;
}

export const engineGenerate = (r: EngineRequest, projectId?: string) =>
  post<EngineResult>('/api/engine/generate', r, { projectId });

export const engineEdit = (current: EngineResult, userRequest: string, r: EngineRequest, projectId?: string) =>
  post<EngineResult>(
    '/api/engine/edit',
    { current, userRequest, ...r, referenceImages: r.referenceImages.map((x) => ({ name: x.name, note: x.note })) },
    { projectId }
  );

/** Đọc style từ ảnh tham chiếu → chuỗi Style tiếng Anh + mô tả tiếng Việt. */
export async function styleFromImage(image: { mime: string; data: string }, projectId?: string): Promise<{ style: string; summary: string }> {
  return post('/api/style-from-image', { image }, { projectId });
}
