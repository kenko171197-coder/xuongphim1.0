import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Clapperboard, FileText, Sparkles, Camera, AlertTriangle, ChevronDown, Wand2, Send, ArrowRight,
  ShieldAlert, RefreshCw, ImagePlus, CheckCircle2, Map as MapIcon, Loader2, Trash2, RotateCcw, XCircle,
} from 'lucide-react';
import type { Asset, BeatWork, Project, ProjectPatch, Scene, ScriptBeat } from '../../types';
import { usableFrame, usableImage } from '../../types';
import {
  engineGenerate, engineEdit, readFrame, EngineRequest,
} from '../../services/api';
import { autoMap, MappedRefs, projectLibrary, extractTags } from '../../lib/refs';
import { putImage, deleteImage, getImage, readAndResize, shrinkDataUrl, splitDataUrl } from '../../lib/images';
import { useImage } from '../../lib/useImage';
import { runBeatInput } from '../../lib/beatContext';
import { CopyButton, ErrorBox, RunButton } from '../ui';
import Markdown from '../Markdown';

interface Props {
  project: Project;
  onUpdate: (patch: ProjectPatch) => void;
  onGoScript: () => void;
  /** Beat đang mở — Workspace giữ để Trợ lý biết ngữ cảnh */
  selectedBeat?: string;
  onSelectBeat?: (id: string) => void;
}

const beatNum = (id: string) => parseInt(id.replace(/\D/g, ''), 10) || 0;

/* ---------- Ảnh nhỏ ---------- */

function Thumb({ imageId, alt, className = '' }: { imageId?: string; alt: string; className?: string }) {
  const url = useImage(imageId);
  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center ${className}`}>
      {url ? <img src={url} alt={alt} className="w-full h-full object-contain" /> : <span className="text-[10px] text-gray-400">chưa có</span>}
    </div>
  );
}

/* ---------- Thẻ frame: ảnh, điểm, tiêu chí, gửi lại / xoá ---------- */

function scoreTone(score: number) {
  if (score >= 8) return 'bg-green-100 text-green-800';
  if (score >= 5) return 'bg-primary-100 text-primary-800';
  return 'bg-red-100 text-red-700';
}

function FrameCard({
  frame: f,
  busy,
  onNote,
  onResend,
  onDelete,
  onUseAnyway,
}: {
  frame: Asset;
  busy: boolean;
  onNote: (note: string) => void;
  onResend: () => void;
  onDelete: () => void;
  onUseAnyway: (v: boolean) => void;
}) {
  const bad = f.fix && f.fix !== 'ok';
  return (
    <li className={`border rounded-xl p-3 space-y-2 ${bad && !f.useAnyway ? 'border-red-300 bg-red-50/30' : 'border-gray-200'}`}>
      <Thumb imageId={f.imageId} alt={`Frame @${f.tag}`} className="aspect-video" />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-sm flex items-center gap-2">
          @{f.tag}
          {typeof f.score === 'number' && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${scoreTone(f.score)}`}>{f.score}/10</span>
          )}
          {f.stable === false && <span className="text-xs text-red-700 font-bold">tư thế chưa ổn định</span>}
        </p>
        <div className="flex gap-1">
          <button onClick={onResend} disabled={busy} title="Gửi ảnh khác thay cho frame này" className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 hover:bg-primary-100 flex items-center gap-1 disabled:opacity-50">
            <RotateCcw className="w-3.5 h-3.5" />
            Gửi lại
          </button>
          <button onClick={onDelete} disabled={busy} title="Xoá frame" className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 hover:bg-red-50 hover:text-red-700 flex items-center gap-1 disabled:opacity-50">
            <Trash2 className="w-3.5 h-3.5" />
            Xoá
          </button>
        </div>
      </div>

      {bad && (
        <div role="alert" className="bg-red-600 text-white rounded-lg p-3 text-xs space-y-1.5">
          <p className="font-bold text-sm flex items-center gap-1.5">
            <XCircle className="w-4 h-4" />
            {f.fix === 'tao-lai-video' ? 'Video này không có frame dùng được — nên tạo lại video' : 'Frame chụp chưa đúng — nên chụp lại'}
          </p>
          <p>
            {f.fix === 'tao-lai-video'
              ? 'Chỉnh lại prompt ở khối 2 (hoặc sửa đầu vào), chạy lại Veo, rồi gửi frame mới.'
              : 'Tua lại đúng khoảnh khắc trong Ghi chú hậu kỳ, chụp lại rồi bấm "Gửi lại".'}
            {!f.useAnyway && ' Frame này sẽ KHÔNG được dùng làm frame nối cho beat sau.'}
          </p>
          <label className="flex items-center gap-2 pt-1">
            <input type="checkbox" checked={!!f.useAnyway} onChange={(e) => onUseAnyway(e.target.checked)} className="accent-white" />
            Vẫn dùng frame này (tôi chấp nhận rủi ro)
          </label>
        </div>
      )}

      {f.criteria && f.criteria.length > 0 && (
        <ul className="text-xs space-y-1">
          {f.criteria.map((c) => (
            <li key={c.name} className="flex gap-2">
              <span className={`shrink-0 w-9 text-center rounded font-bold ${c.points === 2 ? 'bg-green-100 text-green-800' : c.points === 1 ? 'bg-primary-100 text-primary-800' : 'bg-red-100 text-red-700'}`}>
                {c.points}/2
              </span>
              <span>
                <span className="font-bold">{c.name}: </span>
                {c.comment}
              </span>
            </li>
          ))}
        </ul>
      )}

      <label className="block text-xs font-bold text-gray-600" htmlFor={`fn-${f.tag}`}>Ô Note</label>
      <textarea
        id={`fn-${f.tag}`}
        rows={2}
        value={f.note}
        onChange={(e) => onNote(e.target.value)}
        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-400"
      />
      {f.seen && (
        <p className="text-xs text-gray-600">
          <span className="font-bold">AI thấy: </span>
          {f.seen}
        </p>
      )}
      {f.warning && <p className="text-xs text-red-700">⚠ {f.warning}</p>}
    </li>
  );
}

