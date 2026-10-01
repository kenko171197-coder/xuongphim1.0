// Đọc kho kiến thức trong thư mục knowledge/.
// App KHÔNG chứa luật viết cứng: mọi lời dặn cho Gemini lấy từ các file ở đây.
// Đọc lại mỗi 30 giây, nên sửa file không cần khởi động lại server.
import fs from 'node:fs';
import path from 'node:path';
import type { LengthKey, ScriptType } from '../shared/types';

export const KNOWLEDGE_DIR = path.join(process.cwd(), 'knowledge');

export interface Doc {
  id: string;
  file: string;
  meta: Record<string, string | string[]>;
  body: string;
}

export interface Library {
  chung?: Doc;
  steps: Map<string, Doc>;
  scriptTypes: Doc[];
  modules: Doc[];
  models: Doc[];
  errors: string[];
  loadedAt: number;
}

/* ======================= Khối đầu file ======================= */

/** Khối giữa hai dòng `---` ở đầu file. Hỗ trợ `khoa: gia tri`, chuỗi trong ngoặc kép, mảng `[a, b]`. */
export function parseFrontmatter(text: string): { meta: Record<string, string | string[]>; body: string } {
  const src = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(src);
  if (!m) return { meta: {}, body: src };
  const meta: Record<string, string | string[]> = {};
  for (const line of m[1].split('\n')) {
    const kv = /^([A-Za-z0-9_.-]+)\s*:\s*(.*)$/.exec(line.trim());
    if (!kv) continue;
    const raw = kv[2].trim();
    if (raw.startsWith('[') && raw.endsWith(']')) {
      meta[kv[1]] = raw
        .slice(1, -1)
        .split(',')
        .map((s) => unquote(s.trim()))
        .filter(Boolean);
    } else {
      meta[kv[1]] = unquote(raw);
    }
  }
  return { meta, body: src.slice(m[0].length).trim() };
}

