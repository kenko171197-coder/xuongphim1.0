// Bước 3 của LÕI trong app: chia scene (3.2), viết đầu vào từng beat (3.4 → 3.10), đọc frame (3.6).
// Bước 3 KHÔNG viết prompt video — engine của app Đạo diễn (server/engine) làm việc đó.
import { Type } from '@google/genai';
import { loiForBeats, loiForFrames, modulesBlock, getModule, moduleIndex, stripChecklist, scriptTypeBlock, isModuleCode, loadedModules, ModuleCode } from './knowledge';
import { POSITIVE_RULE } from './outline';
import { ProjectPayload, projectContext } from './project';
import { toTag } from './story';

const ROLE = `VAI TRÒ
Bạn là Trợ lý đạo diễn trong hệ thống FILM 2.0, chạy BÊN TRONG một app có nút bấm: không chào hỏi, không hỏi lại bằng chữ, không kết bằng câu hỏi. Chỗ LÕI bảo "dừng lại xin ảnh" thì ghi vào trường thiếu ảnh; app sẽ hiện cho người dùng.`;

const str = (v: unknown) => String(v ?? '').trim();

/* ============ 3.4 → 3.10 — Viết đầu vào một beat ============ */

export interface LibraryItem {
  tag: string;
  kind: 'character' | 'prop' | 'frame';
  note: string;
  seen?: string;
  beatId?: string;
  hasImage?: boolean;
}

export interface BeatContext {
  beatId: string;
  scene: { id: string; location: string; time: string; light: string; beats: string[] } | null;
  style: string;
  scriptMarkdown: string;
  library: LibraryItem[];
  /** Đầu vào đã viết của các beat trước (gần nhất trước), dạng 3.10 */
  previousBeats: { beatId: string; markdown: string }[];
  /** Ảnh frame gửi kèm để "đọc frame" (nhịp 3) */
  frameImages: { tag: string; mime: string; data: string }[];
  feedback?: string;
  previousOutput?: string;
  borrowed?: ModuleCode | '';
  /** Tag trạng thái sau khai ở 1.5 (VD baykep ← baychuot) */
  stateTags: { tag: string; parent: string; note: string }[];
}

export function validateBeatContext(body: any): BeatContext {
  const beatId = str(body?.beatId);
  if (!/^B\d+$/i.test(beatId)) throw new Error('Thiếu mã beat.');
  const scriptMarkdown = str(body?.scriptMarkdown);
  if (!scriptMarkdown) throw new Error('Chưa có kịch bản.');
  const library = (Array.isArray(body?.library) ? body.library : [])
    .map((l: any) => ({
      tag: toTag(l.tag),
      kind: ['character', 'prop', 'frame'].includes(l.kind) ? l.kind : 'character',
      note: str(l.note),
      seen: str(l.seen),
      beatId: str(l.beatId),
      hasImage: l.hasImage !== false,
    }))
    .filter((l: LibraryItem) => l.tag);
  const frameImages = (Array.isArray(body?.frameImages) ? body.frameImages : [])
    .filter((f: any) => f && typeof f.data === 'string' && f.data.length > 100)
    .slice(0, 3)
    .map((f: any) => ({ tag: toTag(f.tag), mime: /^image\/(png|jpeg|webp)$/.test(f.mime) ? f.mime : 'image/jpeg', data: f.data }));
  const previousBeats = (Array.isArray(body?.previousBeats) ? body.previousBeats : [])
    .slice(0, 3)
    .map((b: any) => ({ beatId: str(b.beatId), markdown: str(b.markdown) }))
    .filter((b: any) => b.markdown);
  const s = body?.scene;
  return {
    beatId: beatId.toUpperCase(),
    scene: s && s.id ? { id: str(s.id), location: str(s.location), time: str(s.time), light: str(s.light), beats: (s.beats || []).map(str) } : null,
    style: str(body?.style),
    scriptMarkdown,
    library,
    previousBeats,
    frameImages,
    feedback: str(body?.feedback),
    previousOutput: str(body?.previousOutput),
    borrowed: isModuleCode(body?.borrowed) ? body.borrowed : '',
    stateTags: (Array.isArray(body?.stateTags) ? body.stateTags : [])
      .map((t: any) => ({ tag: toTag(t.tag), parent: toTag(t.parent), note: str(t.note) }))
      .filter((t: any) => t.tag),
  };
}

