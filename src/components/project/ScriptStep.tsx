import React, { useRef, useState } from 'react';
import {
  FileText, PenLine, ArrowRight, ShieldAlert, ShieldCheck, ChevronDown, AlertTriangle, ListTree, Play, Square,
  CheckCircle2, Clock, RefreshCw,
} from 'lucide-react';
import type { GateItem, Project, ProjectPatch, SceneScript } from '../../types';
import { writeOutline, writeScene } from '../../services/api';
import { assemble, flatScenes, startBeatFor, FlatScene } from '../../lib/script';
import { lengthLabel } from '../../lib/modules';
import { effectiveStyle, fixedStyle } from '../../lib/styles';
import StylePicker from './StylePicker';
import { CopyButton, ErrorBox, RunButton } from '../ui';
import Markdown from '../Markdown';

interface Props {
  project: Project;
  onUpdate: (patch: ProjectPatch) => void;
  onNext: () => void;
}

const fmtTime = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} phút ${s % 60 ? `${s % 60}s` : ''}`.trim() : `${s}s`);

/** Gợi ý thời lượng mặc định theo mức đã chọn. */
function defaultTarget(p: Project) {
  if (p.idea.seconds) return p.idea.seconds;
  if (p.settings.length === 'ngan') return 60;
  if (p.settings.length === 'trung-binh') return 300;
  if (p.settings.length === 'dai') return 600;
  return Math.max(p.idea.beats, 1) * 6;
}

/** Áp thay đổi rồi ghép lại script/scenes cho các bước sau. */
const withAssemble = (changes: (latest: Project) => Partial<Project>) => (latest: Project) => {
  const c = changes(latest);
  return { ...c, ...assemble({ ...latest, ...c } as Project) };
};

/* ---------- Danh sách mục cổng chặn ---------- */

function GateList({ gate, onWaive, onNote }: { gate: GateItem[]; onWaive: (id: string, v: boolean) => void; onNote: (g: GateItem) => void }) {
  if (!gate.length) return null;
  return (
    <ul className="space-y-2">
      {gate.map((g) => (
        <li key={g.id} className={`rounded-xl border p-3 ${g.waived ? 'bg-gray-50 border-gray-200 opacity-70' : 'border-red-200 bg-red-50/40'}`}>
          <p className="text-sm">
            <span className="font-bold text-black">{g.beat}</span> · <span className="font-bold text-red-700">{g.kind}</span>
            {g.waived && <span className="ml-2 text-xs font-bold text-gray-600">[đã miễn trừ]</span>}
          </p>
          <p className="text-sm text-gray-800 mt-1">{g.description}</p>
          {g.suggestion && <p className="text-sm text-gray-500 mt-1">Gợi ý: {g.suggestion}</p>}
          <div className="flex flex-wrap gap-2 mt-2">
            <button onClick={() => onNote(g)} className="px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-gray-200 hover:border-primary-400">
              Ghi cách sửa
            </button>
            <button onClick={() => onWaive(g.id, !g.waived)} className="px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-gray-200 hover:border-primary-400">
              {g.waived ? 'Bỏ miễn trừ' : 'Chấp nhận rủi ro'}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Một scene ---------- */

function SceneRow({
  scene, sc, canWrite, busy, open, onToggle, onWrite, onWaive,
}: {
  scene: FlatScene;
  sc?: SceneScript;
  canWrite: boolean;
  busy: boolean;
  open: boolean;
  onToggle: () => void;
  onWrite: (feedback: string, revise: boolean) => void;
  onWaive: (gateId: string, v: boolean) => void;
}) {
  const [feedback, setFeedback] = useState('');
  const [showMd, setShowMd] = useState(false);
  const openGate = (sc?.gate || []).filter((g) => !g.waived);
  const seconds = sc?.beats.reduce((t, b) => t + b.duration, 0) || 0;

  const status = !sc
    ? { label: `~${scene.beats} beat`, cls: 'bg-gray-100 text-gray-600' }
    : sc.stale
    ? { label: 'Cần viết lại (mã beat lệch)', cls: 'bg-red-100 text-red-700' }
    : openGate.length
    ? { label: `${sc.beats.length} beat · ${openGate.length} cổng chặn`, cls: 'bg-red-100 text-red-700' }
    : { label: `${sc.beats.length} beat · ${fmtTime(seconds)}`, cls: 'bg-green-100 text-green-800' };

  return (
    <li className="border border-gray-200 rounded-xl bg-white">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <button onClick={onToggle} aria-expanded={open} className="flex-1 min-w-[12rem] text-left flex items-start gap-2">
          <ChevronDown className={`w-4 h-4 mt-1 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
          <span>
            <span className="font-bold text-black">{scene.id} — {scene.title}</span>
            <span className="block text-xs text-gray-500">{scene.location} · {scene.time}</span>
          </span>
        </button>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${status.cls}`}>{status.label}</span>
        {(!sc || sc.stale) && (
          <button
            onClick={() => onWrite('', false)}
            disabled={!canWrite || busy}
            title={canWrite ? '' : 'Viết các scene trước đó trước (để mã beat liền mạch)'}
            className="px-3 py-1.5 rounded-full text-xs font-bold bg-black text-primary-400 disabled:opacity-40"
          >
            Viết beat
          </button>
        )}
      </div>

      {open && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-4 text-sm">
          <div className="text-gray-700 space-y-1">
            <p>{scene.summary}</p>
            <p><span className="font-bold text-black">Mục đích:</span> {scene.purpose} · <span className="font-bold text-black">Chuyển biến:</span> {scene.turn}</p>
            <p><span className="font-bold text-black">Ánh sáng:</span> {scene.light}</p>
            <p><span className="font-bold text-black">Khung cuối:</span> {sc?.endState || scene.endState}</p>
          </div>

          {sc && (
            <>
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-primary-50 text-left">
                    <tr>
                      <th className="px-3 py-2 font-bold">Beat</th>
                      <th className="px-3 py-2 font-bold">Tên</th>
                      <th className="px-3 py-2 font-bold">Giây</th>
                      <th className="px-3 py-2 font-bold">Mức</th>
                      <th className="px-3 py-2 font-bold">Chuyện gì xảy ra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sc.beats.map((b) => (
                      <tr key={b.id} className="border-t border-gray-100 align-top">
                        <td className="px-3 py-2 font-bold whitespace-nowrap">
                          {b.id}
                          {b.borrowed && <span className="block text-[10px] text-primary-700">mượn {b.borrowed}</span>}
                        </td>
                        <td className="px-3 py-2">{b.name}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {b.duration}s{b.durationWarning && <AlertTriangle className="inline w-3.5 h-3.5 text-red-600 ml-1" aria-label="Đã làm tròn về 4/6/8" />}
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex gap-0.5" aria-label={`Mức ${b.level}`}>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <span key={n} className={`w-1.5 h-3 rounded-sm ${n <= b.level ? 'bg-primary-500' : 'bg-gray-200'}`} />
                            ))}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-700">{b.summary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <GateList gate={sc.gate} onWaive={onWaive} onNote={(g) => setFeedback((f) => `${f ? `${f}\n` : ''}${g.beat} (${g.kind}): `)} />

              <div>
                <button onClick={() => setShowMd((v) => !v)} aria-expanded={showMd} className="flex items-center gap-2 font-bold text-black">
                  <ChevronDown className={`w-4 h-4 transition-transform ${showMd ? 'rotate-180' : ''}`} />
                  Kịch bản scene và bảng kiểm 1.6
                </button>
                {showMd && (
                  <div className="mt-3">
                    <Markdown text={sc.markdown} />
                  </div>
                )}
              </div>

              <div className="flex flex-col md:flex-row gap-2">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={2}
                  placeholder="Yêu cầu sửa scene này, VD: B05 tách làm 2 beat; thêm một nhịp lấy đà trước cú ngã"
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
                <RunButton
                  onClick={() => {
                    onWrite(feedback.trim(), true);
                    setFeedback('');
                  }}
                  busy={busy}
                  busyLabel="Đang viết…"
                  icon={PenLine}
                  variant="ghost"
                  disabled={busy || (!feedback.trim() && !sc.gate.some((g) => g.waived))}
                >
                  Viết lại scene
                </RunButton>
              </div>
            </>
          )}
        </div>
      )}
    </li>
  );
}

/* ---------- Dự án cũ (viết kịch bản một lần, chưa có đề cương) ---------- */

function LegacyScript({ project, onUpdate, onRebuild }: { project: Project; onUpdate: (p: ProjectPatch) => void; onRebuild: () => void }) {
  const script = project.script!;
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-4">
      <p className="text-sm bg-primary-100 border border-primary-300 rounded-xl px-4 py-3">
        Dự án này được viết theo quy trình cũ (cả phim một lần). Vẫn làm tiếp được. Muốn dùng quy trình mới (đề cương → từng scene), bấm nút bên dưới.
      </p>
      <GateList
        gate={script.gate}
        onWaive={(id, v) => onUpdate((l) => ({ script: l.script ? { ...l.script, gate: l.script.gate.map((g) => (g.id === id ? { ...g, waived: v } : g)) } : l.script }))}
        onNote={() => undefined}
      />
      <button onClick={() => setShow((v) => !v)} className="flex items-center gap-2 font-bold text-black">
        <ChevronDown className={`w-4 h-4 ${show ? 'rotate-180' : ''}`} />
        Kịch bản đầy đủ ({script.beats.length} beat · {fmtTime(script.totalSeconds)})
      </button>
      {show && <Markdown text={script.markdown} />}
      <button onClick={onRebuild} className="px-5 py-2.5 rounded-xl border border-gray-300 font-bold hover:border-primary-400">
        Viết lại theo đề cương (quy trình mới)
      </button>
    </div>
  );
}

/* ---------- Bước kịch bản ---------- */

export default function ScriptStep({ project, onUpdate, onNext }: Props) {
  const outline = project.outline;
  const scenes = flatScenes(outline);
  const [target, setTarget] = useState(outline?.targetSeconds || defaultTarget(project));
  const [busy, setBusy] = useState<'' | 'outline' | string>('');
  const [error, setError] = useState('');
  const [openScene, setOpenScene] = useState<string>('');
  const [outlineFeedback, setOutlineFeedback] = useState('');
  const [showOutline, setShowOutline] = useState(false);
  const [progress, setProgress] = useState('');
  const stopRef = useRef(false);
  const [legacyRebuild, setLegacyRebuild] = useState(false);
  // Bản mới nhất của dự án cho vòng "viết tất cả" (props cập nhật sau mỗi lần render)
  const latest = useRef(project);
  latest.current = project;

  const direction = project.directions?.find((d) => d.key === project.chosenDirection);

  const runOutline = async (feedback = '') => {
    if (outline && Object.keys(project.sceneScripts || {}).length && !confirm('Viết lại đề cương sẽ xoá beat của mọi scene đã viết. Tiếp tục?')) return;
    setBusy('outline');
    setError('');
    try {
      const next = await writeOutline(project, {
        targetSeconds: target,
        feedback,
        previousMarkdown: feedback && outline ? outline.markdown : '',
        style: fixedStyle(project),
      });
      onUpdate(withAssemble(() => ({ outline: next, sceneScripts: {}, stage: 'kich-ban' })));
      setOutlineFeedback('');
      setLegacyRebuild(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  /** Viết (hoặc viết lại) beat cho scene thứ index. Trả về false nếu lỗi. */
  const runScene = async (index: number, feedback = '', revise = false): Promise<boolean> => {
    const p = latest.current;
    const list = flatScenes(p.outline);
    const scene = list[index];
    const start = startBeatFor(p, index);
    if (!p.outline || !scene || start === null) {
      setError('Hãy viết các scene phía trước trước, để mã beat liền mạch cả phim.');
      return false;
    }
    const prev = index > 0 ? p.sceneScripts?.[list[index - 1].id] : undefined;
    const old = p.sceneScripts?.[scene.id];
    setBusy(scene.id);
    setError('');
    try {
      const sc = await writeScene(p, {
        outlineMarkdown: p.outline.markdown,
        scene,
        actName: scene.actName,
        startBeat: start,
        prevScene: prev
          ? { id: list[index - 1].id, endState: prev.endState, tail: prev.beats.slice(-2).map((b) => `${b.id} · ${b.name}: ${b.summary}`).join('\n') }
          : null,
        nextScene: list[index + 1] ? { id: list[index + 1].id, summary: list[index + 1].summary } : null,
        style: effectiveStyle(p),
        feedback,
        previousMarkdown: revise && old ? old.markdown : '',
        waived: revise && old ? old.gate.filter((g) => g.waived).map((g) => `${g.beat} — ${g.kind}: ${g.description}`) : [],
      });
      onUpdate(
        withAssemble((l) => {
          const scripts = { ...(l.sceneScripts || {}), [scene.id]: sc };
          // Số beat đổi → mã beat các scene sau bị lệch
          if (old && old.beats.length !== sc.beats.length) {
            flatScenes(l.outline).slice(index + 1).forEach((s) => {
              if (scripts[s.id]) scripts[s.id] = { ...scripts[s.id], stale: true };
            });
          }
          return { sceneScripts: scripts };
        })
      );
      return true;
    } catch (e: any) {
      setError(`${scene.id}: ${e.message}`);
      return false;
    } finally {
      setBusy('');
    }
  };

  const runAll = async () => {
    stopRef.current = false;
    const list = flatScenes(latest.current.outline);
    for (let i = 0; i < list.length; i++) {
      if (stopRef.current) break;
      const sc = latest.current.sceneScripts?.[list[i].id];
      if (sc && !sc.stale) continue;
      setProgress(`Đang viết ${list[i].id} (${i + 1}/${list.length})`);
      const ok = await runScene(i);
      if (!ok) break;
      await new Promise((r) => setTimeout(r, 50)); // chờ React cập nhật dự án mới nhất
    }
    setProgress('');
  };

  const waive = (sceneId: string, gateId: string, v: boolean) =>
    onUpdate(
      withAssemble((l) => {
        const sc = l.sceneScripts?.[sceneId];
        if (!sc) return {};
        return { sceneScripts: { ...l.sceneScripts, [sceneId]: { ...sc, gate: sc.gate.map((g) => (g.id === gateId ? { ...g, waived: v } : g)) } } };
      })
    );

  if (!direction) {
    return <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-500">Chưa có hướng khai thác. Quay lại bước 2.</div>;
  }

  if (!outline && project.script && !legacyRebuild) {
    return (
      <div className="space-y-6">
        <StylePicker project={project} onUpdate={onUpdate} />
        <LegacyScript project={project} onUpdate={onUpdate} onRebuild={() => setLegacyRebuild(true)} />
      </div>
    );
  }

  const written = scenes.filter((s) => project.sceneScripts?.[s.id] && !project.sceneScripts[s.id].stale);
  const script = project.script;
  const openGate = (script?.gate || []).filter((g) => !g.waived);
  const estBeats = scenes.reduce((t, s) => t + s.beats, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-end gap-4">
        <div className="flex-1">
          <p className="text-sm text-gray-500">Viết theo hướng</p>
          <p className="font-bold text-black">{direction.name}</p>
          <p className="text-xs text-gray-500 mt-1">Mức thời lượng: {lengthLabel(project.settings.length)}</p>
        </div>
        <div>
          <label htmlFor="target" className="block text-sm font-medium text-gray-700 mb-1">Thời lượng mong muốn (giây)</label>
          <input
            id="target"
            type="number"
            min={8}
            max={3600}
            step={10}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value) || 0)}
            className="w-36 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          <p className="text-xs text-gray-500 mt-1">≈ {fmtTime(target)}</p>
        </div>
        {!outline && (
          <RunButton onClick={() => runOutline()} busy={busy === 'outline'} busyLabel="Đang lập đề cương…" icon={ListTree}>
            Viết đề cương
          </RunButton>
        )}
      </div>

      <StylePicker project={project} onUpdate={onUpdate} />

      <ErrorBox message={error} />

      {busy === 'outline' && (
        <p className="text-sm text-gray-500 bg-primary-50 rounded-xl px-4 py-3">
          Biên kịch đang định tính cách nhân vật, liệt kê đạo cụ, chia hồi và scene. Beat sẽ được viết sau, theo từng scene.
        </p>
      )}

      {outline && (
        <>
          <section className="grid sm:grid-cols-3 gap-3">
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <p className="text-sm text-gray-500">Scene đã viết beat</p>
              <p className="text-2xl font-bold text-black">{written.length}/{scenes.length}</p>
              <p className="text-xs text-gray-500">ước tính ~{estBeats} beat cả phim</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <p className="text-sm text-gray-500">Thời lượng đã viết</p>
              <p className="text-2xl font-bold text-black">{fmtTime(script?.totalSeconds || 0)}</p>
              <p className="text-xs text-gray-500">mong muốn {fmtTime(outline.targetSeconds)}</p>
            </div>
            <div className={`rounded-2xl p-4 border ${openGate.length ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <p className="text-sm text-gray-600">Cổng chặn 1.6</p>
              <p className={`text-2xl font-bold flex items-center gap-2 ${openGate.length ? 'text-red-700' : 'text-green-800'}`}>
                {openGate.length ? <ShieldAlert className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                {openGate.length ? `${openGate.length} mục` : 'Thông'}
              </p>
              <p className="text-xs text-gray-600">Tính theo từng scene — scene thông là làm beat được</p>
            </div>
          </section>

          {/* ---------- Đề cương ---------- */}
          <section className="bg-white border border-gray-200 rounded-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5">
              <button onClick={() => setShowOutline((v) => !v)} aria-expanded={showOutline} className="flex items-center gap-2 font-bold text-black">
                <ChevronDown className={`w-5 h-5 transition-transform ${showOutline ? 'rotate-180' : ''}`} />
                Đề cương đầy đủ (nhân vật, đạo cụ, hồi, scene)
              </button>
              <CopyButton text={outline.markdown} />
            </div>
            {showOutline && (
              <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                <Markdown text={outline.markdown} />
                <div className="flex flex-col md:flex-row gap-2">
                  <textarea
                    value={outlineFeedback}
                    onChange={(e) => setOutlineFeedback(e.target.value)}
                    rows={2}
                    placeholder="Yêu cầu sửa đề cương, VD: thêm một scene đuổi bắt ở giữa; kết phim nhẹ nhàng hơn"
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                  <RunButton onClick={() => runOutline(outlineFeedback.trim())} busy={busy === 'outline'} busyLabel="Đang viết lại…" icon={RefreshCw} variant="ghost" disabled={!!busy || !outlineFeedback.trim()}>
                    Viết lại đề cương
                  </RunButton>
                </div>
              </div>
            )}
          </section>

          {/* ---------- Hồi và scene ---------- */}
          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-bold text-black text-lg">Hồi và scene</h3>
              {progress ? (
                <button onClick={() => (stopRef.current = true)} className="px-4 py-2 rounded-full text-sm font-bold bg-gray-100 hover:bg-red-50 flex items-center gap-2">
                  <Square className="w-4 h-4" /> {progress} — Dừng sau scene này
                </button>
              ) : (
                written.length < scenes.length && (
                  <button onClick={runAll} disabled={!!busy} className="px-4 py-2 rounded-full text-sm font-bold bg-black text-primary-400 flex items-center gap-2 disabled:opacity-50">
                    <Play className="w-4 h-4" /> Viết beat tất cả scene còn lại
                  </button>
                )
              )}
            </div>
            {outline.acts.map((a) => (
              <div key={a.id} className="space-y-2">
                <p className="text-sm font-bold text-gray-700">
                  {a.id} · {a.name} {a.role && <span className="font-normal text-gray-500">— {a.role}</span>}
                </p>
                <ul className="space-y-2">
                  {a.scenes.map((s) => {
                    const fs = scenes.find((x) => x.id === s.id)!;
                    return (
                      <SceneRow
                        key={s.id}
                        scene={fs}
                        sc={project.sceneScripts?.[s.id]}
                        canWrite={startBeatFor(project, fs.index) !== null}
                        busy={!!busy}
                        open={openScene === s.id}
                        onToggle={() => setOpenScene((o) => (o === s.id ? '' : s.id))}
                        onWrite={(fb, revise) => runScene(fs.index, fb, revise)}
                        onWaive={(gid, v) => waive(s.id, gid, v)}
                      />
                    );
                  })}
                </ul>
              </div>
            ))}
            {busy && busy !== 'outline' && !progress && (
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Đang viết beat cho {busy}… thường 30–90 giây.
              </p>
            )}
          </section>

          <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3">
            {written.length === scenes.length && (
              <p className="text-sm text-green-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Đã viết beat cho mọi scene
              </p>
            )}
            <button onClick={onNext} className="py-3 px-6 rounded-xl bg-black hover:bg-gray-800 text-primary-400 font-bold flex items-center justify-center gap-2">
              Sang thiết kế nhân vật & đạo cụ
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-gray-500 text-right -mt-3">
            Thiết kế chỉ cần đề cương (nhân vật, đạo cụ), nên làm song song được trong lúc chờ viết scene.
          </p>
        </>
      )}
    </div>
  );
}
