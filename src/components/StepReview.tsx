import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Loader2, Wand2, EyeOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import type { Project, ProjectPatch, ReviewIssue } from '../types';
import { reviewBasis, reviewState, previousOf, PreviousIssue } from '../lib/review';
import { ErrorBox } from './ui';

interface Props {
  project: Project;
  onUpdate: (patch: ProjectPatch) => void;
  /** Khoá lưu kết quả (VD 'y-tuong', 'kich-ban:S3', 'beat:B05') */
  reviewKey: string;
  title: string;
  /** Mô tả ngắn: rà cái gì */
  hint?: string;
  /** Gọi AI rà soát */
  run: (previous: PreviousIssue[]) => Promise<{ issues: ReviewIssue[]; tongQuan: string }>;
  /** Sửa theo các lỗi đã chọn (gửi "cách sửa" cho tác vụ viết lại của bước). Không có → chỉ hiện cách sửa để chép. */
  fix?: (issues: ReviewIssue[]) => Promise<void>;
  /** Tên hiển thị của đích sửa */
  targetLabel?: (target: string) => string;
  compact?: boolean;
}

const MUC: Record<ReviewIssue['mucDo'], { label: string; cls: string }> = {
  cao: { label: 'Cao', cls: 'bg-red-600 text-white' },
  vua: { label: 'Vừa', cls: 'bg-primary-400 text-black' },
  thap: { label: 'Thấp', cls: 'bg-gray-200 text-gray-700' },
};

