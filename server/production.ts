// Bước 4–6: shot list, biên dịch prompt, duyệt và sửa.
// Luật làm phim nằm trong knowledge/. File này lo dữ liệu vào/ra và ghép các khối cố định của prompt.
import { activeModel, library, metaStr } from './knowledge';
import { buildStepPrompt, describeAssets, describeIdea, describeOutline, describeSettings } from './prompt';
import { clamp, str, strList, type MatchImage } from './steps';
import type { Assets, Clip, ClipPrompt, FlowMode, FrameScore, Idea, Outline, ProjectSettings, Review, SceneShots, Shot } from '../shared/types';
import { CAMERA_MOVES, SHOT_SIZES, clipHash, frameTag, toTag } from '../shared/types';

const T = { OBJECT: 'OBJECT', ARRAY: 'ARRAY', STRING: 'STRING', INTEGER: 'INTEGER', NUMBER: 'NUMBER' } as const;
const S = (description?: string) => ({ type: T.STRING, ...(description ? { description } : {}) });
const E = (values: readonly string[], description?: string) => ({ type: T.STRING, enum: [...values], ...(description ? { description } : {}) });
const I = (description?: string) => ({ type: T.INTEGER, ...(description ? { description } : {}) });
const N = (description?: string) => ({ type: T.NUMBER, ...(description ? { description } : {}) });
const LIST = (items: any, description?: string) => ({ type: T.ARRAY, items, ...(description ? { description } : {}) });
const OBJ = (properties: Record<string, any>) => ({ type: T.OBJECT, properties, required: Object.keys(properties) });

const MODES: FlowMode[] = ['nguyen-lieu', 'khung-dau', 'khung-dau-cuoi'];

/** Cài đặt đọc từ file mô hình (knowledge/mo-hinh/…) */
export function modelLimits() {
  const m = activeModel();
  const num = (k: string, d: number) => Number(metaStr(m, k)) || d;
  return { min: num('clip-toi-thieu', 3), max: num('clip-toi-da', 10), maxRefs: num('anh-nguyen-lieu-toi-da', 10) };
}

/* ======================= Bảng tài sản ======================= */

export interface AssetRef {
  tag: string;
  kind: 'character' | 'prop' | 'variant' | 'angle';
  desc: string;
  location?: string;
  angle?: { id: string; en: string; light: string };
  parent?: string;
}

export function assetIndex(a: Assets): Map<string, AssetRef> {
  const map = new Map<string, AssetRef>();
  a.characters.forEach((c) => map.set(c.tag, { tag: c.tag, kind: 'character', desc: c.desc }));
  a.props.forEach((p) => {
    map.set(p.tag, { tag: p.tag, kind: 'prop', desc: p.desc });
    p.variants.forEach((v) => map.set(v.tag, { tag: v.tag, kind: 'variant', desc: v.desc, parent: p.tag }));
  });
  a.locations.forEach((l) =>
    l.angles.forEach((g) =>
      map.set(g.tag, { tag: g.tag, kind: 'angle', desc: `${l.desc}, ${g.en}`, location: l.tag, angle: { id: g.id, en: g.en, light: g.light } })
    )
  );
  return map;
}

/** Clip viết thành chữ theo khuôn của buoc/4-shot-list.md */
export function formatClip(c: Clip): string {
  const lines = [
    `CLIP ${c.id} · ${c.seconds} giây · chế độ: ${c.mode} · độ khó ${c.difficulty}/5`,
    `Chuyển biến: ${c.change}`,
    `Bối cảnh: @${c.location} · Ảnh nạp: ${c.assets.map((t) => '@' + t).join(' ')}`,
    `Tình huống: ${c.situations.join(', ') || '—'}`,
    `Khoá: ${c.locks}`,
  ];
  if (c.firstFrame) lines.push(`Khung đầu: ${c.firstFrame}`);
  c.shots.forEach((s, i) =>
    lines.push(`Shot ${i + 1} [${fmt(s.from)}-${fmt(s.to)}s] · góc ${s.angle} · ${s.size} · ${s.move}\n   Ai ở đâu: ${s.where}\n   Hành động: ${s.action}`)
  );
  lines.push(`Âm thanh: ${c.sound || '—'} · thoại: ${c.dialogue || 'không'} · nhạc: ${c.music || 'không'}`);
  lines.push(`Thay đổi còn lưu sau clip: ${c.carryOver || '—'}`);
  if (c.lastFrame) lines.push(`Khung cuối: ${c.lastFrame}`);
  if (c.risk) lines.push(`Rủi ro: ${c.risk}`);
  return lines.join('\n');
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ''));

