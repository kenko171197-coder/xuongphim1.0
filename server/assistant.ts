// Trợ lý chat: chạy NGUYÊN VĂN toàn bộ LÕI + module của dự án làm system instruction,
// nhìn thấy ảnh chụp dự án hiện tại, trò chuyện tự do và ĐỀ XUẤT hành động (người dùng bấm mới áp dụng).
import { Type } from '@google/genai';
import { loiForAssistant, modulesBlock } from './knowledge';
import { ProjectPayload, projectContext, validateProject } from './project';
import { toTag } from './story';

const str = (v: unknown, max = 20000) => String(v ?? '').trim().slice(0, max);

export const ACTION_TYPES = ['sua-kich-ban', 'viet-lai-beat', 'thay-o-script', 'sua-note'] as const;
type ActionType = (typeof ACTION_TYPES)[number];

export interface Snapshot {
  project: ProjectPayload;
  step: string;
  stepNumber: number;
  currentBeat: string;
  script: { markdown: string; style: string; gate: { beat: string; kind: string; description: string; waived?: boolean }[] } | null;
  scenes: { id: string; location: string; time: string; light: string; beats: string[] }[];
  library: { tag: string; kind: string; note: string; seen?: string; score?: number; fix?: string; hasImage?: boolean; beatId?: string }[];
  beats: {
    id: string;
    name: string;
    duration: number;
    summary: string;
    script?: string;
    markdown?: string;
    missing?: string[];
    blocked?: { cell: string; reason: string }[];
    warnings?: string[];
    finalPrompt?: string;
  }[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  images: { mime: string; data: string }[];
}

export function validateAssistant(body: any): { snap: Snapshot; messages: ChatMessage[] } {
  const project = validateProject(body);
  const s = body?.snapshot || {};
  const snap: Snapshot = {
    project,
    step: str(s.step, 100),
    stepNumber: Math.min(Math.max(Number(s.stepNumber) || 5, 1), 5),
    currentBeat: str(s.currentBeat, 10).toUpperCase(),
    script: s.script && s.script.markdown
      ? {
          markdown: str(s.script.markdown, 60000),
          style: str(s.script.style, 500),
          gate: Array.isArray(s.script.gate) ? s.script.gate.slice(0, 30) : [],
        }
      : null,
    scenes: Array.isArray(s.scenes) ? s.scenes.slice(0, 30) : [],
    library: (Array.isArray(s.library) ? s.library : []).slice(0, 80).map((l: any) => ({
      tag: toTag(l.tag),
      kind: str(l.kind, 20),
      note: str(l.note, 600),
      seen: str(l.seen, 800),
      score: typeof l.score === 'number' ? l.score : undefined,
      fix: str(l.fix, 20),
      hasImage: !!l.hasImage,
      beatId: str(l.beatId, 10),
    })),
    beats: (Array.isArray(s.beats) ? s.beats : []).slice(0, 60).map((b: any) => ({
      id: str(b.id, 10).toUpperCase(),
      name: str(b.name, 200),
      duration: Number(b.duration) || 0,
      summary: str(b.summary, 600),
      script: str(b.script, 6000),
      markdown: str(b.markdown, 20000),
      missing: Array.isArray(b.missing) ? b.missing.map((x: any) => str(x, 30)) : [],
      blocked: Array.isArray(b.blocked) ? b.blocked.slice(0, 10) : [],
      warnings: Array.isArray(b.warnings) ? b.warnings.map((x: any) => str(x, 500)).slice(0, 10) : [],
      finalPrompt: str(b.finalPrompt, 6000),
    })),
  };

  const messages: ChatMessage[] = (Array.isArray(body?.messages) ? body.messages : [])
    .slice(-16)
    .map((m: any) => ({
      role: m?.role === 'assistant' ? 'assistant' : 'user',
      text: str(m?.text, 12000),
      images: (Array.isArray(m?.images) ? m.images : [])
        .filter((i: any) => i && typeof i.data === 'string' && i.data.length > 100)
        .slice(0, 4)
        .map((i: any) => ({ mime: /^image\/(png|jpeg|webp)$/.test(i.mime) ? i.mime : 'image/jpeg', data: i.data })),
    }))
    .filter((m: ChatMessage) => m.text || m.images.length);
  if (!messages.length || messages[messages.length - 1].role !== 'user') throw new Error('Chưa có tin nhắn.');
  return { snap, messages };
}

function snapshotText(s: Snapshot): string {
  const out: string[] = [projectContext(s.project, true), ''];
  out.push(`NGƯỜI DÙNG ĐANG Ở: ${s.step}${s.currentBeat ? ` · beat ${s.currentBeat}` : ''}`);

  if (s.script) {
    out.push('', '===== KỊCH BẢN HIỆN TẠI (Bước 1, khuôn 1.7) =====', s.script.markdown);
    out.push(`Style chung: ${s.script.style}`);
    const gate = s.script.gate.filter((g) => !g.waived);
    if (gate.length) out.push(`Cổng chặn còn mở: ${gate.map((g) => `${g.beat} — ${g.kind}: ${g.description}`).join(' | ')}`);
  } else {
    out.push('', 'Chưa có kịch bản.');
  }

  if (s.scenes.length) {
    out.push('', 'SCENE (3.2):');
    s.scenes.forEach((sc) => out.push(`- ${sc.id}: ${sc.location} · ${sc.time} · ánh sáng: ${sc.light} · ${sc.beats.join(', ')}`));
  }

  if (s.library.length) {
    out.push('', 'THƯ VIỆN ẢNH (tag · loại · Note · AI đọc từ ảnh · điểm frame):');
    s.library.forEach((l) =>
      out.push(
        `- @${l.tag} · ${l.kind}${l.beatId ? ` (từ ${l.beatId})` : ''}${l.hasImage ? '' : ' · CHƯA CÓ ẢNH'} · Note: "${l.note}"${l.seen ? ` · Thấy: ${l.seen}` : ''}${typeof l.score === 'number' ? ` · ${l.score}/10 (${l.fix || 'ok'})` : ''}`
      )
    );
  }

  if (s.beats.length) {
    out.push('', 'CÁC BEAT:');
    s.beats.forEach((b) => {
      out.push(`--- ${b.id} · ${b.name} · ${b.duration}s — ${b.summary}`);
      if (b.id === s.currentBeat && b.markdown) out.push(`Đầu vào 3.10 đầy đủ (beat đang mở):\n${b.markdown}`);
      else if (b.script) out.push(`Ô Script:\n${b.script}`);
      if (b.missing?.length) out.push(`Thiếu ảnh: ${b.missing.join(', ')}`);
      if (b.blocked?.length) out.push(`Ô chặn: ${b.blocked.map((x: any) => `${x.cell}: ${x.reason}`).join(' | ')}`);
      if (b.warnings?.length) out.push(`Cảnh báo của app Đạo diễn: ${b.warnings.join(' | ')}`);
      if (b.id === s.currentBeat && b.finalPrompt) out.push(`Prompt Veo hiện tại:\n${b.finalPrompt}`);
    });
  }
  return out.join('\n');
}

export function buildAssistantRequest(snap: Snapshot, messages: ChatMessage[]) {
  const { settings } = snap.project;
  const beatIds = snap.beats.map((b) => b.id);

  const systemInstruction = `VAI TRÒ
Bạn là Trợ lý của hệ thống FILM 2.0, chạy bên trong app "Xưởng phim AI". Bạn nắm toàn bộ LÕI và module dưới đây, đóng cả ba vai Biên kịch, Thiết kế nhân vật, Trợ lý đạo diễn tuỳ câu hỏi. Người dùng trò chuyện tự do với bạn: hỏi, nhờ đọc ảnh, nhờ chẩn đoán vì sao video Veo ra sai, nhờ sửa.

CÁCH TRẢ LỜI
- Tiếng Việt, ngắn gọn, đi thẳng vào việc. "reply" viết markdown.
- Ảnh người dùng gửi (frame, ảnh chụp video) là sự thật: ảnh thắng kịch bản (LÕI 0.3).
- Chẩn đoán lỗi video thì chỉ ra nguyên nhân gốc theo Phần 0 và luật module, rồi đề xuất cách sửa ô Script.
- Báo, không tự sửa: bạn KHÔNG tự thay đổi dự án. Muốn đổi gì thì đưa vào "actions" để người dùng bấm "Áp dụng". Không có gì cần đổi thì để mảng rỗng.
- Tối đa 3 hành động mỗi lượt, mỗi hành động có "label" ngắn tiếng Việt nói rõ sẽ làm gì.

CÁC LOẠI HÀNH ĐỘNG
- "sua-kich-ban": gửi yêu cầu sửa cho Biên kịch viết lại toàn bộ kịch bản (Bước 1). "text" = yêu cầu sửa cụ thể.
- "viet-lai-beat": chạy lại Bước 3 cho một beat với yêu cầu sửa. Cần "beatId" (${beatIds.join(', ') || 'chưa có beat'}), "text" = yêu cầu sửa.
- "thay-o-script": thay NGUYÊN VĂN ô The Script của một beat bằng bản bạn viết (dùng khi sửa nhỏ, bạn chắc chắn). Cần "beatId", "text" = toàn bộ ô Script mới, đúng khuôn 3.7 (dòng frame nếu có, các Shot, câu "Toàn bộ cảnh chỉ gồm đúng N shot…" nếu Multishot, Âm thanh:, Style:). Chỉ dùng cho beat đã có đầu vào.
- "sua-note": sửa ô Note của một ảnh trong thư viện. Cần "tag" (không kèm @), "text" = Note mới.

===== LÕI — NGUYÊN VĂN: CÁCH DÙNG, NGUYÊN TẮC, PHẦN 0 VÀ BƯỚC NGƯỜI DÙNG ĐANG LÀM =====
${loiForAssistant(snap.stepNumber)}

${modulesBlock(settings.module, settings.secondary)}

===== ẢNH CHỤP DỰ ÁN HIỆN TẠI =====
${snapshotText(snap)}`;

  // Gemini cần lượt user/model xen kẽ và bắt đầu bằng user: gộp các tin liền nhau cùng vai, bỏ tin model ở đầu
  const contents: { role: 'user' | 'model'; parts: any[] }[] = [];
  for (const m of messages) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    const parts: any[] = [];
    if (m.text) parts.push({ text: m.text });
    m.images.forEach((img) => parts.push({ inlineData: { mimeType: img.mime, data: img.data } }));
    if (!contents.length && role === 'model') continue;
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts.push(...parts);
    else contents.push({ role, parts });
  }

