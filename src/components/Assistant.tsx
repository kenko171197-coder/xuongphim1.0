import React, { useEffect, useRef, useState } from 'react';
import { Bot, X, Send, ImagePlus, Loader2, Trash2, CheckCircle2, AlertTriangle, Play, ChevronDown } from 'lucide-react';
import type { AssistantAction, ChatMessage, Project, ProjectPatch } from '../types';
import { askAssistant } from '../services/api';
import { buildSnapshot } from '../lib/snapshot';
import { putImage, getImage, deleteImage, readAndResize, shrinkDataUrl, splitDataUrl } from '../lib/images';
import { useImage } from '../lib/useImage';
import { uid } from '../lib/store';
import Markdown from './Markdown';

interface Props {
  project: Project;
  stepLabel: string;
  stepNumber: number;
  currentBeat: string;
  onUpdate: (patch: ProjectPatch) => void;
  onApply: (action: AssistantAction) => Promise<void>;
  onClose: () => void;
}

const ACTION_LABEL: Record<AssistantAction['type'], string> = {
  'sua-kich-ban': 'Viết lại kịch bản',
  'viet-lai-beat': 'Viết lại đầu vào beat',
  'thay-o-script': 'Thay ô Script',
  'sua-note': 'Sửa ô Note',
};

const QUICK = [
  'Vì sao video của beat đang mở ra sai? (mình gửi kèm frame)',
  'Rà lại beat đang mở theo bảng kiểm 3.10, có ô nào đáng lo không?',
  'Cú Lật của phim đã đủ bất ngờ chưa? Gợi ý cách làm mạnh hơn.',
];

function ChatImage({ id }: { id: string }) {
  const url = useImage(id);
  return url ? <img src={url} alt="Ảnh gửi kèm" className="w-20 h-20 object-cover rounded-lg border border-black/10" /> : null;
}

function ActionCard({ action, onApply }: { action: AssistantAction; onApply: () => void }) {
  const [open, setOpen] = useState(false);
  const target = action.beatId ? ` · ${action.beatId}` : action.tag ? ` · @${action.tag}` : '';
  return (
    <div className="bg-white border border-primary-300 rounded-xl p-3 space-y-2">
      <p className="text-xs font-bold text-primary-800">
        {ACTION_LABEL[action.type]}
        {target}
      </p>
      <p className="text-sm text-black">{action.label}</p>
      <button onClick={() => setOpen((v) => !v)} className="text-xs text-gray-500 flex items-center gap-1" aria-expanded={open}>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        {open ? 'Ẩn nội dung' : 'Xem nội dung'}
      </button>
      {open && <pre className="whitespace-pre-wrap text-xs bg-gray-50 rounded-lg p-2 max-h-60 overflow-y-auto font-sans">{action.text}</pre>}
      {action.status === 'applied' ? (
        <p className="text-xs font-bold text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-4 h-4" /> Đã áp dụng
        </p>
      ) : (
        <>
          {action.status === 'error' && (
            <p className="text-xs text-red-700 flex items-start gap-1">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {action.error}
            </p>
          )}
          <button
            onClick={onApply}
            disabled={action.status === 'running'}
            className="w-full py-2 rounded-lg bg-black text-primary-400 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {action.status === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {action.status === 'running' ? 'Đang áp dụng…' : action.status === 'error' ? 'Thử lại' : 'Áp dụng'}
          </button>
        </>
      )}
    </div>
  );
}