/* =============================== BƯỚC 4 · SHOT LIST =============================== */

export const SHOTS_SCHEMA = OBJ({
  clips: LIST(
    OBJ({
      seconds: N('Độ dài clip, giây'),
      mode: E(MODES),
      difficulty: I('1–5'),
      change: S('Chuyển biến của clip — một câu'),
      assets: LIST(S('tag không có @: nhân vật, đạo cụ, trạng thái sau, ảnh góc máy (VD bep-a) có trong clip')),
      situations: LIST(S('id module tình huống')),
      locks: S('Khoá: số nhân vật, ai bên trái/phải, ai cầm gì ở shot nào'),
      firstFrame: S('Mô tả khung đầu — bắt buộc với chế độ khung-dau, khung-dau-cuoi; rỗng nếu không cần'),
      lastFrame: S('Mô tả khung cuối — LUÔN có, mọi clip: tư thế đứng yên của mọi nhân vật và vật cuối clip (trái/phải, gần/xa). Clip sau bắt đầu từ đây'),
      shots: LIST(
        OBJ({
          from: N('giây bắt đầu'),
          to: N('giây kết thúc'),
          angle: S('id góc máy của bối cảnh: a, b, c, d'),
          size: E(SHOT_SIZES),
          move: E(CAMERA_MOVES),
          where: S('Ai ở đâu'),
          action: S('Hành động, có nhịp con nếu cần'),
        })
      ),
      sound: S('Tiếng động theo thời điểm'),
      dialogue: S('Thoại; rỗng nếu không thoại'),
      music: S('Nhạc; rỗng nếu không nhạc'),
      carryOver: S('Toàn bộ trạng thái bối cảnh còn hiệu lực sau clip, cộng dồn; "—" nếu không có'),
      risk: S(),
    })
  ),
  missingAssets: LIST(S('Tài sản còn thiếu: tag cần ảnh, góc máy cần thêm, trạng thái sau cần tạo')),
  warnings: LIST(S()),
});

export interface ShotsRequest {
  settings: ProjectSettings;
  idea: Idea;
  outline: Outline;
  assets: Assets;
  images: Record<string, string>;
  sceneId: string;
  prevClip?: Clip;
  feedback: string;
  previous?: SceneShots;
}

export function shotsPrompt(r: ShotsRequest): string {
  const scene = r.outline.scenes.find((s) => s.id === r.sceneId);
  if (!scene) throw new Error(`Outline không có scene ${r.sceneId}.`);
  const loc = r.assets.locations.find((l) => l.tag === scene.location);
  const { min, max, maxRefs } = modelLimits();
  const sceneIdx = r.outline.scenes.findIndex((s) => s.id === r.sceneId);
  const prevScene = sceneIdx > 0 ? r.outline.scenes[sceneIdx - 1] : undefined;
  const bridge = r.prevClip
    ? `CLIP CUỐI CỦA SCENE TRƯỚC (clip đầu scene này nối từ đây):\n${formatClip(r.prevClip)}`
    : prevScene
      ? `Scene trước (${prevScene.id}) chưa có shot list. Trạng thái cuối theo outline: ${prevScene.endState}`
      : 'Đây là scene đầu phim.';
  const rules = `Khuôn dữ liệu:
- Clip dài ${min}–${max} giây; mốc giây các shot nối liền từ 0 và cộng đúng độ dài clip.
- "angle": id góc máy của @${scene.location}: ${loc ? loc.angles.map((g) => `${g.id} (${g.vi})`).join('; ') : 'bối cảnh chưa có tài sản'}.
- "assets": tag không có @. Tối đa ${maxRefs} tag mỗi clip.
- "situations": id module trong mục lục.
- "size" ∈ ${SHOT_SIZES.join(' / ')}; "move" ∈ ${CAMERA_MOVES.join(' / ')}.
- "dialogue", "music": để rỗng nếu không có.`;
  const task = r.previous
    ? `Sửa shot list của scene ${scene.id} theo góp ý. Sửa đúng chỗ được góp ý, giữ nguyên phần còn lại.\nGÓP Ý: ${r.feedback}\n\nSHOT LIST HIỆN TẠI (JSON):\n${JSON.stringify(r.previous.clips)}`
    : `Chia scene ${scene.id} thành clip, khoảng ${scene.clips} clip.${r.feedback ? `\nYêu cầu thêm: ${r.feedback}` : ''}`;
  return buildStepPrompt({
    step: '4-shot-list',
    scriptType: r.settings.scriptType,
    project: [
      describeSettings(r.settings),
      `Style của phim: ${r.assets.style}`,
      describeIdea(r.idea),
      describeOutline(r.outline),
      `TÀI SẢN\n${describeAssets(r.assets, r.images)}`,
      bridge,
    ].join('\n\n'),
    task: `${task}\n\n${rules}`,
  });
}

