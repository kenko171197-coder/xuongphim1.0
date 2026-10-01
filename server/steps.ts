// Bước 1–3: khuôn JSON (ép Gemini trả đúng dạng), lời giao việc, và chuẩn hoá kết quả.
// Luật làm phim KHÔNG nằm ở đây — nằm trong knowledge/. File này chỉ lo dữ liệu vào/ra cho đúng.
import { buildStepPrompt, describeIdea, describeOutline, describeSettings } from './prompt';
import { scriptTypeDoc, metaStr } from './knowledge';
import type {
  Assets, CharacterAsset, Idea, IdeaMode, LengthKey, LocationAsset, Outline, PropAsset, ProjectSettings,
} from '../shared/types';
import { toTag } from '../shared/types';

/** Tên kiểu trong khuôn JSON của Gemini (giống enum Type của @google/genai) */
const T = { OBJECT: 'OBJECT', ARRAY: 'ARRAY', STRING: 'STRING', INTEGER: 'INTEGER' } as const;
const S = (description?: string) => ({ type: T.STRING, ...(description ? { description } : {}) });
const I = (description?: string) => ({ type: T.INTEGER, ...(description ? { description } : {}) });
const LIST = (items: any, description?: string) => ({ type: T.ARRAY, items, ...(description ? { description } : {}) });
const OBJ = (properties: Record<string, any>) => ({ type: T.OBJECT, properties, required: Object.keys(properties) });

export const str = (v: unknown, max = 4000) => String(v ?? '').trim().slice(0, max);
export const strList = (v: unknown, max = 20) => (Array.isArray(v) ? v.map((x) => str(x, 400)).filter(Boolean).slice(0, max) : []);
const tagList = (v: unknown) => Array.from(new Set((Array.isArray(v) ? v : []).map(toTag).filter(Boolean)));
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const uid = (p: string) => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const LENGTH_SECONDS: Record<LengthKey, [number, number]> = { ngan: [20, 120], 'trung-binh': [120, 480], dai: [480, 1800] };

export function validSettings(raw: any): ProjectSettings {
  const scriptType = str(raw?.scriptType, 80);
  const type = scriptTypeDoc(scriptType);
  if (!type) throw new Error('Chưa chọn thể loại, hoặc thể loại không còn trong knowledge/kich-ban/.');
  const length: LengthKey = ['ngan', 'trung-binh', 'dai'].includes(raw?.length) ? raw.length : 'ngan';
  const aspect = ['9:16', '16:9'].includes(raw?.aspect) ? raw.aspect : metaStr(type, 'ti-le-mac-dinh', '9:16');
  return { scriptType, length, aspect };
}

/* =============================== BƯỚC 1 · Ý TƯỞNG =============================== */

export const IDEAS_SCHEMA = OBJ({
  assessment: S('Nhận xét về ý của người dùng (chỉ chế độ "từ ý của tôi"); rỗng ở chế độ khác'),
  ideas: LIST(
    OBJ({
      title: S('2–5 chữ'),
      logline: S('Một câu'),
      formula: S('Tên công thức trong file thể loại'),
      hook: S(),
      turn: S(),
      ending: S(),
      characters: LIST(S('Vai + một dòng ngoại hình phân biệt')),
      locations: LIST(S()),
      seconds: I(),
      clips: I(),
      whyGood: S(),
      productionRisk: S(),
    })
  ),
});

export interface IdeasRequest {
  settings: ProjectSettings;
  mode: IdeaMode;
  idea: string;
  extra: string;
  base?: Idea;
  disliked: string[];
  /** Số thẻ muốn nhận, 1–10 */
  count: number;
}

export function validIdeasRequest(body: any): IdeasRequest {
  const settings = validSettings(body);
  const mode: IdeaMode = ['goi-y', 'tu-y', 'bien-the'].includes(body?.mode) ? body.mode : 'goi-y';
  const idea = str(body?.idea, 3000);
  if (mode === 'tu-y' && idea.length < 10) throw new Error('Hãy viết ý tưởng của bạn (ít nhất một câu).');
  if (mode === 'bien-the' && !body?.base?.logline) throw new Error('Thiếu thẻ ý tưởng gốc để làm biến thể.');
  const fallback = mode === 'goi-y' ? 6 : 3;
  const count = clamp(Math.round(Number(body?.count) || fallback), 1, 10);
  return { settings, mode, idea, extra: str(body?.extra, 1500), base: body?.base, disliked: strList(body?.disliked, 30), count };
}

