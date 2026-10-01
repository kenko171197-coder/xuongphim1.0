import React, { useState } from 'react';
import { Compass, HelpCircle, RefreshCw, ArrowRight, Trash2 } from 'lucide-react';
import type { Direction, Project, ProjectPatch, DeepQuestion } from '../../types';
import { askDirections, askQuestions } from '../../services/api';
import { ErrorBox, RunButton } from '../ui';

interface Props {
  project: Project;
  onUpdate: (patch: ProjectPatch) => void;
  onNext: () => void;
}

function DirectionCard({ d, chosen, onChoose }: { d: Direction; chosen: boolean; onChoose: () => void }) {
  return (
    <article
      className={`bg-white border rounded-2xl p-5 flex flex-col gap-3 ${
        chosen ? 'border-primary-400 ring-2 ring-primary-400' : 'border-gray-200'
      }`}
    >
      <header className="flex items-start gap-3">
        <span className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold ${chosen ? 'bg-black text-primary-400' : 'bg-primary-400 text-black'}`}>
          {d.key}
        </span>
        <div>
          <h3 className="text-lg font-bold text-black">{d.name}</h3>
          <p className="text-sm text-gray-600">{d.core}</p>
        </div>
      </header>

      <div className="bg-primary-50 border border-primary-100 rounded-xl p-3 text-sm space-y-1">
        <p className="font-bold text-primary-800">{d.frame}</p>
        <p><span className="font-bold">Móc:</span> {d.hook}</p>
        <p><span className="font-bold">Lật:</span> {d.turn}</p>
        <p><span className="font-bold">Chốt:</span> {d.ending}</p>
      </div>

      <dl className="text-sm space-y-1.5 text-gray-700">
        <div><dt className="inline font-bold text-black">Cấu trúc: </dt><dd className="inline">{d.structure} — {d.why}</dd></div>
        <div><dt className="inline font-bold text-black">Cảm giác: </dt><dd className="inline">{d.feeling}</dd></div>
        <div><dt className="inline font-bold text-black">Hợp với: </dt><dd className="inline">{d.fitsFor}</dd></div>
      </dl>

      <p className="text-sm text-gray-700 border-l-4 border-red-200 pl-3">
        <span className="font-bold text-black">Rủi ro Veo: </span>
        {d.veoRisk}
      </p>

      <button
        onClick={onChoose}
        className={`mt-auto py-2.5 rounded-xl text-sm font-bold transition-colors ${
          chosen ? 'bg-black text-primary-400' : 'bg-primary-400 hover:bg-primary-300 text-black'
        }`}
      >
        {chosen ? 'Đang chọn hướng này' : `Chọn hướng ${d.key}`}
      </button>
    </article>
  );
}

function QuestionBlock({ q, onAnswer }: { q: DeepQuestion; onAnswer: (a: string) => void }) {
  const custom = q.answer && !q.options.includes(q.answer) ? q.answer : '';
  return (
    <fieldset className="space-y-2">
      <legend className="font-bold text-black text-sm mb-1">{q.question}</legend>
      <div className="flex flex-wrap gap-2">
        {q.options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onAnswer(q.answer === o ? '' : o)}
            aria-pressed={q.answer === o}
            className={`px-3 py-2 rounded-xl text-sm border text-left transition-colors ${
              q.answer === o ? 'bg-primary-400 border-primary-400 text-black' : 'bg-gray-50 border-gray-200 text-gray-700 hover:text-black'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
      <input
        value={custom}
        onChange={(e) => onAnswer(e.target.value)}
        placeholder="Hoặc tự trả lời…"
        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
      />
    </fieldset>
  );
}

export default function DirectionStep({ project, onUpdate, onNext }: Props) {
  const [busy, setBusy] = useState<'' | 'q' | 'd'>('');
  const [error, setError] = useState('');
  const [showQuestions, setShowQuestions] = useState(!!project.questions?.length);
  const [note, setNote] = useState(project.directionNote || '');

  const directions = project.directions || [];
  const questions = project.questions || [];
  const scriptDirection = project.script ? project.chosenDirection : undefined;

  const loadQuestions = async () => {
    setBusy('q');
    setError('');
    try {
      onUpdate({ questions: await askQuestions(project) });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const loadDirections = async () => {
    setBusy('d');
    setError('');
    try {
      const result = await askDirections(project, note.trim());
      onUpdate({ directions: result, directionNote: note.trim(), chosenDirection: undefined });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const answer = (i: number, a: string) => {
    const next = questions.map((q, j) => (j === i ? { ...q, answer: a } : q));
    onUpdate({ questions: next });
  };

  const answered = questions.filter((q) => q.answer).length;

  return (
    <div className="space-y-8">
      {/* ---------- Câu hỏi đào sâu (tuỳ chọn) ---------- */}
      <section className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-black flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary-600" />
              Hỏi thêm để đào sâu
              <span className="text-xs font-normal text-gray-500">(tuỳ chọn)</span>
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Câu trả lời được gửi kèm khi đưa hướng và khi viết kịch bản.
              {answered > 0 && ` Đã trả lời ${answered}/${questions.length}.`}
            </p>
          </div>
          {!showQuestions ? (
            <button
              onClick={() => {
                setShowQuestions(true);
                if (!questions.length) loadQuestions();
              }}
              className="px-4 py-2 rounded-full text-sm font-bold bg-primary-400/15 hover:bg-primary-400/30 text-black"
            >
              Hỏi thêm
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={loadQuestions}
                disabled={!!busy}
                className="px-3 py-2 rounded-full text-sm font-medium bg-gray-100 hover:bg-primary-100 flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${busy === 'q' ? 'animate-spin' : ''}`} />
                Câu khác
              </button>
              <button
                onClick={() => {
                  onUpdate({ questions: [] });
                  setShowQuestions(false);
                }}
                className="px-3 py-2 rounded-full text-sm font-medium text-gray-500 hover:text-red-600 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Bỏ
              </button>
            </div>
          )}
        </div>

        {showQuestions && (
          <div className="mt-5 space-y-5">
            {busy === 'q' && !questions.length && <p className="text-sm text-gray-500">Đang nghĩ câu hỏi theo module…</p>}
            {questions.map((q, i) => (
              <QuestionBlock key={`${q.question}-${i}`} q={q} onAnswer={(a) => answer(i, a)} />
            ))}
          </div>
        )}
      </section>

      {/* ---------- Ba hướng ---------- */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <label htmlFor="dnote" className="block text-sm font-medium text-gray-700 mb-2">
              Ghi chú cho lần đưa hướng <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
            </label>
            <input
              id="dnote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: muốn một hướng kết buồn, bỏ hướng có chó"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <RunButton onClick={loadDirections} busy={busy === 'd'} busyLabel="Đang nghĩ 3 hướng…" icon={Compass} disabled={!!busy}>
            {directions.length ? 'Xem 3 hướng khác' : 'Đưa 3 hướng khai thác'}
          </RunButton>
        </div>

        <ErrorBox message={error} />

        {busy === 'd' ? (
          <div className="grid lg:grid-cols-3 gap-4" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-96 rounded-2xl bg-primary-50 border border-primary-100 animate-pulse" />
            ))}
          </div>
        ) : directions.length > 0 ? (
          <>
            <div className="grid lg:grid-cols-3 gap-4">
              {directions.map((d) => (
                <DirectionCard key={d.key} d={d} chosen={project.chosenDirection === d.key} onChoose={() => onUpdate({ chosenDirection: d.key })} />
              ))}
            </div>
            {project.chosenDirection && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3">
                {scriptDirection && (
                  <p className="text-sm text-gray-500">Kịch bản hiện có được viết theo hướng đã chọn. Đổi hướng thì nhớ viết lại kịch bản.</p>
                )}
                <button
                  onClick={onNext}
                  className="py-3 px-6 rounded-xl bg-black hover:bg-gray-800 text-primary-400 font-bold flex items-center justify-center gap-2"
                >
                  Sang viết kịch bản theo hướng {project.chosenDirection}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-500">
            Bấm "Đưa 3 hướng khai thác". Mỗi hướng có khung truyện và rủi ro Veo lấy từ module của dự án.
          </div>
        )}
      </section>
    </div>
  );
}