export function normalizeShots(raw: any, r: ShotsRequest): SceneShots {
  const scene = r.outline.scenes.find((s) => s.id === r.sceneId)!;
  const { min, max, maxRefs } = modelLimits();
  const index = assetIndex(r.assets);
  const moduleIds = new Set(library().modules.map((m) => m.id));
  const loc = r.assets.locations.find((l) => l.tag === scene.location);
  const angleIds = new Set(loc?.angles.map((g) => g.id) || []);
  const warnings = strList(raw?.warnings, 12);
  const missing = new Set(strList(raw?.missingAssets, 20));

  const clips: Clip[] = (Array.isArray(raw?.clips) ? raw.clips : []).map((c: any, i: number): Clip => {
    const id = `${scene.id}-C${String(i + 1).padStart(2, '0')}`;
    const mode: FlowMode = MODES.includes(c?.mode) ? c.mode : 'nguyen-lieu';

    // Shot: sắp theo thời gian, ép nối liền từ 0
    let cursor = 0;
    const shots: Shot[] = (Array.isArray(c?.shots) ? c.shots : [])
      .map((s: any) => ({ ...s, from: Number(s?.from) || 0, to: Number(s?.to) || 0 }))
      .sort((a: any, b: any) => a.from - b.from)
      .slice(0, 4)
      .map((s: any) => {
        const len = Math.max(0.5, Math.round((s.to - s.from) * 2) / 2 || 2);
        const shot: Shot = {
          from: cursor,
          to: cursor + len,
          angle: angleIds.has(String(s?.angle).trim().toLowerCase()) ? String(s.angle).trim().toLowerCase() : 'a',
          size: (SHOT_SIZES as readonly string[]).includes(s?.size) ? s.size : 'trung',
          move: (CAMERA_MOVES as readonly string[]).includes(s?.move) ? s.move : 'đứng yên',
          where: str(s?.where, 800),
          action: str(s?.action, 1500),
        };
        if (s?.angle && !angleIds.has(String(s.angle).trim().toLowerCase())) warnings.push(`${id}: góc "${s.angle}" không có ở @${scene.location}, đã đổi thành góc a.`);
        cursor = shot.to;
        return shot;
      });
    if (!shots.length) warnings.push(`${id} không có shot nào.`);
    const total = shots.length ? shots[shots.length - 1].to : min;
    const seconds = clamp(total, min, max);
    if (total !== seconds) warnings.push(`${id}: tổng ${fmt(total)} giây nằm ngoài khoảng ${min}–${max} giây của model.`);

    // Tài sản: chỉ giữ tag có thật; tag góc máy các shot dùng luôn được thêm vào
    const assets = new Set<string>();
    (Array.isArray(c?.assets) ? c.assets : []).forEach((t: any) => {
      const tag = toTag(t);
      if (!tag) return;
      if (index.has(tag)) assets.add(tag);
      else {
        missing.add(`@${tag}`);
        warnings.push(`${id} dùng @${tag} nhưng chưa có trong tài sản.`);
      }
    });
    shots.forEach((s) => assets.add(`${scene.location}-${s.angle}`));
    let list = Array.from(assets).filter((t) => index.has(t));
    if (list.length > maxRefs) warnings.push(`${id} cần ${list.length} ảnh, vượt giới hạn ${maxRefs} ảnh nguyên liệu.`);

    // Tag nhắc trong mô tả mà không có trong tài sản của clip
    const text = shots.map((s) => `${s.where} ${s.action}`).join(' ');
    const mentioned = Array.from(new Set((text.match(/@[a-z0-9-]+/g) || []).map((m) => m.slice(1))));
    mentioned.filter((t) => !assets.has(t)).forEach((t) => warnings.push(`${id} nhắc @${t} trong shot nhưng không có trong "Ảnh nạp".`));

    // Ảnh nạp thừa: tài sản không được nhắc ở shot, Khoá hay khung nào thì không có trong cảnh → bỏ, tránh model vẽ bừa
    const everywhere = new Set(
      ((`${text} ${str(c?.locks, 800)} ${str(c?.firstFrame, 1200)} ${str(c?.lastFrame, 1200)}`).match(/@[a-z0-9-]+/g) || []).map((m) => m.slice(1))
    );
    const used = (t: string) => everywhere.has(t) || index.get(t)?.kind === 'angle' || (index.get(t)?.kind === 'prop' && list.some((v) => index.get(v)?.parent === t && everywhere.has(v)));
    const extra = list.filter((t) => !used(t));
    if (extra.length) {
      warnings.push(`${id}: bỏ ${extra.map((t) => '@' + t).join(', ')} khỏi "Ảnh nạp" vì không được nhắc trong shot nào. Nếu vật đó có trong khung, hãy thêm vào "Ai ở đâu".`);
      extra.forEach((t) => assets.delete(t));
      list = list.filter((t) => !extra.includes(t));
    }

    const firstFrame = str(c?.firstFrame, 1200);
    const lastFrame = str(c?.lastFrame, 1200);
    if (!lastFrame) warnings.push(`${id} chưa có "Khung cuối" — clip sau không có chỗ bắt đầu để liền mạch.`);
    if (mode !== 'nguyen-lieu' && !firstFrame) warnings.push(`${id} dùng chế độ khung đầu nhưng chưa mô tả khung đầu.`);
    if (mode === 'khung-dau-cuoi' && !lastFrame) warnings.push(`${id} dùng chế độ khung đầu + cuối nhưng chưa mô tả khung cuối.`);
    if (mode !== 'nguyen-lieu' && firstFrame) {
      // Chế độ khung đầu + cuối: tính cả khung cuối. Trạng thái sau hợp lệ nếu vật gốc đã có trong khung.
      const frames = mode === 'khung-dau-cuoi' ? `${firstFrame} ${lastFrame}` : firstFrame;
      const inFrame = new Set((frames.match(/@[a-z0-9-]+/g) || []).map((m) => m.slice(1)));
      const inside = (t: string) => inFrame.has(t) || (index.get(t)?.kind === 'variant' && inFrame.has(index.get(t)!.parent!));
      mentioned
        .filter((t) => !inside(t) && index.get(t)?.kind !== 'angle')
        .forEach((t) => warnings.push(`${id} (khung đầu): @${t} xuất hiện trong clip nhưng không có trong khung đầu — dễ bị vẽ sai.`));
    }

    return {
      id,
      scene: scene.id,
      seconds,
      mode,
      difficulty: clamp(Math.round(Number(c?.difficulty) || 2), 1, 5),
      change: str(c?.change, 600),
      location: scene.location,
      assets: list,
      situations: Array.from(new Set(strList(c?.situations, 6).map((s) => s.trim()).filter((s) => moduleIds.has(s)))),
      locks: str(c?.locks, 800),
      firstFrame,
      lastFrame,
      shots,
      sound: str(c?.sound, 800),
      dialogue: str(c?.dialogue, 1500),
      music: str(c?.music, 400),
      carryOver: str(c?.carryOver, 1200) || '—',
      risk: str(c?.risk, 600),
    };
  });

  if (!clips.length) throw new Error('Gemini không trả về clip nào. Thử lại.');
  if (Math.abs(clips.length - scene.clips) > Math.max(1, scene.clips * 0.5))
    warnings.push(`Scene ${scene.id}: ${clips.length} clip, outline ước tính ${scene.clips} clip.`);
  return { scene: scene.id, clips, missingAssets: Array.from(missing), warnings: Array.from(new Set(warnings)), createdAt: Date.now() };
}

