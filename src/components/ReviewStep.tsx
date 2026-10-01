import { useRef, useState } from 'react';
import type { Clip, ClipStatus, Project, Review } from '../../shared/types';
import { CLIP_STATUS_LABEL, FLOW_MODE_LABEL, allClips, frameTag } from '../../shared/types';
import { requestReview } from '../lib/api';
import { downloadDataUrl, putImage, readAndResize, splitDataUrl } from '../lib/images';
import { saveProject } from '../lib/store';
import { Button, CopyBlock, ErrorNote, Field, TagText, inputCls } from './ui';

const VERDICT: Record<Review['verdict'], { label: string; cls: string; status: ClipStatus }> = {
  'dung-duoc': { label: 'Dùng được', cls: 'bg-good-soft text-good', status: 'dat' },
  sua: { label: 'Sửa trên video', cls: 'bg-tape-soft text-ink', status: 'can-sua' },
  'chay-lai': { label: 'Chạy lại', cls: 'bg-bad-soft text-bad', status: 'chay-lai' },
};
const STATUS_CLS: Record<ClipStatus, string> = { 'chua-chay': 'text-mute', dat: 'text-good', 'can-sua': 'text-ink', 'chay-lai': 'text-bad' };

export default function ReviewStep({ project }: { project: Project }) {
  const clips = allClips(project);
  const [open, setOpen] = useState(clips.find((c) => (project.status?.[c.id] || 'chua-chay') !== 'dat')?.id || '');
  if (!clips.length) return <p className="text-mute">Chưa có clip nào. Làm bước 4 và 5 trước.</p>;

  const statusOf = (id: string): ClipStatus => project.status?.[id] || 'chua-chay';
  const counts = (Object.keys(CLIP_STATUS_LABEL) as ClipStatus[]).map((s) => [s, clips.filter((c) => statusOf(c.id) === s).length] as const);
  const setStatus = (id: string, s: ClipStatus) => saveProject({ ...project, status: { ...(project.status || {}), [id]: s } });

  return (
    <div className="max-w-4xl">
      <p className="mb-2 prose-block">
        Chạy clip trong Flow, rồi ghi nhận xét và gửi ảnh chụp từ video. AI kết luận dùng được, sửa trên video hay phải chạy lại, và viết câu sửa ngắn cho Omni.
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6">
        <p className="text-sm">
          {counts.map(([s, n]) => (
            <span key={s} className={`mr-4 ${STATUS_CLS[s]}`}>{CLIP_STATUS_LABEL[s]}: <b>{n}</b></span>
          ))}
        </p>
        <Button small onClick={() => exportCsv(project)}>Tải danh sách clip (CSV)</Button>
      </div>

      <ul className="divide-y divide-line border-y border-line mb-16">
        {clips.map((c) => (
          <li key={c.id}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
              <button type="button" className="font-bold text-left min-w-20 hover:underline underline-offset-4" onClick={() => setOpen(open === c.id ? '' : c.id)} aria-expanded={open === c.id}>
                {c.id}
              </button>
              <span className="text-sm text-mute">{c.seconds} giây, {FLOW_MODE_LABEL[c.mode]}</span>
              <span className="text-sm flex-1 min-w-40 truncate"><TagText text={c.change} /></span>
              <select
                aria-label={`Trạng thái ${c.id}`}
                className={`rounded-md border border-line bg-card px-2 py-1 text-sm font-medium ${STATUS_CLS[statusOf(c.id)]}`}
                value={statusOf(c.id)}
                onChange={(e) => setStatus(c.id, e.target.value as ClipStatus)}
              >
                {(Object.keys(CLIP_STATUS_LABEL) as ClipStatus[]).map((s) => (
                  <option key={s} value={s}>{CLIP_STATUS_LABEL[s]}</option>
                ))}
              </select>
            </div>
            {open === c.id && <ReviewPanel project={project} clip={c} next={clips[clips.indexOf(c) + 1]} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface Shot { dataUrl: string }

function ReviewPanel({ project, clip: c, next }: { project: Project; clip: Clip; next?: Clip }) {
  const [note, setNote] = useState('');
  const [shots, setShots] = useState<Shot[]>([]);
  const [checkFrame, setCheckFrame] = useState(!!next && next.mode !== 'nguyen-lieu');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const reviews = project.reviews?.[c.id] || [];
  const latest = reviews[0];
  const prompt = project.prompts?.[c.id];

  const add = async (files: File[]) => {
    const list = await Promise.all(files.slice(0, 3 - shots.length).map((f) => readAndResize(f, 1024, 0.85)));
    setShots([...shots, ...list.map((dataUrl) => ({ dataUrl }))]);
  };

  const review = async () => {
    setBusy(true);
    setError('');
    setSaved('');
    try {
      const r = await requestReview(project, c, note, shots.map((s) => splitDataUrl(s.dataUrl)), checkFrame && shots.length > 0);
      saveProject({
        ...project,
        reviews: { ...(project.reviews || {}), [c.id]: [r.review, ...reviews].slice(0, 10) },
        status: { ...(project.status || {}), [c.id]: VERDICT[r.review.verdict].status },
      });
      setNote('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  /** Lưu ảnh cuối làm khung cuối của clip này và khung đầu của clip sau (hai bản riêng, xoá một bên không mất bên kia) */
  const saveFrame = async () => {
    const last = shots[shots.length - 1];
    if (!last) return;
    const images = { ...project.images, [frameTag(c.id, 'cuoi')]: await putImage(last.dataUrl) };
    if (next && next.mode !== 'nguyen-lieu') images[frameTag(next.id, 'dau')] = await putImage(last.dataUrl);
    saveProject({ ...project, images });
    setSaved(next && next.mode !== 'nguyen-lieu' ? `Đã lưu làm khung cuối của ${c.id} và khung đầu của ${next.id}.` : `Đã lưu làm khung cuối của ${c.id}.`);
  };

  return (
    <div className="pb-6 pt-2 space-y-4">
      {!prompt && <ErrorNote message="Clip này chưa biên dịch prompt. Vẫn duyệt được, nhưng AI sẽ không biết prompt đã dùng." />}
      <Field label="Nhận xét của bạn" hint="Ghi thấy gì sai hoặc chưa ưng. Để trống nếu chỉ muốn AI tự xem ảnh.">
        <textarea className={`${inputCls} min-h-20`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: bẫy bật lên trời thay vì quật xuống; chuột đứng sai bên" />
      </Field>
      <div>
        <p className="text-sm font-semibold mb-2">Ảnh chụp từ video (tối đa 3, ảnh cuối nên là khung cuối)</p>
        <div className="flex flex-wrap gap-3 items-start">
          {shots.map((s, i) => (
            <figure key={i} className="w-28">
              <img src={s.dataUrl} alt={`Ảnh ${i + 1}`} className="w-28 h-28 object-contain bg-paper border border-line rounded-md" />
              <button className="text-sm text-bad hover:underline underline-offset-4" onClick={() => setShots(shots.filter((_, j) => j !== i))}>Bỏ</button>
            </figure>
          ))}
          {shots.length < 3 && (
            <button type="button" onClick={() => fileRef.current?.click()} className="w-28 h-28 border-2 border-dashed border-line rounded-md text-sm text-mute hover:border-ink hover:text-ink">
              Thêm ảnh
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { const fs = Array.from((e.target.files || []) as ArrayLike<File>); if (fs.length) add(fs); e.target.value = ''; }} />
        </div>
        {shots.length > 0 && (
          <label className="flex gap-2 items-start text-sm mt-2">
            <input type="checkbox" className="mt-1" checked={checkFrame} onChange={(e) => setCheckFrame(e.target.checked)} />
            <span>Chấm ảnh cuối làm khung nối cho clip sau{next ? ` (${next.id}, chế độ ${FLOW_MODE_LABEL[next.mode]})` : ''}</span>
          </label>
        )}
      </div>
      <Button kind="primary" onClick={review} busy={busy} disabled={!note.trim() && !shots.length}>Nhờ AI duyệt</Button>
      <ErrorNote message={error} onClose={() => setError('')} />

      {latest && <ReviewResult review={latest} canSaveFrame={shots.length > 0} onSaveFrame={saveFrame} saved={saved} />}
      {reviews.length > 1 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold">Các lần duyệt trước ({reviews.length - 1})</summary>
          <div className="space-y-4 mt-3">
            {reviews.slice(1).map((r) => <ReviewResult key={r.at} review={r} />)}
          </div>
        </details>
      )}
    </div>
  );
}

function ReviewResult({ review: r, canSaveFrame, onSaveFrame, saved }: { review: Review; canSaveFrame?: boolean; onSaveFrame?: () => void; saved?: string }) {
  const v = VERDICT[r.verdict];
  return (
    <div className="border border-line rounded-md bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`px-2 py-0.5 rounded font-semibold text-sm ${v.cls}`}>{v.label}</span>
        <span className="text-sm text-mute">{new Date(r.at).toLocaleString('vi-VN')}</span>
      </div>
      {r.note && <p className="text-sm text-mute">Bạn ghi: {r.note}</p>}
      <p><TagText text={r.summary} /></p>
      {r.edits.map((e, i) => (
        <CopyBlock key={i} label={`Câu sửa ${i + 1}${r.edits.length > 1 ? ` / ${r.edits.length} — sửa lần lượt, mỗi lượt một câu` : ''}`} text={e} />
      ))}
      {r.fixShotList && <p className="text-sm"><span className="font-semibold">Đổi trong shot list rồi biên dịch lại:</span> <TagText text={r.fixShotList} /></p>}
      {r.updates && <p className="text-sm"><span className="font-semibold">Video khác kế hoạch — nên sửa dữ liệu:</span> <TagText text={r.updates} /></p>}
      {r.frame && (
        <div className="text-sm">
          <p className="font-semibold mb-1">
            Khung cuối: {r.frame.total}/10 điểm,{' '}
            <span className={r.frame.ok ? 'text-good' : 'text-bad'}>{r.frame.ok ? 'dùng được để nối' : 'không nên dùng để nối — chụp khung khác hoặc tạo bằng công cụ ảnh'}</span>
          </p>
          <table className="w-full">
            <tbody>
              {r.frame.criteria.map((c, i) => (
                <tr key={i} className="border-t border-line align-top">
                  <td className="py-1 pr-3 font-medium">{c.name}</td>
                  <td className={`pr-3 ${c.points === 0 ? 'text-bad font-semibold' : ''}`}>{c.points}/2</td>
                  <td className="text-mute">{c.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {r.frame.ok && canSaveFrame && onSaveFrame && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button small kind="primary" onClick={onSaveFrame}>Lưu ảnh cuối làm khung nối</Button>
              {saved && <span className="text-good">{saved}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function exportCsv(p: Project) {
  const rows = [['Thứ tự', 'Clip', 'Scene', 'Giây', 'Chế độ', 'Trạng thái', 'Chuyển biến', 'Âm thanh']];
  allClips(p).forEach((c, i) =>
    rows.push([String(i + 1), c.id, c.scene, String(c.seconds), FLOW_MODE_LABEL[c.mode], CLIP_STATUS_LABEL[p.status?.[c.id] || 'chua-chay'], c.change, c.sound])
  );
  const csv = '\uFEFF' + rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  downloadDataUrl(url, `${p.title.replace(/[^\p{L}\p{N}]+/gu, '-')}_danh-sach-clip.csv`);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