  return { systemInstruction, contents };
}

export const ASSISTANT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reply: { type: Type.STRING, description: 'Câu trả lời, markdown, tiếng Việt' },
    actions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: [...ACTION_TYPES] },
          label: { type: Type.STRING },
          beatId: { type: Type.STRING },
          tag: { type: Type.STRING },
          text: { type: Type.STRING },
        },
        required: ['type', 'label', 'text'],
      },
    },
  },
  required: ['reply', 'actions'],
};

export function normalizeAssistant(raw: any, snap: Snapshot) {
  const beatIds = new Set(snap.beats.map((b) => b.id));
  const beatsWithInput = new Set(snap.beats.filter((b) => b.script).map((b) => b.id));
  const tags = new Set(snap.library.map((l) => l.tag));

  const actions = (Array.isArray(raw?.actions) ? raw.actions : [])
    .map((a: any) => ({
      type: String(a?.type || '') as ActionType,
      label: str(a?.label, 200),
      beatId: str(a?.beatId, 10).toUpperCase(),
      tag: toTag(a?.tag),
      text: str(a?.text, 12000),
    }))
    .filter((a: any) => {
      if (!(ACTION_TYPES as readonly string[]).includes(a.type) || !a.text) return false;
      if (a.type === 'sua-kich-ban') return !!snap.script;
      if (a.type === 'viet-lai-beat') return beatIds.has(a.beatId);
      if (a.type === 'thay-o-script') return beatsWithInput.has(a.beatId);
      if (a.type === 'sua-note') return tags.has(a.tag);
      return false;
    })
    .slice(0, 3);

  return { reply: str(raw?.reply, 20000) || '(Trợ lý không trả lời được, thử hỏi lại.)', actions };
}

