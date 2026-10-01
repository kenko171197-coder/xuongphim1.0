// Kiểu dữ liệu dùng chung cho server và giao diện.
// Tên trường bằng tiếng Anh cho code; nghĩa của từng trường ghi theo thuật ngữ trong knowledge/buoc/0-chung.md.

export type LengthKey = 'ngan' | 'trung-binh' | 'dai';
export type AspectChoice = 'auto' | '9:16' | '16:9';
export type IdeaMode = 'goi-y' | 'tu-y' | 'bien-the';

export const LENGTH_LABEL: Record<LengthKey, string> = { ngan: 'Ngắn', 'trung-binh': 'Trung bình', dai: 'Dài' };

/** Thể loại đọc từ knowledge/kich-ban/*.md (khối đầu file) */
export interface ScriptType {
  id: string;
  name: string;
  summary: string;
  aspect: string;
  dialogue: string;
  durations: Record<LengthKey, string>;
  style: string;
}

/* ---------------- Bước 1 · Ý tưởng ---------------- */

export interface Idea {
  id: string;
  createdAt: number;
  scriptType: string;
  length: LengthKey;
  title: string;
  logline: string;
  formula: string;
  hook: string;
  turn: string;
  ending: string;
  characters: string[];
  locations: string[];
  seconds: number;
  clips: number;
  aspect: string;
  whyGood: string;
  productionRisk: string;
  status?: 'liked' | 'disliked';
}

/* ---------------- Bước 2 · Outline ---------------- */

export interface CharacterOutline {
  tag: string;
  role: string;
  look: string;
  wants: string;
  reflex: string;
  weakness: string;
  scale: string;
}

export interface LocationOutline {
  tag: string;
  description: string;
  landmarks: string;
  scenes: string[];
}

export interface PropOutline {
  tag: string;
  role: string;
  shapeNeeded: string;
  afterTag: string;
  afterDescription: string;
  afterFromScene: string;
}

export interface SceneOutline {
  id: string;
  act: string;
  location: string;
  timeOfDay: string;
  role: string;
  purpose: string;
  change: string;
  endState: string;
  characters: string[];
  props: string[];
  clips: number;
}

export interface Outline {
  title: string;
  summary: string;
  characters: CharacterOutline[];
  locations: LocationOutline[];
  props: PropOutline[];
  axisLock: string;
  scenes: SceneOutline[];
  warnings: string[];
}

/* ---------------- Bước 3 · Tài sản ---------------- */

export interface CharacterAsset {
  tag: string;
  /** Cụm mô tả tiếng Anh — dùng nguyên văn trong mọi prompt: @tag (desc) */
  desc: string;
  note: string;
  age: string;
  personality: string;
  look: string;
  outfit: string;
  expression: string;
  scale: string;
  standardPrompt: string;
  details: string;
  /** App ghép: mẫu Character Reference Sheet + details */
  sheetPrompt: string;
}

export interface PropVariant {
  tag: string;
  desc: string;
  note: string;
  state: string;
  editPrompt: string;
}

export interface PropAsset {
  tag: string;
  desc: string;
  note: string;
  description: string;
  imagePrompt: string;
  variants: PropVariant[];
}

export interface LocationAngle {
  /** a, b, c, d — ảnh có tag `${location.tag}-${id}` */
  id: string;
  tag: string;
  vi: string;
  en: string;
  light: string;
  prompt: string;
}

export interface LocationAsset {
  tag: string;
  desc: string;
  note: string;
  layout: string;
  scale: string;
  angles: LocationAngle[];
  /** Lượt 2: những gì AI thấy trong ảnh góc a thật */
  seen?: string;
  /** Lượt 2: chỗ ảnh thật lệch sơ đồ / lỗi ảnh góc a */
  angleWarnings?: string[];
}

export interface Assets {
  style: string;
  characters: CharacterAsset[];
  props: PropAsset[];
  locations: LocationAsset[];
  warnings: string[];
}

export type SlotKind = 'character' | 'prop' | 'variant' | 'angle' | 'frame';

