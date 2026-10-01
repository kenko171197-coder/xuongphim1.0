// Xuất PDF bằng trình duyệt: dựng một trang in đầy đủ rồi mở hộp thoại In → "Lưu thành PDF".
// Dùng trình duyệt để in nên tiếng Việt luôn đúng dấu, không cần nhúng font.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Project } from '../types';
import { moduleInfo } from './modules';
import { projectLibrary } from './refs';
import { getImage } from './images';
import Markdown from '../components/Markdown';

const esc = (s: string) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

const md = (text: string) => renderToStaticMarkup(React.createElement(Markdown, { text }));

const CSS = `
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #111; font-size: 11pt; line-height: 1.5; margin: 0; }
  h1 { font-size: 22pt; margin: 0 0 4pt; }
  h2 { font-size: 15pt; margin: 18pt 0 8pt; padding: 4pt 10pt; background: #FFDD00; border-radius: 6pt; break-after: avoid; }
  h3 { font-size: 12.5pt; margin: 12pt 0 6pt; break-after: avoid; }
  .meta { color: #555; font-size: 10pt; margin-bottom: 10pt; }
  .box { border: 1px solid #ddd; border-radius: 8pt; padding: 8pt 10pt; margin: 6pt 0; break-inside: avoid; }
  .hook { background: #fffbe6; border-color: #f5d900; }
  .label { font-weight: 700; }
  table { border-collapse: collapse; width: 100%; font-size: 9.5pt; margin: 6pt 0; }
  th, td { border: 1px solid #ddd; padding: 4pt 6pt; text-align: left; vertical-align: top; }
  th { background: #fffbe6; }
  pre { white-space: pre-wrap; font-family: "SFMono-Regular", Consolas, monospace; font-size: 9pt; background: #f6f6f6; border-radius: 6pt; padding: 8pt; margin: 6pt 0; }
  .prompt { background: #111; color: #f2f2f2; }
  ul { padding-left: 14pt; margin: 4pt 0; }
  p { margin: 4pt 0; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8pt; }
  .card { border: 1px solid #ddd; border-radius: 8pt; padding: 8pt; break-inside: avoid; }
  .card img { width: 100%; max-height: 70mm; object-fit: contain; background: #fafafa; border-radius: 4pt; }
  .frames { display: flex; flex-wrap: wrap; gap: 6pt; }
  .frames figure { margin: 0; width: 48%; break-inside: avoid; }
  .frames img { width: 100%; border-radius: 4pt; border: 1px solid #ddd; }
  figcaption { font-size: 8.5pt; color: #555; }
  .beat { break-before: page; }
  .warn { color: #b00; }
  .tag { font-weight: 700; }
`;