const unquote = (s: string) => (/^(["']).*\1$/.test(s) ? s.slice(1, -1) : s);

export const metaStr = (d: Doc | undefined, key: string, fallback = '') => {
  const v = d?.meta[key];
  return typeof v === 'string' ? v : Array.isArray(v) ? v.join(', ') : fallback;
};
export const metaList = (d: Doc | undefined, key: string): string[] => {
  const v = d?.meta[key];
  return Array.isArray(v) ? v : typeof v === 'string' && v ? [v] : [];
};

/* ======================= Đọc thư mục ======================= */

function readFolder(folder: string, errors: string[]): Doc[] {
  const dir = path.join(KNOWLEDGE_DIR, folder);
  if (!fs.existsSync(dir)) {
    errors.push(`Thiếu thư mục knowledge/${folder}/`);
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .sort()
    .map((f) => {
      const { meta, body } = parseFrontmatter(fs.readFileSync(path.join(dir, f), 'utf8'));
      const id = typeof meta.id === 'string' && meta.id ? meta.id : f.replace(/\.md$/, '');
      if (!meta.id) errors.push(`${folder}/${f}: thiếu dòng "id" ở khối đầu file`);
      return { id, file: `${folder}/${f}`, meta, body };
    });
}

let cache: Library | null = null;

export function library(): Library {
  if (cache && Date.now() - cache.loadedAt < 30_000) return cache;
  const errors: string[] = [];
  const steps = readFolder('buoc', errors);
  const lib: Library = {
    chung: steps.find((d) => d.id === '0-chung'),
    steps: new Map(steps.map((d) => [d.id, d])),
    scriptTypes: readFolder('kich-ban', errors),
    modules: readFolder('module', errors),
    models: readFolder('mo-hinh', errors),
    errors,
    loadedAt: Date.now(),
  };
  validate(lib);
  cache = lib;
  return lib;
}

/* ======================= Cắt mục ======================= */

/**
 * Lấy một mục của file kịch bản theo số: "5" → từ `## 5.` tới tiêu đề `## ` kế tiếp;
 * "7.1" → từ `### 7.1` tới tiêu đề `##`/`###` kế tiếp.
 */
export function section(body: string, key: string): string {
  const lines = body.split('\n');
  const sub = key.includes('.');
  const start = lines.findIndex((l) =>
    sub ? new RegExp(`^###\\s+${escape(key)}(\\s|$)`).test(l) : new RegExp(`^##\\s+${escape(key)}\\.(\\s|$)`).test(l)
  );
  if (start < 0) return '';
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (sub ? /^#{2,3}\s/.test(lines[i]) : /^##\s/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join('\n').trim();
}

/** Lấy mục theo tiêu đề chính xác (VD "## Khi viết prompt") tới tiêu đề `## ` kế tiếp. */
export function headingSection(body: string, heading: string): string {
  const lines = body.split('\n');
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start < 0) return '';
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join('\n').trim();
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ======================= Module ======================= */

export const MODULE_HEADINGS = {
  shot: '## Khi viết shot list',
  prompt: '## Khi viết prompt',
  examples: '## Ví dụ đúng / sai',
} as const;

/** Mục lục module: mỗi module một dòng (id, tên, dùng khi). */
export function moduleIndex(): string {
  return library()
    .modules.map((m) => `- ${m.id} — ${metaStr(m, 'ten')}: dùng khi ${metaStr(m, 'dung-khi')}`)
    .join('\n');
}

/** Nguyên văn một nửa của module (kèm ví dụ đúng/sai). */
export function moduleHalf(id: string, half: 'shot' | 'prompt'): string {
  const m = library().modules.find((d) => d.id === id);
  if (!m) return '';
  return [`### MODULE ${m.id} — ${metaStr(m, 'ten')}`, headingSection(m.body, MODULE_HEADINGS[half]), headingSection(m.body, MODULE_HEADINGS.examples)]
    .filter(Boolean)
    .join('\n\n');
}

/* ======================= Thể loại ======================= */

export function scriptTypeDoc(id: string): Doc | undefined {
  return library().scriptTypes.find((d) => d.id === id);
}

export function scriptTypes(): ScriptType[] {
  return library().scriptTypes.map((d) => ({
    id: d.id,
    name: metaStr(d, 'ten', d.id),
    summary: metaStr(d, 'mo-ta'),
    aspect: metaStr(d, 'ti-le-mac-dinh', '9:16'),
    dialogue: metaStr(d, 'thoai', 'co'),
    durations: {
      ngan: metaStr(d, 'thoi-luong-ngan'),
      'trung-binh': metaStr(d, 'thoi-luong-trung-binh'),
      dai: metaStr(d, 'thoi-luong-dai'),
    } as Record<LengthKey, string>,
    style: metaStr(d, 'style-mac-dinh'),
  }));
}

/** File mô hình đang dùng (hiện chỉ có Omni Flash; sau này chọn theo cài đặt). */
export function activeModel(): Doc | undefined {
  const lib = library();
  return lib.models.find((d) => d.id === 'omni-flash') || lib.models[0];
}

/* ======================= Kiểm tra kho ======================= */

const REQUIRED_TYPE_SECTIONS = ['1', '2', '3', '4', '5', '6', '7'];
export const REQUIRED_STEPS = ['0-chung', '1-y-tuong', '2-outline', '3-tai-san', '4-shot-list', '5-prompt', '6-duyet-sua'];

function validate(lib: Library) {
  for (const id of REQUIRED_STEPS) if (!lib.steps.has(id)) lib.errors.push(`Thiếu file buoc/${id}.md`);
  if (!lib.scriptTypes.length) lib.errors.push('Chưa có thể loại nào trong knowledge/kich-ban/');
  if (!lib.models.length) lib.errors.push('Chưa có file mô hình nào trong knowledge/mo-hinh/');

  for (const t of lib.scriptTypes) {
    for (const s of REQUIRED_TYPE_SECTIONS) if (!section(t.body, s)) lib.errors.push(`${t.file}: thiếu mục "## ${s}."`);
    if (!metaStr(t, 'ten')) lib.errors.push(`${t.file}: thiếu dòng "ten"`);
  }
  for (const m of lib.modules) {
    if (!metaStr(m, 'dung-khi')) lib.errors.push(`${m.file}: thiếu dòng "dung-khi"`);
    for (const h of Object.values(MODULE_HEADINGS)) if (!headingSection(m.body, h)) lib.errors.push(`${m.file}: thiếu mục "${h}"`);
  }
  for (const step of lib.steps.values()) {
    for (const key of metaList(step, 'kich-ban-muc')) {
      for (const t of lib.scriptTypes) {
        if (!section(t.body, key)) lib.errors.push(`${step.file} cần mục ${key} nhưng ${t.file} không có`);
      }
    }
  }
}

export function knowledgeStatus() {
  const lib = library();
  const list = (docs: Doc[]) => docs.map((d) => ({ id: d.id, file: d.file, name: metaStr(d, 'ten', d.id), size: d.body.length }));
  return {
    steps: list(Array.from(lib.steps.values())),
    scriptTypes: list(lib.scriptTypes),
    modules: list(lib.modules),
    models: list(lib.models),
    errors: lib.errors,
  };
}
