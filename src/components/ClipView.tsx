import { useState } from 'react';
import type { Clip, FlowMode, LocationAsset, Shot } from '../../shared/types';
import { CAMERA_MOVES, FLOW_MODE_LABEL, SHOT_SIZES } from '../../shared/types';
import { Button, Field, Tag, TagText, inputCls } from './ui';

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ''));

export function Difficulty({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5 align-middle" aria-label={`Độ khó ${n}/5`} title={`Độ khó ${n}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`w-2 h-2 rounded-full ${i <= n ? (n >= 4 ? 'bg-bad' : 'bg-ink') : 'bg-line'}`} />
      ))}
    </span>
  );
}

const Line = ({ k, v }: { k: string; v: string }) =>
  v && v !== '—' ? (
    <p>
      <span className="font-semibold">{k}:</span> <TagText text={v} />
    </p>
  ) : null;

/** Clip ở dạng đọc */
export function ClipView({ clip, moduleNames }: { clip: Clip; moduleNames: Record<string, string> }) {
  return (
    <div className="space-y-2 text-sm">
      <p className="text-[15px]"><TagText text={clip.change} /></p>
      <p className="flex flex-wrap gap-1 items-center">
        <span className="font-semibold">Ảnh nạp:</span> {clip.assets.map((t) => <Tag key={t} tag={t} />)}
      </p>
      {clip.situations.length > 0 && (
        <p><span className="font-semibold">Tình huống:</span> {clip.situations.map((s) => moduleNames[s] || s).join('; ')}</p>
      )}
      <Line k="Khoá" v={clip.locks} />
      <Line k="Khung đầu" v={clip.firstFrame} />
      <ol className="space-y-2 border-l-2 border-line pl-3">
        {clip.shots.map((s, i) => (
          <li key={i}>
            <p className="font-semibold">
              Shot {i + 1} [{fmt(s.from)}–{fmt(s.to)}s], góc {s.angle}, {s.size}, {s.move}
            </p>
            <p><span className="text-mute">Ai ở đâu:</span> <TagText text={s.where} /></p>
            <p><span className="text-mute">Hành động:</span> <TagText text={s.action} /></p>
          </li>
        ))}
      </ol>
      <p>
        <span className="font-semibold">Âm thanh:</span> <TagText text={clip.sound || '—'} />. {clip.dialogue ? <>Thoại: <TagText text={clip.dialogue} />.</> : 'Không thoại.'}{' '}
        {clip.music ? `Nhạc: ${clip.music}.` : 'Không nhạc.'}
      </p>
      <Line k="Thay đổi còn lưu sau clip" v={clip.carryOver} />
      <Line k="Khung cuối" v={clip.lastFrame} />
      {clip.risk && <p className="text-bad"><span className="font-semibold">Rủi ro:</span> <TagText text={clip.risk} /></p>}
    </div>
  );
}