export async function buildPrintHtml(p: Project): Promise<string> {
  const mod = moduleInfo(p.settings.module);
  const dir = p.directions?.find((d) => d.key === p.chosenDirection);
  const library = projectLibrary(p);
  const img = async (id?: string) => (id ? (await getImage(id).catch(() => undefined)) || '' : '');

  const parts: string[] = [];
  parts.push(`<h1>${esc(p.title)}</h1>`);
  parts.push(
    `<div class="meta">${esc(p.settings.module)} · ${esc(mod?.name || '')}${p.settings.secondary ? ` + ${esc(p.settings.secondary)}` : ''} · ${esc(p.settings.aspect)} · xuất ngày ${new Date().toLocaleDateString('vi-VN')}</div>`
  );
  parts.push(`<p>${esc(p.idea.logline)}</p>`);
  parts.push(
    `<div class="box hook"><p><span class="label">Móc:</span> ${esc(dir?.hook || p.idea.hook)}</p><p><span class="label">Lật:</span> ${esc(dir?.turn || p.idea.turn)}</p><p><span class="label">Chốt:</span> ${esc(dir?.ending || p.idea.ending)}</p></div>`
  );
  if (dir) {
    parts.push(`<h2>Hướng khai thác ${esc(dir.key)} — ${esc(dir.name)}</h2>`);
    parts.push(`<p>${esc(dir.core)}</p><p><span class="label">Khung truyện:</span> ${esc(dir.frame)} · <span class="label">Rủi ro Veo:</span> ${esc(dir.veoRisk)}</p>`);
  }

  if (p.script) {
    parts.push(`<h2>Kịch bản chia beat</h2>`);
    parts.push(`<p><span class="label">Thời lượng:</span> ${p.script.totalSeconds}s · ${p.script.beats.length} beat · <span class="label">Style:</span> ${esc(p.script.style)}</p>`);
    parts.push(md(p.script.markdown));
  }

  const designTags = library.filter((a) => a.kind !== 'frame' && !a.state);
  if (designTags.length) {
    parts.push(`<h2 style="break-before: page">Nhân vật & đạo cụ</h2><div class="grid">`);
    for (const a of designTags) {
      const url = await img(a.imageId);
      const c = p.design?.characters.find((x) => x.tag === a.tag);
      const pr = p.design?.props.find((x) => x.tag === a.tag);
      parts.push(
        `<div class="card">${url ? `<img src="${url}" alt="@${esc(a.tag)}">` : '<p class="warn">Chưa có ảnh</p>'}<p class="tag">@${esc(a.tag)} · ${a.kind === 'character' ? 'Nhân vật' : '★ Đạo cụ'}</p><p><span class="label">Note:</span> ${esc(a.note)}</p>${
          c ? `<p>${esc([c.age, c.appearance, c.outfit].filter(Boolean).join(' · '))}</p>` : pr ? `<p>${esc(pr.description)}</p>` : ''
        }</div>`
      );
    }
    parts.push(`</div>`);
  }

  if (p.script?.beats.length) {
    for (const b of p.script.beats) {
      const w = p.beats?.[b.id];
      const scene = p.scenes?.find((s) => s.beats.includes(b.id));
      parts.push(`<section class="beat"><h2>${esc(b.id)} — ${esc(b.name)} · ${b.duration}s</h2>`);
      if (scene) parts.push(`<div class="meta">${esc(scene.id)} · ${esc(scene.location)} · ${esc(scene.time)} · ${esc(scene.light)}</div>`);
      parts.push(`<p>${esc(b.summary)}</p>`);
      if (w?.input) {
        const i = w.input;
        parts.push(
          `<p><span class="label">Thiết lập:</span> ${i.duration}s · ${i.promptType === 'multishot' ? 'Multishot' : 'Continuous'} · ${esc(i.cinematicLevel)} · ${esc(i.pacing)}${i.borrowed ? ` · mượn ${esc(i.borrowed)}` : ''}</p>`
        );
        if (i.refs.length) parts.push(`<p><span class="label">Ảnh nạp:</span> ${i.refs.map((r) => '@' + esc(r.tag)).join(', ')}</p>`);
        parts.push(`<h3>Ô The Script</h3><pre>${esc(i.script)}</pre>`);
      } else {
        parts.push(`<p class="warn">Chưa viết đầu vào.</p>`);
      }
      if (w?.engine) {
        if (w.engine.warnings.length) parts.push(`<ul class="warn">${w.engine.warnings.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`);
        parts.push(`<h3>Prompt Veo</h3><pre class="prompt">${esc(w.engine.finalPrompt)}</pre>`);
      }
      const shots = library.filter((a) => a.beatId === b.id && (a.kind === 'frame' || a.state) && a.imageId);
      if (shots.length) {
        parts.push(`<h3>Frame đã chụp</h3><div class="frames">`);
        for (const f of shots) {
          const url = await img(f.imageId);
          parts.push(
            `<figure>${url ? `<img src="${url}" alt="@${esc(f.tag)}">` : ''}<figcaption><b>@${esc(f.tag)}</b>${typeof f.score === 'number' ? ` · ${f.score}/10` : ''} — ${esc(f.note)}</figcaption></figure>`
          );
        }
        parts.push(`</div>`);
      }
      parts.push(`</section>`);
    }
  }

  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${esc(p.title)}</title><style>${CSS}</style></head><body>${parts.join('\n')}</body></html>`;
}

/** Mở hộp thoại In của trình duyệt với bản in dự án (chọn "Lưu thành PDF"). */
export async function exportProjectPdf(p: Project) {
  const html = await buildPrintHtml(p);
  // In qua iframe ẩn: không bị chặn popup, chạy được cả trong AI Studio
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) throw new Error('Trình duyệt không cho tạo bản in.');
  doc.open();
  doc.write(html);
  doc.close();
  await new Promise<void>((resolve) => {
    const imgs = Array.from(doc.images);
    let left = imgs.length;
    if (!left) return resolve();
    const done = () => --left <= 0 && resolve();
    imgs.forEach((im) => (im.complete ? done() : ((im.onload = done), (im.onerror = done))));
    setTimeout(resolve, 4000);
  });
  frame.contentWindow?.focus();
  frame.contentWindow?.print();
  setTimeout(() => frame.remove(), 60_000);
}