export function ideasPrompt(r: IdeasRequest): string {
  const count = r.count;
  const unit = count === 1 ? 'ĐÚNG 1 thẻ' : `ĐÚNG ${count} thẻ`;
  const task =
    r.mode === 'goi-y'
      ? `Chế độ GỢI Ý. Đưa ra ${unit} ý tưởng mới hoàn toàn, rải đều các công thức của thể loại.`
      : r.mode === 'tu-y'
        ? `Chế độ TỪ Ý CỦA NGƯỜI DÙNG. Ý của người dùng:\n"""${r.idea}"""\nViết nhận xét ngắn vào "assessment" (hợp thể loại chưa, mạnh ở đâu, thiếu gì), rồi đưa ${unit} giữ lõi ý đó, mỗi thẻ một cách khai thác khác.`
        : `Chế độ BIẾN THỂ. Thẻ gốc:\n${describeIdea(r.base as Idea)}\nĐưa ${unit} biến thể giữ nhân vật và mục tiêu, đổi cú lật hoặc đổi công thức.`;
  const avoid = r.disliked.length ? `\n\nNgười dùng đã LOẠI các ý sau — không đưa lại ý giống lõi hoặc giống cú lật:\n${r.disliked.map((d) => `- ${d}`).join('\n')}` : '';
  const extra = r.extra ? `\n\nYêu cầu thêm của người dùng: ${r.extra}` : '';
  const [lo, hi] = LENGTH_SECONDS[r.settings.length];
  return buildStepPrompt({
    step: '1-y-tuong',
    scriptType: r.settings.scriptType,
    project: describeSettings(r.settings),
    task: `${task}${avoid}${extra}\n\n"seconds" nằm trong khoảng ${lo}–${hi}. "clips" ≈ seconds / 6.`,
  });
}

export function normalizeIdeas(raw: any, r: IdeasRequest): { assessment: string; ideas: Idea[] } {
  const [lo, hi] = LENGTH_SECONDS[r.settings.length];
  const ideas = (Array.isArray(raw?.ideas) ? raw.ideas : [])
    .map((x: any): Idea => {
      const seconds = clamp(Math.round(Number(x?.seconds) || lo), lo, hi);
      const clipsRaw = Math.round(Number(x?.clips) || 0);
      const clips = clamp(clipsRaw || Math.round(seconds / 6), Math.ceil(seconds / 10), Math.ceil(seconds / 3));
      return {
        id: uid('idea'),
        createdAt: Date.now(),
        scriptType: r.settings.scriptType,
        length: r.settings.length,
        title: str(x?.title, 80),
        logline: str(x?.logline, 600),
        formula: str(x?.formula, 80),
        hook: str(x?.hook, 400),
        turn: str(x?.turn, 400),
        ending: str(x?.ending, 400),
        characters: strList(x?.characters, 6),
        locations: strList(x?.locations, 6),
        seconds,
        clips,
        aspect: r.settings.aspect,
        whyGood: str(x?.whyGood, 400),
        productionRisk: str(x?.productionRisk, 400),
      };
    })
    .filter((i: Idea) => i.title && i.logline);
  if (!ideas.length) throw new Error('Gemini không trả về thẻ ý tưởng nào. Thử lại.');
  return { assessment: str(raw?.assessment, 1500), ideas: ideas.slice(0, r.count) };
}

/* =============================== BƯỚC 2 · OUTLINE =============================== */

