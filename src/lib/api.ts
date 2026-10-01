// Gọi server. Mọi request mang theo nhóm API key và model đã chọn (header), rồi ghi lại số token thật.
import { keysHeader, loadKeyOrder } from './apiKeys';
import { modelPrefsHeader } from './modelPrefs';
import { recordUsage } from './usage';
import type { Assets, Clip, ClipPrompt, Idea, IdeaMode, LocationAsset, Outline, Project, ProjectSettings, Review, SceneShots, ScriptType } from '../../shared/types';
import { previousClip, stateBefore } from '../../shared/types';

async function post<T>(url: string, body: unknown, projectId?: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-gemini-keys': keysHeader(), 'x-gemini-models': modelPrefsHeader(), 'x-key-order': loadKeyOrder() },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Không kết nối được server. Kiểm tra app còn đang chạy.');
  }
  const data = await res.json().catch(() => ({}));
  if (data?.usage) recordUsage(url, data.usage, projectId);
  if (!res.ok) throw new Error(data?.error || `Lỗi ${res.status}`);
  return data as T;
}

export interface KnowledgeInfo {
  scriptTypes: ScriptType[];
  status: {
    steps: { id: string; file: string; name: string; size: number }[];
    scriptTypes: { id: string; file: string; name: string; size: number }[];
    modules: { id: string; file: string; name: string; size: number }[];
    models: { id: string; file: string; name: string; size: number }[];
    errors: string[];
  };
  /** Đọc từ file mô hình: độ dài clip, số ảnh nguyên liệu tối đa */
  limits: { min: number; max: number; maxRefs: number };
}

export async function getKnowledge(): Promise<KnowledgeInfo> {
  const res = await fetch('/api/knowledge');
  if (!res.ok) throw new Error('Không đọc được kho kiến thức.');
  return res.json();
}

export interface KeyTestResult { model: string; name: string; ok: boolean; message: string }

export const testKeyApi = async (key: string): Promise<{ ok: boolean; results: KeyTestResult[]; error?: string }> => {
  const res = await fetch('/api/test-key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, results: Array.isArray(data?.results) ? data.results : [], error: data?.error };
};

export const requestIdeas = (body: {
  scriptType: string; length: string; aspect: string; mode: IdeaMode; idea?: string; extra?: string; base?: Idea; disliked: string[]; count: number;
}) => post<{ assessment: string; ideas: Idea[] }>('/api/ideas', body);

const projectBody = (p: Project) => ({ settings: p.settings, idea: p.idea });

export const requestOutline = (p: Project, feedback = '', previous?: Outline) =>
  post<{ outline: Outline; warnings?: string[] }>('/api/outline', { ...projectBody(p), feedback, previous }, p.id);

export const requestAssets = (p: Project, style: string, feedback = '', previous?: Assets) =>
  post<{ assets: Assets }>('/api/assets', { ...projectBody(p), outline: p.outline, style, feedback, previous }, p.id);

export const requestAngles = (p: Project, location: LocationAsset, image: { mime: string; data: string }, extra = '') =>
  post<{ location: LocationAsset }>('/api/location-angles', { ...projectBody(p), outline: p.outline, style: p.style || p.assets?.style, location, image, extra }, p.id);

/** Bước 4: shot list cho một scene */
export const requestShots = (p: Project, sceneId: string, feedback = '', previous?: SceneShots) => {
  const idx = p.outline?.scenes.findIndex((s) => s.id === sceneId) ?? -1;
  const prevScene = idx > 0 ? p.outline?.scenes[idx - 1] : undefined;
  const prevClips = prevScene ? p.shots?.[prevScene.id]?.clips : undefined;
  return post<{ shots: SceneShots }>(
    '/api/shotlist',
    { ...projectBody(p), outline: p.outline, assets: p.assets, images: p.images, sceneId, prevClip: prevClips?.[prevClips.length - 1], feedback, previous },
    p.id
  );
};

/** Bước 5: biên dịch một clip */
export const requestClipPrompt = (p: Project, clip: Clip, feedback = '') =>
  post<{ prompt: ClipPrompt }>(
    '/api/clip-prompt',
    { settings: p.settings, assets: p.assets, clip, state: stateBefore(p, clip.id), timeOfDay: p.outline?.scenes.find((s) => s.id === clip.scene)?.timeOfDay || '', feedback },
    p.id
  );

/** Bước 6: duyệt clip đã chạy */
export const requestReview = (p: Project, clip: Clip, note: string, images: { mime: string; data: string }[], checkFrame: boolean) =>
  post<{ review: Review }>(
    '/api/review',
    { settings: p.settings, assets: p.assets, clip, prompt: p.prompts?.[clip.id]?.video || '', note, images, checkFrame },
    p.id
  );

export { previousClip };

export const requestMatch = (projectId: string, images: { mime: string; data: string }[], tags: { tag: string; label: string; desc: string; note: string }[]) =>
  post<{ matches: { index: number; tag: string; confidence: number; seen: string; warning: string }[] }>('/api/match-images', { images, tags }, projectId);

export const requestStyle = (image: { mime: string; data: string }, projectId?: string) =>
  post<{ style: string; summary: string }>('/api/style-from-image', { image }, projectId);

export type { ProjectSettings };