function libraryText(items: LibraryItem[]): string {
  if (!items.length) return '(chưa có ảnh nào)';
  const label = { character: 'nhân vật', prop: 'đạo cụ', frame: 'frame nối' };
  return items
    .map(
      (l) =>
        `- @${l.tag} (${label[l.kind]}${l.beatId ? `, chụp từ ${l.beatId}` : ''})${l.hasImage ? '' : ' — CHƯA CÓ ẢNH'} — Note: "${l.note}"${l.seen ? ` | Đọc từ ảnh: ${l.seen}` : ''}`
    )
    .join('\n');
}

export function buildBeatParts(p: ProjectPayload, c: BeatContext) {
  const { settings } = p;
  const usedModules = [settings.module, settings.secondary];

  // ---- PHẦN CỐ ĐỊNH CHO CẢ PHIM (đặt đầu để Gemini tính giá rẻ cho phần lặp lại giữa các beat) ----
  const stable = `${ROLE}

===== LÕI — CÁCH DÙNG, NGUYÊN TẮC, PHẦN 0 VÀ TOÀN BỘ BƯỚC 3 — NGUYÊN VĂN, BẮT BUỘC TUÂN THỦ =====
${loiForBeats()}

${modulesBlock(settings.module, settings.secondary)}${scriptTypeBlock(settings.scriptType, 'beat')}
===== MỤC LỤC CÁC MODULE KHÁC (nhịp 4a': beat rõ ràng thuộc thể loại của module nào thì ghi mã vào "borrowed", app sẽ nạp nguyên văn module đó) =====
${moduleIndex(usedModules)}

${projectContext(p, true)}
Style chung cả phim (dòng Style: phải y hệt): ${c.style}
Tỉ lệ khung: ${settings.aspect}`;

  // ---- PHẦN THEO BEAT ----
  const borrowedBlock =
    c.borrowed && !usedModules.includes(c.borrowed) && loadedModules().includes(c.borrowed)
      ? `\n===== MODULE MƯỢN CHO RIÊNG BEAT NÀY (${c.borrowed}) — NGUYÊN VĂN, trừ Style =====\n${getModule(c.borrowed)}\n`
      : '';

  const revision = c.previousOutput
    ? `\n===== BẢN ĐẦU VÀO TRƯỚC CỦA ${c.beatId} =====\n${c.previousOutput}\n\n===== YÊU CẦU SỬA =====\n${c.feedback || '(không có)'}\nViết lại đầu vào của beat theo yêu cầu. Giữ nguyên phần không bị yêu cầu đổi. Làm lại bảng kiểm 3.10.\n`
    : c.feedback
    ? `\nGHI CHÚ CỦA NGƯỜI DÙNG: ${c.feedback}\n`
    : '';

  const variable = `${borrowedBlock}
===== KỊCH BẢN LIÊN QUAN (đề cương + scene chứa beat này) =====
${stripChecklist(c.scriptMarkdown)}

===== KHỞI ĐỘNG 3.1 — ĐÃ XONG =====
${c.scene ? `Scene ${c.scene.id}: ${c.scene.location} · ${c.scene.time} · Ánh sáng: ${c.scene.light} · gồm ${c.scene.beats.join(', ')}` : ''}

ẢNH ĐANG CÓ TRONG THƯ VIỆN (tên @tag khớp chính xác ô Name của app):
${libraryText(c.library)}
${c.stateTags.length ? `\nTAG TRẠNG THÁI SAU ĐÃ KHAI Ở 1.5 (ảnh lấy bằng cách chụp từ video của beat đổi trạng thái — LÕI 2.2):\n${c.stateTags.map((t) => `- @${t.tag} ← trạng thái sau của @${t.parent}${t.note ? `: ${t.note}` : ''}`).join('\n')}\n` : ''}
${c.previousBeats.length ? `CÁC BEAT TRƯỚC (beat liền trước: đầu vào 3.10 đầy đủ; beat xa hơn: ô Script):\n${c.previousBeats.map((b) => `--- ${b.beatId} ---\n${b.markdown}`).join('\n\n')}` : 'Đây là beat đầu tiên được viết.'}

${c.frameImages.length ? `ẢNH FRAME THẬT ĐƯỢC ĐÍNH KÈM Ở CUỐI (nhịp 3: đọc frame thật rồi mới chốt): ${c.frameImages.map((f) => '@' + f.tag).join(', ')}` : 'Chưa có ảnh frame thật nào được đính kèm.'}
${revision}
===== NHIỆM VỤ =====
Viết đầu vào cho beat ${c.beatId} theo 3.4 (5 nhịp) và xuất theo đúng định dạng 3.10.
- Trường "markdown": phần xuất 3.10 của beat (tiêu đề BEAT, BẢNG KIỂM đủ mọi dòng, Thiết lập, dòng đọc frame nếu có, Lý do, Ghi chú hậu kỳ). KHÔNG chép lại ô Script và danh sách Ảnh nạp + ô Note trong markdown — hai thứ này đã nằm ở trường "script" và "refs", app tự ghép khi hiển thị. Ở chỗ của chúng chỉ ghi một dòng "(xem ô Script)" / "(xem ảnh nạp)".
- Trường "script": CHÍNH XÁC nội dung ô The Script sẽ dán vào app (dòng frame nếu có, các Shot hoặc đoạn Continuous, câu "Toàn bộ cảnh chỉ gồm đúng N shot…" nếu Multishot, dòng Âm thanh:, dòng Style:). Không có dấu ">" đầu dòng.
- ${POSITIVE_RULE}
- Các trường thiết lập phải khớp dòng Thiết lập, và khoá cứng 3.5.
- Nhịp 2: ảnh cần mà thư viện CHƯA CÓ (kể cả frame chưa chụp) → ghi vào "missing" và không tham chiếu tới nó trong Script.
- Bảy ô chặn: ô nào không đạt → ghi vào "blocked" kèm cách xử lý. Beat đạt hết thì để mảng rỗng.
- Nhịp 4a': nếu beat rõ ràng thuộc thể loại của một module khác trong mục lục, ghi mã module đó vào "borrowed" kèm lý do trong markdown; không mượn thì để rỗng.
- "postNotes": từng frame cần chụp ở Ghi chú hậu kỳ. Tag frame dạng frame + số beat + chữ cái (VD beat B03 → frame3a, frame3b). avoid = true cho frame "không dùng".
- TAG TRẠNG THÁI SAU: nếu chính beat này là beat đạo cụ đổi hình dáng (tag trạng thái sau lên hình lần đầu), tả trạng thái mới bằng chữ và KHÔNG ghi tag đó vào "missing" (ảnh chưa thể có trước khi video tồn tại). Thêm vào "postNotes" một mục với tag = ĐÚNG tên tag trạng thái (VD baykep), "what" = chụp khoảnh khắc nào để có ảnh trạng thái mới rõ nhất, "forBeat" = các beat sau cần nó. Beat SAU beat đổi trạng thái mà tag đó chưa có ảnh thì mới ghi vào "missing".`;

  // Tách đôi: `stable` giống hệt nhau giữa các beat của cùng dự án → đưa vào cache chủ động;
  // `parts` là phần riêng của beat này (module mượn, scene, thư viện, beat trước, ảnh frame, nhiệm vụ).
  const parts: any[] = [{ text: variable }];
  c.frameImages.forEach((f) => {
    parts.push({ text: `Ảnh frame @${f.tag}:` });
    parts.push({ inlineData: { mimeType: f.mime, data: f.data } });
  });
  return { stable, parts };
}

