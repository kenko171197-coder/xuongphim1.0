// Bước 3 của LÕI trong app: chia scene (3.2), viết đầu vào từng beat (3.4 → 3.10), đọc frame (3.6).
// Bước 3 KHÔNG viết prompt video — engine của app Đạo diễn (server/engine) làm việc đó.
import { Type } from '@google/genai';
import { nap, borrowedModuleBlock, moduleIndex, stripChecklist, isModuleCode, loadedModules, ModuleCode } from '../knowledge';
import { POSITIVE_RULE } from './3-kich-ban';
import { ProjectPayload, projectContext, ctxOf } from '../project';
import { toTag } from '../util';

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
  /** Kế hoạch của kịch bản cho beat này: số shot và từng mắt xích */
  plan: { shots: number; links: string[] } | null;
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
    plan:
      body?.plan && Array.isArray(body.plan.links) && body.plan.links.length
        ? { shots: Math.min(Math.max(Number(body.plan.shots) || 1, 1), 8), links: body.plan.links.map((x: any) => str(x)).filter(Boolean) }
        : null,
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

${nap('buoc-5-beat', 'beat', ctxOf(p))}

===== MỤC LỤC CÁC MODULE KHÁC (nhịp 4a': beat rõ ràng thuộc thể loại của module nào thì ghi mã vào "borrowed", app sẽ nạp nguyên văn module đó) =====
${moduleIndex(usedModules)}

${projectContext(p, true)}
Style chung cả phim (dòng Style: phải y hệt): ${c.style}
Tỉ lệ khung: ${settings.aspect}`;

  // ---- PHẦN THEO BEAT ----
  const borrowedBlock =
    c.borrowed && !usedModules.includes(c.borrowed) && loadedModules().includes(c.borrowed)
      ? `\n${borrowedModuleBlock('buoc-5-beat', 'beat', c.borrowed)}\n`
      : '';

  const revision = c.previousOutput
    ? `\n===== BẢN ĐẦU VÀO TRƯỚC CỦA ${c.beatId} =====\n${c.previousOutput}\n\n===== YÊU CẦU SỬA =====\n${c.feedback || '(không có)'}\nViết lại đầu vào của beat theo yêu cầu. Giữ nguyên phần không bị yêu cầu đổi. Làm lại bảng kiểm 3.10.\n`
    : c.feedback
    ? `\nGHI CHÚ CỦA NGƯỜI DÙNG: ${c.feedback}\n`
    : '';

  const variable = `${borrowedBlock}
===== KỊCH BẢN LIÊN QUAN (đề cương + scene chứa beat này) =====
${stripChecklist(c.scriptMarkdown)}

${c.plan ? `KẾ HOẠCH CỦA KỊCH BẢN CHO ${c.beatId}: ${c.plan.shots} shot · mắt xích: ${c.plan.links.join(' → ')}. Bám đúng kế hoạch này (mỗi mắt xích một shot khi có nhiều shot); muốn đổi thì ghi lý do trong markdown.

` : ''}===== KHỞI ĐỘNG 3.1 — ĐÃ XONG =====
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
- "links": chuỗi nhân quả của beat, TỪNG mắt xích một phần tử, kể cả cơ chế trung gian (dây căng, vật trượt, vật rơi…). Không gộp.
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
    links: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Từng mắt xích nhân quả của beat' },
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
  required: ['markdown', 'script', 'duration', 'promptType', 'cinematicLevel', 'pacing', 'refs', 'missing', 'links', 'blocked', 'borrowed', 'postNotes'],
};

