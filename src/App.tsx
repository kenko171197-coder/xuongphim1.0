import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { Project, ScriptType } from '../shared/types';
import { LENGTH_LABEL, allClips, imageSlots } from '../shared/types';
import { getKnowledge, type KnowledgeInfo } from './lib/api';
import { hasAnyKey, onKeysChange } from './lib/apiKeys';
import { deleteProject, useProjects } from './lib/store';
import { deleteImage } from './lib/images';
import { getLastCall, onUsageChange } from './lib/usage';
import { modelInfo } from '../shared/models';
import IdeaStudio from './components/IdeaStudio';
import OutlineStep from './components/OutlineStep';
import AssetsStep from './components/AssetsStep';
import Settings from './components/Settings';
import ShotListStep, { type KnowledgeBits } from './components/ShotListStep';
import PromptStep from './components/PromptStep';
import ReviewStep from './components/ReviewStep';
import { Button, ErrorNote, Tag } from './components/ui';

type View = { kind: 'ideas' } | { kind: 'settings' } | { kind: 'project'; id: string };

const STEPS = [
  { n: 1, name: 'Ý tưởng', ready: true },
  { n: 2, name: 'Outline', ready: true },
  { n: 3, name: 'Tài sản', ready: true },
  { n: 4, name: 'Shot list', ready: true },
  { n: 5, name: 'Prompt', ready: true },
  { n: 6, name: 'Duyệt và sửa', ready: true },
];

export default function App() {
  const projects = useProjects();
  const [view, setView] = useState<View>({ kind: 'ideas' });
  const [knowledge, setKnowledge] = useState<KnowledgeInfo>();
  const [kError, setKError] = useState('');
  const [hasKey, setHasKey] = useState(hasAnyKey());

  const loadKnowledge = useCallback(() => {
    getKnowledge().then((k) => { setKnowledge(k); setKError(''); }).catch((e) => setKError(e.message));
  }, []);
  useEffect(loadKnowledge, [loadKnowledge]);
  useEffect(() => onKeysChange(() => setHasKey(hasAnyKey())), []);

  const project = view.kind === 'project' ? projects.find((p) => p.id === view.id) : undefined;
  const types = knowledge?.scriptTypes || [];

  return (
    <div className="min-h-full md:grid md:grid-cols-[15rem_1fr]">
      <aside className="bg-ink text-white md:min-h-screen md:sticky md:top-0 md:h-screen md:overflow-auto px-4 py-5 flex md:flex-col gap-4 overflow-x-auto">
        <div className="shrink-0">
          <p className="text-lg font-bold leading-tight">Xưởng phim 2</p>
          <p className="text-xs text-white/60">Ý tưởng tới prompt cho Flow</p>
        </div>
        <nav className="flex md:flex-col gap-1 shrink-0">
          <NavItem active={view.kind === 'ideas'} onClick={() => setView({ kind: 'ideas' })}>Ý tưởng</NavItem>
          <NavItem active={view.kind === 'settings'} onClick={() => setView({ kind: 'settings' })}>
            Cài đặt{!hasKey && <span className="ml-2 text-tape">cần key</span>}
          </NavItem>
        </nav>
        <div className="md:mt-4 min-w-48">
          <p className="text-xs text-white/60 mb-1 px-2">Dự án ({projects.length})</p>
          <div className="flex md:flex-col gap-1">
            {projects.map((p) => (
              <NavItem key={p.id} active={view.kind === 'project' && view.id === p.id} onClick={() => setView({ kind: 'project', id: p.id })}>
                <span className="block truncate">{p.title}</span>
              </NavItem>
            ))}
            {!projects.length && <p className="text-sm text-white/50 px-2">Chưa có. Tạo từ một thẻ ý tưởng.</p>}
          </div>
        </div>
        <LastCallNote />
      </aside>

      <main className="px-5 md:px-10 py-8 min-w-0">
        {!hasKey && view.kind !== 'settings' && (
          <div className="mb-6">
            <ErrorNote message="Chưa có API key Gemini. Vào Cài đặt để thêm key trước khi tạo ý tưởng." />
          </div>
        )}
        {kError && <div className="mb-6"><ErrorNote message={kError} /></div>}
        {knowledge && knowledge.status.errors.length > 0 && view.kind !== 'settings' && (
          <div className="mb-6">
            <ErrorNote message={`Kho kiến thức có ${knowledge.status.errors.length} lỗi. Xem chi tiết ở Cài đặt.`} />
          </div>
        )}

        {view.kind === 'ideas' && (knowledge ? <IdeaStudio types={types} onOpenProject={(id) => setView({ kind: 'project', id })} /> : <p className="text-mute">Đang đọc kho kiến thức…</p>)}
        {view.kind === 'settings' && <Settings knowledge={knowledge} reloadKnowledge={loadKnowledge} />}
        {view.kind === 'project' &&
          (project ? (
            <ProjectView
              key={project.id}
              project={project}
              type={types.find((t) => t.id === project.settings.scriptType)}
              kb={{ modules: (knowledge?.status.modules || []).map((m) => ({ id: m.id, name: m.name })), limits: knowledge?.limits || { min: 3, max: 10, maxRefs: 10 } }}
              onDeleted={() => setView({ kind: 'ideas' })}
            />
          ) : (
            <p className="text-mute">Không tìm thấy dự án.</p>
          ))}
      </main>
    </div>
  );
}