/* =============================== BƯỚC 5 · PROMPT =============================== */

const SIZE_EN: Record<string, string> = { toàn: 'Wide shot', trung: 'Medium shot', cận: 'Close-up', 'đặc tả': 'Extreme close-up' };
const MOVE_EN: Record<string, string> = {
  'đứng yên': 'static camera',
  'lia theo': 'camera pans to follow the action',
  'đẩy chậm vào': 'slow push-in',
  'kéo chậm ra': 'slow pull-out',
};
const TIME_EN: [RegExp, string][] = [
  [/sáng/i, 'Morning'],
  [/trưa/i, 'Midday'],
  [/chiều/i, 'Afternoon'],
  [/tối|hoàng hôn/i, 'Evening'],
  [/đêm|khuya/i, 'Night'],
];

export const CLIP_PROMPT_SCHEMA = OBJ({
  shots: LIST(OBJ({ body: S('Thân shot, tiếng Anh') }), 'Đúng bằng số shot của clip, cùng thứ tự'),
  firstFrame: S('Thân prompt ảnh khung đầu (tư thế tĩnh) — rỗng nếu chế độ không cần'),
  lastFrame: S('Thân prompt ảnh khung cuối — rỗng nếu chế độ không cần'),
  state: S('Dịch sát trạng thái bối cảnh trước clip; rỗng nếu không có'),
  locks: S('Dịch sát dòng Khoá'),
  audio: S('Dịch sát âm thanh (tiếng động theo thời điểm)'),
  dialogue: S('Dịch sát thoại; rỗng nếu không thoại'),
  music: S('Dịch sát nhạc; rỗng nếu không nhạc'),
  added: LIST(S('Chi tiết buộc phải thêm mà shot list không có — tiếng Việt')),
  warnings: LIST(S('Vấn đề phát hiện khi tự kiểm — tiếng Việt')),
});