export function normalizeBeatInput(raw: any, beatId: string, stateTags: string[] = []) {
  if (!raw || !str(raw.script)) throw new Error('Gemini không trả về ô Script.');
  const d = Number(raw.duration);
  const beatNum = parseInt(beatId.replace(/\D/g, ''), 10) || 0;
  const borrowedRaw = str(raw.borrowed).toUpperCase().match(/M\d{2}/)?.[0] || '';
  const script = str(raw.script).replace(/^>\s?/gm, '');
  const promptType = raw.promptType === 'continuous' ? 'continuous' : 'multishot';
  const duration = [4, 6, 8].includes(d) ? d : 8;
  const links: string[] = (Array.isArray(raw.links) ? raw.links : []).map(str).filter(Boolean);

  // ---- App tự đối chiếu ô Script (không tốn token) → thêm vào ô chặn để người dùng xử lý ----
  const appBlocked: { cell: string; reason: string }[] = [];
  const shotLines = (script.match(/^\s*Shot\s*\d+\s*:/gim) || []).length;
  const shots = promptType === 'continuous' ? 1 : Math.max(shotLines, 1);
  if (promptType === 'multishot' && shotLines < 2) {
    appBlocked.push({ cell: 'App kiểm: thiết lập', reason: `Thiết lập là Multishot nhưng ô Script có ${shotLines} dòng "Shot N:".` });
  }
  if (promptType === 'continuous' && shotLines >= 2) {
    appBlocked.push({ cell: 'App kiểm: thiết lập', reason: `Thiết lập là Continuous nhưng ô Script chia ${shotLines} shot.` });
  }
  const declared = /đúng\s+(\d+)\s+shot/i.exec(script);
  if (promptType === 'multishot' && declared && Number(declared[1]) !== shotLines) {
    appBlocked.push({ cell: 'App kiểm: số shot', reason: `Câu chốt ghi ${declared[1]} shot nhưng ô Script có ${shotLines} shot.` });
  }
  if (links.length - 1 > shots) {
    appBlocked.push({
      cell: 'App kiểm: mắt xích / shot',
      reason: `${links.join(' → ')} = ${links.length - 1} tầng nhưng chỉ ${shots} shot. Mỗi mắt xích một shot, mỗi shot một chủ thể — hoặc tách beat.`,
    });
  }
  if (duration === 4 && shots >= 3) {
    appBlocked.push({ cell: 'App kiểm: thời lượng', reason: `${shots} shot trong 4 giây — nên 6–8 giây.` });
  }

  return {
    markdown: str(raw.markdown),
    script,
    duration,
    promptType,
    links,
    cinematicLevel: ['simple', 'medium', 'complex'].includes(raw.cinematicLevel) ? raw.cinematicLevel : 'medium',
    pacing: ['slow', 'medium', 'fast'].includes(raw.pacing) ? raw.pacing : 'medium',
    refs: (Array.isArray(raw.refs) ? raw.refs : []).map((r: any) => ({ tag: toTag(r.tag), note: str(r.note) })).filter((r: any) => r.tag),
    missing: Array.from(new Set((Array.isArray(raw.missing) ? raw.missing : []).map(toTag).filter(Boolean))),
    blocked: [
      ...(Array.isArray(raw.blocked) ? raw.blocked : []).map((b: any) => ({ cell: str(b.cell), reason: str(b.reason) })).filter((b: any) => b.cell),
      ...appBlocked,
    ],
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

${nap('buoc-5-beat', 'doc-frame')}

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
   - "Đúng khoảnh khắc": frame có đúng thời điểm Ghi chú hậu kỳ dự kiến không (VD cần khung cuối mà lại chụp khung đầu = 0; ảnh trạng thái sau mà đạo cụ chưa đổi trạng thái = 0). Thiếu bất kỳ chi tiết nào Ghi chú hậu kỳ yêu cầu thì tối đa 1 điểm.
   - "Tư thế ổn định": theo luật 3.6.
   - "Nhân vật & đạo cụ": đủ, đúng, đúng trạng thái, nhận ra được, không méo, không thừa.
   - "Bố cục khớp Script": vị trí, hướng nhìn, cỡ cảnh, góc máy có dùng được cho beat sau không.
   - "Chất lượng hình": nét, không biến dạng, đúng tỉ lệ khung của phim.
5. "score": tổng điểm các tiêu chí, quy về thang 10 (làm tròn).
5b. "missingDetails": liệt kê TỪNG chi tiết mà Ghi chú hậu kỳ (hoặc khung cuối trong ô Script) yêu cầu nhưng KHÔNG thấy trong frame (VD "chóp đuôi móc vào dây"). Đủ hết thì mảng rỗng. Soi kỹ: đây là thứ beat sau sẽ dựa vào.
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
    missingDetails: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Chi tiết được yêu cầu mà frame không có' },
    fix: { type: Type.STRING, enum: ['ok', 'chup-lai', 'tao-lai-video'] },
    warning: { type: Type.STRING },
  },
  required: ['seen', 'note', 'stable', 'criteria', 'score', 'missingDetails', 'fix', 'warning'],
};

/** Chuẩn hoá kết quả chấm frame. Điểm tính lại từ tiêu chí để không tin con số AI tự ghi. */
export function normalizeFrameRead(raw: any) {
  const missingDetails: string[] = (Array.isArray(raw?.missingDetails) ? raw.missingDetails : []).map(str).filter(Boolean);
  const criteria = (Array.isArray(raw?.criteria) ? raw.criteria : [])
    .map((c: any) => ({
      name: str(c.name),
      points: Math.min(Math.max(Math.round(Number(c.points) || 0), 0), 2),
      comment: str(c.comment),
    }))
    .filter((c: any) => c.name)
    // Thiếu chi tiết được yêu cầu → "Đúng khoảnh khắc" tối đa 1 điểm, dù AI chấm cao hơn
    .map((c: any) => (missingDetails.length && /khoảnh khắc/i.test(c.name) ? { ...c, points: Math.min(c.points, 1) } : c));
  const score = criteria.length
    ? Math.round((criteria.reduce((t: number, c: any) => t + c.points, 0) / (criteria.length * 2)) * 10)
    : Math.min(Math.max(Math.round(Number(raw?.score) || 0), 0), 10);
  let fix = ['ok', 'chup-lai', 'tao-lai-video'].includes(raw?.fix) ? raw.fix : 'ok';
  // Điểm quá thấp hoặc có tiêu chí hỏng hẳn mà AI vẫn ghi "ok" → không cho qua
  if (fix === 'ok' && (score < 5 || criteria.some((c: any) => c.points === 0) || missingDetails.length)) fix = 'chup-lai';
  return {
    seen: str(raw?.seen),
    note: str(raw?.note),
    stable: raw?.stable !== false,
    criteria,
    score,
    fix: fix as 'ok' | 'chup-lai' | 'tao-lai-video',
    warning: [missingDetails.length ? `Thiếu so với yêu cầu: ${missingDetails.join('; ')}.` : '', str(raw?.warning)].filter(Boolean).join(' '),
    missingDetails,
  };
}