/** Một ô ảnh chờ nạp (mỗi tag một ô) */
export interface ImageSlot {
  tag: string;
  kind: SlotKind;
  label: string;
  desc: string;
  note: string;
}

/* ---------------- Bước 4 · Shot list ---------------- */

export type FlowMode = 'nguyen-lieu' | 'khung-dau' | 'khung-dau-cuoi';
export const FLOW_MODE_LABEL: Record<FlowMode, string> = {
  'nguyen-lieu': 'Nguyên liệu',
  'khung-dau': 'Khung đầu',
  'khung-dau-cuoi': 'Khung đầu + cuối',
};
export const SHOT_SIZES = ['toàn', 'trung', 'cận', 'đặc tả'] as const;
export const CAMERA_MOVES = ['đứng yên', 'lia theo', 'đẩy chậm vào', 'kéo chậm ra'] as const;

export interface Shot {
  /** giây bắt đầu / kết thúc trong clip */
  from: number;
  to: number;
  /** id góc máy của bối cảnh: a, b, c, d */
  angle: string;
  size: string;
  move: string;
  /** Ai ở đâu */
  where: string;
  /** Hành động (có thể có nhịp con) */
  action: string;
}

export interface Clip {
  /** S1-C01 */
  id: string;
  scene: string;
  seconds: number;
  mode: FlowMode;
  difficulty: number;
  /** Chuyển biến của clip */
  change: string;
  location: string;
  /** Tài sản có mặt trong clip + ảnh góc máy các shot dùng */
  assets: string[];
  /** id module tình huống */
  situations: string[];
  locks: string;
  firstFrame: string;
  lastFrame: string;
  shots: Shot[];
  sound: string;
  /** rỗng = không thoại */
  dialogue: string;
  /** rỗng = không nhạc */
  music: string;
  /** Trạng thái bối cảnh sau clip, cộng dồn */
  carryOver: string;
  risk: string;
}

export interface SceneShots {
  scene: string;
  clips: Clip[];
  missingAssets: string[];
  warnings: string[];
  createdAt: number;
}

/* ---------------- Bước 5 · Prompt ---------------- */

export interface ClipPrompt {
  video: string;
  firstFrame: string;
  lastFrame: string;
  /** Ảnh cần nạp khi tạo ảnh khung đầu / khung cuối (chỉ tài sản có trong khung đó + ảnh góc máy) */
  frameRefs: { first: string[]; last: string[] };
  /** Ảnh cần nạp trong Flow, theo thứ tự */
  load: string[];
  added: string[];
  warnings: string[];
  /** Dấu của clip lúc biên dịch — khác dấu hiện tại nghĩa là shot list đã sửa sau đó */
  clipHash: string;
  builtAt: number;
}

/* ---------------- Bước 6 · Duyệt ---------------- */

export type ClipStatus = 'chua-chay' | 'dat' | 'can-sua' | 'chay-lai';
export const CLIP_STATUS_LABEL: Record<ClipStatus, string> = {
  'chua-chay': 'Chưa chạy',
  dat: 'Đạt',
  'can-sua': 'Cần sửa',
  'chay-lai': 'Chạy lại',
};

export interface FrameScore {
  criteria: { name: string; points: number; comment: string }[];
  total: number;
  ok: boolean;
}

export interface Review {
  at: number;
  note: string;
  verdict: 'dung-duoc' | 'sua' | 'chay-lai';
  summary: string;
  edits: string[];
  fixShotList: string;
  updates: string;
  frame?: FrameScore;
}

/** Tag ảnh khung đầu / khung cuối của một clip: s1-c02-dau, s1-c02-cuoi */
export const frameTag = (clipId: string, which: 'dau' | 'cuoi') => `${clipId.toLowerCase()}-${which}`;