export interface ClipPromptRequest {
  settings: ProjectSettings;
  assets: Assets;
  clip: Clip;
  /** Trạng thái bối cảnh trước clip (tiếng Việt) */
  state: string;
  timeOfDay: string;
  feedback: string;
  /** Clip ngay trước cùng bối cảnh: khung cuối (chữ) và tag ảnh khung cuối thật nếu người dùng đã lưu */
  prevEnd?: string;
  prevFrameTag?: string;
}

const aspectLine = (aspect: string) => (aspect === '16:9' ? 'Horizontal 16:9' : 'Vertical 9:16');
const shotHeader = (s: Shot, index: Map<string, AssetRef>, location: string) => {
  const g = index.get(`${location}-${s.angle}`)?.angle;
  return [SIZE_EN[s.size] || 'Medium shot', g?.en, MOVE_EN[s.move] || 'static camera', g?.light].filter(Boolean).join(', ');
};

export function clipPromptText(r: ClipPromptRequest): string {
  const index = assetIndex(r.assets);
  const c = r.clip;
  const assetLines = c.assets.map((t) => `- @${t} (${index.get(t)?.desc || '?'})`).join('\n');
  const headers = c.shots.map((s, i) => `Shot ${i + 1}: [${fmt(s.from)}-${fmt(s.to)}s] ${i ? 'Hard cut. ' : ''}${shotHeader(s, index, c.location)}. <thân shot ${i + 1} do bạn viết>`).join('\n');
  const task = `Biên dịch clip ${c.id} theo chế độ "${c.mode}".
App tự ghép khối [1] style, [2] bối cảnh + trạng thái, [3] tham chiếu, dòng kiểm soát cắt cảnh, đầu mỗi shot, [5] số nhân vật, [6] âm thanh.
Đầu mỗi shot app ghép sẵn như sau — KHÔNG viết lại cỡ cảnh, góc máy, chuyển động máy, hướng sáng:
${headers}

Trả "shots" đúng ${c.shots.length} phần tử theo thứ tự.
${c.mode === 'nguyen-lieu' ? 'Chế độ nguyên liệu: mở mỗi thân shot bằng vị trí (trái/phải, gần/xa) rồi mới tới hành động. "firstFrame", "lastFrame" để rỗng.' : ''}${c.mode === 'khung-dau' ? 'Chế độ khung đầu: không tả lại bố cục trong thân shot, chỉ tả chuyển động. Viết "firstFrame" từ dòng Khung đầu; "lastFrame" để rỗng.' : ''}${c.mode === 'khung-dau-cuoi' ? 'Chế độ khung đầu + cuối: thân shot tả quá trình đi từ khung đầu tới khung cuối. Viết cả "firstFrame" và "lastFrame".' : ''}
Trạng thái bối cảnh trước clip (dịch vào "state"): ${r.state || '(không có)'}${r.prevEnd ? `\nKhung cuối của clip trước (clip này bắt đầu từ đây — shot 1 phải khớp vị trí này): ${r.prevEnd}` : ''}${r.feedback ? `\n\nGóp ý của người dùng cho lần biên dịch này: ${r.feedback}` : ''}`;
  return buildStepPrompt({
    step: '5-prompt',
    scriptType: r.settings.scriptType,
    modules: c.situations,
    project: [`Style của phim: ${r.assets.style}`, `Tỉ lệ khung: ${r.settings.aspect}`, `TÀI SẢN CỦA CLIP\n${assetLines}`, `SHOT LIST CỦA CLIP (đã duyệt)\n${formatClip(c)}`].join('\n\n'),
    task,
  });
}