export const OUTLINE_SCHEMA = OBJ({
  title: S(),
  summary: S('2–3 câu tóm tắt cả phim'),
  characters: LIST(OBJ({ tag: S('không dấu, không @'), role: S(), look: S(), wants: S(), reflex: S(), weakness: S(), scale: S() })),
  locations: LIST(OBJ({ tag: S(), description: S(), landmarks: S('Mốc cố định và vị trí của chúng'), scenes: LIST(S('id scene')) })),
  props: LIST(
    OBJ({
      tag: S(),
      role: S(),
      shapeNeeded: S('Hình dạng cần có để hành động làm được'),
      afterTag: S('Tag trạng thái sau dạng tag-bienthe, rỗng nếu không đổi trạng thái'),
      afterDescription: S(),
      afterFromScene: S(),
    })
  ),
  axisLock: S('Ai thường bên trái, ai bên phải khung'),
  scenes: LIST(
    OBJ({
      act: S('Tên hồi; rỗng với phim ngắn'),
      location: S('tag bối cảnh'),
      timeOfDay: S(),
      role: S('Móc / Đẩy / Lật / Chốt'),
      purpose: S(),
      change: S(),
      endState: S(),
      characters: LIST(S('tag')),
      props: LIST(S('tag')),
      clips: I(),
    })
  ),
  warnings: LIST(S('Điều người dùng nên biết (tiếng Việt)')),
});

export function outlinePrompt(settings: ProjectSettings, idea: Idea, feedback: string, previous?: Outline): string {
  const task = previous
    ? `Sửa outline dưới đây theo góp ý của người dùng. Sửa đúng chỗ được góp ý, giữ nguyên phần còn lại (kể cả tag), rồi kiểm lại chuỗi nhân quả.\nGÓP Ý: ${feedback}\n\nOUTLINE HIỆN TẠI (JSON):\n${JSON.stringify(previous)}`
    : `Dựng outline chi tiết cho ý tưởng đã chọn, đủ để thiết kế tài sản và chia shot list.${feedback ? `\nYêu cầu thêm: ${feedback}` : ''}`;
  return buildStepPrompt({
    step: '2-outline',
    scriptType: settings.scriptType,
    project: `${describeSettings(settings)}\n\n${describeIdea(idea)}`,
    task,
  });
}

export function normalizeOutline(raw: any, idea: Idea): Outline {
  const warnings = strList(raw?.warnings, 10);
  const characters = (Array.isArray(raw?.characters) ? raw.characters : [])
    .map((c: any) => ({
      tag: toTag(c?.tag),
      role: str(c?.role, 200), look: str(c?.look, 600), wants: str(c?.wants, 300),
      reflex: str(c?.reflex, 300), weakness: str(c?.weakness, 300), scale: str(c?.scale, 300),
    }))
    .filter((c: any) => c.tag);
  const locations = (Array.isArray(raw?.locations) ? raw.locations : [])
    .map((l: any) => ({ tag: toTag(l?.tag).slice(0, 12), description: str(l?.description, 600), landmarks: str(l?.landmarks, 1200), scenes: strList(l?.scenes) }))
    .filter((l: any) => l.tag);
  const props = (Array.isArray(raw?.props) ? raw.props : [])
    .map((p: any) => {
      const tag = toTag(p?.tag);
      let afterTag = toTag(p?.afterTag);
      if (afterTag && !afterTag.startsWith(`${tag}-`)) afterTag = toTag(`${tag}-${afterTag.replace(tag, '') || 'sau'}`);
      return {
        tag, role: str(p?.role, 400), shapeNeeded: str(p?.shapeNeeded, 400),
        afterTag, afterDescription: afterTag ? str(p?.afterDescription, 400) : '', afterFromScene: afterTag ? str(p?.afterFromScene, 20) : '',
      };
    })
    .filter((p: any) => p.tag);

  const known = new Set([...characters.map((c: any) => c.tag), ...props.map((p: any) => p.tag), ...props.map((p: any) => p.afterTag).filter(Boolean)]);
  const locTags = new Set(locations.map((l: any) => l.tag));
  const scenes = (Array.isArray(raw?.scenes) ? raw.scenes : []).map((s: any, i: number) => {
    const id = `S${i + 1}`;
    const location = toTag(s?.location).slice(0, 12);
    if (location && !locTags.has(location)) warnings.push(`${id} dùng bối cảnh @${location} chưa có trong danh sách bối cảnh.`);
    const chars = tagList(s?.characters);
    const ps = tagList(s?.props);
    [...chars, ...ps].filter((t) => !known.has(t)).forEach((t) => warnings.push(`${id} nhắc @${t} nhưng outline chưa khai báo tag này.`));
    return {
      id, act: str(s?.act, 80), location, timeOfDay: str(s?.timeOfDay, 60), role: str(s?.role, 60),
      purpose: str(s?.purpose, 600), change: str(s?.change, 600), endState: str(s?.endState, 600),
      characters: chars, props: ps, clips: clamp(Math.round(Number(s?.clips) || 1), 1, 40),
    };
  });
  if (!characters.length || !scenes.length) throw new Error('Outline thiếu nhân vật hoặc scene. Thử lại.');
  const totalClips = scenes.reduce((t: number, s: any) => t + s.clips, 0);
  if (Math.abs(totalClips - idea.clips) > Math.max(2, idea.clips * 0.3))
    warnings.push(`Tổng ${totalClips} clip, lệch nhiều so với ước tính ${idea.clips} clip của ý tưởng.`);
  return {
    title: str(raw?.title, 120) || idea.title,
    summary: str(raw?.summary, 1200),
    characters, locations, props,
    axisLock: str(raw?.axisLock, 400),
    scenes,
    warnings: Array.from(new Set(warnings)),
  };
}