/** Dấu ngắn của nội dung clip (để biết prompt đã cũ hay chưa) */
export function clipHash(c: Clip): string {
  const s = JSON.stringify([c.seconds, c.mode, c.assets, c.situations, c.locks, c.firstFrame, c.lastFrame, c.shots, c.sound, c.dialogue, c.music, c.location]);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/* ---------------- Dự án ---------------- */

export interface ProjectSettings {
  scriptType: string;
  length: LengthKey;
  aspect: string;
}

export interface Project {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  settings: ProjectSettings;
  idea: Idea;
  outline?: Outline;
  outlinePrev?: Outline;
  assets?: Assets;
  assetsPrev?: Assets;
  /** Style đã chốt cho phim (có thể khác style mặc định của thể loại) */
  style?: string;
  /** tag → id ảnh trong IndexedDB */
  images: Record<string, string>;
  /** Bước 4: shot list theo scene id */
  shots?: Record<string, SceneShots>;
  shotsPrev?: Record<string, SceneShots>;
  /** Bước 5: prompt theo clip id */
  prompts?: Record<string, ClipPrompt>;
  /** Bước 6 */
  status?: Record<string, ClipStatus>;
  reviews?: Record<string, Review[]>;
}

/** Mọi clip của dự án theo thứ tự scene */
export function allClips(p: Project): Clip[] {
  if (!p.outline || !p.shots) return [];
  return p.outline.scenes.flatMap((s) => p.shots?.[s.id]?.clips || []);
}

/** Trạng thái bối cảnh trước một clip: dòng "thay đổi còn lưu" của clip gần nhất trước đó cùng bối cảnh */
export function stateBefore(p: Project, clipId: string): string {
  const list = allClips(p);
  const idx = list.findIndex((c) => c.id === clipId);
  if (idx < 0) return '';
  const loc = list[idx].location;
  for (let i = idx - 1; i >= 0; i--) {
    if (list[i].location === loc) {
      const s = list[i].carryOver.trim();
      return s === '—' || s === '-' ? '' : s;
    }
  }
  return '';
}

/** Clip ngay trước (cả phim) */
export function previousClip(p: Project, clipId: string): Clip | undefined {
  const list = allClips(p);
  const idx = list.findIndex((c) => c.id === clipId);
  return idx > 0 ? list[idx - 1] : undefined;
}

/** Danh sách ô ảnh của một bộ tài sản, theo thứ tự hiển thị */
export function imageSlots(a?: Assets): ImageSlot[] {
  if (!a) return [];
  const slots: ImageSlot[] = [];
  a.characters.forEach((c) => slots.push({ tag: c.tag, kind: 'character', label: 'Nhân vật', desc: c.desc, note: c.note }));
  a.props.forEach((p) => {
    slots.push({ tag: p.tag, kind: 'prop', label: 'Đạo cụ', desc: p.desc, note: p.note });
    p.variants.forEach((v) => slots.push({ tag: v.tag, kind: 'variant', label: `Trạng thái sau của @${p.tag}`, desc: v.desc, note: v.note }));
  });
  a.locations.forEach((l) =>
    l.angles.forEach((g) => slots.push({ tag: g.tag, kind: 'angle', label: `Bối cảnh @${l.tag}, góc ${g.id}`, desc: `${l.desc}, ${g.en}`, note: g.vi }))
  );
  return slots;
}

/** Tag có trong outline nhưng bộ tài sản chưa có (outline được sửa sau khi tạo tài sản) */
export function missingAssets(o?: Outline, a?: Assets): string[] {
  if (!o || !a) return [];
  const have = new Set([
    ...a.characters.map((c) => c.tag),
    ...a.props.flatMap((p) => [p.tag, ...p.variants.map((v) => v.tag)]),
    ...a.locations.map((l) => l.tag),
  ]);
  const need = [...o.characters.map((c) => c.tag), ...o.props.flatMap((p) => (p.afterTag ? [p.tag, p.afterTag] : [p.tag])), ...o.locations.map((l) => l.tag)];
  return Array.from(new Set(need.filter((t) => !have.has(t))));
}

/** Chuẩn hoá tag: chữ thường, không dấu, a–z 0–9 và dấu gạch ngang, tối đa 15 ký tự */
export function toTag(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 15);
}
