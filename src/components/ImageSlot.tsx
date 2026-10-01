import { useRef, useState } from 'react';
import type { ImageSlot, Project } from '../../shared/types';
import { deleteImage, downloadDataUrl, putImage, readAndResize } from '../lib/images';
import { saveProject } from '../lib/store';
import { useImage } from './ui';

/* ---------------- Ô ảnh ---------------- */

export async function assign(project: Project, pairs: { tag: string; dataUrl: string }[]) {
  const images = { ...project.images };
  for (const { tag, dataUrl } of pairs) {
    const old = images[tag];
    images[tag] = await putImage(dataUrl);
    if (old) await deleteImage(old).catch(() => undefined);
  }
  saveProject({ ...project, images });
}

export function Slot({ project, slot, compact }: { project: Project; slot?: ImageSlot; compact?: boolean }) {
  const url = useImage(slot ? project.images[slot.tag] : undefined);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  if (!slot) return null;
  const upload = async (file: File) => {
    setBusy(true);
    try {
      await assign(project, [{ tag: slot.tag, dataUrl: await readAndResize(file) }]);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    const id = project.images[slot.tag];
    const images = { ...project.images };
    delete images[slot.tag];
    saveProject({ ...project, images });
    if (id) await deleteImage(id).catch(() => undefined);
  };
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className={`w-full ${compact ? 'aspect-[3/4]' : 'aspect-square'} rounded-md overflow-hidden grid place-items-center text-sm ${url ? 'border border-line bg-card' : 'border-2 border-dashed border-line text-mute hover:border-ink hover:text-ink'}`}
        aria-label={url ? `Thay ảnh @${slot.tag}` : `Nạp ảnh cho @${slot.tag}`}
      >
        {busy ? <span className="spinner" /> : url ? <img src={url} alt={`@${slot.tag}`} className="w-full h-full object-contain" /> : `Nạp ảnh @${slot.tag}`}
      </button>
      {url && (
        <div className="flex gap-3 text-sm">
          <button className="hover:underline underline-offset-4" onClick={() => downloadDataUrl(url, `${slot.tag}.jpg`)}>Tải về</button>
          <button className="text-bad hover:underline underline-offset-4" onClick={remove}>Xoá ảnh</button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
    </div>
  );
}
