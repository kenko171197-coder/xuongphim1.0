import { useEffect, useRef, useState } from 'react';
import type { Assets, ImageSlot, LocationAsset, Project, ScriptType } from '../../shared/types';
import { imageSlots, missingAssets } from '../../shared/types';
import { requestAngles, requestAssets, requestMatch, requestStyle } from '../lib/api';
import { downloadDataUrl, getImage, readAndResize, shrinkDataUrl, splitDataUrl } from '../lib/images';
import { saveProject } from '../lib/store';
import { Button, CopyBlock, ErrorNote, Field, SectionTitle, Tag, TagText, Warnings, inputCls } from './ui';
import { Slot, assign } from './ImageSlot';

export default function AssetsStep({ project, type, onNext }: { project: Project; type?: ScriptType; onNext?: () => void }) {
  const a = project.assets;
  const [style, setStyle] = useState(project.style || a?.style || type?.style || '');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  if (!project.outline) return <p className="text-mute">Cần có outline trước. Quay lại bước 2.</p>;

  const commitStyle = (value: string) => {
    setStyle(value);
    if (value !== project.style) saveProject({ ...project, style: value });
  };

  const generate = async (fb = '', previous?: Assets) => {
    setBusy('assets');
    setError('');
    try {
      const r = await requestAssets(project, style, fb, previous);
      saveProject({ ...project, style, assets: r.assets, assetsPrev: project.assets });
      setFeedback('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const slots = imageSlots(a);
  const done = slots.filter((s) => project.images[s.tag]).length;

  return (
    <div className="max-w-4xl">
      <StylePanel project={project} style={style} setStyle={setStyle} commit={commitStyle} fallback={type?.style || ''} setError={setError} />

      {!a ? (
        <div className="mt-8">
          <p className="mb-4 prose-block">
            App sẽ viết prompt ảnh cho mọi nhân vật, đạo cụ chính và bối cảnh trong outline, kèm cụm mô tả tiếng Anh cố định cho từng @tag. Bạn tạo ảnh ở Nano Banana rồi nạp về đây.
          </p>
          <Button kind="primary" onClick={() => generate()} busy={busy === 'assets'} disabled={style.trim().length < 8}>Tạo tài sản</Button>
          <div className="mt-4"><ErrorNote message={error} onClose={() => setError('')} /></div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4 mt-8 mb-4">
            <p className="flex-1">
              Đã có ảnh <span className="font-bold">{done}/{slots.length}</span> ô.
              {a.style !== style && <span className="text-bad"> Style đã đổi so với lúc tạo tài sản — nên tạo lại hoặc sửa theo góp ý.</span>}
            </p>
            <Button onClick={() => downloadPrompts(project)}>Tải file prompt</Button>
          </div>
          <Warnings items={a.warnings} />
          {missingAssets(project.outline, a).length > 0 && (
            <div className="mt-3">
              <Warnings
                title="Outline có thêm tag mới"
                items={[`Chưa có tài sản cho ${missingAssets(project.outline, a).map((t) => '@' + t).join(', ')}. Dùng "Sửa theo góp ý" ở cuối trang, VD: "thêm tài sản cho các tag còn thiếu".`]}
              />
            </div>
          )}
          <BulkUpload project={project} slots={slots} setError={setError} />
          <div className="mt-2"><ErrorNote message={error} onClose={() => setError('')} /></div>

          <SectionTitle>Nhân vật</SectionTitle>
          <p className="text-sm text-mute -mt-2 mb-5 prose-block">Cụm mô tả tiếng Anh cạnh mỗi @tag sửa được trực tiếp (bấm vào để sửa). Nó được dùng nguyên văn trong mọi prompt ảnh và video, nên hãy chốt sớm.</p>
          <div className="space-y-8">
            {a.characters.map((c) => (
              <article key={c.tag} className="grid md:grid-cols-[1fr_14rem] gap-5">
                <div className="space-y-3 min-w-0">
                  <AssetHead project={project} tag={c.tag} desc={c.desc} note={c.note} />
                  <dl className="grid sm:grid-cols-2 gap-x-5 gap-y-1 text-sm">
                    <Row k="Tuổi" v={c.age} /><Row k="Tính cách" v={c.personality} /><Row k="Ngoại hình" v={c.look} />
                    <Row k="Trang phục" v={c.outfit} /><Row k="Biểu cảm mặc định" v={c.expression} /><Row k="Tỉ lệ" v={c.scale} />
                  </dl>
                  <CopyBlock label="Ảnh một góc" text={c.standardPrompt} />
                  <CopyBlock label="Character Reference Sheet" text={c.sheetPrompt} hint="Nên nạp ảnh sheet này làm ảnh tham chiếu chính của nhân vật." />
                </div>
                <Slot project={project} slot={slots.find((s) => s.tag === c.tag)!} />
              </article>
            ))}
          </div>

          <SectionTitle>Đạo cụ</SectionTitle>
          {!a.props.length && <p className="text-mute">Phim không có đạo cụ chính.</p>}
          <div className="space-y-8">
            {a.props.map((p) => (
              <article key={p.tag} className="space-y-4">
                <div className="grid md:grid-cols-[1fr_14rem] gap-5">
                  <div className="space-y-3 min-w-0">
                    <AssetHead project={project} tag={p.tag} desc={p.desc} note={p.note} />
                    <p className="text-sm"><TagText text={p.description} /></p>
                    <CopyBlock label="Prompt ảnh" text={p.imagePrompt} />
                  </div>
                  <Slot project={project} slot={slots.find((s) => s.tag === p.tag)!} />
                </div>
                {p.variants.map((v) => (
                  <div key={v.tag} className="grid md:grid-cols-[1fr_14rem] gap-5 pl-5 border-l-2 border-line">
                    <div className="space-y-3 min-w-0">
                      <AssetHead project={project} tag={v.tag} desc={v.desc} note={v.note} />
                      <p className="text-sm"><span className="font-semibold">Trạng thái:</span> <TagText text={v.state} /></p>
                      <CopyBlock label="Prompt sửa từ ảnh gốc" text={v.editPrompt} hint={`Nạp ảnh @${p.tag} làm ảnh tham chiếu rồi dùng prompt này. Cũng có thể chụp từ video sau.`} />
                    </div>
                    <Slot project={project} slot={slots.find((s) => s.tag === v.tag)!} />
                  </div>
                ))}
              </article>
            ))}
          </div>

          <SectionTitle>Bối cảnh</SectionTitle>
          <p className="text-sm text-mute -mt-2 mb-5 prose-block">
            Làm hai lượt: tạo ảnh góc a trước và nạp vào app; sau đó bấm "Viết prompt góc phụ" để AI nhìn ảnh thật, sửa sơ đồ theo ảnh và viết prompt các góc còn lại.
          </p>
          <div className="space-y-12">
            {a.locations.map((l) => (
              <LocationBlock key={l.tag} project={project} location={l} slots={slots} />
            ))}
          </div>

          <SectionTitle>Sửa tài sản</SectionTitle>
          <Field label="Góp ý của bạn" hint="Tag và cụm mô tả được giữ nguyên nếu góp ý không nhắc tới.">
            <textarea className={`${inputCls} min-h-20`} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="VD: thêm góc máy nhìn từ lỗ chuột ra; chuột đeo khăn quàng đỏ" />
          </Field>
          <div className="flex flex-wrap gap-3 mt-3">
            <Button kind="primary" onClick={() => generate(feedback, a)} busy={busy === 'assets'} disabled={feedback.trim().length < 5}>Sửa theo góp ý</Button>
            {project.assetsPrev && (
              <Button onClick={() => saveProject({ ...project, assets: project.assetsPrev, assetsPrev: undefined })} disabled={!!busy}>Hoàn tác lần sửa trước</Button>
            )}
            <Button kind="quiet" onClick={() => confirm('Tạo lại toàn bộ tài sản? Ảnh đã nạp vẫn giữ theo tag.') && generate()} disabled={!!busy}>Tạo lại từ đầu</Button>
          </div>
          {onNext && (
            <div className="border-t border-line pt-6 mt-8 mb-16">
              <Button kind="primary" onClick={onNext}>Sang bước Shot list</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const Row = ({ k, v }: { k: string; v: string }) =>
  v ? (
    <div>
      <dt className="font-semibold inline">{k}: </dt>
      <dd className="inline">{v}</dd>
    </div>
  ) : null;

/* ---------------- Bối cảnh: hai lượt ---------------- */

function LocationBlock({ project, location: l, slots }: { project: Project; location: LocationAsset; slots: ImageSlot[] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [extra, setExtra] = useState('');
  const main = l.angles[0];
  const mainImage = main ? project.images[main.tag] : undefined;
  const secondary = l.angles.slice(1);
  const written = secondary.some((g) => g.prompt);
  const staleImages = secondary.filter((g) => project.images[g.tag]).map((g) => g.tag);

  const writeAngles = async () => {
    if (!mainImage || !project.assets) return;
    setBusy(true);
    setError('');
    try {
      const url = await getImage(mainImage);
      if (!url) throw new Error(`Không đọc được ảnh @${main.tag} trong trình duyệt. Nạp lại ảnh góc a.`);
      const r = await requestAngles(project, l, splitDataUrl(await shrinkDataUrl(url, 1024)), extra);
      const assets = project.assets;
      saveProject({ ...project, assets: { ...assets, locations: assets.locations.map((x) => (x.tag === l.tag ? r.location : x)) }, assetsPrev: assets });
      setExtra('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="space-y-5">
      <AssetHead project={project} tag={l.tag} desc={l.desc} note={l.note} />
      <div className="bg-card border border-line rounded-md p-4 text-sm">
        <p className="font-semibold mb-1">Sơ đồ{l.seen ? ' (đã sửa theo ảnh góc a)' : ' (dự kiến, chưa đối chiếu ảnh)'}</p>
        <p className="whitespace-pre-wrap"><TagText text={l.layout} /></p>
        <p className="mt-2"><span className="font-semibold">Tỉ lệ:</span> <TagText text={l.scale} /></p>
        {l.seen && (
          <p className="mt-2"><span className="font-semibold">AI thấy trong ảnh góc a:</span> <TagText text={l.seen} /></p>
        )}
      </div>
      {!!l.angleWarnings?.length && <Warnings title="Ảnh góc a lệch so với kế hoạch" items={l.angleWarnings} />}

      {main && <AngleRow project={project} location={l} angle={main} index={0} slots={slots} />}

      <div className="border-l-4 border-ink bg-card px-4 py-3 space-y-3">
        <p className="font-semibold">Lượt 2: góc phụ</p>
        {!mainImage ? (
          <p className="text-sm">Nạp ảnh <Tag tag={main?.tag || l.tag} /> trước. Prompt góc phụ phải viết từ ảnh thật, không viết trước được.</p>
        ) : (
          <>
            <p className="text-sm prose-block">
              AI đọc ảnh <Tag tag={main.tag} />, sửa sơ đồ theo ảnh, rồi viết prompt góc phụ buộc công cụ ảnh đổi vị trí máy
              (ưu tiên góc dễ: đẩy vào một khu vực, hạ máy thấp).
            </p>
            <Field label="Yêu cầu thêm (không bắt buộc)">
              <input className={inputCls} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="VD: cần một góc cận lỗ chuột ngang tầm chuột" />
            </Field>
            <Button kind="primary" onClick={writeAngles} busy={busy}>{written ? 'Viết lại prompt góc phụ' : 'Viết prompt góc phụ'}</Button>
            {written && staleImages.length > 0 && (
              <p className="text-sm text-mute">
                Ảnh đang có ở {staleImages.map((t) => '@' + t).join(', ')} được giữ nguyên. Nếu ảnh đó tạo từ prompt cũ, hãy xoá và tạo lại theo prompt mới.
              </p>
            )}
          </>
        )}
        <ErrorNote message={error} onClose={() => setError('')} />
      </div>

      {secondary.map((g, i) => (
        <AngleRow key={g.tag} project={project} location={l} angle={g} index={i + 1} slots={slots} />
      ))}
    </article>
  );
}

function AngleRow({ project, location: l, angle: g, index, slots }: { project: Project; location: LocationAsset; angle: LocationAsset['angles'][number]; index: number; slots: ImageSlot[] }) {
  return (
    <div className="grid md:grid-cols-[1fr_14rem] gap-5">
      <div className="space-y-2 min-w-0">
        <p className="font-semibold">Góc {g.id} <Tag tag={g.tag} />{index === 0 ? ' — góc chính, tạo trước' : ''}</p>
        <p className="text-sm"><TagText text={g.vi} /></p>
        <p className="text-sm text-mute font-mono">{g.en}. {g.light}</p>
        {g.prompt ? (
          <CopyBlock
            label={index === 0 ? 'Prompt ảnh góc chính' : 'Prompt ảnh góc phụ'}
            text={g.prompt}
            hint={index === 0 ? undefined : `Nạp ảnh @${l.angles[0].tag} làm ảnh tham chiếu. Nếu ảnh ra vẫn giữ nguyên góc máy cũ, bấm "Viết lại prompt góc phụ" kèm yêu cầu cụ thể hơn.`}
          />
        ) : (
          <p className="text-sm text-mute">Mới là kế hoạch. Prompt được viết ở lượt 2, sau khi có ảnh góc a.</p>
        )}
      </div>
      <Slot project={project} slot={slots.find((s) => s.tag === g.tag)} />
    </div>
  );
}

/* ---------------- Style ---------------- */

function StylePanel(props: { project: Project; style: string; setStyle: (s: string) => void; commit: (s: string) => void; fallback: string; setError: (e: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const fromImage = async (file: File) => {
    setBusy(true);
    try {
      const url = await readAndResize(file, 1024, 0.85);
      const r = await requestStyle(splitDataUrl(url), props.project.id);
      props.commit(r.style);
      setSummary(r.summary);
    } catch (e: any) {
      props.setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section>
      <SectionTitle top>Style của phim</SectionTitle>
      <Field label="Dòng style (tiếng Anh)" hint="Dùng nguyên văn trong mọi prompt ảnh và video của phim. Mọi ảnh tài sản phải cùng style này.">
        <textarea
          className={`${inputCls} min-h-16 font-mono text-sm`}
          value={props.style}
          onChange={(e) => props.setStyle(e.target.value)}
          onBlur={(e) => props.commit(e.target.value.trim())}
        />
      </Field>
      {summary && <p className="text-sm text-mute mt-1">{summary}</p>}
      <div className="flex flex-wrap gap-3 mt-3">
        <Button small onClick={() => fileRef.current?.click()} busy={busy}>Đọc style từ ảnh</Button>
        {props.fallback && props.style !== props.fallback && (
          <Button small kind="quiet" onClick={() => props.commit(props.fallback)}>Dùng style mặc định của thể loại</Button>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) fromImage(f); e.target.value = ''; }} />
      </div>
    </section>
  );
}

/* ---------------- Tag + cụm mô tả ---------------- */

function AssetHead({ project, tag, desc, note }: { project: Project; tag: string; desc: string; note: string }) {
  const [value, setValue] = useState(desc);
  useEffect(() => setValue(desc), [desc]);
  const commit = () => {
    const v = value.trim();
    if (!v || v === desc || !project.assets) return setValue(desc);
    saveProject({ ...project, assets: renameDesc(project.assets, tag, v) });
  };
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Tag tag={tag} />
        <input
          aria-label={`Cụm mô tả của @${tag}`}
          title="Cụm mô tả tiếng Anh — bấm để sửa"
          className="flex-1 min-w-48 font-mono text-sm border-b border-dashed border-line focus:border-ink bg-transparent py-0.5 outline-none"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </div>
      <p className="text-sm text-mute mt-1"><TagText text={note} /></p>
    </div>
  );
}

function renameDesc(a: Assets, tag: string, desc: string): Assets {
  return {
    ...a,
    characters: a.characters.map((c) => (c.tag === tag ? { ...c, desc } : c)),
    props: a.props.map((p) => ({ ...(p.tag === tag ? { ...p, desc } : p), variants: p.variants.map((v) => (v.tag === tag ? { ...v, desc } : v)) })),
    locations: a.locations.map((l) => (l.tag === tag ? { ...l, desc } : l)),
  };
}

/* ---------------- Nạp nhiều ảnh, AI gán @tag ---------------- */

interface Pending { dataUrl: string; tag: string; confidence: number; seen: string; warning: string }

function BulkUpload({ project, slots, setError }: { project: Project; slots: ImageSlot[]; setError: (e: string) => void }) {
  const [pending, setPending] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const scan = async (files: File[]) => {
    setBusy(true);
    setError('');
    try {
      const list = files.slice(0, 12);
      const full = await Promise.all(list.map((f) => readAndResize(f)));
      const small = await Promise.all(full.map((u) => shrinkDataUrl(u, 768)));
      const r = await requestMatch(project.id, small.map(splitDataUrl), slots.map((s) => ({ tag: s.tag, label: s.label, desc: s.desc, note: s.note })));
      setPending(full.map((dataUrl, i) => ({ dataUrl, ...(r.matches[i] || { tag: '', confidence: 0, seen: '', warning: '' }) })));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const chosen = pending.filter((p) => p.tag);
  const dupes = chosen.map((p) => p.tag).filter((t, i, arr) => arr.indexOf(t) !== i);

  return (
    <section className="mt-6 border border-line bg-card rounded-md p-4">
      <div className="flex flex-wrap items-center gap-4">
        <p className="flex-1 text-sm">Tạo xong nhiều ảnh? Nạp một lượt (tối đa 12 ảnh), AI đoán ảnh nào của @tag nào, bạn duyệt lại.</p>
        <Button onClick={() => fileRef.current?.click()} busy={busy}>Nạp nhiều ảnh</Button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { const fs = Array.from((e.target.files || []) as ArrayLike<File>); if (fs.length) scan(fs); e.target.value = ''; }} />
      </div>
      {pending.length > 0 && (
        <div className="mt-4 space-y-3">
          {pending.map((p, i) => (
            <div key={i} className="grid grid-cols-[5rem_1fr] gap-3 items-start border-t border-line pt-3">
              <img src={p.dataUrl} alt="" className="w-20 h-20 object-contain bg-paper rounded" />
              <div className="space-y-1 text-sm">
                <select
                  className={`${inputCls} py-1`}
                  value={p.tag}
                  onChange={(e) => setPending(pending.map((x, j) => (j === i ? { ...x, tag: e.target.value } : x)))}
                >
                  <option value="">Không gán</option>
                  {slots.map((s) => (
                    <option key={s.tag} value={s.tag}>@{s.tag} ({s.label}){project.images[s.tag] ? ' — đã có ảnh, sẽ thay' : ''}</option>
                  ))}
                </select>
                {p.tag && <p className="text-mute">AI tự tin {p.confidence}%. {p.seen}</p>}
                {p.warning && <p className="text-bad">{p.warning}</p>}
              </div>
            </div>
          ))}
          {dupes.length > 0 && <p className="text-bad text-sm">Có nhiều ảnh cùng gán cho {Array.from(new Set(dupes)).map((t) => '@' + t).join(', ')} — chỉ ảnh cuối được giữ.</p>}
          <div className="flex gap-3">
            <Button kind="primary" disabled={!chosen.length} onClick={async () => { await assign(project, chosen.map((c) => ({ tag: c.tag, dataUrl: c.dataUrl }))); setPending([]); }}>
              Gán {chosen.length} ảnh
            </Button>
            <Button kind="quiet" onClick={() => setPending([])}>Bỏ lượt này</Button>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------------- Tải toàn bộ prompt ra file chữ ---------------- */

function downloadPrompts(project: Project) {
  const a = project.assets;
  if (!a) return;
  const out: string[] = [`${project.title}\nStyle: ${a.style}\n`];
  a.characters.forEach((c) => out.push(`=== @${c.tag} (${c.desc}) — nhân vật: ảnh một góc ===\n${c.standardPrompt}\n`, `=== @${c.tag} — Character Reference Sheet ===\n${c.sheetPrompt}\n`));
  a.props.forEach((p) => {
    out.push(`=== @${p.tag} (${p.desc}) — đạo cụ ===\n${p.imagePrompt}\n`);
    p.variants.forEach((v) => out.push(`=== @${v.tag} (${v.desc}) — sửa từ ảnh @${p.tag} ===\n${v.editPrompt}\n`));
  });
  a.locations.forEach((l) =>
    l.angles.filter((g) => g.prompt).forEach((g, i) => out.push(`=== @${g.tag} (${l.desc}) — bối cảnh góc ${g.id}${i ? `, nạp ảnh @${l.angles[0].tag} làm tham chiếu` : ', tạo trước'} ===\n${g.prompt}\n`))
  );
  const blob = new Blob([out.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, `${project.title.replace(/[^\p{L}\p{N}]+/gu, '-')}_prompt-anh.txt`);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