const tagged = (tag: string, index: Map<string, AssetRef>) => `@${tag} (${index.get(tag)?.desc || tag})`;

export function assembleClipPrompt(raw: any, r: ClipPromptRequest): ClipPrompt {
  const c = r.clip;
  const index = assetIndex(r.assets);
  const { maxRefs } = modelLimits();
  const warnings = strList(raw?.warnings, 10);
  const bodies: string[] = (Array.isArray(raw?.shots) ? raw.shots : []).map((s: any) => str(s?.body, 2500));
  if (bodies.length !== c.shots.length) warnings.push(`AI trả ${bodies.length} thân shot cho ${c.shots.length} shot — hãy biên dịch lại.`);

  const loc = r.assets.locations.find((l) => l.tag === c.location);
  const time = TIME_EN.find(([re]) => re.test(r.timeOfDay))?.[1];
  const state = str(raw?.state, 1200);

  // [1] style · [2] bối cảnh
  const block1 = `${r.assets.style}. ${aspectLine(r.settings.aspect)}.`;
  const block2 = [`Location: ${loc?.desc || c.location}.`, time ? `${time}.` : '', state ? `Current state: ${state}` : ''].filter(Boolean).join(' ');

  // [3] tham chiếu
  let block3 = '';
  let load: string[] = [];
  if (c.mode === 'nguyen-lieu') {
    const order = (t: string) => ['character', 'prop', 'variant', 'angle'].indexOf(index.get(t)?.kind || 'angle');
    load = [...c.assets].sort((a, b) => order(a) - order(b));
    // Khung cuối thật của clip trước (nếu đã lưu ở bước Duyệt) đi cuối danh sách: giữ phòng, vị trí đồ vật, nhân vật liền mạch
    const continuity = r.prevFrameTag && !load.includes(r.prevFrameTag) ? r.prevFrameTag : '';
    if (continuity) load.push(continuity);
    const hasVariant = (parent: string) => load.some((t) => index.get(t)?.parent === parent);
    const lines = load.map((t, i) => {
      const ref = index.get(t);
      const head = `Image ${i + 1} — `;
      if (t === continuity) return `${head}@${t} (the final frame of the previous clip): continuity reference — keep the room, object positions and character designs exactly as shown; this clip continues from that moment.`;
      if (!ref) return `${head}${tagged(t, index)}: reference.`;
      if (ref.kind === 'character') return `${head}${tagged(t, index)}: character reference.`;
      if (ref.kind === 'prop') return `${head}${tagged(t, index)}: prop reference${hasVariant(t) ? ', the object before it changes' : ''}.`;
      if (ref.kind === 'variant') return `${head}${tagged(t, index)}: prop reference, the same object after it changes.`;
      return `${head}${tagged(t, index)}: location reference for the shots filmed from this angle; match this view.`;
    });
    block3 = `${lines.join('\n')}\nUse the given images as references for the video. They are not the first frame.`;
    if (load.length > maxRefs) warnings.push(`Clip cần ${load.length} ảnh nguyên liệu, vượt giới hạn ${maxRefs}.`);
  } else if (c.mode === 'khung-dau') {
    load = [frameTag(c.id, 'dau')];
    block3 = 'Start from the provided first frame. Keep every character, object and the room exactly as they appear in it.';
  } else {
    load = [frameTag(c.id, 'dau'), frameTag(c.id, 'cuoi')];
    block3 = 'Start from the provided first frame and end exactly on the provided last frame. Keep every character, object and the room exactly as they appear in the frames.';
  }

  // [4] shot
  const cuts = c.shots.slice(1).map((s) => `${fmt(s.from)}s`);
  const control =
    c.shots.length <= 1 ? 'Single continuous shot, no scene cuts.' : `Exactly ${c.shots.length} shots, hard cuts at ${cuts.join(' and ')}; no other cuts.`;
  const shotLines = c.shots.map(
    (s, i) => `[${fmt(s.from)}-${fmt(s.to)}s] ${i ? 'Hard cut. ' : ''}${shotHeader(s, index, c.location)}. ${bodies[i] || ''}`.trim()
  );

  // [5] khoá
  const characters = c.assets.filter((t) => index.get(t)?.kind === 'character');
  const count = characters.length
    ? `Exactly ${characters.length} character${characters.length > 1 ? 's' : ''} on screen: ${characters.map((t) => tagged(t, index)).join(', ')}.`
    : 'No characters on screen.';
  const block5 = [count, str(raw?.locks, 1200)].filter(Boolean).join(' ');

  // [6] âm thanh
  const audio = str(raw?.audio, 1200);
  const dialogue = c.dialogue ? str(raw?.dialogue, 1500) : '';
  const music = c.music ? str(raw?.music, 400) : '';
  const block6 = [
    audio ? `Audio: ${audio.replace(/^audio:\s*/i, '')}` : '',
    dialogue ? `Dialogue: ${dialogue.replace(/^dialogue:\s*/i, '')}` : 'No dialogue, no speech.',
    music ? `Music: ${music.replace(/^music:\s*/i, '')}` : 'No music.',
    'No on-screen text, no subtitles.',
  ]
    .filter(Boolean)
    .join(' ');

  const video = [block1, block2, block3, [control, ...shotLines].join('\n'), block5, block6].filter(Boolean).join('\n\n');

  // Prompt ảnh khung đầu / cuối. Chỉ nạp tài sản được nhắc trong mô tả khung đó (VD khung đầu không nạp ảnh bẫy đã sập).
  const frameRefs = (body: string, shot?: Shot): string[] => {
    if (!body || !shot) return [];
    const named = new Set((body.match(/@[a-z0-9-]+/g) || []).map((m) => m.slice(1)));
    const picked = c.assets.filter((t) => index.get(t)?.kind !== 'angle' && named.has(t));
    return [...(picked.length ? picked : c.assets.filter((t) => ['character', 'prop'].includes(index.get(t)?.kind || ''))), `${c.location}-${shot.angle}`];
  };
  const frame = (body: string, shot: Shot | undefined, refs: string[]) => {
    if (!body || !shot) return '';
    const g = index.get(`${c.location}-${shot.angle}`);
    return [
      `${r.assets.style}. ${aspectLine(r.settings.aspect)}. ${cap(g?.angle?.en || '')}${g?.angle?.light ? `, ${g.angle.light}` : ''}.`,
      body,
      state ? `Current state: ${state}` : '',
      `Use the attached images of ${refs.map((t) => tagged(t, index)).join(', ')} as references; keep their designs identical. A single still frame, no motion blur, no text.`,
    ]
      .filter(Boolean)
      .join('\n');
  };
  const firstBody = c.mode !== 'nguyen-lieu' ? str(raw?.firstFrame, 2000) : '';
  const lastBody = c.mode === 'khung-dau-cuoi' ? str(raw?.lastFrame, 2000) : '';
  const firstShot = c.shots[0];
  const lastShot = c.shots[c.shots.length - 1];
  const refs = { first: frameRefs(firstBody, firstShot), last: frameRefs(lastBody, lastShot) };
  const firstFrame = frame(firstBody, firstShot, refs.first);
  const lastFrame = frame(lastBody, lastShot, refs.last);
  if (c.mode !== 'nguyen-lieu' && !firstFrame) warnings.push('Thiếu prompt ảnh khung đầu.');
  if (c.mode === 'khung-dau-cuoi' && !lastFrame) warnings.push('Thiếu prompt ảnh khung cuối.');

  // @tag trong thân shot phải có trong clip
  const known = new Set(c.assets);
  const used = Array.from(new Set((bodies.join(' ').match(/@[a-z0-9-]+/g) || []).map((m) => m.slice(1))));
  used.filter((t) => !known.has(t)).forEach((t) => warnings.push(`Thân shot nhắc @${t} nhưng clip không có tài sản này.`));

  return { video, firstFrame, lastFrame, frameRefs: refs, load, added: strList(raw?.added, 10), warnings: Array.from(new Set(warnings)), clipHash: clipHash(c), builtAt: Date.now() };
}