/* =============================== BƯỚC 3 · TÀI SẢN =============================== */

/** Mẫu cố định (giữ nguyên từ bản cũ): app ghép với phần mô tả nhân vật */
export const SHEET_TEMPLATE = `A professional character reference sheet, 4x2 grid layout, pure white background, high resolution. The subject is a single consistent character in all panels. Studio lighting, sharp focus, no text.
Top Row: 1. Front view of the head. 2. Side profile of the head. 3. Back view of the head. 4. Top-down view of the head.
Bottom Row: 1. Full-body front view. 2. Full-body side view. 3. Full-body back view. 4. Close-up of both hands and forearms.
Character details: `;

/** Câu kết bắt buộc của prompt ảnh đạo cụ (giữ nguyên từ bản cũ) */
export const PROP_SUFFIX = 'no text, no letters, no logos, no engraving or writing on the surface';

export const ASSETS_SCHEMA = OBJ({
  characters: LIST(
    OBJ({
      tag: S(), desc: S('Cụm mô tả tiếng Anh 3–6 chữ, chỉ hình dáng, VD "the orange tabby cat"'),
      note: S('Mô tả ngắn cho ô Note, tiếng Việt, 1–2 câu'),
      age: S(), personality: S(), look: S(), outfit: S(), expression: S(), scale: S(),
      standardPrompt: S('Standard Image Prompt tiếng Anh, một góc chính'),
      details: S('Toàn bộ mô tả nhân vật tiếng Anh để ghép vào cuối mẫu Character Reference Sheet — KHÔNG chép lại mẫu'),
    })
  ),
  props: LIST(
    OBJ({
      tag: S(), desc: S('Cụm mô tả tiếng Anh'), note: S(), description: S('Hình dáng, chất liệu, màu, kích thước neo vào cơ thể nhân vật'),
      imagePrompt: S('Prompt ảnh tiếng Anh, nền trắng, ánh sáng studio'),
      variants: LIST(OBJ({ tag: S('tag-bienthe'), desc: S(), note: S(), state: S(), editPrompt: S('Prompt sửa từ ảnh gốc, tiếng Anh') })),
    })
  ),
  locations: LIST(
    OBJ({
      tag: S(), desc: S('Cụm mô tả tiếng Anh'), note: S(),
      layout: S('Sơ đồ: mốc cố định, nguồn sáng, thời điểm, trục đặt máy — tiếng Việt, nhiều dòng'),
      scale: S('Tỉ lệ so với nhân vật'),
      angles: LIST(OBJ({ id: S('a, b, c hoặc d'), vi: S(), en: S(), light: S('Hướng sáng trong khung, tiếng Anh'), prompt: S('Chỉ góc a có prompt; góc phụ để trống — viết ở lượt 2 khi đã có ảnh góc a') })),
    })
  ),
  warnings: LIST(S()),
});