/* ---------- Trạng thái beat trong danh sách ---------- */

function beatStatus(work: BeatWork | undefined, frames: Asset[]) {
  if (!work?.input) return { icon: FileText, label: 'Chưa viết', tone: 'text-gray-400' };
  if (work.input.blocked.length || (work.input.missing.length && !work.acceptMissing)) return { icon: AlertTriangle, label: 'Cần xử lý', tone: 'text-red-600' };
  if (!work.engine) return { icon: FileText, label: 'Có đầu vào', tone: 'text-primary-700' };
  if (!frames.length) return { icon: Sparkles, label: 'Có prompt', tone: 'text-primary-700' };
  if (!frames.some(usableImage)) return { icon: XCircle, label: 'Frame cần làm lại', tone: 'text-red-600' };
  return { icon: Camera, label: 'Có frame', tone: 'text-green-700' };
}

/* ---------- Khung từng beat ---------- */

function BeatPanel({
  project,
  beat,
  scene,
  onUpdate,
  onNext,
}: {
  project: Project;
  beat: ScriptBeat;
  scene: Scene | null;
  onUpdate: (patch: ProjectPatch) => void;
  onNext: (() => void) | null;
}) {
  const work: BeatWork = project.beats?.[beat.id] || {};
  const input = work.input;
  const assets = project.assets || [];
  const library = useMemo(() => projectLibrary(project), [project.design, project.assets]);
  // Ảnh chụp từ video của beat này: frame nối + ảnh tag trạng thái sau (VD @baykep)
  const frames = assets.filter((a) => a.beatId === beat.id && (a.kind === 'frame' || a.state));
  // Tag trạng thái sau khai ở 1.5 của kịch bản
  const stateList = useMemo(
    () =>
      (project.script?.props || []).flatMap((p) =>
        (p.stateTags || []).map((t) => ({ tag: t, parent: p.tag, note: p.note }))
      ),
    [project.script]
  );
  const isStateTag = (t: string) => stateList.some((x) => x.tag === t);

  const [busy, setBusy] = useState<'' | 'input' | 'engine' | 'edit' | 'frame'>('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [editReq, setEditReq] = useState('');
  const [showFull, setShowFull] = useState(false);
  const [override, setOverride] = useState(false);
  const [refWithNote, setRefWithNote] = useState(false);
  const [mapped, setMapped] = useState<MappedRefs | null>(null);
  const [frameTarget, setFrameTarget] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const rerunAfterUpload = useRef(false);
  const [pendingRerun, setPendingRerun] = useState('');

  // Luôn gộp vào bản mới nhất của dự án (an toàn khi đổi beat trong lúc AI đang chạy)
  const setWork = (patch: Partial<BeatWork>) =>
    onUpdate((p) => ({ beats: { ...(p.beats || {}), [beat.id]: { ...(p.beats?.[beat.id] || {}), ...patch } } }));

  // Luôn map lại ảnh theo @tag đang có trong ô Script (giống app Đạo diễn)
  useEffect(() => {
    let alive = true;
    if (!input?.script) {
      setMapped(null);
      return;
    }
    autoMap(input.script, library).then((m) => alive && setMapped(m));
    return () => {
      alive = false;
    };
  }, [input?.script, library]);

  // Frame chụp từ các beat trước, mới hơn lần viết đầu vào → ảnh thắng kịch bản
  const newerFrames = input
    ? assets.filter((a) => usableFrame(a) && a.beatId && beatNum(a.beatId) < beatNum(beat.id) && (a.addedAt || 0) > (work.inputAt || 0))
    : [];

  /* ----- Viết đầu vào (LÕI Bước 3) ----- */
  const writeInput = async (fb = '', withPrevious = false) => {
    setBusy('input');
    setError('');
    try {
      const next = await runBeatInput(project, beat.id, fb, withPrevious);
      setWork({ input: next, inputAt: Date.now() });
      setFeedback('');
      setOverride(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const editScript = (script: string) => input && setWork({ input: { ...input, script } });

  /* ----- Engine Đạo diễn ----- */
  const engineRequest = async (): Promise<EngineRequest> => {
    const m = await autoMap(input!.script, library);
    setMapped(m);
    return {
      script: input!.script,
      duration: input!.duration,
      referenceImages: m.refs,
      cinematicLevel: input!.cinematicLevel,
      promptType: input!.promptType,
      pacing: input!.pacing,
    };
  };

  const generate = async () => {
    if (!input) return;
    setBusy('engine');
    setError('');
    try {
      const req = await engineRequest();
      const result = await engineGenerate(req, project.id);
      setWork({ engine: result, engineAt: Date.now(), engineScript: input.script });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const refine = async () => {
    if (!input || !work.engine || !editReq.trim()) return;
    setBusy('edit');
    setError('');
    try {
      const result = await engineEdit(work.engine, editReq.trim(), await engineRequest(), project.id);
      setWork({ engine: result, engineAt: Date.now() });
      setEditReq('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  // Phụ lục LÕI: cảnh báo / "App tự thêm" khác ý đồ → sửa ô Script, không sửa tay prompt
  const sendWarningsToWriter = () => {
    if (!work.engine) return;
    const lines = [
      'App Đạo diễn trả về kết quả sau. Hãy sửa ô Script cho rõ hơn theo phụ lục LÕI.',
      ...work.engine.warnings.map((w) => `- Cảnh báo: ${w}`),
      ...work.engine.segments.flatMap((s) => s.addedByDirectorVi.map((a) => `- App tự thêm ở shot ${s.shotNumber}: ${a}`)),
    ];
    writeInput(lines.join('\n'), true);
  };

  /* ----- Frame sau khi có video ----- */
  const plannedFrames = (input?.postNotes || []).filter((n) => !n.avoid);
  const nextFreeTag = () => {
    const used = new Set([
      ...assets.filter((a) => a.kind === 'frame').map((a) => a.tag),
      ...(input?.postNotes || []).map((n) => n.tag),
    ]);
    const planned = plannedFrames.find((n) => !assets.some((a) => a.tag === n.tag && a.imageId));
    if (planned) return planned.tag;
    for (const ch of 'abcdefghijklmnopqrstuvwxyz') {
      const t = `frame${beatNum(beat.id)}${ch}`;
      if (!used.has(t)) return t;
    }
    return `frame${beatNum(beat.id)}z`;
  };

  /** Beat nào hẹn chụp ảnh cho tag này (theo Ghi chú hậu kỳ đã viết). */
  const sourceBeatOf = (tag: string): string => {
    const m = /^frame(\d+)[a-z]$/.exec(tag);
    if (m) return `B${m[1].padStart(2, '0')}`;
    for (const [id, w] of Object.entries(project.beats || {})) {
      if (w.input?.postNotes.some((n) => n.tag === tag)) return id;
    }
    const all = project.script?.beats || [];
    const i = all.findIndex((b) => b.id === beat.id);
    return all[Math.max(0, i - 1)]?.id || beat.id;
  };

  /**
   * Gửi ảnh cho một tag. Frame nối và ảnh trạng thái sau được AI đọc + chấm điểm;
   * ảnh nhân vật/đạo cụ gốc (Bước 2) thì lưu thẳng.
   */
  const uploadFrame = async (file: File, tag: string) => {
    setBusy('frame');
    setError('');
    try {
      const full = await readAndResize(file, 1536);
      const old = assets.find((a) => a.tag === tag);
      const fromDesign = library.find((a) => a.tag === tag && (a.kind === 'character' || a.kind === 'prop') && !a.state);
      const isFrame = /^frame\d+[a-z]$/.test(tag);
      let asset: Asset;

      if (!isFrame && !isStateTag(tag) && fromDesign) {
        const id = await putImage(full);
        if (old?.imageId) await deleteImage(old.imageId).catch(() => undefined);
        asset = { ...fromDesign, imageId: id, addedAt: Date.now() };
      } else {
        const source = sourceBeatOf(tag);
        const sourceInput = project.beats?.[source]?.input;
        const plan = sourceInput?.postNotes.find((n) => n.tag === tag);
        const kind = isFrame ? 'frame' : 'state';
        const read = await readFrame({
          beatId: source,
          tag,
          planned: plan ? `${plan.what} — dùng cho ${plan.forBeat}` : '',
          beatScript: sourceInput?.script || '',
          aspect: project.settings.aspect,
          image: splitDataUrl(await shrinkDataUrl(full, 1024)),
          kind,
        }, project.id);
        const id = await putImage(full);
        if (old?.imageId) await deleteImage(old.imageId).catch(() => undefined);
        asset = {
          tag,
          kind: isFrame ? 'frame' : 'prop',
          state: !isFrame,
          beatId: source,
          note: read.note,
          seen: read.seen,
          stable: read.stable,
          score: read.score,
          criteria: read.criteria,
          fix: read.fix,
          useAnyway: false,
          warning: read.warning,
          imageId: id,
          addedAt: Date.now(),
        };
      }
      onUpdate((p) => ({ assets: [...(p.assets || []).filter((a) => a.tag !== tag), asset] }));
      if (rerunAfterUpload.current) setPendingRerun(tag);
    } catch (e: any) {
      setError(e.message);
    } finally {
      rerunAfterUpload.current = false;
      setBusy('');
    }
  };

  // Gửi bổ sung ảnh thiếu xong → đợi thư viện có ảnh rồi chạy lại beat (ảnh thắng kịch bản)
  useEffect(() => {
    if (!pendingRerun || busy) return;
    if (!library.some((a) => a.tag === pendingRerun && a.imageId)) return;
    const tag = pendingRerun;
    setPendingRerun('');
    writeInput(`Người dùng vừa bổ sung ảnh @${tag}. Dùng ảnh thật này (nạp ảnh, tham chiếu @${tag} trong Script), không tả thay bằng chữ nữa. Làm lại nhịp 1–5.`, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRerun, library, busy]);

  const sendMissing = (tag: string) => {
    rerunAfterUpload.current = true;
    setFrameTarget(tag);
    fileRef.current?.click();
  };

  const deleteFrame = async (tag: string) => {
    if (!confirm(`Xoá ảnh @${tag}? Ảnh và ô Note của nó sẽ mất.`)) return;
    const old = assets.find((a) => a.tag === tag);
    if (old?.imageId) await deleteImage(old.imageId).catch(() => undefined);
    onUpdate((p) => ({ assets: (p.assets || []).filter((a) => a.tag !== tag) }));
  };

  const resendFrame = (tag: string) => {
    setFrameTarget(tag);
    fileRef.current?.click();
  };

  const setUseAnyway = (tag: string, useAnyway: boolean) =>
    onUpdate((p) => ({ assets: (p.assets || []).map((a) => (a.tag === tag ? { ...a, useAnyway } : a)) }));

  const setFrameNote = (tag: string, note: string) =>
    onUpdate((p) => ({ assets: (p.assets || []).map((a) => (a.tag === tag ? { ...a, note } : a)) }));

  const blockers = input ? input.blocked.length + (work.acceptMissing ? 0 : input.missing.length) : 0;
  const stale = !!(work.engine && input && work.engineScript !== undefined && work.engineScript !== input.script);
  const totalSeconds = work.engine?.segments.reduce((t, s) => t + (s.duration || 0), 0) || 0;

  return (
    <div className="space-y-6 min-w-0">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">
            {scene ? `${scene.id} · ${scene.location} · ${scene.time}` : 'Chưa chia scene'}
          </p>
          <h3 className="text-2xl font-bold text-black">
            {beat.id} — {beat.name}
          </h3>
          <p className="text-sm text-gray-600 mt-1 max-w-2xl">{beat.summary}</p>
        </div>
        {onNext && (
          <button onClick={onNext} className="px-4 py-2 rounded-full text-sm font-bold bg-gray-100 hover:bg-primary-100 flex items-center gap-1.5">
            Beat sau
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </header>

      <ErrorBox message={error} />

      {/* ================= 1. ĐẦU VÀO ================= */}
      <section className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-bold text-black text-lg flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-primary-400 text-black text-sm flex items-center justify-center">1</span>
            Đầu vào cho app Đạo diễn
          </h4>
          {!input ? (
            <RunButton onClick={() => writeInput()} busy={busy === 'input'} busyLabel="Đang chạy 5 nhịp…" icon={FileText} disabled={!!busy}>
              Viết đầu vào {beat.id}
            </RunButton>
          ) : (
            <button
              onClick={() => writeInput()}
              disabled={!!busy}
              className="px-3 py-2 rounded-full text-sm font-medium bg-gray-100 hover:bg-primary-100 flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${busy === 'input' ? 'animate-spin' : ''}`} />
              Viết lại từ đầu
            </button>
          )}
        </div>

        {busy === 'input' && (
          <p className="text-sm text-gray-500 bg-primary-50 rounded-xl px-4 py-3">
            Đang đọc frame, quét đạo cụ, vật lý, nhân quả, bản đồ vị trí rồi mới viết ô Script. Thường mất 30–60 giây.
          </p>
        )}

        {newerFrames.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 bg-primary-100 border border-primary-300 rounded-xl px-4 py-3 text-sm">
            <Camera className="w-4 h-4" />
            <span className="flex-1">
              Có frame mới ({newerFrames.map((f) => '@' + f.tag).join(', ')}) sau lần viết này. Ảnh thắng kịch bản — nên viết lại theo khung thật.
            </span>
            <button onClick={() => writeInput('Có frame mới từ beat trước. Đọc lại frame thật và chốt lại theo nhịp 3.', true)} disabled={!!busy} className="font-bold underline">
              Viết lại theo frame
            </button>
          </div>
        )}

        {input && (
          <>
            {(input.blocked.length > 0 || input.missing.length > 0) && (
              <div className={`rounded-xl p-4 space-y-2 text-sm border ${blockers > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                <p className="font-bold text-red-700 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  Beat chưa qua được bảng kiểm 3.10
                </p>
                {input.missing.length > 0 && (
                  <div className="space-y-2">
                    <p className="font-bold">Thiếu ảnh (nhịp 2 — dừng và xin):</p>
                    <ul className="space-y-1.5">
                      {input.missing.map((t) => {
                        const src = isStateTag(t) || /^frame\d+[a-z]$/.test(t) ? sourceBeatOf(t) : '';
                        return (
                          <li key={t} className="flex flex-wrap items-center gap-2 bg-white rounded-lg px-3 py-2">
                            <span className="font-bold">@{t}</span>
                            <span className="flex-1 min-w-[12rem] text-gray-600">
                              {isStateTag(t)
                                ? `Ảnh trạng thái sau — chụp từ video ${src}`
                                : /^frame\d+[a-z]$/.test(t)
                                ? `Frame nối — chụp từ video ${src}`
                                : 'Ảnh nhân vật / đạo cụ (Bước 2)'}
                            </span>
                            <button
                              onClick={() => sendMissing(t)}
                              disabled={!!busy}
                              className="px-3 py-1 rounded-full text-xs font-bold bg-black text-primary-400 disabled:opacity-50"
                            >
                              Gửi ảnh và chạy lại beat
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <label className="flex items-start gap-2 pt-1">
                      <input
                        type="checkbox"
                        checked={!!work.acceptMissing}
                        onChange={(e) => setWork({ acceptMissing: e.target.checked })}
                        className="accent-black mt-0.5"
                      />
                      <span>Không cần ảnh — giữ mô tả bằng chữ như bản hiện tại (tôi chấp nhận rủi ro Veo vẽ lệch).</span>
                    </label>
                  </div>
                )}
                {input.blocked.map((b, i) => (
                  <p key={i}>
                    <span className="font-bold">Ô chặn "{b.cell}": </span>
                    {b.reason}
                  </p>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2 text-sm">
              {[
                `${input.duration}s`,
                input.promptType === 'multishot' ? 'Multishot' : 'Continuous',
                `Cinematic: ${input.cinematicLevel}`,
                `Pacing: ${input.pacing}`,
                project.settings.aspect,
              ].map((c) => (
                <span key={c} className="px-3 py-1 rounded-full bg-black text-primary-400 font-bold">{c}</span>
              ))}
              {input.borrowed && <span className="px-3 py-1 rounded-full bg-primary-100 text-primary-800 font-bold">Mượn {input.borrowed}</span>}
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label htmlFor={`script-${beat.id}`} className="font-bold text-black text-sm">Ô The Script</label>
                <CopyButton text={input.script} />
              </div>
              <textarea
                id={`script-${beat.id}`}
                value={input.script}
                onChange={(e) => editScript(e.target.value)}
                rows={Math.min(18, Math.max(8, input.script.split('\n').length + 2))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <p className="text-xs text-gray-500 mt-1">Sửa tay được. Ảnh bên dưới tự map lại theo @tag trong ô này.</p>
            </div>

            <div>
              <p className="font-bold text-black text-sm mb-2">Ảnh nạp ({mapped?.refs.length || 0}/10)</p>
              <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {(mapped?.matched || []).map((tag) => {
                  const a = library.find((x) => x.tag === tag);
                  return (
                    <li key={tag} className="bg-gray-50 rounded-xl p-2 space-y-1">
                      <Thumb imageId={a?.imageId} alt={`@${tag}`} className="aspect-square" />
                      <p className="text-xs font-bold">@{tag}</p>
                      <p className="text-xs text-gray-500 line-clamp-2">{a?.note}</p>
                    </li>
                  );
                })}
              </ul>
              {mapped && (mapped.unknown.length > 0 || mapped.noImage.length > 0 || mapped.overflow.length > 0) && (
                <p className="text-sm text-red-700 mt-2">
                  {mapped.unknown.length > 0 && `Tag chưa có trong thư viện: ${mapped.unknown.map((t) => '@' + t).join(', ')}. `}
                  {mapped.noImage.length > 0 && `Tag chưa gắn ảnh: ${mapped.noImage.map((t) => '@' + t).join(', ')}. `}
                  {mapped.overflow.length > 0 && `Vượt 10 ảnh, bị bỏ: ${mapped.overflow.map((t) => '@' + t).join(', ')}.`}
                </p>
              )}
            </div>

            <div className="border-t border-gray-100 pt-3">
              <button onClick={() => setShowFull((v) => !v)} aria-expanded={showFull} className="flex items-center gap-2 font-bold text-black text-sm">
                <ChevronDown className={`w-4 h-4 transition-transform ${showFull ? 'rotate-180' : ''}`} />
                Bảng kiểm 3.10 và ghi chú đầy đủ
              </button>
              {showFull && (
                <div className="mt-3">
                  <Markdown text={input.markdown} />
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-2">
              <input
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Yêu cầu sửa đầu vào, VD: shot 2 đặt máy sát sàn, bỏ thoại"
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <RunButton onClick={() => writeInput(feedback.trim(), true)} busy={busy === 'input'} busyLabel="Đang sửa…" icon={Wand2} variant="ghost" disabled={!!busy || !feedback.trim()}>
                Sửa đầu vào
              </RunButton>
            </div>
          </>
        )}
      </section>

      {/* ================= ẢNH THAM CHIẾU CỦA BEAT (để chép) ================= */}
      {input && (() => {
        const tags = extractTags(input.script);
        const text = tags
          .map((t) => {
            const a = library.find((x) => x.tag === t);
            return refWithNote && a?.note ? `${t} : ${a.note}` : `${t} : `;
          })
          .join('\n');
        const missingImg = tags.filter((t) => !library.some((x) => x.tag === t && x.imageId));
        return (
          <section className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="font-bold text-black">Ảnh tham chiếu của beat ({tags.length})</h4>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-sm text-gray-600">
                  <input type="checkbox" checked={refWithNote} onChange={(e) => setRefWithNote(e.target.checked)} className="accent-black" />
                  Kèm ô Note
                </label>
                <CopyButton text={text} />
              </div>
            </div>
            <label htmlFor={`refs-${beat.id}`} className="sr-only">Danh sách ảnh tham chiếu</label>
            <textarea
              id={`refs-${beat.id}`}
              readOnly
              value={text || '(ô Script không nhắc @tag nào)'}
              rows={Math.min(12, Math.max(2, tags.length))}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            {missingImg.length > 0 && (
              <p className="text-xs text-red-700">Chưa có ảnh trong thư viện: {missingImg.map((t) => '@' + t).join(', ')}</p>
            )}
          </section>
        );
      })()}

      {/* ================= 2. PROMPT VEO ================= */}
      <section className={`bg-white border border-gray-200 rounded-2xl p-5 space-y-4 ${!input ? 'opacity-60' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-bold text-black text-lg flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-primary-400 text-black text-sm flex items-center justify-center">2</span>
            Prompt Veo
            <span className="text-xs font-normal text-gray-500">(engine Đạo diễn AI)</span>
          </h4>
          <RunButton
            onClick={generate}
            busy={busy === 'engine'}
            busyLabel="Đang chia góc máy…"
            icon={Sparkles}
            variant="yellow"
            disabled={!input || !!busy || (blockers > 0 && !override)}
          >
            {work.engine ? 'Tạo lại prompt' : 'Tạo prompt Veo'}
          </RunButton>
        </div>

        {input && blockers > 0 && (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} className="accent-black" />
            Beat còn ô chặn{work.acceptMissing ? '' : ' hoặc thiếu ảnh'} — vẫn tạo prompt (tôi chấp nhận rủi ro)
          </label>
        )}

        {stale && (
          <p className="text-sm bg-primary-100 border border-primary-300 rounded-xl px-4 py-2.5">
            Ô Script đã đổi sau lần tạo prompt này. Bấm "Tạo lại prompt" để cập nhật.
          </p>
        )}

        {work.engine && (
          <>
            {work.engine.warnings.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="font-bold text-red-700 text-sm flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  Cần xem lại ({work.engine.warnings.length})
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800">
                  {work.engine.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-black rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-primary-400 font-bold text-sm">Prompt Veo hoàn chỉnh</span>
                <span className="text-gray-400 text-xs">
                  {work.engine.mode === 'continuous' ? 'Long take' : 'Multishot'} · {totalSeconds}s
                </span>
              </div>
              <pre className="whitespace-pre-wrap break-words text-sm text-gray-100 leading-relaxed font-mono">{work.engine.finalPrompt}</pre>
              <div className="flex flex-wrap gap-2 mt-3">
                <CopyButton text={work.engine.finalPrompt} label="Chép prompt" className="!bg-primary-400 !text-black hover:!bg-primary-300" />
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-2">
              <input
                value={editReq}
                onChange={(e) => setEditReq(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && refine()}
                placeholder="Chỉnh lại cả beat, VD: Shot 2 hạ máy sát sàn, Tom vào khung sớm hơn…"
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <RunButton onClick={refine} busy={busy === 'edit'} busyLabel="Đang chỉnh…" icon={Wand2} variant="ghost" disabled={!!busy || !editReq.trim()}>
                Chỉnh lại
              </RunButton>
            </div>

            {(work.engine.warnings.length > 0 || work.engine.segments.some((s) => s.addedByDirectorVi.length)) && (
              <button
                onClick={sendWarningsToWriter}
                disabled={!!busy}
                className="text-sm font-bold text-primary-800 hover:text-black flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                Cảnh báo hoặc "App tự thêm" khác ý đồ? Gửi cho biên kịch sửa ô Script
              </button>
            )}

            <ol className="space-y-2">
              {work.engine.segments.map((s, i) => (
                <li key={i} className="border border-gray-200 rounded-xl p-3 text-sm">
                  <p className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-bold text-black">
                      Shot {s.shotNumber}
                      {work.engine!.mode === 'multishot' && i > 0 && <span className="ml-2 text-xs text-gray-500">HARD CUT</span>}
                    </span>
                    <span className="text-xs text-gray-500">{s.timeRange} · {s.duration}s</span>
                  </p>
                  {s.summaryVi && <p className="text-gray-800 mt-1">{s.summaryVi}</p>}
                  <p className="text-gray-500 mt-1"><span className="font-bold text-gray-700">Máy quay: </span>{s.cameraVi || s.camera}</p>
                  {s.addedByDirectorVi.length > 0 && (
                    <div className="mt-2 bg-primary-50 rounded-lg p-2">
                      <p className="text-xs font-bold text-primary-800">App tự thêm</p>
                      <ul className="list-disc pl-5 text-xs text-gray-700">
                        {s.addedByDirectorVi.map((a, j) => (
                          <li key={j}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      {/* ================= 3. FRAME ================= */}
      <section className={`bg-white border border-gray-200 rounded-2xl p-5 space-y-4 ${!work.engine ? 'opacity-60' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-bold text-black text-lg flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-primary-400 text-black text-sm flex items-center justify-center">3</span>
            Frame sau khi có video
          </h4>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFrame(f, frameTarget || nextFreeTag());
              e.target.value = '';
              setFrameTarget('');
            }}
          />
          <RunButton
            onClick={() => {
              setFrameTarget('');
              fileRef.current?.click();
            }}
            busy={busy === 'frame'}
            busyLabel="Đang đọc frame…"
            icon={ImagePlus}
            variant="ghost"
            disabled={!!busy}
          >
            Gửi frame
          </RunButton>
        </div>

        {input && input.postNotes.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-bold text-black">Ghi chú hậu kỳ — cần chụp</p>
            <ul className="space-y-1.5">
              {input.postNotes.map((n) => {
                const got = assets.find((a) => a.tag === n.tag && a.imageId);
                const ok = got && usableImage(got);
                return (
                  <li
                    key={n.tag}
                    className={`text-sm rounded-xl px-3 py-2 flex flex-wrap items-center gap-2 ${
                      n.avoid ? 'bg-red-50' : ok ? 'bg-green-50' : got ? 'bg-red-50' : 'bg-gray-50'
                    }`}
                  >
                    <span className="font-bold">@{n.tag}</span>
                    {(n.kind === 'state' || isStateTag(n.tag)) && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-800">ảnh trạng thái sau</span>
                    )}
                    <span className="flex-1 min-w-[12rem]">
                      {n.avoid ? '⚠️ Không dùng — ' : ''}
                      {n.what}
                      {n.forBeat && <span className="text-gray-500"> · dùng cho {n.forBeat}</span>}
                    </span>
                    {!n.avoid && ok && <CheckCircle2 className="w-4 h-4 text-green-700" aria-label="Đã có frame dùng được" />}
                    {!n.avoid && got && !ok && <XCircle className="w-4 h-4 text-red-600" aria-label="Frame cần làm lại" />}
                    {!n.avoid && (
                      <button
                        onClick={() => resendFrame(n.tag)}
                        disabled={!!busy}
                        className="px-3 py-1 rounded-full text-xs font-bold bg-white border border-gray-200 hover:border-primary-400"
                      >
                        {got ? 'Gửi lại' : 'Gửi ảnh này'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {frames.length > 0 && (
          <ul className="grid md:grid-cols-2 gap-3">
            {frames
              .sort((a, b) => a.tag.localeCompare(b.tag))
              .map((f) => (
                <FrameCard
                  key={f.tag}
                  frame={f}
                  busy={!!busy}
                  onNote={(note) => setFrameNote(f.tag, note)}
                  onResend={() => resendFrame(f.tag)}
                  onDelete={() => deleteFrame(f.tag)}
                  onUseAnyway={(v) => setUseAnyway(f.tag, v)}
                />
              ))}
          </ul>
        )}

        {!frames.length && (
          <p className="text-sm text-gray-500">
            Chạy prompt trên Veo, chụp frame theo ghi chú hậu kỳ rồi gửi lên. App tự đặt tên @frame, tự viết ô Note theo mẫu 3.6, và beat sau sẽ đọc frame thật này.
          </p>
        )}
      </section>
    </div>
  );
}

/* ---------- Bước 5 ---------- */

export default function BeatStep({ project, onUpdate, onGoScript, selectedBeat, onSelectBeat }: Props) {
  const script = project.script;
  const beats = script?.beats || [];
  const [localSelected, setLocalSelected] = useState(() => {
    const firstOpen = beats.find((b) => !project.beats?.[b.id]?.engine);
    return firstOpen?.id || beats[0]?.id || '';
  });
  const selected = selectedBeat && beats.some((b) => b.id === selectedBeat) ? selectedBeat : localSelected;
  const setSelected = (id: string) => {
    setLocalSelected(id);
    onSelectBeat?.(id);
  };
  useEffect(() => {
    if (selected) onSelectBeat?.(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const openGate = (script?.gate || []).filter((g) => !g.waived);
  const sceneOf = useMemo(() => {
    const map: Record<string, Scene> = {};
    (project.scenes || []).forEach((s) => s.beats.forEach((b) => (map[b] = s)));
    return map;
  }, [project.scenes]);

  // Quy trình đề cương: cổng chặn tính theo TỪNG SCENE — scene nào đã thông thì làm beat của scene đó được ngay.
  const byScene = !!project.outline;
  const lockedScenes = new Set(
    byScene ? openGate.map((g) => script?.beats.find((b) => b.id === g.beat)?.sceneId || g.id.split('_gate_')[0]) : []
  );
  const isLocked = (b: { sceneId?: string }) => (byScene ? !!b.sceneId && lockedScenes.has(b.sceneId) : openGate.length > 0);

  if (!script) {
    return <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-500">Chưa có kịch bản.</div>;
  }

  if (!beats.length) {
    return (
      <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-500 space-y-3">
        <p>Chưa có scene nào được viết beat.</p>
        <button onClick={onGoScript} className="px-5 py-2.5 rounded-xl bg-black text-primary-400 font-bold">Về bước kịch bản</button>
      </div>
    );
  }

  if (!byScene && openGate.length) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 space-y-3">
        <p className="font-bold text-red-700 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" />
          Cổng chặn 1.6 còn {openGate.length} mục chưa chốt
        </p>
        <p className="text-sm text-gray-700">
          LÕI không cho sang Bước 3 khi beat rủi ro cao, mắt xích hụt, mâu thuẫn không gian, cú ngã vắt beat hoặc beat rỗng quá 25% chưa có hướng xử lý.
          Quay lại bước kịch bản để sửa hoặc chấp nhận rủi ro từng mục.
        </p>
        <button onClick={onGoScript} className="px-5 py-2.5 rounded-xl bg-black text-primary-400 font-bold">
          Về bước kịch bản
        </button>
      </div>
    );
  }

  const index = beats.findIndex((b) => b.id === selected);
  const beat = beats[index];
  const assets = project.assets || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {(project.scenes || []).map((s) => (
          <span
            key={s.id}
            className={`text-xs rounded-full px-3 py-1.5 ${lockedScenes.has(s.id) ? 'bg-red-50 text-red-700' : 'bg-gray-100'}`}
            title={s.light}
          >
            <span className="font-bold">{s.id}</span> · {s.location} · {s.beats[0]}–{s.beats[s.beats.length - 1]}
            {lockedScenes.has(s.id) ? ' · còn cổng chặn' : ''}
          </span>
        ))}
        {beats.filter((b) => b.borrowed).map((b) => (
          <span key={b.id} className="text-xs bg-primary-100 text-primary-800 rounded-full px-3 py-1.5">
            {b.id} mượn {b.borrowed}
          </span>
        ))}
        {Object.entries(project.borrowPlan || {}).map(([b, x]) => (
          <span key={b} className="text-xs bg-primary-100 text-primary-800 rounded-full px-3 py-1.5" title={x.reason}>
            {b} mượn {x.module}
          </span>
        ))}
      </div>

      <div className="grid lg:grid-cols-[14rem_1fr] gap-6 items-start">
        <nav aria-label="Danh sách beat" className="lg:sticky lg:top-24">
          <ol className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
            {beats.map((b) => {
              const st = beatStatus(project.beats?.[b.id], assets.filter((a) => (a.kind === 'frame' || a.state) && a.beatId === b.id));
              const Icon = st.icon;
              return (
                <li key={b.id} className="shrink-0">
                  <button
                    onClick={() => setSelected(b.id)}
                    aria-current={b.id === selected ? 'true' : undefined}
                    className={`w-40 lg:w-full text-left rounded-xl px-3 py-2 border transition-colors ${
                      b.id === selected ? 'bg-black border-black text-white' : 'bg-white border-gray-200 hover:border-primary-400'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-bold">{b.id}</span>
                      <span className="text-xs opacity-70">
                        {b.sceneId ? `${b.sceneId} · ` : ''}
                        {b.duration}s
                      </span>
                    </span>
                    <span className="block text-xs truncate opacity-80">{b.name}</span>
                    <span className={`flex items-center gap-1 text-xs mt-0.5 ${b.id === selected ? 'text-primary-400' : st.tone}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {st.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {beat && isLocked(beat) ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 space-y-3">
            <p className="font-bold text-red-700 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              Scene {beat.sceneId} còn mục chạm cổng chặn 1.6
            </p>
            <p className="text-sm text-gray-700">
              LÕI không cho sang Bước 3 khi chưa chốt hướng xử lý. Về bước kịch bản, mở scene này để sửa hoặc chấp nhận rủi ro từng mục. Các scene đã thông vẫn làm tiếp được.
            </p>
            <button onClick={onGoScript} className="px-5 py-2.5 rounded-xl bg-black text-primary-400 font-bold">Về bước kịch bản</button>
          </div>
        ) : beat ? (
          <BeatPanel
            key={beat.id}
            project={project}
            beat={beat}
            scene={sceneOf[beat.id] || null}
            onUpdate={onUpdate}
            onNext={index < beats.length - 1 ? () => {
              setSelected(beats[index + 1].id);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } : null}
          />
        ) : (
          <p className="text-gray-500">Kịch bản chưa có beat nào.</p>
        )}
      </div>

      <p className="text-xs text-gray-400 flex items-center gap-1.5">
        <Clapperboard className="w-3.5 h-3.5" />
        Engine tạo prompt chép nguyên từ app Đạo diễn AI 1.7 — cùng luật, cùng kết quả.
      </p>
    </div>
  );
}
