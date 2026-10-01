import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, FolderOpen, Trash2, Check, Lock, FileDown, Loader2 } from 'lucide-react';
import type { Project, ProjectPatch, ProjectStage } from '../types';
import { exportProjectPdf } from '../lib/exportPdf';
import { ProjectUsageBadge } from './UsagePanel';
import { moduleInfo, lengthLabel } from '../lib/modules';
import { buildBrief } from '../lib/store';
import IdeaCard from './IdeaCard';
import BriefPanel from './BriefPanel';
import DirectionStep from './project/DirectionStep';
import ScriptStep from './project/ScriptStep';
import DesignStep from './project/DesignStep';
import BeatStep from './project/BeatStep';

interface Props {
  projects: Project[];
  openId: string | null;
  onOpen: (id: string | null) => void;
  onUpdate: (id: string, patch: ProjectPatch) => void;
  onDelete: (id: string) => void;
  onGoIdeas: () => void;
}

const STEPS: { key: ProjectStage; label: string; phase: number }[] = [
  { key: 'y-tuong', label: 'Ý tưởng', phase: 1 },
  { key: 'huong', label: 'Hướng (tuỳ chọn)', phase: 2 },
  { key: 'kich-ban', label: 'Đề cương & kịch bản', phase: 2 },
  { key: 'nhan-vat', label: 'Nhân vật & đạo cụ', phase: 2 },
  { key: 'tung-beat', label: 'Từng beat → prompt Veo', phase: 3 },
];

const stageIndex = (s: ProjectStage) => Math.max(0, STEPS.findIndex((x) => x.key === s));

const formatDate = (t: number) =>
  new Date(t).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Bước nào mở được: phải có dữ liệu của bước trước. */
function canOpen(p: Project, i: number): boolean {
  if (i <= 1) return true;
  if (i === 2) return !!p.chosenDirection;
  if (i === 3) return !!p.script;
  return !!p.script?.beats.length && !!p.design; // Bước 3 của LÕI cần ảnh từ Bước 2 và beat đã viết
}