export const BEAT_INPUT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    markdown: { type: Type.STRING, description: 'Toàn bộ phần xuất 3.10, markdown' },
    script: { type: Type.STRING, description: 'Nội dung ô The Script' },
    duration: { type: Type.INTEGER, description: '4, 6 hoặc 8' },
    promptType: { type: Type.STRING, enum: ['multishot', 'continuous'] },
    cinematicLevel: { type: Type.STRING, enum: ['simple', 'medium', 'complex'] },
    pacing: { type: Type.STRING, enum: ['slow', 'medium', 'fast'] },
    refs: {
      type: Type.ARRAY,
      description: 'Ảnh nạp cho beat, đúng thứ tự',
      items: {
        type: Type.OBJECT,
        properties: { tag: { type: Type.STRING }, note: { type: Type.STRING } },
        required: ['tag', 'note'],
      },
    },
    missing: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Tag ảnh cần mà chưa có' },
    blocked: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { cell: { type: Type.STRING }, reason: { type: Type.STRING } },
        required: ['cell', 'reason'],
      },
    },
    borrowed: { type: Type.STRING, description: 'Mã module mượn, hoặc rỗng' },
    postNotes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          tag: { type: Type.STRING },
          what: { type: Type.STRING, description: 'Chụp gì' },
          forBeat: { type: Type.STRING, description: 'Dùng cho beat nào' },
          avoid: { type: Type.BOOLEAN },
        },
        required: ['tag', 'what', 'forBeat', 'avoid'],
      },
    },
  },
  required: ['markdown', 'script', 'duration', 'promptType', 'cinematicLevel', 'pacing', 'refs', 'missing', 'blocked', 'borrowed', 'postNotes'],
};