/* =============================== BƯỚC 6 · DUYỆT VÀ SỬA =============================== */

export const REVIEW_SCHEMA = OBJ({
  verdict: E(['dung-duoc', 'sua', 'chay-lai']),
  summary: S('Một đến hai câu tiếng Việt: thấy gì, vì sao kết luận vậy'),
  edits: LIST(S('Câu sửa tiếng Anh cho Omni, mỗi câu một thay đổi')),
  fixShotList: S('Nếu chạy lại: phải đổi gì trong shot list hoặc chế độ — tiếng Việt; rỗng nếu không'),
  updates: S('Nếu video khác kế hoạch mà vẫn dùng được: sửa dữ liệu dự án thế nào — tiếng Việt; rỗng nếu không'),
  criteria: LIST(OBJ({ name: S(), points: I('0–2'), comment: S() }), 'Chấm khung cuối (5 tiêu chí) — chỉ khi được yêu cầu, không thì để rỗng'),
});

export interface ReviewRequest {
  settings: ProjectSettings;
  assets: Assets;
  clip: Clip;
  prompt: string;
  note: string;
  images: MatchImage[];
  checkFrame: boolean;
}

export function reviewParts(r: ReviewRequest) {
  const index = assetIndex(r.assets);
  const text = buildStepPrompt({
    step: '6-duyet-sua',
    scriptType: r.settings.scriptType,
    modules: r.clip.situations,
    project: [
      `TÀI SẢN CỦA CLIP\n${r.clip.assets.map((t) => `- @${t} (${index.get(t)?.desc || '?'})`).join('\n')}`,
      `SHOT LIST CỦA CLIP\n${formatClip(r.clip)}`,
      `PROMPT ĐÃ DÙNG TRONG FLOW\n${r.prompt || '(chưa có)'}`,
    ].join('\n\n'),
    task: `Người dùng đã chạy clip ${r.clip.id} trong Flow. Nhận xét của người dùng:\n"""${r.note || '(không ghi nhận xét — hãy tự xem ảnh)'}"""\n${
      r.images.length ? `Kèm ${r.images.length} ảnh chụp từ video, ở cuối prompt.` : 'Không kèm ảnh.'
    }\n${
      r.checkFrame
        ? 'Ảnh cuối cùng là KHUNG CUỐI người dùng định dùng làm khung đầu cho clip sau: chấm "criteria" đủ 5 tiêu chí theo bảng "Chấm khung cuối".'
        : '"criteria" để rỗng.'
    }\nCâu sửa phải kết bằng "Keep everything else the same." và nhắc tài sản theo dạng @tag (cụm mô tả).`,
  });
  const parts: any[] = [{ text }];
  r.images.forEach((img, i) => {
    parts.push({ text: `Ảnh ${i + 1}${r.checkFrame && i === r.images.length - 1 ? ' (khung cuối cần chấm)' : ''}:` });
    parts.push({ inlineData: { mimeType: img.mime, data: img.data } });
  });
  return parts;
}

