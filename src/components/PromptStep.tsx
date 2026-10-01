import { useState, type ReactNode } from 'react';
import type { Clip, Project } from '../../shared/types';
import { FLOW_MODE_LABEL, allClips, clipHash, frameTag, previousClip } from '../../shared/types';
import { requestClipPrompt } from '../lib/api';
import { saveProject } from '../lib/store';
import { getImage, putImage } from '../lib/images';
import { Slot } from './ImageSlot';
import { Button, CopyBlock, ErrorNote, Tag, Warnings, inputCls, useImage } from './ui';
import { Difficulty } from './ClipView';

export default function PromptStep({ project, onNext }: { project: Project; onNext: () => void }) {
  const scenes = project.outline!.scenes.filter((s) => project.shots?.[s.id]);
  const [sceneId, setSceneId] = useState(scenes[0]?.id || '');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  if (!scenes.length) return <p className="text-mute">Chưa có shot list. Làm bước 4 trước.</p>;
  const clips = project.shots?.[sceneId]?.clips || [];

  // Biên dịch tuần tự; luôn đọc dự án mới nhất sau mỗi lần lưu để không ghi đè kết quả trước
  let latest = project;
  const compile = async (clip: Clip, feedback = '') => {
    const r = await requestClipPrompt(latest, clip, feedback);
    latest = saveProject({ ...latest, prompts: { ...(latest.prompts || {}), [clip.id]: r.prompt } });
  };
  const run = async (list: Clip[], label: string, feedback = '') => {
    latest = project;
    setBusy(label);
    setError('');
    try {
      for (const c of list) await compile(c, feedback);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };
  const pending = clips.filter((c) => !project.prompts?.[c.id] || project.prompts[c.id].clipHash !== clipHash(c));
  const total = allClips(project).length;
  const built = allClips(project).filter((c) => project.prompts?.[c.id]).length;

  return (
    <div className="max-w-4xl">
      <p className="mb-4 prose-block">
        Mỗi clip biên dịch thành prompt cho Gemini Omni Flash trong Flow. App tự ghép phần cố định (style, bối cảnh, tham chiếu, số shot, âm thanh); AI chỉ viết thân từng shot. Đã biên dịch {built}/{total} clip.
      </p>
      <nav aria-label="Scene" className="flex flex-wrap gap-2 mb-4">
        {scenes.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSceneId(s.id)}
            className={`px-3 py-1.5 rounded-md border text-sm ${s.id === sceneId ? 'border-ink bg-ink text-white' : 'border-line bg-card hover:border-ink'}`}
          >
            {s.id}
          </button>
        ))}
      </nav>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Button kind="primary" onClick={() => run(pending, 'all')} busy={busy === 'all'} disabled={!!busy || !pending.length}>
          {pending.length ? `Biên dịch ${pending.length} clip chưa có hoặc đã cũ` : 'Mọi clip của scene đã biên dịch'}
        </Button>
      </div>
      <ErrorNote message={error} onClose={() => setError('')} />

      <div className="space-y-8 mt-4 mb-16">
        {clips.map((c) => (
          <ClipPromptCard key={c.id} project={project} clip={c} busy={busy === c.id} disabled={!!busy} onCompile={(fb) => run([c], c.id, fb)} />
        ))}
        <div className="border-t border-line pt-6">
          <Button kind="primary" onClick={onNext}>Sang bước Duyệt và sửa</Button>
        </div>
      </div>
    </div>
  );
}

