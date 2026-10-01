// Lưu dự án và ngân hàng ý tưởng trong trình duyệt (localStorage). Ảnh nằm riêng ở IndexedDB (images.ts).
import { useSyncExternalStore } from 'react';
import type { Idea, Project } from '../../shared/types';

const PROJECTS = 'xp2_projects';
const IDEAS = 'xp2_ideas';

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

let projects: Project[] = read<Project[]>(PROJECTS, []);
let ideas: Idea[] = read<Idea[]>(IDEAS, []);
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

function persist(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    alert('Bộ nhớ trình duyệt đã đầy — không lưu được. Hãy xoá bớt dự án cũ.');
  }
}

export const useProjects = () => useSyncExternalStore(subscribe, () => projects);
export const useIdeas = () => useSyncExternalStore(subscribe, () => ideas);

export const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export function saveProject(p: Project) {
  const next = { ...p, updatedAt: Date.now() };
  projects = projects.some((x) => x.id === p.id) ? projects.map((x) => (x.id === p.id ? next : x)) : [next, ...projects];
  persist(PROJECTS, projects);
  emit();
  return next;
}

export function deleteProject(id: string) {
  projects = projects.filter((p) => p.id !== id);
  persist(PROJECTS, projects);
  emit();
}

export function projectFromIdea(idea: Idea, aspect: string): Project {
  const now = Date.now();
  return saveProject({
    id: uid('proj'),
    title: idea.title,
    createdAt: now,
    updatedAt: now,
    settings: { scriptType: idea.scriptType, length: idea.length, aspect },
    idea,
    images: {},
  });
}

/** Thêm thẻ mới vào ngân hàng (thẻ mới lên đầu), giữ tối đa 200 thẻ */
export function addIdeas(list: Idea[]) {
  ideas = [...list, ...ideas].slice(0, 200);
  persist(IDEAS, ideas);
  emit();
}

export function setIdeaStatus(id: string, status: Idea['status']) {
  ideas = ideas.map((i) => (i.id === id ? { ...i, status: i.status === status ? undefined : status } : i));
  persist(IDEAS, ideas);
  emit();
}

export function removeIdea(id: string) {
  ideas = ideas.filter((i) => i.id !== id);
  persist(IDEAS, ideas);
  emit();
}
