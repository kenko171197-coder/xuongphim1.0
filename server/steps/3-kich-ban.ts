// Kịch bản theo tầng: ĐỀ CƯƠNG (phim → hồi → scene) rồi VIẾT BEAT CHO TỪNG SCENE.
// Lý do: phim trung bình/dài có hàng chục tới hàng trăm beat; viết một lần thì bị cắt ngang và kém chặt.
// Mỗi lần gọi vẫn mang NGUYÊN VĂN luật LÕI + module + kiểu kịch bản. Phần cố định đặt đầu prompt
// (để Gemini tính giá rẻ cho phần lặp lại), phần thay đổi theo scene đặt cuối.
import { Type } from '@google/genai';
import { nap, moduleIndex, isModuleCode, loadedModules, ModuleCode } from '../knowledge';
import { ProjectPayload, projectContext, ctxOf } from '../project';
import { toTag } from '../util';

const ROLE = `VAI TRÒ
Bạn là Biên kịch trong hệ thống FILM 2.0 — pipeline tạo phim AI bằng Veo. Bạn đang chạy BÊN TRONG một app có nút bấm:
- Không hỏi lại người dùng bằng chữ, không chào hỏi, không kết bằng câu hỏi.
- Chỗ LÕI bảo "dừng lại hỏi" thì trả kết quả của mục đó rồi dừng; app hiện nút cho người dùng.
- Viết tiếng Việt. Riêng chuỗi Style giữ tiếng Anh như ví dụ trong module.`;

// Luật viết câu khẳng định — theo khuyến nghị chính thức của Google cho prompt Veo
const POSITIVE_RULE = `Tả điều MUỐN THẤY bằng câu khẳng định. Tránh câu kiểu "không có X", "không rơi", "không ai" — mô hình video dễ vẽ chính thứ bị nhắc tới. Thay bằng trạng thái đúng (VD thay "không có vật gì rơi xuống" bằng "cái bẫy đã nằm yên trên mũi từ khung đầu tiên"). Ngoại lệ: câu chốt số shot mà LÕI bắt buộc.`;

const str = (v: unknown) => String(v ?? '').trim();

/* ============================ ĐỀ CƯƠNG ============================ */

export function buildOutlinePrompt(
  p: ProjectPayload,
  o: { targetSeconds: number; feedback?: string; previousMarkdown?: string; style?: string }
): string {
  const approxBeats = Math.max(1, Math.round(o.targetSeconds / 6));
  const revision = o.previousMarkdown
    ? `\n===== ĐỀ CƯƠNG TRƯỚC =====\n${o.previousMarkdown}\n\n===== YÊU CẦU SỬA =====\n${o.feedback || '(không có)'}\nViết lại toàn bộ đề cương theo yêu cầu. Giữ nguyên phần không bị yêu cầu đổi.\n`
    : '';

  return `${ROLE}

${nap('buoc-3-kich-ban', 'de-cuong', ctxOf(p))}

${projectContext(p, true)}

Thời lượng mong muốn: khoảng ${o.targetSeconds} giây (~${approxBeats} beat nếu trung bình 6 giây/beat).
${o.style ? `STYLE NGƯỜI DÙNG ĐÃ CHỐT (dùng NGUYÊN VĂN cho trường "style" và dòng style trong đề cương, không tự chọn style khác): ${o.style}` : ''}
${revision}
===== NHIỆM VỤ: VIẾT ĐỀ CƯƠNG =====
Người dùng đã chọn hướng. Trước khi chia beat, lập ĐỀ CƯƠNG cho cả phim:
1. Làm mục 1.3 (tính cách từng nhân vật: Muốn / Phản xạ / Điểm yếu) và mục 1.5 ở mức cả phim (★ đạo cụ, đạo cụ bối cảnh, quét đổi hình dáng → tag trạng thái sau).
2. Chia phim thành HỒI, mỗi hồi gồm các SCENE. Mỗi scene = một địa điểm + một mốc thời gian liên tục + MỘT mục đích kể chuyện + MỘT chuyển biến lớn. Scene sau mở bằng hậu quả của scene trước.
3. Gắn khung truyện của phim (Móc → Đẩy → Lật → Chốt) vào hồi/scene cụ thể. Móc nằm trong 2 giây đầu của scene đầu tiên.
4. Ước tính số beat từng scene (thường 4–12 beat/scene) sao cho TỔNG khớp thời lượng mong muốn. Thời lượng là để câu chuyện TRỌN VẸN: phim dài thì thêm tình huống, tuyến phụ, leo thang — không kéo dài bằng beat rỗng, không cắt cụt.
5. Mỗi scene có một câu ánh sáng (sẽ lặp y hệt ở mọi beat của scene) và "endState" = khung cuối của scene trông ra sao (ai ở đâu, đạo cụ trạng thái gì) để scene sau nối vào.
6. Viết đúng cách viết của KIỂU KỊCH BẢN (nếu có) và chơi vào điểm mạnh của Veo theo module.
7. Chưa viết beat. Chưa viết bảng kiểm 1.6 (sẽ làm theo từng scene).

Trường "markdown": đề cương dễ đọc gồm đầu phim (tên, ý tưởng, module, tỉ lệ, thoại, thời lượng, style, khung truyện), NHÂN VẬT, ĐẠO CỤ, rồi từng HỒI và SCENE (địa điểm, giờ, mục đích, chuyển biến, số beat ước tính).
Các trường còn lại là bản có cấu trúc của CHÍNH đề cương đó. Tag viết liền không dấu, chữ thường, dưới 15 ký tự, không kèm @. Mã hồi H1, H2…; mã scene S1, S2… đánh số liên tục cả phim.`;
}