export function assetsPrompt(settings: ProjectSettings, idea: Idea, outline: Outline, style: string, feedback: string, previous?: Assets): string {
  const task = previous
    ? `Sửa bộ tài sản dưới đây theo góp ý. Sửa đúng chỗ được góp ý, giữ nguyên phần còn lại — ĐẶC BIỆT giữ nguyên tag và cụm mô tả (desc) nếu góp ý không nhắc tới.\nGÓP Ý: ${feedback}\n\nTÀI SẢN HIỆN TẠI (JSON):\n${JSON.stringify(previous)}`
    : `Viết tài sản cho MỌI nhân vật, MỌI đạo cụ chính và MỌI bối cảnh trong outline. Giữ đúng tag của outline. Đạo cụ có trạng thái sau thì thêm "variants" với đúng tag trạng thái sau của outline. Mỗi bối cảnh 2–4 góc máy: đây là LƯỢT 1 — chỉ viết prompt cho góc a; góc phụ chỉ lên kế hoạch (vi, en, light), để trống prompt.${feedback ? `\nYêu cầu thêm: ${feedback}` : ''}`;
  return buildStepPrompt({
    step: '3-tai-san',
    scriptType: settings.scriptType,
    project: `${describeSettings(settings)}\nStyle của phim (dùng nguyên văn trong mọi prompt ảnh): ${style}\n\n${describeIdea(idea)}\n\n${describeOutline(outline)}`,
    task,
  });
}

const ensureSuffix = (prompt: string) => (prompt.toLowerCase().includes('no engraving or writing') ? prompt : `${prompt.replace(/[.,\s]+$/, '')}, ${PROP_SUFFIX}`);

export function normalizeAssets(raw: any, outline: Outline, style: string): Assets {
  const warnings = strList(raw?.warnings, 10);

  const characters: CharacterAsset[] = (Array.isArray(raw?.characters) ? raw.characters : [])
    .map((c: any) => {
      const details = str(c?.details, 3000).replace(/^character details:\s*/i, '');
      return {
        tag: toTag(c?.tag), desc: str(c?.desc, 80), note: str(c?.note, 400),
        age: str(c?.age, 80), personality: str(c?.personality, 300), look: str(c?.look, 800), outfit: str(c?.outfit, 300),
        expression: str(c?.expression, 200), scale: str(c?.scale, 300),
        standardPrompt: str(c?.standardPrompt, 2000), details, sheetPrompt: SHEET_TEMPLATE + details,
      };
    })
    .filter((c: CharacterAsset) => c.tag);

  const props: PropAsset[] = (Array.isArray(raw?.props) ? raw.props : [])
    .map((p: any) => {
      const tag = toTag(p?.tag);
      return {
        tag, desc: str(p?.desc, 80), note: str(p?.note, 400), description: str(p?.description, 800),
        imagePrompt: ensureSuffix(str(p?.imagePrompt, 2000)),
        variants: (Array.isArray(p?.variants) ? p.variants : [])
          .map((v: any) => {
            let vt = toTag(v?.tag);
            if (vt && !vt.startsWith(`${tag}-`)) vt = toTag(`${tag}-${vt}`);
            let edit = str(v?.editPrompt, 1500);
            if (edit && !/same object/i.test(edit)) edit = `Same object as the reference image, ${edit.charAt(0).toLowerCase()}${edit.slice(1)}`;
            return { tag: vt, desc: str(v?.desc, 80), note: str(v?.note, 400), state: str(v?.state, 400), editPrompt: edit ? ensureSuffix(edit) : '' };
          })
          .filter((v: any) => v.tag && v.tag !== tag),
      };
    })
    .filter((p: PropAsset) => p.tag);

  const ids = ['a', 'b', 'c', 'd'];
  const locations: LocationAsset[] = (Array.isArray(raw?.locations) ? raw.locations : [])
    .map((l: any) => {
      const tag = toTag(l?.tag).slice(0, 12);
      const angles = (Array.isArray(l?.angles) ? l.angles : []).slice(0, 4).map((g: any, i: number) => {
        const id = ids[i];
        // Lượt 1 chỉ có prompt góc a. Góc phụ viết ở lượt 2, khi đã nhìn thấy ảnh góc a thật.
        const prompt = i === 0 ? str(g?.prompt, 2000) : '';
        return { id, tag: `${tag}-${id}`, vi: str(g?.vi, 400), en: str(g?.en, 400), light: str(g?.light, 200), prompt };
      });
      if (angles.length < 2) warnings.push(`Bối cảnh @${tag} chỉ có ${angles.length} góc máy — nên có 2–4 góc.`);
      return { tag, desc: str(l?.desc, 80), note: str(l?.note, 400), layout: str(l?.layout, 2000), scale: str(l?.scale, 600), angles };
    })
    .filter((l: LocationAsset) => l.tag);

  // Đối chiếu với outline
  const has = (list: { tag: string }[], t: string) => list.some((x) => x.tag === t);
  outline.characters.forEach((c) => !has(characters, c.tag) && warnings.push(`Thiếu tài sản cho nhân vật @${c.tag}.`));
  outline.props.forEach((p) => {
    const found = props.find((x) => x.tag === p.tag);
    if (!found) warnings.push(`Thiếu tài sản cho đạo cụ @${p.tag}.`);
    else if (p.afterTag && !found.variants.some((v) => v.tag === p.afterTag)) warnings.push(`Đạo cụ @${p.tag} thiếu trạng thái sau @${p.afterTag}.`);
  });
  outline.locations.forEach((l) => !has(locations, l.tag) && warnings.push(`Thiếu tài sản cho bối cảnh @${l.tag}.`));
  [...characters, ...props, ...locations].forEach((x) => {
    if (!x.desc) warnings.push(`@${x.tag} chưa có cụm mô tả tiếng Anh.`);
    else if (x.desc.split(/\s+/).length > 8) warnings.push(`Cụm mô tả của @${x.tag} dài quá (${x.desc.split(/\s+/).length} chữ) — nên 3–6 chữ.`);
  });

  if (!characters.length && !locations.length) throw new Error('Gemini không trả về tài sản nào. Thử lại.');
  return { style, characters, props, locations, warnings: Array.from(new Set(warnings)) };
}