export function normalizeReview(raw: any, r: ReviewRequest): Review {
  const verdict = ['dung-duoc', 'sua', 'chay-lai'].includes(raw?.verdict) ? raw.verdict : 'sua';
  const edits = strList(raw?.edits, 3).map((e) => (/keep everything else the same/i.test(e) ? e : `${e.replace(/[.\s]+$/, '')}. Keep everything else the same.`));
  let frame: FrameScore | undefined;
  if (r.checkFrame) {
    const criteria = (Array.isArray(raw?.criteria) ? raw.criteria : []).slice(0, 5).map((c: any) => ({
      name: str(c?.name, 80),
      points: clamp(Math.round(Number(c?.points) || 0), 0, 2),
      comment: str(c?.comment, 300),
    }));
    const total = criteria.reduce((t: number, c: any) => t + c.points, 0);
    // Server tự tính: tổng dưới 6 hoặc có tiêu chí 0 điểm → không dùng được làm khung nối
    frame = { criteria, total, ok: criteria.length === 5 && total >= 6 && criteria.every((c: any) => c.points > 0) };
  }
  return {
    at: Date.now(),
    note: r.note,
    verdict,
    summary: str(raw?.summary, 800),
    edits: verdict === 'sua' ? edits : [],
    fixShotList: str(raw?.fixShotList, 1500),
    updates: str(raw?.updates, 1500),
    frame,
  };
}
