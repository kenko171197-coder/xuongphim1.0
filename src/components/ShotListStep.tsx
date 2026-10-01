import { useState } from 'react';
import type { Clip, Project, SceneShots } from '../../shared/types';
import { FLOW_MODE_LABEL, imageSlots } from '../../shared/types';
import { requestShots } from '../lib/api';
import { saveProject } from '../lib/store';
import { ClipEditor, ClipView, Difficulty } from './ClipView';
import { Button, ErrorNote, Field, SectionTitle, Tag, TagText, Warnings, inputCls } from './ui';

export interface KnowledgeBits {
  modules: { id: string; name: string }[];
  limits: { min: number; max: number; maxRefs: number };
}

export default function ShotListStep({ project, kb, onNext }: { project: Project; kb: KnowledgeBits; onNext: () => void }) {
  const o = project.outline!;
  const firstMissing = o.scenes.find((s) => !project.shots?.[s.id])?.id;
  const [sceneId, setSceneId] = useState(firstMissing || o.scenes[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [editing, setEditing] = useState('');

  const scene = o.scenes.find((s) => s.id === sceneId)!;
  const data = project.shots?.[sceneId];
  const sceneIdx = o.scenes.findIndex((s) => s.id === sceneId);
  const prevMissing = sceneIdx > 0 && !project.shots?.[o.scenes[sceneIdx - 1].id];
  const moduleNames = Object.fromEntries(kb.modules.map((m) => [m.id, m.name]));
  const location = project.assets?.locations.find((l) => l.tag === scene.location);
  const noImage = imageSlots(project.assets).filter((s) => !project.images[s.tag]).map((s) => s.tag);

  const write = async (fb: string, previous?: SceneShots) => {
    setBusy(true);
    setError('');
    try {
      const r = await requestShots(project, sceneId, fb, previous);
      saveProject({
        ...project,
        shots: { ...(project.shots || {}), [sceneId]: r.shots },
        shotsPrev: data ? { ...(project.shotsPrev || {}), [sceneId]: data } : project.shotsPrev,
      });
      setFeedback('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveClip = (clip: Clip) => {
    if (!data) return;
    saveProject({ ...project, shots: { ...project.shots, [sceneId]: { ...data, clips: data.clips.map((c) => (c.id === clip.id ? clip : c)) } } });
    setEditing('');
  };

  const undo = () => {
    const prev = project.shotsPrev?.[sceneId];
    if (!prev) return;
    const rest = { ...(project.shotsPrev || {}) };
    delete rest[sceneId];
    saveProject({ ...project, shots: { ...project.shots, [sceneId]: prev }, shotsPrev: rest });
  };

  const order = data ? [...data.clips].sort((a, b) => b.difficulty - a.difficulty) : [];

  return (
    <div className="max-w-4xl">
      <nav aria-label="Scene" className="flex flex-wrap gap-2 mb-6">
        {o.scenes.map((s) => {
          const done = !!project.shots?.[s.id];
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => { setSceneId(s.id); setEditing(''); setError(''); }}
              className={`px-3 py-1.5 rounded-md border text-sm ${s.id === sceneId ? 'border-ink bg-ink text-white' : 'border-line bg-card hover:border-ink'}`}
            >
              {s.id}{' '}
              <span className={s.id === sceneId ? 'text-tape' : done ? 'text-good' : 'text-mute'}>
                {done ? `${project.shots![s.id].clips.length} clip` : 'chưa có'}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="bg-card border border-line rounded-md p-4 text-sm space-y-1">
        <p className="text-[15px] font-semibold">
          {scene.id}: <Tag tag={scene.location} /> {scene.timeOfDay}, {scene.role}, khoảng {scene.clips} clip
        </p>
        <p><span className="font-semibold">Mục đích:</span> <TagText text={scene.purpose} /></p>
        <p><span className="font-semibold">Chuyển biến:</span> <TagText text={scene.change} /></p>
        <p><span className="font-semibold">Trạng thái cuối:</span> <TagText text={scene.endState} /></p>
      </div>

      {noImage.length > 0 && (
        <div className="mt-4">
          <Warnings title="Tài sản chưa có ảnh" items={[`${noImage.map((t) => '@' + t).join(', ')} chưa có ảnh. Shot list vẫn viết được, nhưng cần ảnh trước khi chạy clip trong Flow.`]} />
        </div>
      )}

      {!data ? (
        <div className="mt-6 space-y-4">
          {prevMissing && (
            <Warnings title="Nên làm scene trước" items={[`Scene ${o.scenes[sceneIdx - 1].id} chưa có shot list, nên clip đầu của ${scene.id} sẽ nối theo outline thay vì theo clip thật.`]} />
          )}
          <Field label="Yêu cầu thêm (không bắt buộc)">
            <input className={inputCls} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="VD: cú bẫy sập dùng chế độ khung đầu + cuối" />
          </Field>
          <Button kind="primary" onClick={() => write(feedback)} busy={busy}>Viết shot list {scene.id}</Button>
          <ErrorNote message={error} onClose={() => setError('')} />
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-3">
            <Warnings items={data.warnings} />
            {data.missingAssets.length > 0 && <Warnings title="Tài sản còn thiếu" items={data.missingAssets} />}
          </div>

          <SectionTitle aside={<span className="text-sm text-mute">Tổng {data.clips.reduce((t, c) => t + c.seconds, 0)} giây</span>}>
            Clip của {scene.id}
          </SectionTitle>
          <p className="text-sm text-mute -mt-2 mb-4">
            Thứ tự nên chạy (khó trước, nếu clip khó nhất ổn thì phần còn lại thường ổn): {order.map((c) => c.id).join(', ')}.
          </p>
          <div className="space-y-6">
            {data.clips.map((c) => (
              <article key={c.id} className="bg-card border border-line rounded-md">
                <header className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 border-b border-line">
                  <h3 className="font-bold text-lg">{c.id}</h3>
                  <span className="text-sm">{c.seconds} giây, {FLOW_MODE_LABEL[c.mode]}</span>
                  <Difficulty n={c.difficulty} />
                  <span className="flex-1" />
                  {editing !== c.id && <Button small onClick={() => setEditing(c.id)}>Sửa</Button>}
                </header>
                <div className="p-4">
                  {editing === c.id ? (
                    <ClipEditor clip={c} location={location} modules={kb.modules} limits={kb.limits} onSave={saveClip} onCancel={() => setEditing('')} />
                  ) : (
                    <ClipView clip={c} moduleNames={moduleNames} />
                  )}
                </div>
              </article>
            ))}
          </div>

          <SectionTitle>Sửa shot list {scene.id}</SectionTitle>
          <Field label="Góp ý của bạn" hint="Sửa nhỏ thì bấm Sửa trên từng clip. Góp ý dùng cho thay đổi lớn: tách, gộp, đổi chế độ nhiều clip.">
            <textarea className={`${inputCls} min-h-20`} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="VD: tách C02 thành hai clip, clip sau dùng khung đầu" />
          </Field>
          <div className="flex flex-wrap gap-3 mt-3 mb-4">
            <Button kind="primary" onClick={() => write(feedback, data)} busy={busy} disabled={feedback.trim().length < 5}>Sửa theo góp ý</Button>
            {project.shotsPrev?.[sceneId] && <Button onClick={undo} disabled={busy}>Hoàn tác lần sửa trước</Button>}
            <Button kind="quiet" onClick={() => confirm(`Viết lại shot list ${scene.id} từ đầu?`) && write('')} disabled={busy}>Viết lại từ đầu</Button>
          </div>
          <ErrorNote message={error} onClose={() => setError('')} />
          <div className="border-t border-line pt-6 mt-8 mb-16 flex flex-wrap gap-3">
            {firstMissing && firstMissing !== sceneId && (
              <Button onClick={() => { setSceneId(firstMissing); setFeedback(''); }}>Sang scene {firstMissing}</Button>
            )}
            <Button kind="primary" onClick={onNext}>Sang bước Prompt</Button>
          </div>
        </>
      )}
    </div>
  );
}