function ClipPromptCard({ project, clip: c, busy, disabled, onCompile }: { project: Project; clip: Clip; busy: boolean; disabled: boolean; onCompile: (fb: string) => Promise<void> }) {
  const [feedback, setFeedback] = useState('');
  const [compiling, setCompiling] = useState(false);
  const p = project.prompts?.[c.id];
  const stale = p && p.clipHash !== clipHash(c);
  const prev = previousClip(project, c.id);
  const prevLast = prev ? project.images[frameTag(prev.id, 'cuoi')] : undefined;
  const firstTag = frameTag(c.id, 'dau');

  const compile = async () => {
    setCompiling(true);
    try {
      await onCompile(feedback);
      setFeedback('');
    } finally {
      setCompiling(false);
    }
  };

  return (
    <article className="bg-card border border-line rounded-md">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 border-b border-line">
        <h3 className="font-bold text-lg">{c.id}</h3>
        <span className="text-sm">{c.seconds} giây, {FLOW_MODE_LABEL[c.mode]}</span>
        <Difficulty n={c.difficulty} />
        <span className={`text-sm ${!p ? 'text-mute' : stale ? 'text-bad font-semibold' : 'text-good'}`}>
          {!p ? 'Chưa biên dịch' : stale ? 'Shot list đã sửa sau khi biên dịch' : 'Đã biên dịch'}
        </span>
      </header>
      <div className="p-4 space-y-4">
        <p className="text-sm">{c.change}</p>
        <div className="flex flex-wrap gap-3 items-end">
          <input className={`${inputCls} flex-1 min-w-60 text-sm`} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Góp ý cho lần biên dịch (không bắt buộc)" />
          <Button onClick={compile} busy={busy || compiling} disabled={disabled}>{p ? 'Biên dịch lại' : 'Biên dịch'}</Button>
        </div>

        {p && (
          <>
            <Warnings items={p.warnings} />
            {p.added.length > 0 && <Warnings title="AI đã thêm chi tiết không có trong shot list" items={p.added} />}

            <div>
              <p className="font-semibold mb-2">Ảnh cần nạp trong Flow ({c.mode === 'nguyen-lieu' ? 'Ingredients to video' : 'Frames to video'})</p>
              {c.mode === 'nguyen-lieu' ? (
                <div className="flex flex-wrap gap-3">
                  {p.load.map((t) => <RefThumb key={t} project={project} tag={t} />)}
                </div>
              ) : (
                <div className="space-y-4">
                  <FrameRow
                    project={project}
                    label="Khung đầu"
                    tag={firstTag}
                    prompt={p.firstFrame}
                    hint={`Tạo ở Nano Banana, nạp các ảnh: ${(p.frameRefs?.first || c.assets).map((t) => '@' + t).join(', ')}.`}
                    extra={
                      prev && prevLast && !project.images[firstTag] ? (
                        <Button
                          small
                          onClick={async () => {
                            const url = await getImage(prevLast);
                            if (url) saveProject({ ...project, images: { ...project.images, [firstTag]: await putImage(url) } });
                          }}
                        >
                          Dùng khung cuối của {prev.id}
                        </Button>
                      ) : null
                    }
                  />
                  {c.mode === 'khung-dau-cuoi' && (
                    <FrameRow project={project} label="Khung cuối" tag={frameTag(c.id, 'cuoi')} prompt={p.lastFrame} hint={`Tạo từ ảnh khung đầu (nạp làm tham chiếu) để giữ đúng bố cục, kèm các ảnh: ${(p.frameRefs?.last || []).map((t) => '@' + t).join(', ')}.`} />
                  )}
                </div>
              )}
            </div>

            <CopyBlock label={`Prompt video — Gemini Omni Flash, chế độ ${FLOW_MODE_LABEL[c.mode]}`} text={p.video} />
          </>
        )}
      </div>
    </article>
  );
}

function FrameRow(props: { project: Project; label: string; tag: string; prompt: string; hint: string; extra?: ReactNode }) {
  return (
    <div className="grid md:grid-cols-[1fr_11rem] gap-4 items-start">
      <div className="min-w-0 space-y-2">
        <p className="text-sm font-semibold">{props.label} <Tag tag={props.tag} /></p>
        {props.prompt ? <CopyBlock label={`Prompt ảnh ${props.label.toLowerCase()}`} text={props.prompt} hint={props.hint} /> : <p className="text-sm text-bad">Chưa có prompt — biên dịch lại.</p>}
      </div>
      <div className="space-y-2">
        <Slot compact project={props.project} slot={{ tag: props.tag, kind: 'frame', label: props.label, desc: '', note: '' }} />
        {props.extra}
      </div>
    </div>
  );
}

/** Ảnh nhỏ của một tài sản cần nạp; đỏ nếu chưa có ảnh */
function RefThumb({ project, tag }: { project: Project; tag: string }) {
  const url = useImage(project.images[tag]);
  return (
    <figure className="w-24 text-center">
      <div className={`w-24 h-24 rounded-md overflow-hidden grid place-items-center ${url ? 'bg-paper border border-line' : 'border-2 border-dashed border-bad text-bad text-xs p-1'}`}>
        {url ? <img src={url} alt={`@${tag}`} className="w-full h-full object-contain" /> : 'Chưa có ảnh'}
      </div>
      <figcaption className="mt-1"><Tag tag={tag} /></figcaption>
    </figure>
  );
}