export const OUTLINE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    markdown: { type: Type.STRING },
    style: { type: Type.STRING, description: 'Chuỗi Style dùng chung cả phim, tiếng Anh' },
    characters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { tag: { type: Type.STRING }, want: { type: Type.STRING }, reflex: { type: Type.STRING }, weakness: { type: Type.STRING } },
        required: ['tag', 'want', 'reflex', 'weakness'],
      },
    },
    props: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          tag: { type: Type.STRING },
          star: { type: Type.BOOLEAN },
          span: { type: Type.STRING, description: 'Xuất hiện ở scene nào tới scene nào' },
          stateTags: { type: Type.ARRAY, items: { type: Type.STRING } },
          note: { type: Type.STRING, description: 'Đổi hình dáng thế nào, ở scene nào' },
        },
        required: ['tag', 'star', 'span', 'stateTags', 'note'],
      },
    },
    acts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          role: { type: Type.STRING, description: 'Vai trong khung truyện: Móc / Đẩy / Lật / Chốt (có thể ghép)' },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                location: { type: Type.STRING },
                time: { type: Type.STRING },
                light: { type: Type.STRING },
                summary: { type: Type.STRING },
                purpose: { type: Type.STRING, description: 'Mục đích kể chuyện của scene' },
                turn: { type: Type.STRING, description: 'Chuyển biến lớn của scene' },
                endState: { type: Type.STRING },
                beats: { type: Type.INTEGER, description: 'Số beat ước tính' },
                characters: { type: Type.ARRAY, items: { type: Type.STRING } },
                props: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['id', 'title', 'location', 'time', 'light', 'summary', 'purpose', 'turn', 'endState', 'beats', 'characters', 'props'],
            },
          },
        },
        required: ['id', 'name', 'role', 'scenes'],
      },
    },
  },
  required: ['markdown', 'style', 'characters', 'props', 'acts'],
};

export function normalizeOutline(raw: any, fixedStyle = '') {
  if (!raw || !str(raw.markdown)) throw new Error('Gemini không trả về đề cương.');
  let sceneNo = 0;
  const acts = (Array.isArray(raw.acts) ? raw.acts : []).map((a: any, ai: number) => ({
    id: `H${ai + 1}`,
    name: str(a.name),
    role: str(a.role),
    scenes: (Array.isArray(a.scenes) ? a.scenes : []).map((s: any) => {
      sceneNo += 1;
      return {
        id: `S${sceneNo}`,
        title: str(s.title),
        location: str(s.location),
        time: str(s.time),
        light: str(s.light),
        summary: str(s.summary),
        purpose: str(s.purpose),
        turn: str(s.turn),
        endState: str(s.endState),
        beats: Math.min(Math.max(Math.round(Number(s.beats) || 4), 1), 40),
        characters: (Array.isArray(s.characters) ? s.characters : []).map(toTag).filter(Boolean),
        props: (Array.isArray(s.props) ? s.props : []).map(toTag).filter(Boolean),
      };
    }),
  }));
  if (!sceneNo) throw new Error('Đề cương không có scene nào.');
  return {
    markdown: str(raw.markdown),
    style: fixedStyle || str(raw.style),
    characters: (Array.isArray(raw.characters) ? raw.characters : [])
      .map((c: any) => ({ tag: toTag(c.tag), want: str(c.want), reflex: str(c.reflex), weakness: str(c.weakness) }))
      .filter((c: any) => c.tag),
    props: (Array.isArray(raw.props) ? raw.props : [])
      .map((x: any) => ({
        tag: toTag(x.tag),
        star: !!x.star,
        span: str(x.span),
        stateTags: (Array.isArray(x.stateTags) ? x.stateTags : []).map(toTag).filter(Boolean),
        note: str(x.note),
      }))
      .filter((x: any) => x.tag),
    acts,
  };
}

