export type ModuleCode =
  | 'M01' | 'M02' | 'M03' | 'M04' | 'M05' | 'M06' | 'M07'
  | 'M08' | 'M09' | 'M10' | 'M11' | 'M12' | 'M13' | 'M14';

/** 'ngan' | 'trung-binh' | 'dai' là 3 mức mới; các mức theo beat cũ giữ lại cho dự án cũ. */
export type LengthKey = 'ngan' | 'trung-binh' | 'dai' | '1beat' | '2-3beat' | '4-8beat' | '8plus' | 'series';
export type DurationKey = 'ngan' | 'trung-binh' | 'dai';

export interface IdeaSettings {
  module: ModuleCode;
  secondary: ModuleCode | '';
  length: LengthKey;
  aspect: '9:16' | '16:9';
  dialogue: 'auto' | 'co' | 'khong';
  form: 'auto' | 'hoathinh' | 'nguoithat';
  extra: string;
  /** Kiểu kịch bản (id file trong knowledge/kieu-kich-ban/) */
  scriptType?: string;
  scriptTypeName?: string;
}

/** Thiết lập của Phòng Ý tưởng. */
export interface StudioSettings {
  mode: 'suggest' | 'custom';
  scriptType: string;
  duration: DurationKey;
  idea: string;
  aspect: 'auto' | '9:16' | '16:9';
  extra: string;
}

export interface ScriptTypeInfo {
  id: string;
  name: string;
  summary: string;
  modules: ModuleCode[];
  aspect: '9:16' | '16:9' | '';
  durations: Record<DurationKey, string>;
}

/** Một thẻ ý tưởng do Phòng Ý tưởng sinh ra. */
export interface Idea {
  title: string;
  logline: string;
  frame: string;
  hook: string;
  hookQuestion: string;
  turn: string;
  ending: string;
  characters: string[];
  dialogue: string;
  form: string;
  beats: number;
  veoLevel: 'de' | 'vua' | 'kho';
  veoNote: string;
  message: string;
  /** Do AI tự chọn (Phòng Ý tưởng mới). Thẻ cũ không có. */
  seconds?: number;
  module?: ModuleCode;
  secondary?: ModuleCode | '';
  aspect?: '9:16' | '16:9';
  dialogueMode?: 'co' | 'khong';
  formMode?: 'hoathinh' | 'nguoithat';
}

/** Ý tưởng đã lưu vào kho (thích hoặc không thích), nhớ kèm thiết lập lúc tạo. */
export interface SavedIdea extends Idea {
  id: string;
  settings: IdeaSettings;
  createdAt: number;
}

export type ProjectStage = 'y-tuong' | 'huong' | 'kich-ban' | 'nhan-vat' | 'tung-beat';

/** Một câu hỏi đào sâu (tuỳ chọn) và câu trả lời của người dùng. */
export interface DeepQuestion {
  question: string;
  options: string[];
  answer: string;
}

/** Một hướng khai thác theo LÕI 1.2. */
export interface Direction {
  key: 'A' | 'B' | 'C';
  name: string;
  core: string;
  frame: string;
  hook: string;
  turn: string;
  ending: string;
  structure: string;
  why: string;
  feeling: string;
  fitsFor: string;
  veoRisk: string;
}

export interface ScriptBeat {
  id: string;
  name: string;
  duration: 4 | 6 | 8;
  durationWarning?: boolean;
  level: number;
  summary: string;
  /** Scene chứa beat (quy trình đề cương) */
  sceneId?: string;
  /** Module cần mượn riêng cho beat này */
  borrowed?: string;
}

/** Một scene trong đề cương. */
export interface OutlineScene {
  id: string;
  title: string;
  location: string;
  time: string;
  light: string;
  summary: string;
  purpose: string;
  turn: string;
  endState: string;
  beats: number;
  characters: string[];
  props: string[];
}

/** Đề cương phim: hồi → scene, cùng tính cách (1.3) và đạo cụ (1.5) ở mức cả phim. */
export interface Outline {
  markdown: string;
  style: string;
  characters: ScriptCharacter[];
  props: ScriptProp[];
  acts: { id: string; name: string; role: string; scenes: OutlineScene[] }[];
  targetSeconds: number;
  createdAt: number;
}

/** Beat của một scene, viết theo 1.4 → 1.6. */
export interface SceneScript {
  markdown: string;
  beats: ScriptBeat[];
  gate: GateItem[];
  endState: string;
  createdAt: number;
  /** Scene trước đã đổi số beat sau khi scene này được viết → mã beat lệch, cần viết lại */
  stale?: boolean;
}

export interface ScriptCharacter {
  tag: string;
  want: string;
  reflex: string;
  weakness: string;
}

export interface ScriptProp {
  tag: string;
  star: boolean;
  span: string;
  stateTags: string[];
  note: string;
}

/** Một mục chạm cổng chặn của bảng kiểm 1.6. */
export interface GateItem {
  id: string;
  beat: string;
  kind: string;
  description: string;
  suggestion: string;
  waived?: boolean;
}

/** Kịch bản chia beat theo khuôn 1.7 (markdown) + bản tóm tắt có cấu trúc cho app. */
export interface Script {
  markdown: string;
  style: string;
  totalSeconds: number;
  targetSeconds: number;
  beats: ScriptBeat[];
  characters: ScriptCharacter[];
  props: ScriptProp[];
  gate: GateItem[];
  createdAt: number;
}

