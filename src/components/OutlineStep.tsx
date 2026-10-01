import { useState } from 'react';
import type { Outline, Project } from '../../shared/types';
import { missingAssets } from '../../shared/types';
import { requestOutline } from '../lib/api';
import { saveProject } from '../lib/store';
import { Button, ErrorNote, Field, SectionTitle, Tag, TagText, Warnings, inputCls } from './ui';

export default function OutlineStep({ project, onNext }: { project: Project; onNext: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const o = project.outline;

  const run = async (fb: string, previous?: Outline) => {
    setBusy(true);
    setError('');
    try {
      const r = await requestOutline(project, fb, previous);
      saveProject({ ...project, outline: r.outline, outlinePrev: project.outline, title: r.outline.title || project.title });
      setFeedback('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const undo = () => project.outlinePrev && saveProject({ ...project, outline: project.outlinePrev, outlinePrev: undefined });

  if (!o) {
    return (
      <div className="max-w-3xl">
        <p className="mb-4 prose-block">
          Outline gồm nhân vật, bối cảnh (kèm các mốc cố định), đạo cụ chính, khoá trái/phải và danh sách scene. Đây là nền cho bước Tài sản và Shot list.
        </p>
        <Field label="Yêu cầu thêm (không bắt buộc)">
          <input className={inputCls} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="VD: thêm một chú chó ngủ gật ở phòng khách" />
        </Field>
        <div className="mt-4 flex items-center gap-4">
          <Button kind="primary" onClick={() => run(feedback)} busy={busy}>Viết outline</Button>
          {busy && <span className="text-sm text-mute">Bước này dùng model mạnh nhất nên có thể mất một phút.</span>}
        </div>
        <div className="mt-4"><ErrorNote message={error} onClose={() => setError('')} /></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold">{o.title}</h2>
      <p className="mt-1 mb-4 prose-block">{o.summary}</p>
      {missingAssets(o, project.assets).length > 0 && (
        <div className="mb-4">
          <Warnings
            title="Tài sản chưa theo kịp outline"
            items={[`Outline có ${missingAssets(o, project.assets).map((t) => '@' + t).join(', ')} nhưng bước Tài sản chưa có. Sang bước Tài sản, sửa theo góp ý để thêm.`]}
          />
        </div>
      )}
      <Warnings items={o.warnings} />

      <SectionTitle>Nhân vật</SectionTitle>
      <div className="divide-y divide-line border-y border-line">
        {o.characters.map((c) => (
          <div key={c.tag} className="py-3 grid sm:grid-cols-[10rem_1fr] gap-2">
            <div>
              <Tag tag={c.tag} />
              <p className="text-sm text-mute mt-1">{c.role}</p>
            </div>
            <div className="text-sm space-y-0.5">
              <p><TagText text={c.look} /></p>
              <p><span className="font-semibold">Muốn:</span> <TagText text={c.wants} /></p>
              <p><span className="font-semibold">Phản xạ:</span> <TagText text={c.reflex} /></p>
              <p><span className="font-semibold">Điểm yếu:</span> <TagText text={c.weakness} /></p>
              <p><span className="font-semibold">Tỉ lệ:</span> <TagText text={c.scale} /></p>
            </div>
          </div>
        ))}
      </div>

      <SectionTitle>Bối cảnh</SectionTitle>
      <div className="divide-y divide-line border-y border-line">
        {o.locations.map((l) => (
          <div key={l.tag} className="py-3 grid sm:grid-cols-[10rem_1fr] gap-2">
            <div>
              <Tag tag={l.tag} />
              <p className="text-sm text-mute mt-1">{l.scenes.join(', ')}</p>
            </div>
            <div className="text-sm space-y-0.5">
              <p><TagText text={l.description} /></p>
              <p><span className="font-semibold">Mốc cố định:</span> <TagText text={l.landmarks} /></p>
            </div>
          </div>
        ))}
      </div>

      <SectionTitle>Đạo cụ chính</SectionTitle>
      {!o.props.length && <p className="text-mute">Không có đạo cụ chính.</p>}
      <div className="divide-y divide-line border-y border-line">
        {o.props.map((p) => (
          <div key={p.tag} className="py-3 grid sm:grid-cols-[10rem_1fr] gap-2">
            <div><Tag tag={p.tag} /></div>
            <div className="text-sm space-y-0.5">
              <p><TagText text={p.role} /></p>
              <p><span className="font-semibold">Hình dạng cần có:</span> <TagText text={p.shapeNeeded} /></p>
              {p.afterTag && (
                <p>
                  <span className="font-semibold">Trạng thái sau:</span> <Tag tag={p.afterTag} /> <TagText text={p.afterDescription} /> (từ {p.afterFromScene})
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <SectionTitle>Khoá trái / phải</SectionTitle>
      <p><TagText text={o.axisLock} /></p>

      <SectionTitle aside={<span className="text-sm text-mute">Tổng {o.scenes.reduce((t, s) => t + s.clips, 0)} clip</span>}>Scene</SectionTitle>
      <ol className="space-y-4">
        {o.scenes.map((s) => (
          <li key={s.id} className="grid sm:grid-cols-[4rem_1fr] gap-2">
            <div className="text-2xl font-bold leading-none">{s.id}</div>
            <div className="text-sm space-y-0.5">
              <p className="font-semibold text-[15px]">
                {s.act ? `${s.act}, ` : ''}<Tag tag={s.location} /> {s.timeOfDay}, vai trò {s.role}, khoảng {s.clips} clip
              </p>
              <p><span className="font-semibold">Mục đích:</span> <TagText text={s.purpose} /></p>
              <p><span className="font-semibold">Chuyển biến:</span> <TagText text={s.change} /></p>
              <p><span className="font-semibold">Trạng thái cuối:</span> <TagText text={s.endState} /></p>
              <p className="flex flex-wrap gap-1 items-center">
                <span className="font-semibold">Có mặt:</span> {[...s.characters, ...s.props].map((t) => <Tag key={t} tag={t} />)}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <SectionTitle>Sửa outline</SectionTitle>
      <Field label="Góp ý của bạn" hint="AI chỉ sửa đúng chỗ được góp ý, giữ nguyên phần còn lại.">
        <textarea className={`${inputCls} min-h-20`} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="VD: S2 cho chuột trốn sau lọ muối thay vì dưới gầm bàn" />
      </Field>
      <div className="flex flex-wrap gap-3 mt-3 mb-4">
        <Button kind="primary" onClick={() => run(feedback, o)} busy={busy} disabled={feedback.trim().length < 5}>Sửa theo góp ý</Button>
        {project.outlinePrev && <Button onClick={undo} disabled={busy}>Hoàn tác lần sửa trước</Button>}
        <Button kind="quiet" onClick={() => confirm('Viết lại outline từ đầu? Bản hiện tại sẽ vào ô hoàn tác.') && run('')} disabled={busy}>Viết lại từ đầu</Button>
      </div>
      <ErrorNote message={error} onClose={() => setError('')} />
      <div className="border-t border-line pt-6 mt-8 mb-16">
        <Button kind="primary" onClick={onNext}>Sang bước Tài sản</Button>
      </div>
    </div>
  );
}