export function normalizeBeatInput(raw: any, beatId: string, stateTags: string[] = []) {
  if (!raw || !str(raw.script)) throw new Error('Gemini không trả về ô Script.');
  const d = Number(raw.duration);
  const beatNum = parseInt(beatId.replace(/\D/g, ''), 10) || 0;
  const borrowedRaw = str(raw.borrowed).toUpperCase().match(/M\d{2}/)?.[0] || '';
  return {
    markdown: str(raw.markdown),
    script: str(raw.script).replace(/^>\s?/gm, ''),
    duration: [4, 6, 8].includes(d) ? d : 8,
    promptType: raw.promptType === 'continuous' ? 'continuous' : 'multishot',
    cinematicLevel: ['simple', 'medium', 'complex'].includes(raw.cinematicLevel) ? raw.cinematicLevel : 'medium',
    pacing: ['slow', 'medium', 'fast'].includes(raw.pacing) ? raw.pacing : 'medium',
    refs: (Array.isArray(raw.refs) ? raw.refs : []).map((r: any) => ({ tag: toTag(r.tag), note: str(r.note) })).filter((r: any) => r.tag),
    missing: Array.from(new Set((Array.isArray(raw.missing) ? raw.missing : []).map(toTag).filter(Boolean))),
    blocked: (Array.isArray(raw.blocked) ? raw.blocked : []).map((b: any) => ({ cell: str(b.cell), reason: str(b.reason) })).filter((b: any) => b.cell),
    borrowed: (isModuleCode(borrowedRaw) && loadedModules().includes(borrowedRaw) ? borrowedRaw : '') as ModuleCode | '',
    postNotes: (Array.isArray(raw.postNotes) ? raw.postNotes : [])
      .map((n: any, i: number) => {
        let tag = toTag(n.tag);
        const isState = stateTags.includes(tag);
        if (!isState && !/^frame\d+[a-z]$/.test(tag)) tag = `frame${beatNum}${'abcdefgh'[i] || 'z'}`;
        return { tag, what: str(n.what), forBeat: str(n.forBeat), avoid: !!n.avoid, kind: isState ? 'state' : 'frame' };
      }),
  };
}

/* ============ 3.6 — Đọc frame người dùng gửi về ============ */