/* =============================== BƯỚC 3 · BỐI CẢNH LƯỢT 2 =============================== */
// Đọc ảnh góc a thật → sửa sơ đồ theo ảnh → viết prompt các góc phụ.

export const ANGLES_SCHEMA = OBJ({
  seen: S('Các mốc cố định thấy trong ảnh góc a, kèm vị trí trong khung (trái/giữa/phải, gần/xa) — tiếng Việt'),
  layout: S('Sơ đồ viết lại theo ảnh thật — tiếng Việt, nhiều dòng'),
  scale: S(),
  angles: LIST(
    OBJ({ id: S('b, c hoặc d'), vi: S(), en: S(), light: S(), prompt: S('Prompt góc phụ theo khuôn "Prompt góc phụ (lượt 2)"') }),
    '1–3 góc phụ'
  ),
  warnings: LIST(S('Chỗ ảnh thật lệch outline/sơ đồ, hoặc lỗi của ảnh góc a')),
});

export function validLocationRequest(body: any): { location: LocationAsset; image: MatchImage; extra: string } {
  const location = body?.location as LocationAsset;
  if (!location?.tag || !Array.isArray(location.angles) || !location.angles.length) throw new Error('Thiếu dữ liệu bối cảnh.');
  const image = body?.image;
  if (!image || typeof image.data !== 'string' || image.data.length < 100) throw new Error(`Chưa có ảnh @${location.angles[0].tag}. Nạp ảnh góc a trước.`);
  return {
    location,
    image: { mime: /^image\/(png|jpeg|webp)$/.test(image.mime) ? image.mime : 'image/jpeg', data: image.data },
    extra: str(body?.extra, 1000),
  };
}

