import { useEffect, useRef, useState } from 'react';
import { addKey, exportKeys, importKeys, loadKeyOrder, loadKeys, mask, onKeysChange, saveKeyOrder, saveKeys, type KeyBook, type KeyOrder, type Tier } from '../lib/apiKeys';
import { loadModelPrefs, resetModelPrefs, saveModelPrefs } from '../lib/modelPrefs';
import { FEATURE_NAMES, fmtTokens, fmtUSD, loadUsage, onUsageChange, resetUsage } from '../lib/usage';
import { TASKS, selectableModels } from '../../shared/models';
import { testKeyApi, type KnowledgeInfo } from '../lib/api';
import { Button, Choice, ErrorNote, Field, SectionTitle, inputCls } from './ui';

export default function Settings({ knowledge, reloadKnowledge }: { knowledge?: KnowledgeInfo; reloadKnowledge: () => void }) {
  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Cài đặt</h1>
      <Keys />
      <Knowledge info={knowledge} reload={reloadKnowledge} />
      <Models />
      <UsagePanel />
    </div>
  );
}

function Keys() {
  const [book, setBook] = useState<KeyBook>(loadKeys());
  const [draft, setDraft] = useState('');
  const [label, setLabel] = useState('');
  const [tier, setTier] = useState<Tier>('free');
  const [error, setError] = useState('');
  const [testing, setTesting] = useState('');
  const [order, setOrder] = useState<KeyOrder>(loadKeyOrder());
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => onKeysChange(() => setBook(loadKeys())), []);

  const add = () => {
    try {
      setBook(addKey(book, tier, draft, label));
      setDraft('');
      setLabel('');
      setError('');
    } catch (e: any) {
      setError(e.message);
    }
  };
  const update = (t: Tier, id: string, patch: object) => {
    const next = { ...book, [t]: book[t].map((k) => (k.id === id ? { ...k, ...patch } : k)) };
    saveKeys(next);
    setBook(next);
  };
  const remove = (t: Tier, id: string) => {
    const next = { ...book, [t]: book[t].filter((k) => k.id !== id) };
    saveKeys(next);
    setBook(next);
  };
  const test = async (t: Tier, id: string, key: string) => {
    setTesting(id);
    try {
      const r = await testKeyApi(key);
      const okNames = r.results.filter((x) => x.ok).map((x) => x.name);
      update(t, id, {
        status: r.ok ? 'ok' : 'error',
        message: r.ok ? `Dùng được: ${okNames.join(', ')}` : r.error || 'Không dùng được',
        models: r.results,
        checkedAt: Date.now(),
      });
    } catch (e: any) {
      update(t, id, { status: 'error', message: e.message, checkedAt: Date.now() });
    } finally {
      setTesting('');
    }
  };

  return (
    <section>
      <SectionTitle top>API key Gemini</SectionTitle>
      <p className="text-mute mb-4 prose-block">
        Key lưu trong trình duyệt này và gửi kèm mỗi lần gọi; server không lưu.
      </p>
      <div className="border-l-4 border-tape bg-tape-soft px-4 py-3 text-sm mb-5 prose-block space-y-1">
        <p>Bậc miễn phí hiện chỉ khoảng <b>20 lượt/ngày</b> cho các model Flash (3.5–3.8) và khoảng <b>500 lượt/ngày</b> cho Flash-Lite; model Pro không có ở bậc miễn phí.</p>
        <p>Giới hạn tính theo <b>project Google Cloud</b>, không theo key: nhiều key tạo trong cùng một project dùng chung một phần lượt. Muốn thêm lượt miễn phí, key phải thuộc project khác nhau.</p>
      </div>
      <div className="mb-5">
        <span className="block text-sm font-semibold mb-1">Thứ tự dùng key</span>
        <Choice<KeyOrder>
          value={order}
          onChange={(v) => { setOrder(v); saveKeyOrder(v); }}
          options={[
            { value: 'free-first', label: 'Miễn phí trước' },
            { value: 'model-first', label: 'Model mạnh trước' },
          ]}
        />
        <p className="text-sm text-mute mt-1 prose-block">
          {order === 'free-first'
            ? 'Thử mọi model bằng key miễn phí (Flash rồi Flash-Lite), hết cách mới dùng key trả phí. Tiết kiệm tiền; khi Flash miễn phí hết lượt, kết quả do Flash-Lite viết có thể kém hơn.'
            : 'Giữ model đã chọn cho từng việc; key miễn phí của model đó hết lượt thì dùng ngay key trả phí. Chất lượng ổn định hơn nhưng tốn tiền sớm hơn.'}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem_9rem_auto] items-end mb-4">
        <Field label="Key mới">
          <input className={inputCls} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="AIza…" />
        </Field>
        <Field label="Tên gợi nhớ">
          <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="VD: tài khoản 2" />
        </Field>
        <Field label="Nhóm">
          <select className={inputCls} value={tier} onChange={(e) => setTier(e.target.value as Tier)}>
            <option value="free">Miễn phí</option>
            <option value="paid">Trả phí</option>
          </select>
        </Field>
        <Button kind="primary" onClick={add} disabled={draft.trim().length < 20}>Thêm key</Button>
      </div>
      <ErrorNote message={error} onClose={() => setError('')} />
      {(['free', 'paid'] as Tier[]).map((t) => (
        <div key={t} className="mt-4">
          <h3 className="font-semibold mb-2">{t === 'free' ? 'Nhóm miễn phí' : 'Nhóm trả phí'} ({book[t].length})</h3>
          {!book[t].length && <p className="text-sm text-mute">Chưa có key.</p>}
          <ul className="divide-y divide-line border-y border-line">
            {book[t].map((k) => (
              <li key={k.id} className="flex flex-wrap items-center gap-3 py-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={k.enabled} onChange={(e) => update(t, k.id, { enabled: e.target.checked })} />
                  <span className="font-mono text-sm">{mask(k.key)}</span>
                </label>
                <span className="text-sm text-mute flex-1">{k.label}</span>
                <Button small onClick={() => test(t, k.id, k.key)} busy={testing === k.id}>Kiểm tra</Button>
                <Button small kind="danger" onClick={() => remove(t, k.id)}>Xoá</Button>
                {k.models?.length ? (
                  <ul className="basis-full text-sm pl-6 grid sm:grid-cols-3 gap-x-4">
                    {k.models.map((m) => (
                      <li key={m.model} className={m.ok ? 'text-good' : 'text-bad'}>{m.name}: {m.message}</li>
                    ))}
                  </ul>
                ) : (
                  k.status && <p className={`basis-full text-sm pl-6 ${k.status === 'ok' ? 'text-good' : 'text-bad'}`}>{k.message}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="text-sm text-mute mt-2">Mỗi lần Kiểm tra gọi thử 3 model, tốn 1 lượt của mỗi model còn dùng được.</p>
      <div className="flex gap-3 mt-4">
        <Button small onClick={exportKeys}>Tải file key</Button>
        <Button small onClick={() => fileRef.current?.click()}>Nạp file key</Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              const r = importKeys(await f.text());
              setError('');
              alert(`Đã thêm ${r.free} key miễn phí, ${r.paid} key trả phí.`);
            } catch (err: any) {
              setError(err.message);
            }
            e.target.value = '';
          }}
        />
      </div>
    </section>
  );
}

function Knowledge({ info, reload }: { info?: KnowledgeInfo; reload: () => void }) {
  const s = info?.status;
  return (
    <section>
      <SectionTitle aside={<Button small onClick={reload}>Đọc lại</Button>}>Kho kiến thức</SectionTitle>
      <p className="text-mute mb-4 prose-block">
        Mọi luật app gửi cho Gemini nằm trong thư mục <span className="font-mono">knowledge/</span>. Sửa file ở đó là đổi cách app làm việc, không cần sửa code. Server đọc lại sau tối đa 30 giây.
      </p>
      {!s ? (
        <p className="text-mute">Đang đọc…</p>
      ) : (
        <>
          {s.errors.length ? (
            <ErrorNote message={`Kho có ${s.errors.length} lỗi:\n• ${s.errors.join('\n• ')}`} />
          ) : (
            <p className="text-good font-medium mb-3">Kho đầy đủ, không có lỗi.</p>
          )}
          <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3 mt-3">
            {[
              ['Lời dặn các bước (buoc/)', s.steps],
              ['Thể loại (kich-ban/)', s.scriptTypes],
              ['Module tình huống (module/)', s.modules],
              ['Mô hình video (mo-hinh/)', s.models],
            ].map(([title, list]: any) => (
              <div key={title}>
                <dt className="font-semibold">{title}: {list.length}</dt>
                <dd className="text-sm text-mute">{list.map((d: any) => d.name).join(', ') || '—'}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}

function Models() {
  const [prefs, setPrefs] = useState(loadModelPrefs());
  const options = selectableModels();
  return (
    <section>
      <SectionTitle aside={<Button small kind="quiet" onClick={() => { resetModelPrefs(); setPrefs(loadModelPrefs()); }}>Về mặc định</Button>}>
        Model cho từng việc
      </SectionTitle>
      <p className="text-mute mb-4 prose-block">Model không gọi được (hết lượt, không có ở bậc miễn phí) thì app tự lùi về Flash rồi Flash-Lite.</p>
      <div className="divide-y divide-line border-y border-line">
        {TASKS.map((t) => (
          <div key={t.key} className="grid sm:grid-cols-[1fr_16rem] gap-2 py-2 items-center">
            <div>
              <p className="font-medium">{t.label}</p>
              <p className="text-sm text-mute">{t.why}</p>
            </div>
            <select
              className={inputCls}
              value={prefs[t.key]}
              onChange={(e) => {
                const next = { ...prefs, [t.key]: e.target.value };
                setPrefs(next);
                saveModelPrefs(next);
              }}
            >
              {options.map((m) => (
                <option key={m.id} value={m.id}>{m.name}{m.status === 'retiring' ? ' (sắp ngừng)' : ''}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </section>
  );
}

function UsagePanel() {
  const [u, setU] = useState(loadUsage());
  useEffect(() => onUsageChange(() => setU(loadUsage())), []);
  const rows = Object.entries(u.byFeature);
  return (
    <section className="mb-16">
      <SectionTitle aside={<Button small kind="quiet" onClick={resetUsage}>Đặt lại</Button>}>Token đã dùng</SectionTitle>
      <p className="text-mute mb-4">
        Từ {new Date(u.since).toLocaleDateString('vi-VN')}: {u.total.calls} lượt gọi, {fmtTokens(u.total.input)} token vào, {fmtTokens(u.total.output)} token ra.
        Chi phí ước tính (chỉ key trả phí): {fmtUSD(u.total.cost)}.
      </p>
      {rows.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-line">
              <th className="py-1 font-semibold">Việc</th>
              <th className="font-semibold">Lượt</th>
              <th className="font-semibold">Vào</th>
              <th className="font-semibold">Ra</th>
              <th className="font-semibold">Chi phí</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([url, v]) => (
              <tr key={url} className="border-b border-line">
                <td className="py-1">{FEATURE_NAMES[url] || url}</td>
                <td>{v.calls}</td>
                <td>{fmtTokens(v.input)}</td>
                <td>{fmtTokens(v.output)}</td>
                <td>{fmtUSD(v.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