export function buildReadFrameParts(
  beatId: string,
  tag: string,
  planned: string,
  beatScript: string,
  aspect: string,
  image: { mime: string; data: string },
  kind: 'frame' | 'state' = 'frame'
) {
  const noteRule =
    kind === 'state'
      ? `"note": ảnh này dùng làm ảnh tham chiếu cho TAG TRẠNG THÁI SAU @${tag} của một đạo cụ (LÕI 2.2: trạng thái sau chụp từ video). Viết ô Note theo mẫu đạo cụ ở 3.6: một câu mô tả hình dáng, màu, kích thước so với nhân vật của đạo cụ Ở TRẠNG THÁI MỚI.`
      : `"note": viết ô Note đúng mẫu frame nối của 3.6: Khung cuối của beat ${beatId}: [ai ở đâu, cỡ cảnh]. Clip mở đầu khớp khung này.`;
  const text = `${ROLE}

===== LÕI — MỤC 3.6 — NGUYÊN VĂN =====
${loiForFrames()}

Người dùng vừa chụp frame @${tag} từ video của beat ${beatId} và gửi lên.
Dự kiến ở Ghi chú hậu kỳ: ${planned || '(không có dự kiến)'}
Tỉ lệ khung của phim: ${aspect || '(không rõ)'}
Ô Script của beat ${beatId}:
${beatScript || '(không có)'}

NHIỆM VỤ
1. "seen": đọc frame như nhịp 3a — ai ở đâu, tư thế, hướng mặt; đạo cụ nằm đâu; cỡ cảnh, cao độ máy; hướng sáng; cái gì KHÔNG có trong khung.
2. ${noteRule}
3. "stable": frame có đạt luật tư thế ổn định không (mọi vật và người có điểm tiếp xúc rõ ràng, không rơi, không lơ lửng, không giữa chừng động tác).
4. "criteria": chấm từng tiêu chí, mỗi tiêu chí 0–2 điểm (2 = đạt, 1 = tạm, 0 = hỏng), kèm một câu nhận xét:
   - "Đúng khoảnh khắc": frame có đúng thời điểm Ghi chú hậu kỳ dự kiến không (VD cần khung cuối mà lại chụp khung đầu = 0; ảnh trạng thái sau mà đạo cụ chưa đổi trạng thái = 0).
   - "Tư thế ổn định": theo luật 3.6.
   - "Nhân vật & đạo cụ": đủ, đúng, đúng trạng thái, nhận ra được, không méo, không thừa.
   - "Bố cục khớp Script": vị trí, hướng nhìn, cỡ cảnh, góc máy có dùng được cho beat sau không.
   - "Chất lượng hình": nét, không biến dạng, đúng tỉ lệ khung của phim.
5. "score": tổng điểm các tiêu chí, quy về thang 10 (làm tròn).
6. "fix": "ok" nếu dùng được; "chup-lai" nếu video có khoảnh khắc đúng nhưng chụp sai thời điểm (chụp lại frame khác trong cùng video); "tao-lai-video" nếu chính video hỏng (nhân vật méo, hành động không xảy ra, thiếu người/vật, sai bố cục nặng) nên không có frame nào dùng được.
7. "warning": điều người dùng cần biết, ngắn gọn (ảnh thắng kịch bản: nếu vẫn dùng được thì nói beat sau phải theo khung thật ở điểm nào). Rỗng nếu không có.`;
  return [{ text }, { inlineData: { mimeType: image.mime, data: image.data } }];
}

export const READ_FRAME_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    seen: { type: Type.STRING },
    note: { type: Type.STRING },
    stable: { type: Type.BOOLEAN },
    criteria: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          points: { type: Type.INTEGER, description: '0, 1 hoặc 2' },
          comment: { type: Type.STRING },
        },
        required: ['name', 'points', 'comment'],
      },
    },
    score: { type: Type.INTEGER, description: 'Thang 10' },
    fix: { type: Type.STRING, enum: ['ok', 'chup-lai', 'tao-lai-video'] },
    warning: { type: Type.STRING },
  },
  required: ['seen', 'note', 'stable', 'criteria', 'score', 'fix', 'warning'],
};

/** Chuẩn hoá kết quả chấm frame. Điểm tính lại từ tiêu chí để không tin con số AI tự ghi. */
export function normalizeFrameRead(raw: any) {
  const criteria = (Array.isArray(raw?.criteria) ? raw.criteria : [])
    .map((c: any) => ({
      name: str(c.name),
      points: Math.min(Math.max(Math.round(Number(c.points) || 0), 0), 2),
      comment: str(c.comment),
    }))
    .filter((c: any) => c.name);
  const score = criteria.length
    ? Math.round((criteria.reduce((t: number, c: any) => t + c.points, 0) / (criteria.length * 2)) * 10)
    : Math.min(Math.max(Math.round(Number(raw?.score) || 0), 0), 10);
  let fix = ['ok', 'chup-lai', 'tao-lai-video'].includes(raw?.fix) ? raw.fix : 'ok';
  // Điểm quá thấp hoặc có tiêu chí hỏng hẳn mà AI vẫn ghi "ok" → không cho qua
  if (fix === 'ok' && (score < 5 || criteria.some((c: any) => c.points === 0))) fix = 'chup-lai';
  return {
    seen: str(raw?.seen),
    note: str(raw?.note),
    stable: raw?.stable !== false,
    criteria,
    score,
    fix: fix as 'ok' | 'chup-lai' | 'tao-lai-video',
    warning: str(raw?.warning),
  };
}