export function anglesParts(settings: ProjectSettings, idea: Idea, outline: Outline, style: string, location: LocationAsset, image: MatchImage, extra: string) {
  const a = location.angles[0];
  const plan = location.angles.slice(1).map((g) => `- Góc ${g.id}: ${g.vi} | ${g.en} | ${g.light}`).join('\n') || '- (chưa có)';
  const text = buildStepPrompt({
    step: '3-tai-san',
    scriptType: settings.scriptType,
    project: `${describeSettings(settings)}\nStyle của phim: ${style}\n\n${describeIdea(idea)}\n\n${describeOutline(outline)}`,
    task: `BỐI CẢNH — LƯỢT 2 cho @${location.tag} (${location.desc}).
Ảnh đính kèm cuối prompt là ảnh GÓC A THẬT (@${a.tag}) người dùng đã tạo: ${a.vi}.
Sơ đồ dự kiến ở lượt 1 (ảnh thật thắng sơ đồ này):
${location.layout}
Kế hoạch góc phụ ở lượt 1 (được sửa nếu ảnh thật khác, hoặc nếu góc đó khó tạo):
${plan}

Làm lần lượt:
1. "seen": liệt kê các mốc cố định THẤY TRONG ẢNH, kèm vị trí trong khung.
2. "layout": viết lại sơ đồ theo ảnh thật, giữ quy tắc đặt máy cùng một phía đường trục.
3. "scale": tỉ lệ so với nhân vật.
4. "angles": 1–3 góc phụ (id b, c, d) theo mục "Chọn góc phụ — ưu tiên góc dễ tạo", phục vụ các scene dùng bối cảnh này.
   Mỗi prompt theo đúng khuôn "Prompt góc phụ (lượt 2)", đủ năm phần, gọi đúng tên đồ vật thấy trong ảnh.
5. "warnings": chỗ ảnh thật lệch outline hoặc sơ đồ; lỗi của ảnh góc a (có nhân vật, có chữ, đồ vật lạ không có trong mô tả).${extra ? `\n\nYêu cầu thêm của người dùng: ${extra}` : ''}`,
  });
  return [{ text }, { text: `Ảnh góc a (@${a.tag}):` }, { inlineData: { mimeType: image.mime, data: image.data } }];
}

const ANGLE_GUARD = 'NEW CAMERA ANGLE of the same room shown in the reference image. Use the reference ONLY for the room\'s design (walls, floor, furniture, materials, colors, style). Do NOT reuse its framing or camera position.';

export function normalizeAngles(raw: any, location: LocationAsset, style: string): LocationAsset & { seen: string; angleWarnings: string[] } {
  const ids = ['b', 'c', 'd'];
  const angles = (Array.isArray(raw?.angles) ? raw.angles : [])
    .slice(0, 3)
    .map((g: any, i: number) => {
      const id = ids[i];
      let prompt = str(g?.prompt, 3000);
      if (prompt && !/new camera angle/i.test(prompt)) prompt = `${style}.\n${ANGLE_GUARD}\n${prompt}`;
      return { id, tag: `${location.tag}-${id}`, vi: str(g?.vi, 400), en: str(g?.en, 400), light: str(g?.light, 200), prompt };
    })
    .filter((g: any) => g.prompt);
  if (!angles.length) throw new Error('Gemini không trả về góc phụ nào. Thử lại.');
  return {
    ...location,
    layout: str(raw?.layout, 3000) || location.layout,
    scale: str(raw?.scale, 800) || location.scale,
    angles: [location.angles[0], ...angles],
    seen: str(raw?.seen, 2000),
    angleWarnings: strList(raw?.warnings, 10),
  };
}

/* =============================== ẢNH: gán @tag, đọc style =============================== */

export interface MatchImage { mime: string; data: string }

export function validImages(list: unknown, max: number): MatchImage[] {
  return (Array.isArray(list) ? list : [])
    .filter((i: any) => i && typeof i.data === 'string' && i.data.length > 100)
    .slice(0, max)
    .map((i: any) => ({ mime: /^image\/(png|jpeg|webp)$/.test(i.mime) ? i.mime : 'image/jpeg', data: i.data }));
}
export interface MatchTag { tag: string; label: string; desc: string; note: string }

