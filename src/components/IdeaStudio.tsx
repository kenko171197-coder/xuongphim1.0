import { useMemo, useState } from 'react';
import type { AspectChoice, Idea, IdeaMode, LengthKey, ScriptType } from '../../shared/types';
import { LENGTH_LABEL } from '../../shared/types';
import { requestIdeas } from '../lib/api';
import { addIdeas, projectFromIdea, removeIdea, setIdeaStatus, useIdeas } from '../lib/store';
import { Button, Choice, ErrorNote, Field, inputCls } from './ui';

type Filter = 'all' | 'liked' | 'disliked';

export default function IdeaStudio({ types, onOpenProject }: { types: ScriptType[]; onOpenProject: (id: string) => void }) {
  const bank = useIdeas();
  const [scriptType, setScriptType] = useState(types[0]?.id || '');
  const [length, setLength] = useState<LengthKey>('ngan');
  const [aspect, setAspect] = useState<AspectChoice>('auto');
  const [mode, setMode] = useState<Exclude<IdeaMode, 'bien-the'>>('goi-y');
  const [idea, setIdea] = useState('');
  const [extra, setExtra] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [assessment, setAssessment] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [count, setCount] = useState<number>(() => Number(localStorage.getItem('xp2_idea_count')) || 6);
  const pickCount = (n: number) => {
    setCount(n);
    try {
      localStorage.setItem('xp2_idea_count', String(n));
    } catch {
      /* bỏ qua */
    }
  };

  const type = types.find((t) => t.id === scriptType) || types[0];
  const resolvedAspect = aspect === 'auto' ? type?.aspect || '9:16' : aspect;
  const disliked = useMemo(() => bank.filter((i) => i.status === 'disliked').map((i) => `${i.title}: ${i.logline}`), [bank]);
  const shown = bank.filter((i) => (filter === 'all' ? i.status !== 'disliked' : i.status === filter));

  const run = async (m: IdeaMode, base?: Idea) => {
    if (!type) return;
    setBusy(base ? base.id : 'main');
    setError('');
    try {
      const r = await requestIdeas({
        scriptType: base?.scriptType || type.id,
        length: base?.length || length,
        aspect: base?.aspect || resolvedAspect,
        mode: m,
        idea: m === 'tu-y' ? idea : '',
        extra,
        base,
        disliked,
        count,
      });
      addIdeas(r.ideas);
      setAssessment(m === 'tu-y' ? r.assessment : '');
      setFilter('all');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  if (!types.length)
    return <ErrorNote message="Chưa có thể loại nào trong knowledge/kich-ban/. Kiểm tra kho kiến thức ở Cài đặt." />;

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-1">Ý tưởng</h1>
      <p className="text-mute mb-8 prose-block">Mỗi thẻ là một logline kèm móc, lật, chốt. Chọn thẻ ưng ý rồi tạo dự án để sang outline.</p>

      <div className="grid gap-5 border border-line bg-card rounded-md p-5">
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Thể loại" hint={type?.summary}>
            <select className={inputCls} value={scriptType} onChange={(e) => setScriptType(e.target.value)}>
              {types.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </Field>
          <div className="grid gap-4">
            <div>
              <span className="block text-sm font-semibold mb-1">Độ dài</span>
              <Choice value={length} onChange={setLength} options={(['ngan', 'trung-binh', 'dai'] as LengthKey[]).map((v) => ({ value: v, label: LENGTH_LABEL[v] }))} />
              <span className="block text-sm text-mute mt-1">{type?.durations[length]}</span>
            </div>
            <div>
              <span className="block text-sm font-semibold mb-1">Tỉ lệ khung</span>
              <Choice
                value={aspect}
                onChange={setAspect}
                options={[
                  { value: 'auto', label: `Theo thể loại (${type?.aspect})` },
                  { value: '9:16', label: '9:16 dọc' },
                  { value: '16:9', label: '16:9 ngang' },
                ]}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-4">
          <div>
            <span className="block text-sm font-semibold mb-1">Cách làm</span>
            <Choice value={mode} onChange={setMode} options={[{ value: 'goi-y', label: 'Gợi ý cho tôi' }, { value: 'tu-y', label: 'Từ ý của tôi' }]} />
          </div>
          <label className="block">
            <span className="block text-sm font-semibold mb-1">Số thẻ mỗi lần</span>
            <select className={`${inputCls} w-24`} value={count} onChange={(e) => pickCount(Number(e.target.value))}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
        {mode === 'tu-y' && (
          <Field label="Ý của bạn">
            <textarea className={`${inputCls} min-h-24`} value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="VD: mèo muốn ăn trộm bánh sinh nhật nhưng chuột đã giấu bánh trong lồng chim" />
          </Field>
        )}
        <Field label="Yêu cầu thêm (không bắt buộc)">
          <input className={inputCls} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="VD: có một chú chó ngủ gật, bối cảnh sân sau" />
        </Field>
        <div className="flex items-center gap-4">
          <Button kind="primary" onClick={() => run(mode)} busy={busy === 'main'} disabled={!!busy || (mode === 'tu-y' && idea.trim().length < 10)}>
            Tạo {count} ý tưởng
          </Button>
          {disliked.length > 0 && <span className="text-sm text-mute">AI sẽ tránh {disliked.length} ý bạn đã loại.</span>}
        </div>
        <ErrorNote message={error} onClose={() => setError('')} />
      </div>

      {assessment && (
        <div className="mt-6 border-l-4 border-ink bg-card px-4 py-3">
          <p className="font-semibold mb-1">Nhận xét về ý của bạn</p>
          <p className="whitespace-pre-wrap">{assessment}</p>
        </div>
      )}

      <div className="flex items-center gap-4 mt-10 mb-4 border-b-2 border-ink pb-1">
        <h2 className="text-xl font-bold flex-1">Ngân hàng ý tưởng</h2>
        <Choice
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Đang xét' },
            { value: 'liked', label: `Đã thích (${bank.filter((i) => i.status === 'liked').length})` },
            { value: 'disliked', label: `Đã loại (${bank.filter((i) => i.status === 'disliked').length})` },
          ]}
        />
      </div>
      {!shown.length && <p className="text-mute">{filter === 'all' ? 'Chưa có thẻ nào. Bấm "Tạo ý tưởng" để bắt đầu.' : 'Không có thẻ nào ở mục này.'}</p>}
      <div className="grid gap-4">
        {shown.map((i) => (
          <IdeaCard
            key={i.id}
            idea={i}
            typeName={types.find((t) => t.id === i.scriptType)?.name || i.scriptType}
            busy={busy === i.id}
            disabled={!!busy}
            onVariant={() => run('bien-the', i)}
            onCreate={() => onOpenProject(projectFromIdea(i, i.aspect).id)}
          />
        ))}
      </div>
    </div>
  );
}