export default function Assistant({ project, stepLabel, stepNumber, currentBeat, onUpdate, onApply, onClose }: Props) {
  const chat = project.chat || [];
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]); // data URL chờ gửi
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.length, busy]);

  const addFiles = async (files: File[]) => {
    const picked = files.filter((f) => f.type.startsWith('image/')).slice(0, 4 - images.length);
    const urls: string[] = [];
    for (const f of picked) urls.push(await readAndResize(f, 1536));
    setImages((prev) => [...prev, ...urls].slice(0, 4));
  };

  const send = async (raw = text) => {
    const content = raw.trim();
    if ((!content && !images.length) || busy) return;
    setBusy(true);
    setError('');
    try {
      const imageIds: string[] = [];
      for (const url of images) imageIds.push(await putImage(url));
      const userMsg: ChatMessage = { id: uid('msg'), role: 'user', text: content, imageIds, at: Date.now() };
      const history = [...chat, userMsg];
      onUpdate((p) => ({ chat: [...(p.chat || []), userMsg].slice(-60) }));
      setText('');
      setImages([]);

      // Gửi 16 tin gần nhất; ảnh chỉ gửi lại cho 2 tin gần nhất có ảnh (tin cũ hơn Trợ lý đã đọc và trả lời rồi)
      const recent = history.slice(-16);
      const withImages = new Set(recent.filter((m) => m.imageIds?.length).slice(-2).map((m) => m.id));
      const messages: { role: 'user' | 'assistant'; text: string; images: { mime: string; data: string }[] }[] = [];
      for (const m of recent) {
        const imgs: { mime: string; data: string }[] = [];
        if (withImages.has(m.id)) {
          for (const id of m.imageIds || []) {
            const url = await getImage(id);
            if (url) imgs.push(splitDataUrl(await shrinkDataUrl(url, 1024)));
          }
        }
        messages.push({ role: m.role, text: m.text, images: imgs });
      }

      const res = await askAssistant(project, buildSnapshot(project, stepLabel, stepNumber, currentBeat), messages);
      const botMsg: ChatMessage = { id: uid('msg'), role: 'assistant', text: res.reply, actions: res.actions, at: Date.now() };
      onUpdate((p) => ({ chat: [...(p.chat || []), botMsg].slice(-60) }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const setActionState = (msgId: string, index: number, patch: Partial<AssistantAction>) =>
    onUpdate((p) => ({
      chat: (p.chat || []).map((m) =>
        m.id === msgId ? { ...m, actions: (m.actions || []).map((a, i) => (i === index ? { ...a, ...patch } : a)) } : m
      ),
    }));

  const apply = async (msgId: string, index: number, action: AssistantAction) => {
    setActionState(msgId, index, { status: 'running', error: '' });
    try {
      await onApply(action);
      setActionState(msgId, index, { status: 'applied' });
    } catch (e: any) {
      setActionState(msgId, index, { status: 'error', error: e?.message || 'Không áp dụng được.' });
    }
  };

  const clearChat = async () => {
    if (!confirm('Xoá toàn bộ cuộc trò chuyện với Trợ lý của dự án này?')) return;
    for (const m of chat) for (const id of m.imageIds || []) await deleteImage(id).catch(() => undefined);
    onUpdate({ chat: [] });
  };

  return (
    <aside
      className="fixed inset-0 lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[28rem] z-[60] bg-white lg:border-l border-gray-200 shadow-2xl flex flex-col"
      aria-label="Trợ lý"
    >
      <header className="flex items-center justify-between gap-2 px-4 h-16 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="bg-primary-400 p-1.5 rounded-lg">
            <Bot className="w-5 h-5 text-black" />
          </span>
          <div className="min-w-0">
            <p className="font-bold text-black leading-tight">Trợ lý</p>
            <p className="text-xs text-gray-500 truncate">
              {stepLabel}
              {currentBeat ? ` · ${currentBeat}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {chat.length > 0 && (
            <button onClick={clearChat} title="Xoá cuộc trò chuyện" className="p-2 rounded-full text-gray-400 hover:text-red-600 hover:bg-gray-100">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} title="Đóng" className="p-2 rounded-full text-gray-500 hover:text-black hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {chat.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Trợ lý chạy toàn bộ LÕI và module của dự án, thấy kịch bản, thư viện ảnh và mọi beat. Gửi kèm frame để nhờ chẩn đoán. Khi cần sửa, Trợ lý đưa đề xuất, bạn bấm "Áp dụng" mới thay đổi.
            </p>
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => setText(q)}
                className="block w-full text-left text-sm bg-gray-50 hover:bg-primary-50 border border-gray-200 rounded-xl px-3 py-2"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {chat.map((m) => (
          <div key={m.id} className={m.role === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start'}>
            <div
              className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm ${
                m.role === 'user' ? 'bg-primary-400 text-black rounded-br-md' : 'bg-gray-50 border border-gray-200 rounded-bl-md'
              }`}
            >
              {m.imageIds && m.imageIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {m.imageIds.map((id) => (
                    <ChatImage key={id} id={id} />
                  ))}
                </div>
              )}
              {m.role === 'assistant' ? <Markdown text={m.text} /> : <p className="whitespace-pre-wrap">{m.text}</p>}
            </div>
            {m.actions && m.actions.length > 0 && (
              <div className="w-[92%] mt-2 space-y-2">
                {m.actions.map((a, i) => (
                  <ActionCard key={i} action={a} onApply={() => apply(m.id, i, a)} />
                ))}
              </div>
            )}
          </div>
        ))}

        {busy && (
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Trợ lý đang đọc dự án…
          </p>
        )}
        {error && <p className="text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
        <div ref={endRef} />
      </div>

      <footer
        className="border-t border-gray-200 p-3 shrink-0 space-y-2"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(Array.from(e.dataTransfer.files || []));
        }}
      >
        {images.length > 0 && (
          <div className="flex gap-1.5">
            {images.map((url, i) => (
              <div key={i} className="relative">
                <img src={url} alt={`Ảnh chờ gửi ${i + 1}`} className="w-14 h-14 object-cover rounded-lg" />
                <button
                  onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 bg-black text-white rounded-full p-0.5"
                  aria-label="Bỏ ảnh"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(Array.from(e.target.files || []));
              e.target.value = '';
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={images.length >= 4}
            title="Gửi kèm ảnh (tối đa 4)"
            className="p-2.5 rounded-xl bg-gray-100 hover:bg-primary-100 disabled:opacity-40"
          >
            <ImagePlus className="w-5 h-5" />
          </button>
          <label htmlFor="assistant-input" className="sr-only">Tin nhắn cho Trợ lý</label>
          <textarea
            id="assistant-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={Math.min(5, Math.max(1, text.split('\n').length))}
            placeholder="Hỏi hoặc nhờ sửa… (Enter để gửi)"
            className="flex-1 resize-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          <button
            onClick={() => send()}
            disabled={busy || (!text.trim() && !images.length)}
            aria-label="Gửi"
            className="p-2.5 rounded-xl bg-black text-primary-400 disabled:opacity-40"
          >
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </footer>
    </aside>
  );
}