export function validMatch(body: any): { images: MatchImage[]; tags: MatchTag[] } {
  const images = (Array.isArray(body?.images) ? body.images : [])
    .filter((i: any) => i && typeof i.data === 'string' && i.data.length > 100)
    .slice(0, 12)
    .map((i: any) => ({ mime: /^image\/(png|jpeg|webp)$/.test(i.mime) ? i.mime : 'image/jpeg', data: i.data }));
  if (!images.length) throw new Error('Chưa có ảnh nào để quét.');
  const tags = (Array.isArray(body?.tags) ? body.tags : [])
    .map((t: any) => ({ tag: toTag(t?.tag), label: str(t?.label, 80), desc: str(t?.desc, 200), note: str(t?.note, 400) }))
    .filter((t: MatchTag) => t.tag);
  if (!tags.length) throw new Error('Dự án chưa có @tag nào đang chờ ảnh.');
  return { images, tags };
}

export function matchParts(images: MatchImage[], tags: MatchTag[]) {
  const list = tags.map((t) => `- @${t.tag} (${t.label}) — ${t.desc}. ${t.note}`).join('\n');
  const parts: any[] = [
    {
      text: `Người dùng gửi ${images.length} ảnh tham chiếu vừa tạo cho một phim hoạt hình/phim ngắn làm bằng AI. Với MỖI ảnh:
1. Ghi ngắn những gì thấy được (loài/người, màu, hình dáng, là bảng reference nhiều ô hay một góc; với ảnh bối cảnh: căn phòng nhìn từ hướng nào, cửa sổ ở bên nào).
2. Gán ảnh cho @tag khớp nhất trong danh sách và cho điểm tự tin 0–100. Không khớp thì để tag rỗng, điểm 0.
3. Cảnh báo nếu: ảnh đạo cụ có chữ trên thân vật; ảnh bối cảnh có nhân vật hoặc chữ; hình lệch rõ so với mô tả.
Ảnh các góc của cùng một bối cảnh trông giống nhau — phân biệt bằng hướng nhìn và vị trí cửa sổ/mốc cố định.

DANH SÁCH @TAG ĐANG CHỜ ẢNH:
${list}

Ảnh được đánh số theo thứ tự gửi, bắt đầu từ 0.`,
    },
  ];
  images.forEach((img, i) => {
    parts.push({ text: `Ảnh số ${i}:` });
    parts.push({ inlineData: { mimeType: img.mime, data: img.data } });
  });
  return parts;
}

export const MATCH_SCHEMA = LIST(OBJ({ index: I(), tag: S(), confidence: I(), seen: S(), warning: S() }));

export function normalizeMatches(raw: any, count: number, tags: MatchTag[]) {
  const valid = new Set(tags.map((t) => t.tag));
  const out = Array.from({ length: count }, (_, index) => ({ index, tag: '', confidence: 0, seen: '', warning: '' }));
  (Array.isArray(raw) ? raw : []).forEach((m: any) => {
    const i = Number(m?.index);
    if (!Number.isInteger(i) || i < 0 || i >= count) return;
    const tag = toTag(m?.tag);
    const ok = valid.has(tag);
    out[i] = { index: i, tag: ok ? tag : '', confidence: ok ? clamp(Math.round(Number(m?.confidence) || 0), 0, 100) : 0, seen: str(m?.seen, 400), warning: str(m?.warning, 400) };
  });
  return out;
}

export const STYLE_SCHEMA = OBJ({ style: S(), summary: S() });

export const STYLE_PROMPT = `Bạn là đạo diễn hình ảnh cho phim làm bằng AI (ảnh bằng Nano Banana, video bằng Gemini Omni Flash).
Đọc PHONG CÁCH HÌNH ẢNH của ảnh tham chiếu — không tả nội dung, nhân vật hay câu chuyện:
- Chất liệu / kỹ thuật (hoạt hình 2D, 3D, đất sét, màu nước, người thật…), nét viền, cách tô bóng.
- Bảng màu, độ bão hoà, ánh sáng (hướng, độ cứng, nhiệt độ màu), độ sâu trường ảnh, hạt, cảm giác ống kính.
"style": MỘT chuỗi tiếng Anh 12–30 từ, các cụm cách nhau bằng dấu phẩy (VD: "2D classic slapstick cartoon, hand-drawn look, clean bold outlines, vibrant flat colors").
"summary": một câu tiếng Việt tóm tắt phong cách đó.`;