function IdeaCard(props: { idea: Idea; typeName: string; busy: boolean; disabled: boolean; onVariant: () => void; onCreate: () => void }) {
  const i = props.idea;
  return (
    <article className={`bg-card border rounded-md p-5 ${i.status === 'liked' ? 'border-ink border-2' : 'border-line'}`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
        <h3 className="text-lg font-bold">{i.title}</h3>
        <span className="text-sm text-mute">
          {props.typeName}, {LENGTH_LABEL[i.length]}, khoảng {i.seconds} giây, {i.clips} clip, {i.aspect}
          {i.formula ? `, công thức "${i.formula}"` : ''}
        </span>
      </div>
      <p className="text-[16px] mb-3 prose-block">{i.logline}</p>
      <dl className="grid sm:grid-cols-3 gap-3 text-sm mb-3">
        <div><dt className="font-semibold">Móc</dt><dd>{i.hook}</dd></div>
        <div><dt className="font-semibold">Lật</dt><dd>{i.turn}</dd></div>
        <div><dt className="font-semibold">Chốt</dt><dd>{i.ending}</dd></div>
      </dl>
      <p className="text-sm"><span className="font-semibold">Nhân vật:</span> {i.characters.join('; ')}</p>
      <p className="text-sm"><span className="font-semibold">Bối cảnh:</span> {i.locations.join('; ')}</p>
      {i.whyGood && <p className="text-sm"><span className="font-semibold">Vì sao hay:</span> {i.whyGood}</p>}
      {i.productionRisk && <p className="text-sm"><span className="font-semibold">Khó quay nhất:</span> {i.productionRisk}</p>}
      <div className="flex flex-wrap gap-2 mt-4">
        <Button kind="primary" small onClick={props.onCreate} disabled={props.disabled}>Tạo dự án</Button>
        <Button small onClick={() => setIdeaStatus(i.id, 'liked')}>{i.status === 'liked' ? 'Bỏ thích' : 'Thích'}</Button>
        <Button small onClick={props.onVariant} busy={props.busy} disabled={props.disabled}>Xem biến thể</Button>
        <Button small onClick={() => setIdeaStatus(i.id, 'disliked')}>{i.status === 'disliked' ? 'Bỏ loại' : 'Loại'}</Button>
        <Button small kind="danger" onClick={() => removeIdea(i.id)}>Xoá</Button>
      </div>
    </article>
  );
}