/* ======================= VIẾT BEAT CHO MỘT SCENE ======================= */

export interface SceneRequest {
  outlineMarkdown: string;
  scene: {
    id: string; title: string; location: string; time: string; light: string;
    summary: string; purpose: string; turn: string; endState: string; beats: number;
  };
  actName: string;
  startBeat: number;
  prevScene?: { id: string; endState: string; tail: string } | null;
  nextScene?: { id: string; summary: string } | null;
  style: string;
  feedback?: string;
  previousMarkdown?: string;
  waived?: string[];
  /** Tag đã khai trong đề cương (nhân vật, đạo cụ, tag trạng thái) — để bắt đạo cụ "từ đâu ra" */
  knownTags: string[];
}

export function validateSceneRequest(body: any): SceneRequest {
  const s = body?.scene;
  if (!s || !/^S\d+$/.test(String(s.id))) throw new Error('Thiếu scene.');
  const outlineMarkdown = str(body?.outlineMarkdown);
  if (!outlineMarkdown) throw new Error('Chưa có đề cương.');
  return {
    outlineMarkdown,
    scene: {
      id: str(s.id), title: str(s.title), location: str(s.location), time: str(s.time), light: str(s.light),
      summary: str(s.summary), purpose: str(s.purpose), turn: str(s.turn), endState: str(s.endState),
      beats: Math.min(Math.max(Number(s.beats) || 4, 1), 40),
    },
    actName: str(body?.actName),
    startBeat: Math.max(1, Math.round(Number(body?.startBeat) || 1)),
    prevScene: body?.prevScene?.id ? { id: str(body.prevScene.id), endState: str(body.prevScene.endState), tail: str(body.prevScene.tail) } : null,
    nextScene: body?.nextScene?.id ? { id: str(body.nextScene.id), summary: str(body.nextScene.summary) } : null,
    style: str(body?.style),
    feedback: str(body?.feedback),
    previousMarkdown: str(body?.previousMarkdown),
    waived: Array.isArray(body?.waived) ? body.waived.map(String) : [],
    knownTags: Array.isArray(body?.knownTags) ? body.knownTags.map((t: any) => toTag(t)).filter(Boolean) : [],
  };
}

export const beatId = (n: number) => `B${String(n).padStart(2, '0')}`;