/* ============ Frame kém → chẩn đoán theo LÕI "Quy trình khi một beat chạy ra hỏng" ============ */

export interface DiagnoseRequest {
  beatId: string;
  script: string;
  markdown: string;
  planned: string;
  read: { seen: string; warning: string; criteria: { name: string; points: number; comment: string }[] };
  image: { mime: string; data: string };
  runs: number;
}

export function validateDiagnose(body: any): DiagnoseRequest {
  const image = body?.image;
  if (!image || typeof image.data !== 'string' || image.data.length < 100) throw new Error('Chưa có ảnh frame.');
  if (!str(body?.script)) throw new Error('Beat chưa có ô Script.');
  return {
    beatId: str(body?.beatId),
    script: str(body?.script),
    markdown: str(body?.markdown),
    planned: str(body?.planned),
    read: {
      seen: str(body?.read?.seen),
      warning: str(body?.read?.warning),
      criteria: Array.isArray(body?.read?.criteria) ? body.read.criteria.slice(0, 8) : [],
    },
    image: { mime: /^image\/(png|jpeg|webp)$/.test(image.mime) ? image.mime : 'image/jpeg', data: image.data },
    runs: Math.max(1, Number(body?.runs) || 1),
  };
}

export function buildDiagnoseParts(p: ProjectPayload, d: DiagnoseRequest) {
  const text = `${ROLE}

${nap('buoc-5-beat', 'chan-doan', ctxOf(p))}

${projectContext(p, true)}

===== BEAT ${d.beatId} VỪA CHẠY RA VIDEO =====
Ô Script đã dùng:
${d.script}

Đầu vào 3.10 của beat:
${d.markdown || '(không có)'}

Ghi chú hậu kỳ dự kiến cho frame này: ${d.planned || '(không có)'}
Kết quả chấm frame: ${d.read.seen}
${d.read.criteria.map((c) => `- ${c.name}: ${c.points}/2 — ${c.comment}`).join('\n')}
${d.read.warning ? `Cảnh báo: ${d.read.warning}` : ''}
Người dùng đã chạy beat này ${d.runs} lần.
Ảnh frame thật đính kèm ở cuối.

===== NHIỆM VỤ =====
Làm đúng "Quy trình khi một beat chạy ra hỏng":
1. "loai": phân loại theo bảng (lệch nhẹ / thiếu hành động / sai vị trí-hướng-thời điểm / sai bối cảnh-nhân vật / frame cuối lơ lửng / cảnh báo app).
2. "viPham": nguyên nhân gốc — luật nào (0.1–0.7, luật module) đã bị vi phạm TRONG Ô SCRIPT khiến Veo dựng ra như vậy. Chỉ thẳng câu nào trong ô Script gây ra.
3. "huong": chọn MỘT —
   - "nhan-frame": lệch nhẹ, vẫn nối tiếp được → nhận frame làm sự thật (0.3), beat sau tự điều chỉnh. Ghi trong "chiDan" beat sau cần bù gì.
   - "sua-beat": sửa ô Script của CHÍNH beat này rồi chạy lại video. "chiDan" = yêu cầu sửa cụ thể, từng câu cần đổi và đổi thành gì (câu khẳng định, đúng cơ chế, đúng vị trí), không viết lại cả ô Script.
   - "tach-beat": beat quá tải (nhiều mắt xích, cú ngã vắt beat) → phải sửa ở kịch bản scene. "chiDan" = yêu cầu sửa scene sẵn để dán.
   - "kiem-anh": lỗi do đường nạp ảnh (thiếu ảnh, thiếu @tag, ô Note trống hoặc sai). "chiDan" = sửa ảnh / Note nào.
4. "lyDo": 1–2 câu vì sao chọn hướng đó. Đã chạy nhiều lần vẫn hỏng cùng kiểu → không chọn "chạy lại y nguyên".`;
  return [{ text }, { inlineData: { mimeType: d.image.mime, data: d.image.data } }];
}

export const DIAGNOSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    loai: { type: Type.STRING },
    viPham: { type: Type.STRING },
    huong: { type: Type.STRING, enum: ['nhan-frame', 'sua-beat', 'tach-beat', 'kiem-anh'] },
    chiDan: { type: Type.STRING },
    lyDo: { type: Type.STRING },
  },
  required: ['loai', 'viPham', 'huong', 'chiDan', 'lyDo'],
};

export function normalizeDiagnose(raw: any) {
  const huong = ['nhan-frame', 'sua-beat', 'tach-beat', 'kiem-anh'].includes(raw?.huong) ? raw.huong : 'sua-beat';
  return { loai: str(raw?.loai), viPham: str(raw?.viPham), huong, chiDan: str(raw?.chiDan), lyDo: str(raw?.lyDo) };
}