export default function StepReview({ project, onUpdate, reviewKey, title, hint, run, fix, targetLabel, compact }: Props) {
  const st = reviewState(project, reviewKey);
  const [busy, setBusy] = useState<'' | 'review' | 'fix'>('');
  const [error, setError] = useState('');
  const [picked, setPicked] = useState<string[]>([]);

  const save = (patchIssues: (list: ReviewIssue[]) => ReviewIssue[]) =>
    onUpdate((p) => {
      const cur = p.reviews?.[reviewKey];
      if (!cur) return {};
      return { reviews: { ...(p.reviews || {}), [reviewKey]: { ...cur, issues: patchIssues(cur.issues) } } };
    });

  const doReview = async () => {
    setBusy('review');
    setError('');
    try {
      const r = await run(previousOf(project, reviewKey));
      const basis = reviewBasis(project, reviewKey);
      onUpdate((p) => ({ reviews: { ...(p.reviews || {}), [reviewKey]: { issues: r.issues, tongQuan: r.tongQuan, at: Date.now(), basis } } }));
      setPicked(r.issues.filter((i) => i.mucDo === 'cao').map((i) => i.id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const doFix = async (issues: ReviewIssue[]) => {
    if (!fix || !issues.length) return;
    setBusy('fix');
    setError('');
    try {
      await fix(issues);
      const ids = new Set(issues.map((i) => i.id));
      save((list) => list.map((i) => (ids.has(i.id) ? { ...i, status: 'da-sua' } : i)));
      setPicked([]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const setStatus = (id: string, status?: ReviewIssue['status']) => save((list) => list.map((i) => (i.id === id ? { ...i, status } : i)));

  const issues = st.result?.issues || [];
  const headerTone = !st.result
    ? 'border-gray-300'
    : st.outdated
    ? 'border-primary-400'
    : st.openHigh.length
    ? 'border-red-400'
    : 'border-green-400';

  return (
    <section className={`bg-white border-2 ${headerTone} rounded-2xl ${compact ? 'p-4' : 'p-5'} space-y-3`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-bold text-black flex items-center gap-2">
            {st.openHigh.length ? <ShieldAlert className="w-5 h-5 text-red-600" /> : <ShieldCheck className="w-5 h-5 text-green-700" />}
            {title}
          </h4>
          <p className="text-sm text-gray-600 mt-0.5">
            {!st.result
              ? hint || 'Chưa rà soát. Nên rà trước khi sang bước sau.'
              : st.outdated
              ? 'Nội dung đã đổi sau lần rà trước — rà lại để chắc chắn.'
              : issues.length === 0
              ? `Không thấy lỗi. ${st.result.tongQuan}`
              : `${st.open.length} lỗi chưa xử lý (${st.openHigh.length} mức cao). ${st.result.tongQuan}`}
          </p>
        </div>
        <button
          onClick={doReview}
          disabled={!!busy}
          className="px-4 py-2 rounded-full text-sm font-bold bg-black text-primary-400 flex items-center gap-2 disabled:opacity-50"
        >
          {busy === 'review' ? <Loader2 className="w-4 h-4 animate-spin" /> : st.result ? <RefreshCw className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
          {busy === 'review' ? 'AI đang rà…' : st.result ? 'Rà soát lại' : 'AI rà soát'}
        </button>
      </div>

      <ErrorBox message={error} />

      {st.result && !st.outdated && issues.length > 0 && (
        <>
          <ul className="space-y-2">
            {issues.map((i) => {
              const done = !!i.status;
              return (
                <li key={i.id} className={`rounded-xl border p-3 text-sm ${done ? 'bg-gray-50 border-gray-200 opacity-60' : 'border-gray-200'}`}>
                  <div className="flex items-start gap-2">
                    {fix && !done && (
                      <input
                        type="checkbox"
                        checked={picked.includes(i.id)}
                        onChange={(e) => setPicked((p) => (e.target.checked ? [...p, i.id] : p.filter((x) => x !== i.id)))}
                        className="accent-black mt-1"
                        aria-label="Chọn để sửa"
                      />
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="flex flex-wrap items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${MUC[i.mucDo].cls}`}>{MUC[i.mucDo].label}</span>
                        <span className="text-xs font-bold text-gray-600">
                          {targetLabel ? targetLabel(i.target) : i.target}
                          {i.beat ? ` · ${i.beat}` : ''} · {i.loai}
                        </span>
                        {i.status === 'da-sua' && <span className="text-xs font-bold text-green-700 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> đã gửi sửa</span>}
                        {i.status === 'bo-qua' && <span className="text-xs font-bold text-gray-500">đã bỏ qua (chấp nhận rủi ro)</span>}
                      </p>
                      <p className="text-gray-800">{i.moTa}</p>
                      <p className="text-gray-600"><span className="font-bold">Cách sửa:</span> {i.cachSua}</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {!done && fix && (
                          <button onClick={() => doFix([i])} disabled={!!busy} className="px-3 py-1 rounded-full text-xs font-bold bg-black text-primary-400 flex items-center gap-1 disabled:opacity-50">
                            <Wand2 className="w-3.5 h-3.5" /> Sửa
                          </button>
                        )}
                        {!done ? (
                          <button onClick={() => setStatus(i.id, 'bo-qua')} disabled={!!busy} className="px-3 py-1 rounded-full text-xs font-bold bg-white border border-gray-200 flex items-center gap-1">
                            <EyeOff className="w-3.5 h-3.5" /> Bỏ qua
                          </button>
                        ) : (
                          <button onClick={() => setStatus(i.id, undefined)} disabled={!!busy} className="px-3 py-1 rounded-full text-xs font-bold bg-white border border-gray-200">
                            Mở lại
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {fix && picked.length > 0 && (
            <button
              onClick={() => doFix(issues.filter((i) => picked.includes(i.id) && !i.status))}
              disabled={!!busy}
              className="w-full py-2.5 rounded-xl bg-black text-primary-400 font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy === 'fix' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {busy === 'fix' ? 'Đang sửa…' : `Sửa ${picked.length} mục đã chọn`}
            </button>
          )}
          {issues.some((i) => i.status === 'da-sua') && (
            <p className="text-xs text-gray-500">Đã sửa xong → bấm "Rà soát lại" để AI kiểm tra bản mới.</p>
          )}
        </>
      )}
    </section>
  );
}