export function buildScenePrompt(p: ProjectPayload, r: SceneRequest): string {
  const ids = Array.from({ length: r.scene.beats }, (_, i) => beatId(r.startBeat + i));
  const used = [p.settings.module, p.settings.secondary];

  // ---- Phần cố định cho cả phim (đặt đầu để được cache) ----
  const stable = `${ROLE}

${nap('buoc-3-kich-ban', 'scene', ctxOf(p))}

===== MỤC LỤC CÁC MODULE KHÁC (để nhận ra beat cần mượn module) =====
${moduleIndex(used)}

${projectContext(p, true)}

===== ĐỀ CƯƠNG CẢ PHIM (đã chốt) =====
${r.outlineMarkdown}
Style chung: ${r.style}`;

  // ---- Phần riêng của scene này ----
  const revision = r.previousMarkdown
    ? `\n===== BẢN TRƯỚC CỦA ${r.scene.id} =====\n${r.previousMarkdown}\n\n===== YÊU CẦU SỬA =====\n${r.feedback || '(chỉ xử lý các mục miễn trừ)'}\n${
        r.waived?.length ? `Người dùng CHẤP NHẬN RỦI RO các mục sau — ghi [đã miễn trừ], không đưa vào cổng chặn:\n${r.waived.map((w) => `- ${w}`).join('\n')}\n` : ''
      }Viết lại toàn bộ scene theo yêu cầu, giữ phần không bị yêu cầu đổi.\n`
    : '';

  return `${stable}

===== SCENE CẦN VIẾT: ${r.scene.id} — ${r.scene.title} (${r.actName}) =====
Địa điểm: ${r.scene.location} · Giờ: ${r.scene.time}
Câu ánh sáng (lặp y hệt mọi beat): ${r.scene.light}
Tóm tắt: ${r.scene.summary}
Mục đích: ${r.scene.purpose} · Chuyển biến: ${r.scene.turn}
Khung cuối dự kiến: ${r.scene.endState}
Số beat ước tính: ${r.scene.beats}
${r.prevScene ? `Scene trước (${r.prevScene.id}) kết ở: ${r.prevScene.endState}\nHai beat cuối của scene trước:\n${r.prevScene.tail}` : 'Đây là scene mở đầu phim — Móc nằm trong 2 giây đầu.'}
${r.nextScene ? `Scene sau (${r.nextScene.id}): ${r.nextScene.summary}` : 'Đây là scene cuối — kết bằng Chốt.'}
${revision}
===== NHIỆM VỤ =====
Làm mục 1.4 và 1.6 cho RIÊNG scene này, theo đúng luật LÕI, module và kiểu kịch bản.
- Mã beat BẮT BUỘC đánh liên tục từ ${ids[0]} (dự kiến tới ${ids[ids.length - 1]}). Số beat do câu chuyện của scene quyết định, được lệch vài beat so với ước tính nếu cần cho trọn vẹn; mỗi beat 4, 6 hoặc 8 giây.
- Beat đầu mở bằng hậu quả / khung cuối của scene trước (nếu có). Beat cuối kết ở khung cuối dự kiến để scene sau nối vào.
- ${POSITIVE_RULE}
- "markdown": phần kịch bản của scene theo khuôn 1.7 (tiêu đề SCENE, BẢNG TỔNG có mức leo thang, CHI TIẾT BEAT lớp 2, CHUỖI NHÂN QUẢ, ĐẠO CỤ dùng trong scene kèm quét đổi hình dáng), rồi BẢNG KIỂM PHẦN A cho từng beat và PHẦN B rút gọn cho scene (nhịp, beat rỗng, vấn đề, cổng chặn). Báo, không tự sửa.
- "beats": tóm tắt có cấu trúc của chính các beat trong markdown; "borrowed" = mã module khác cần mượn cho beat đó (theo mục lục), rỗng nếu không.
- "beats[].links": chuỗi nhân quả của beat, viết TỪNG mắt xích một phần tử, KỂ CẢ cơ chế trung gian (VD ["đuôi mèo giật dây", "dây kéo bàn ủi trượt khỏi mép tủ", "bàn ủi rơi", "bàn ủi sắp trúng đầu mèo"]). Không gộp.
- "beats[].shots": số shot dự kiến của beat (1 = một cú máy liền). App dùng hai trường này để đối chiếu mắt xích với số shot.
- "gate": các mục chạm cổng chặn 1.6 của scene chưa được miễn trừ; không có thì mảng rỗng.
- "endState": khung cuối THẬT của scene theo bản vừa viết.`;
}

export const SCENE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    markdown: { type: Type.STRING },
    beats: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          duration: { type: Type.INTEGER },
          level: { type: Type.INTEGER },
          summary: { type: Type.STRING },
          borrowed: { type: Type.STRING },
          links: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Từng mắt xích nhân quả, kể cả cơ chế trung gian' },
          shots: { type: Type.INTEGER, description: 'Số shot dự kiến' },
        },
        required: ['id', 'name', 'duration', 'level', 'summary', 'borrowed', 'links', 'shots'],
      },
    },
    gate: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          beat: { type: Type.STRING },
          kind: { type: Type.STRING },
          description: { type: Type.STRING },
          suggestion: { type: Type.STRING },
        },
        required: ['beat', 'kind', 'description', 'suggestion'],
      },
    },
    endState: { type: Type.STRING },
  },
  required: ['markdown', 'beats', 'gate', 'endState'],
};