/** Sửa clip trực tiếp. Độ dài shot sửa theo số giây, mốc thời gian tự tính lại. */
export function ClipEditor(props: {
  clip: Clip;
  location?: LocationAsset;
  modules: { id: string; name: string }[];
  limits: { min: number; max: number };
  onSave: (c: Clip) => void;
  onCancel: () => void;
}) {
  const [c, setC] = useState<Clip>(props.clip);
  const [assetsText, setAssetsText] = useState(props.clip.assets.map((t) => '@' + t).join(' '));
  const [lengths, setLengths] = useState<number[]>(props.clip.shots.map((s) => s.to - s.from));
  const set = (patch: Partial<Clip>) => setC({ ...c, ...patch });
  const setShot = (i: number, patch: Partial<Shot>) => set({ shots: c.shots.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const total = lengths.reduce((t, n) => t + (Number(n) || 0), 0);
  const angles = props.location?.angles || [];

  const save = () => {
    let cursor = 0;
    const shots = c.shots.map((s, i) => {
      const len = Math.max(0.5, Number(lengths[i]) || 1);
      const out = { ...s, from: cursor, to: cursor + len };
      cursor += len;
      return out;
    });
    const tags = Array.from(new Set((assetsText.match(/@?[a-z0-9-]+/gi) || []).map((t) => t.replace(/^@/, '').toLowerCase())));
    props.onSave({ ...c, shots, seconds: cursor, assets: tags });
  };

  const area = (label: string, key: keyof Clip, rows = 2, hint?: string) => (
    <Field label={label} hint={hint}>
      <textarea className={`${inputCls} text-sm`} rows={rows} value={String(c[key] ?? '')} onChange={(e) => set({ [key]: e.target.value } as Partial<Clip>)} />
    </Field>
  );

  return (
    <div className="space-y-4 text-sm">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Chế độ Flow">
          <select className={inputCls} value={c.mode} onChange={(e) => set({ mode: e.target.value as FlowMode })}>
            {(Object.keys(FLOW_MODE_LABEL) as FlowMode[]).map((m) => (
              <option key={m} value={m}>{FLOW_MODE_LABEL[m]}</option>
            ))}
          </select>
        </Field>
        <Field label="Độ khó">
          <select className={inputCls} value={c.difficulty} onChange={(e) => set({ difficulty: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </Field>
      </div>
      {area('Chuyển biến', 'change')}
      <Field label="Ảnh nạp" hint="Các @tag cách nhau bằng dấu cách. Ảnh góc máy của các shot được thêm tự động khi biên dịch.">
        <input className={`${inputCls} font-mono`} value={assetsText} onChange={(e) => setAssetsText(e.target.value)} />
      </Field>
      <fieldset>
        <legend className="font-semibold mb-1">Tình huống</legend>
        <div className="grid sm:grid-cols-2 gap-x-4">
          {props.modules.map((m) => (
            <label key={m.id} className="flex gap-2 items-start">
              <input
                type="checkbox"
                className="mt-1"
                checked={c.situations.includes(m.id)}
                onChange={(e) => set({ situations: e.target.checked ? [...c.situations, m.id] : c.situations.filter((x) => x !== m.id) })}
              />
              <span>{m.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {area('Khoá', 'locks')}
      {c.mode !== 'nguyen-lieu' && area('Khung đầu', 'firstFrame', 2, 'Mọi nhân vật, đạo cụ xuất hiện trong clip phải có trong khung đầu.')}

      <div className="space-y-3">
        <p className="font-semibold">
          Shot — tổng {fmt(total)} giây{' '}
          {(total < props.limits.min || total > props.limits.max) && <span className="text-bad">(ngoài khoảng {props.limits.min}–{props.limits.max} giây)</span>}
        </p>
        {c.shots.map((s, i) => (
          <div key={i} className="border border-line rounded-md p-3 space-y-2 bg-paper">
            <div className="flex flex-wrap gap-3 items-end">
              <span className="font-semibold">Shot {i + 1}</span>
              <label>
                <span className="block text-mute">Giây</span>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  className={`${inputCls} w-20`}
                  value={lengths[i]}
                  onChange={(e) => setLengths(lengths.map((n, j) => (j === i ? Number(e.target.value) : n)))}
                />
              </label>
              <label>
                <span className="block text-mute">Góc</span>
                <select className={inputCls} value={s.angle} onChange={(e) => setShot(i, { angle: e.target.value })}>
                  {angles.map((g) => <option key={g.id} value={g.id}>{g.id}: {g.vi.slice(0, 40)}</option>)}
                </select>
              </label>
              <label>
                <span className="block text-mute">Cỡ cảnh</span>
                <select className={inputCls} value={s.size} onChange={(e) => setShot(i, { size: e.target.value })}>
                  {SHOT_SIZES.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </label>
              <label>
                <span className="block text-mute">Máy</span>
                <select className={inputCls} value={s.move} onChange={(e) => setShot(i, { move: e.target.value })}>
                  {CAMERA_MOVES.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </label>
              {c.shots.length > 1 && (
                <Button small kind="danger" onClick={() => { set({ shots: c.shots.filter((_, j) => j !== i) }); setLengths(lengths.filter((_, j) => j !== i)); }}>
                  Xoá shot
                </Button>
              )}
            </div>
            <Field label="Ai ở đâu">
              <textarea className={inputCls} rows={2} value={s.where} onChange={(e) => setShot(i, { where: e.target.value })} />
            </Field>
            <Field label="Hành động">
              <textarea className={inputCls} rows={3} value={s.action} onChange={(e) => setShot(i, { action: e.target.value })} />
            </Field>
          </div>
        ))}
        {c.shots.length < 4 && (
          <Button
            small
            onClick={() => {
              set({ shots: [...c.shots, { from: 0, to: 2, angle: angles[0]?.id || 'a', size: 'trung', move: 'đứng yên', where: '', action: '' }] });
              setLengths([...lengths, 2]);
            }}
          >
            Thêm shot
          </Button>
        )}
      </div>

      {area('Âm thanh', 'sound')}
      <div className="grid sm:grid-cols-2 gap-4">
        {area('Thoại (để trống nếu không thoại)', 'dialogue', 1)}
        {area('Nhạc (để trống nếu không nhạc)', 'music', 1)}
      </div>
      {area('Thay đổi còn lưu sau clip', 'carryOver', 2, 'Ghi toàn bộ trạng thái còn hiệu lực, cộng dồn. Không có thì ghi "—".')}
      {area('Khung cuối', 'lastFrame', 2, 'Cần khi clip sau dùng chế độ khung đầu, hoặc clip này dùng khung đầu + cuối.')}
      {area('Rủi ro', 'risk', 1)}
      <div className="flex gap-3">
        <Button kind="primary" onClick={save}>Lưu clip</Button>
        <Button kind="quiet" onClick={props.onCancel}>Huỷ</Button>
      </div>
    </div>
  );
}
