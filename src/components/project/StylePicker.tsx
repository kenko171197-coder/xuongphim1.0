import React, { useRef, useState } from 'react';
import { Palette, ImagePlus, Loader2, CheckCircle2 } from 'lucide-react';
import type { Project, ProjectPatch, StyleChoice } from '../../types';
import { STYLE_PRESETS, STYLE_GROUPS, effectiveStyle, replaceStyleLine } from '../../lib/styles';
import { assemble } from '../../lib/script';
import { styleFromImage } from '../../services/api';
import { putImage, deleteImage, readAndResize, shrinkDataUrl, splitDataUrl } from '../../lib/images';
import { useImage } from '../../lib/useImage';
import { CopyButton, ErrorBox } from '../ui';

interface Props {
  project: Project;
  onUpdate: (patch: ProjectPatch) => void;
}

/** Lưu lựa chọn style và cập nhật style của kịch bản đã ghép. */
function applyChoice(latest: Project, choice: StyleChoice): Partial<Project> {
  const next = { ...latest, styleChoice: choice } as Project;
  if (next.outline) return { styleChoice: choice, ...assemble(next) };
  // Dự án cũ (không có đề cương): sửa thẳng style của kịch bản
  return { styleChoice: choice, script: next.script ? { ...next.script, style: effectiveStyle(next) } : next.script };
}

export default function StylePicker({ project, onUpdate }: Props) {
  const choice: StyleChoice = project.styleChoice || { mode: 'ai' };
  const current = effectiveStyle(project);
  const aiStyle = project.outline?.style || '';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const imageUrl = useImage(choice.imageId);
  const preset = STYLE_PRESETS.find((s) => s.id === choice.presetId);

  const setChoice = (c: StyleChoice) => onUpdate((latest) => applyChoice(latest, c));

  // Beat đã viết có dòng Style khác style hiện tại
  const outdated = Object.entries(project.beats || {}).filter(
    ([, w]) => w.input && current && !w.input.script.includes(`Style: ${current}`)
  );

  const applyToBeats = () =>
    onUpdate((latest) => {
      const style = effectiveStyle(latest);
      const beats = { ...(latest.beats || {}) };
      for (const [id, w] of Object.entries(beats)) {
        if (w.input) beats[id] = { ...w, input: { ...w.input, script: replaceStyleLine(w.input.script, style) } };
      }
      return { beats };
    });

  const readImage = async (file: File) => {
    setBusy(true);
    setError('');
    try {
      const full = await readAndResize(file, 1536);
      const r = await styleFromImage(splitDataUrl(await shrinkDataUrl(full, 1024)), project.id);
      const id = await putImage(full);
      if (choice.imageId) await deleteImage(choice.imageId).catch(() => undefined);
      setChoice({ mode: 'image', imageId: id, imageStyle: r.style, imageSummary: r.summary });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const option = (mode: StyleChoice['mode'], title: string, sub: string) => (
    <label
      className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
        choice.mode === mode ? 'bg-primary-50 border-primary-400' : 'bg-white border-gray-200 hover:border-primary-400'
      }`}
    >
      <input
        type="radio"
        name={`style-${project.id}`}
        checked={choice.mode === mode}
        onChange={() =>
          setChoice(
            mode === 'preset'
              ? { mode, presetId: choice.presetId || STYLE_PRESETS[0].id }
              : mode === 'image'
              ? { mode, imageId: choice.imageId, imageStyle: choice.imageStyle, imageSummary: choice.imageSummary }
              : { mode }
          )
        }
        className="accent-black mt-1"
      />
      <span>
        <span className="block font-bold text-sm text-black">{title}</span>
        <span className="block text-xs text-gray-500">{sub}</span>
      </span>
    </label>
  );

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-black flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary-600" />
            Style của phim
          </h3>
          <p className="text-sm text-black mt-1 font-mono break-words">{current || 'Chưa có — sẽ có khi viết đề cương (AI chọn theo module).'}</p>
          {choice.mode === 'preset' && preset && <p className="text-xs text-gray-500 mt-0.5">{preset.vi}</p>}
          {choice.mode === 'image' && choice.imageSummary && <p className="text-xs text-gray-500 mt-0.5">{choice.imageSummary}</p>}
        </div>
        {current && <CopyButton text={current} />}
      </div>

      <div className="grid md:grid-cols-3 gap-2">
        {option('ai', 'Style AI chọn theo module', aiStyle ? 'Theo gợi ý style của module' : 'Chọn khi viết đề cương')}
        {option('preset', 'Chọn style mẫu', `${STYLE_PRESETS.length} style phổ biến cho Veo / Nano Banana`)}
        {option('image', 'Tham chiếu style từ ảnh', 'Gửi ảnh, AI đọc phong cách')}
      </div>

      {choice.mode === 'preset' && (
        <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
          {STYLE_GROUPS.map((g) => (
            <div key={g}>
              <p className="sticky top-0 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-600">{g}</p>
              {STYLE_PRESETS.filter((s) => s.group === g).map((s) => (
                <label
                  key={s.id}
                  className={`flex items-start gap-3 px-3 py-2 cursor-pointer ${choice.presetId === s.id ? 'bg-primary-50' : 'hover:bg-gray-50'}`}
                >
                  <input
                    type="radio"
                    name={`preset-${project.id}`}
                    checked={choice.presetId === s.id}
                    onChange={() => setChoice({ mode: 'preset', presetId: s.id })}
                    className="accent-black mt-1"
                  />
                  <span className="text-sm">
                    <span className="block text-black font-medium">{s.en}</span>
                    <span className="block text-gray-500">{s.vi}</span>
                  </span>
                </label>
              ))}
            </div>
          ))}
        </div>
      )}

      {choice.mode === 'image' && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="sm:w-40 shrink-0 space-y-2">
            <div className="aspect-square rounded-xl bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center">
              {imageUrl ? <img src={imageUrl} alt="Ảnh tham chiếu style" className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400">Chưa có ảnh</span>}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) readImage(f);
                e.target.value = '';
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="w-full py-2 rounded-xl bg-black text-primary-400 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              {busy ? 'Đang đọc style…' : imageUrl ? 'Đổi ảnh' : 'Gửi ảnh'}
            </button>
          </div>
          <div className="flex-1 space-y-1.5">
            <label htmlFor={`imgstyle-${project.id}`} className="text-sm font-bold text-black">Style đọc từ ảnh (sửa được)</label>
            <textarea
              id={`imgstyle-${project.id}`}
              rows={3}
              value={choice.imageStyle || ''}
              onChange={(e) => setChoice({ ...choice, mode: 'image', imageStyle: e.target.value })}
              placeholder="Gửi ảnh để AI điền style…"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
        </div>
      )}

      <ErrorBox message={error} />

      {outdated.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-primary-100 border border-primary-300 rounded-xl px-4 py-3 text-sm">
          <span className="flex-1">
            {outdated.length} beat đã viết đang dùng style khác. Beat viết từ giờ sẽ theo style mới.
          </span>
          <button onClick={applyToBeats} className="font-bold underline flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Đổi dòng Style của {outdated.length} beat đó
          </button>
        </div>
      )}
    </section>
  );
}