export function normalizeScene(raw: any, r: SceneRequest, used: (ModuleCode | '' | undefined)[]) {
  if (!raw || !str(raw.markdown)) throw new Error('Gemini không trả về kịch bản scene.');
  const list = Array.isArray(raw.beats) ? raw.beats : [];
  if (!list.length) throw new Error('Scene không có beat nào.');
  // Mã beat do app đánh (liên tục cả phim) — không tin mã AI tự ghi
  const idMap: Record<string, string> = {};
  const beats = list.map((b: any, i: number) => {
    const id = beatId(r.startBeat + i);
    if (b?.id) idMap[str(b.id).toUpperCase()] = id;
    const d = Number(b.duration);
    const code = str(b.borrowed).toUpperCase().match(/M\d{2}/)?.[0] || '';
    return {
      id,
      name: str(b.name),
      duration: [4, 6, 8].includes(d) ? d : d <= 5 ? 4 : d <= 7 ? 6 : 8,
      durationWarning: ![4, 6, 8].includes(d),
      level: Math.min(Math.max(Math.round(Number(b.level) || 1), 1), 5),
      summary: str(b.summary),
      // chỉ nhận module có file thật, để bước viết beat nạp được nguyên văn
      borrowed: isModuleCode(code) && !used.includes(code) && loadedModules().includes(code) ? code : '',
      sceneId: r.scene.id,
      links: (Array.isArray(b.links) ? b.links : []).map(str).filter(Boolean),
      shots: Math.min(Math.max(Math.round(Number(b.shots) || 1), 1), 8),
    };
  });

  // ---- App tự đối chiếu (không tốn token) — thêm vào cổng chặn để người dùng xử lý hoặc chấp nhận rủi ro ----
  const autoGate: { beat: string; kind: string; description: string; suggestion: string }[] = [];
  for (const b of beats) {
    const layers = Math.max(0, b.links.length - 1);
    if (layers > b.shots) {
      autoGate.push({
        beat: b.id,
        kind: 'App kiểm: mắt xích nhiều hơn số shot',
        description: `${b.links.join(' → ')} = ${layers} tầng nhân quả nhưng chỉ ${b.shots} shot.`,
        suggestion: 'Mỗi mắt xích một shot, mỗi shot một chủ thể (giấu va chạm ở điểm cắt), hoặc tách thành nhiều beat.',
      });
    }
    if (b.duration === 4 && b.shots >= 3) {
      autoGate.push({
        beat: b.id,
        kind: 'App kiểm: beat 4 giây quá nhiều shot',
        description: `${b.shots} shot trong 4 giây — mỗi shot quá ngắn để Veo dựng rõ.`,
        suggestion: 'Tăng lên 6–8 giây hoặc bớt shot.',
      });
    }
  }
  // Tag xuất hiện trong scene mà đề cương chưa khai (đạo cụ / nhân vật "từ đâu ra")
  if (r.knownTags.length) {
    const known = new Set(r.knownTags);
    const found = Array.from(new Set(Array.from(str(raw.markdown).matchAll(/@([a-zA-Z0-9]+)/g)).map((m) => m[1].toLowerCase())));
    const unknown = found.filter((t) => !known.has(t) && !/^frame\d+[a-z]$/.test(t));
    if (unknown.length) {
      autoGate.push({
        beat: 'toàn scene',
        kind: 'App kiểm: tag chưa khai trong đề cương',
        description: `Scene dùng ${unknown.map((t) => '@' + t).join(', ')} nhưng đề cương (mục đạo cụ / nhân vật) chưa có.`,
        suggestion: 'Khai trong đề cương (LÕI 1.5) và cho lên hình từ beat đầu tiên cần tới, hoặc bỏ khỏi scene.',
      });
    }
  }
  return {
    markdown: str(raw.markdown),
    beats,
    gate: [
      ...(Array.isArray(raw.gate) ? raw.gate : []).map((g: any) => ({
        beat: idMap[str(g.beat).toUpperCase()] || str(g.beat),
        kind: str(g.kind),
        description: str(g.description),
        suggestion: str(g.suggestion),
      })),
      ...autoGate,
    ].map((g, i) => ({ id: `${r.scene.id}_gate_${i + 1}`, ...g })),
    endState: str(raw.endState) || r.scene.endState,
  };
}

export { POSITIVE_RULE };