function Workspace({
  project,
  onUpdate,
  onDelete,
  onBack,
}: {
  project: Project;
  onUpdate: (patch: ProjectPatch) => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const [active, setActive] = useState(() => stageIndex(project.stage));
  const [currentBeat, setCurrentBeat] = useState('');
  const [exporting, setExporting] = useState(false);

  const exportPdf = async () => {
    setExporting(true);
    try {
      await exportProjectPdf(project);
    } catch (e: any) {
      alert(e?.message || 'Không xuất được PDF.');
    } finally {
      setExporting(false);
    }
  };

  const goTo = (i: number) => {
    if (stageIndex(project.stage) < i) onUpdate({ stage: STEPS[i].key });
    setActive(i);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black">
          <ArrowLeft className="w-4 h-4" />
          Tất cả dự án
        </button>
        <button
          onClick={exportPdf}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-gray-100 hover:bg-primary-100 disabled:opacity-50"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
          Xuất PDF
        </button>
      </div>

      <div>
        <label htmlFor="ptitle" className="sr-only">Tên dự án</label>
        <input
          id="ptitle"
          value={project.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="w-full text-2xl sm:text-3xl font-bold text-black bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-primary-400 focus:outline-none py-1"
        />
        <p className="text-sm text-gray-500 mt-1">
          {project.settings.scriptTypeName ? `${project.settings.scriptTypeName} · ` : ''}
          {project.settings.module} · {moduleInfo(project.settings.module)?.name}
          {project.settings.secondary ? ` + ${project.settings.secondary}` : ''} · {project.settings.aspect} · {lengthLabel(project.settings.length)} · tạo ngày{' '}
          {formatDate(project.createdAt)}
        </p>
        <div className="mt-1">
          <ProjectUsageBadge projectId={project.id} />
        </div>
      </div>

      <nav aria-label="Các bước của dự án">
        <ol className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {STEPS.map((s, i) => {
            const open = canOpen(project, i);
            const done = i === 0 || i < stageIndex(project.stage);
            const current = i === active;
            return (
              <li key={s.key} className={i === 4 ? 'col-span-2 sm:col-span-1' : ''}>
                <button
                  onClick={() => open && goTo(i)}
                  disabled={!open}
                  aria-current={current ? 'step' : undefined}
                  className={`w-full h-full text-left rounded-xl px-3 py-2.5 text-sm border transition-colors ${
                    current
                      ? 'bg-black border-black text-primary-400'
                      : done && open
                      ? 'bg-primary-400 border-primary-400 text-black hover:bg-primary-300'
                      : open
                      ? 'bg-white border-gray-200 text-black hover:border-primary-400'
                      : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-bold">
                    {!open ? <Lock className="w-3.5 h-3.5" /> : done && !current ? <Check className="w-4 h-4" /> : null}
                    {i + 1}. {s.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {active === 0 && (
        <div className="space-y-6">
          <IdeaCard idea={project.idea} badge={project.settings.module} />
          <div className="flex justify-end">
            <button onClick={() => goTo(1)} className="py-3 px-6 rounded-xl bg-black hover:bg-gray-800 text-primary-400 font-bold flex items-center gap-2">
              Sang hướng khai thác
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          <BriefPanel brief={buildBrief(project.idea, project.settings)} />
        </div>
      )}
      {active === 1 && <DirectionStep project={project} onUpdate={onUpdate} onNext={() => goTo(2)} />}
      {active === 2 && <ScriptStep project={project} onUpdate={onUpdate} onNext={() => goTo(3)} />}
      {active === 3 && <DesignStep project={project} onUpdate={onUpdate} onNext={() => goTo(4)} />}
      {active === 4 && (
        <BeatStep project={project} onUpdate={onUpdate} onGoScript={() => goTo(2)} selectedBeat={currentBeat} onSelectBeat={setCurrentBeat} />
      )}

      <div className="pt-6 border-t border-gray-100">
        <button
          onClick={() => {
            if (confirm(`Xoá dự án "${project.title}"? Không khôi phục được.`)) onDelete();
          }}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Xoá dự án
        </button>
      </div>
    </div>
  );
}

export default function Projects({ projects, openId, onOpen: setOpenId, onUpdate, onDelete, onGoIdeas }: Props) {
  const open = projects.find((p) => p.id === openId) || null;

  if (open) {
    return (
      <Workspace
        key={open.id}
        project={open}
        onUpdate={(patch) => onUpdate(open.id, patch)}
        onDelete={() => {
          onDelete(open.id);
          setOpenId(null);
        }}
        onBack={() => setOpenId(null)}
      />
    );
  }

  const sorted = [...projects].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-black">Dự án ({projects.length})</h2>
      {sorted.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
          <FolderOpen className="w-10 h-10 text-primary-500 mx-auto mb-3" />
          <p className="text-gray-600">Chưa có dự án. Chọn một thẻ ý tưởng rồi bấm "Lưu thành dự án".</p>
          <button onClick={onGoIdeas} className="mt-4 px-5 py-2.5 rounded-xl bg-primary-400 hover:bg-primary-300 text-black font-bold transition-colors">
            Sang Phòng Ý tưởng
          </button>
        </div>
      ) : (
        <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((p) => {
            const i = stageIndex(p.stage);
            return (
              <li key={p.id}>
                <button
                  onClick={() => setOpenId(p.id)}
                  className="w-full text-left bg-white border border-gray-200 hover:border-primary-400 rounded-2xl p-5 shadow-sm transition-colors"
                >
                  <span className="text-xs font-bold text-primary-700">
                    {p.settings.scriptTypeName || p.settings.module} · Bước {i + 1}/5: {STEPS[i].label}
                  </span>
                  <h3 className="text-lg font-bold text-black mt-1">{p.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{p.idea.logline}</p>
                  <p className="text-xs text-gray-400 mt-3">Sửa lần cuối {formatDate(p.updatedAt)}</p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