export interface CharacterDesign {
  tag: string;
  age: string;
  personality: string;
  appearance: string;
  outfit: string;
  expression: string;
  note: string;
  standardPrompt: string;
  sheetPrompt: string;
}

export interface PropDesign {
  tag: string;
  description: string;
  note: string;
  imagePrompt: string;
}

/** Ảnh tham chiếu đã gắn @tag. Ảnh thật nằm trong IndexedDB theo imageId. */
export interface Asset {
  tag: string;
  kind: 'character' | 'prop' | 'frame';
  /** Frame nối: chụp từ video của beat nào */
  beatId?: string;
  /** Frame nối: có đạt luật tư thế ổn định (3.6) không */
  stable?: boolean;
  /** Frame nối: điểm chấm thang 10 và từng tiêu chí */
  score?: number;
  criteria?: { name: string; points: number; comment: string }[];
  /** Frame nối: kết luận — dùng được / chụp lại / tạo lại video */
  fix?: 'ok' | 'chup-lai' | 'tao-lai-video';
  /** Người dùng vẫn chọn dùng frame bị chấm thấp */
  useAnyway?: boolean;
  /** Ảnh của tag trạng thái sau (VD baykep), chụp từ video của beat đổi trạng thái */
  state?: boolean;
  addedAt?: number;
  note: string;
  imageId?: string;
  /** Những gì AI thấy trong ảnh (LÕI 3.1c) — dùng lại khi viết beat */
  seen?: string;
  warning?: string;
}

/** Scene theo LÕI 3.2. */
export interface Scene {
  id: string;
  location: string;
  time: string;
  light: string;
  beats: string[];
}

/** Đầu vào PromptLabs của một beat, theo LÕI 3.10. */
export interface BeatInput {
  markdown: string;
  script: string;
  duration: 4 | 6 | 8;
  promptType: 'multishot' | 'continuous';
  cinematicLevel: 'simple' | 'medium' | 'complex';
  pacing: 'slow' | 'medium' | 'fast';
  refs: { tag: string; note: string }[];
  missing: string[];
  blocked: { cell: string; reason: string }[];
  borrowed: string;
  /** kind = 'state': ảnh cho tag trạng thái sau của đạo cụ (VD baykep), chụp từ video beat này */
  postNotes: { tag: string; what: string; forBeat: string; avoid: boolean; kind?: 'frame' | 'state' }[];
}

/** Kết quả của engine Đạo diễn AI (giống hệt app Đạo diễn). */
export interface EngineSegment {
  shotNumber: number;
  duration: number;
  camera: string;
  cameraVi: string;
  text: string;
  summaryVi: string;
  addedByDirectorVi: string[];
  timeRange?: string;
}

export interface EngineResult {
  version: 2;
  mode: 'multishot' | 'continuous';
  analysis: any;
  warnings: string[];
  header: string;
  segments: EngineSegment[];
  finalPrompt: string;
}

export interface BeatWork {
  input?: BeatInput;
  inputAt?: number;
  engine?: EngineResult;
  engineAt?: number;
  /** Ô Script lúc tạo prompt — để biết prompt đã cũ so với Script chưa */
  engineScript?: string;
  /** Người dùng chấp nhận thiếu ảnh, giữ mô tả bằng chữ */
  acceptMissing?: boolean;
}

/** Style của phim: AI chọn theo module / style mẫu / lấy từ ảnh tham chiếu. */
export interface StyleChoice {
  mode: 'ai' | 'preset' | 'image';
  presetId?: string;
  /** Chuỗi style tiếng Anh AI đọc từ ảnh (sửa tay được) */
  imageStyle?: string;
  /** Mô tả tiếng Việt ngắn của style trong ảnh */
  imageSummary?: string;
  imageId?: string;
}

export interface Project {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  stage: ProjectStage;
  settings: IdeaSettings;
  idea: Idea;
  questions?: DeepQuestion[];
  directions?: Direction[];
  directionNote?: string;
  chosenDirection?: Direction['key'];
  script?: Script;
  /** Tối đa 3 bản kịch bản trước để quay lại */
  scriptHistory?: Script[];
  design?: { characters: CharacterDesign[]; props: PropDesign[] };
  assets?: Asset[];
  scenes?: Scene[];
  beats?: Record<string, BeatWork>;
  /** Lựa chọn style của phim (mặc định: AI chọn theo module) */
  styleChoice?: StyleChoice;
  /** Quy trình mới: đề cương + kịch bản từng scene. project.script được ghép lại từ hai thứ này. */
  outline?: Outline;
  sceneScripts?: Record<string, SceneScript>;
  /** Kế hoạch mượn module của cả phim (quét một lần ở bước 5) */
  borrowPlan?: Record<string, { module: string; reason: string }>;
}

/** Thay đổi một dự án: object, hoặc hàm nhận bản MỚI NHẤT (dùng sau các lệnh await). */
export type ProjectPatch = Partial<Project> | ((latest: Project) => Partial<Project>);

/** Frame có được dùng làm frame nối cho beat sau không. */
export const usableFrame = (a: Asset) => a.kind === 'frame' && !!a.imageId && (!a.fix || a.fix === 'ok' || !!a.useAnyway);

/** Ảnh có dùng được không (frame, ảnh trạng thái, hay ảnh thường). */
export const usableImage = (a: Asset) => !!a.imageId && (!a.fix || a.fix === 'ok' || !!a.useAnyway);