function LastCallNote() {
  const [call, setCall] = useState(getLastCall());
  useEffect(() => onUsageChange(() => setCall(getLastCall())), []);
  if (!call?.runs.length) return null;
  return (
    <p className="md:mt-auto text-xs text-white/70 shrink-0 min-w-40" aria-live="polite">
      Lần gọi vừa rồi chạy bằng{' '}
      {call.runs.map((r, i) => (
        <span key={i}>
          {i > 0 && ', '}
          {modelInfo(r.model)?.name || r.model}, <span className={r.tier === 'free' ? 'text-tape' : 'text-white'}>{r.tier === 'free' ? 'key miễn phí' : 'key trả phí'}</span>
        </span>
      ))}
    </p>
  );
}

function NavItem({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left px-2 py-1.5 rounded text-sm whitespace-nowrap md:whitespace-normal ${active ? 'bg-tape text-ink font-semibold' : 'hover:bg-white/10'}`}
    >
      {children}
    </button>
  );
}

function ProjectView({ project, type, kb, onDeleted }: { project: Project; type?: ScriptType; kb: KnowledgeBits; onDeleted: () => void }) {
  const clips = allClips(project);
  const [step, setStep] = useState(clips.length ? (clips.every((c) => project.prompts?.[c.id]) ? 6 : 4) : project.assets ? 3 : 2);
  const done: Record<number, boolean> = {
    1: true,
    2: !!project.outline,
    3: !!project.assets,
    4: !!project.outline && project.outline.scenes.every((s) => project.shots?.[s.id]),
    5: clips.length > 0 && clips.every((c) => project.prompts?.[c.id]),
    6: clips.length > 0 && clips.every((c) => project.status?.[c.id] === 'dat'),
  };
  const canOpen: Record<number, boolean> = { 1: true, 2: true, 3: !!project.outline, 4: !!project.assets, 5: clips.length > 0, 6: clips.length > 0 };
  const slots = imageSlots(project.assets);
  const withImage = slots.filter((s) => project.images[s.tag]).length;

  const remove = async () => {
    if (!confirm(`Xoá dự án "${project.title}" và mọi ảnh đã nạp? Không hoàn tác được.`)) return;
    await Promise.all(Object.values(project.images).map((id) => deleteImage(id).catch(() => undefined)));
    deleteProject(project.id);
    onDeleted();
  };

  return (
    <div>
      <header className="mb-6">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="text-3xl font-bold flex-1">{project.title}</h1>
          <Button small kind="danger" onClick={remove}>Xoá dự án</Button>
        </div>
        <p className="text-mute">
          {type?.name || project.settings.scriptType}, {LENGTH_LABEL[project.settings.length]}, {project.settings.aspect}
          {project.assets ? `, ảnh tài sản ${withImage}/${slots.length}` : ''}
          {clips.length ? `, ${clips.length} clip (${clips.reduce((t, c) => t + c.seconds, 0)} giây), đạt ${clips.filter((c) => project.status?.[c.id] === 'dat').length}` : ''}
        </p>
      </header>

      <ol className="flex flex-wrap gap-1 mb-8 border-b border-line" aria-label="Các bước">
        {STEPS.map((s) => {
          const current = step === s.n;
          const available = s.ready && canOpen[s.n];
          return (
            <li key={s.n}>
              <button
                type="button"
                disabled={!available}
                onClick={() => setStep(s.n)}
                aria-current={current ? 'step' : undefined}
                title={!available ? 'Cần làm bước trước' : undefined}
                className={`px-3 py-2 text-sm -mb-px border-b-2 ${current ? 'border-ink font-semibold' : 'border-transparent'} ${available ? 'hover:border-line' : 'text-mute/60 cursor-not-allowed'}`}
              >
                <span className={`inline-block w-5 h-5 mr-1.5 text-xs leading-5 text-center rounded-full ${done[s.n] ? 'bg-tape text-ink' : 'border border-line'}`}>{s.n}</span>
                {s.name}
              </button>
            </li>
          );
        })}
      </ol>

      {step === 1 && <IdeaSummary project={project} typeName={type?.name} onNext={() => setStep(2)} />}
      {step === 2 && <OutlineStep project={project} onNext={() => setStep(3)} />}
      {step === 3 && <AssetsStep project={project} type={type} onNext={() => setStep(4)} />}
      {step === 4 && <ShotListStep project={project} kb={kb} onNext={() => setStep(5)} />}
      {step === 5 && <PromptStep project={project} onNext={() => setStep(6)} />}
      {step === 6 && <ReviewStep project={project} />}
    </div>
  );
}

function IdeaSummary({ project, typeName, onNext }: { project: Project; typeName?: string; onNext: () => void }) {
  const i = project.idea;
  return (
    <div className="max-w-3xl space-y-3">
      <p className="text-lg prose-block">{i.logline}</p>
      <dl className="grid sm:grid-cols-3 gap-3 text-sm">
        <div><dt className="font-semibold">Móc</dt><dd>{i.hook}</dd></div>
        <div><dt className="font-semibold">Lật</dt><dd>{i.turn}</dd></div>
        <div><dt className="font-semibold">Chốt</dt><dd>{i.ending}</dd></div>
      </dl>
      <p className="text-sm"><span className="font-semibold">Thể loại:</span> {typeName || i.scriptType}, công thức "{i.formula}"</p>
      <p className="text-sm"><span className="font-semibold">Nhân vật dự kiến:</span> {i.characters.join('; ')}</p>
      <p className="text-sm"><span className="font-semibold">Bối cảnh dự kiến:</span> {i.locations.join('; ')}</p>
      <p className="text-sm"><span className="font-semibold">Khó quay nhất:</span> {i.productionRisk}</p>
      <p className="text-sm text-mute">Muốn đổi ý tưởng thì tạo dự án mới từ một thẻ khác ở mục Ý tưởng.</p>
      {project.outline && (
        <p className="text-sm">Outline đã có {project.outline.characters.length} nhân vật: {project.outline.characters.map((c) => <Tag key={c.tag} tag={c.tag} />)}</p>
      )}
      <div className="pt-4"><Button kind="primary" onClick={onNext}>Sang bước Outline</Button></div>
    </div>
  );
}
