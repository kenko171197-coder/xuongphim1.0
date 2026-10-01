import React from 'react';

// Hiển thị markdown đơn giản cho kịch bản của LÕI: tiêu đề, bảng, khối ```, danh sách, **đậm**, `mã`.
// Không dùng innerHTML nên nội dung AI trả về không thể chèn mã độc.

function inline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    const k = `${keyBase}-${i++}`;
    if (t.startsWith('**')) out.push(<strong key={k}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith('`')) out.push(<code key={k} className="bg-gray-100 rounded px-1 text-[0.9em]">{t.slice(1, -1)}</code>);
    else out.push(<em key={k}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const cells = (row: string) =>
  row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

export default function Markdown({ text }: { text: string }) {
  const lines = (text || '').replace(/\r/g, '').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const key = `b${i}`;

    if (line.trim().startsWith('```')) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) body.push(lines[i++]);
      i++;
      blocks.push(
        <pre key={key} className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs sm:text-sm overflow-x-auto whitespace-pre-wrap font-mono">
          {body.join('\n')}
        </pre>
      );
      continue;
    }

    if (line.trim().startsWith('|')) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++]);
      const body = rows.filter((r) => !/^\s*\|?[\s:|-]+\|?\s*$/.test(r));
      const [head, ...rest] = body;
      blocks.push(
        <div key={key} className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-primary-50">
              <tr>
                {cells(head || '').map((c, j) => (
                  <th key={j} className="text-left font-bold px-3 py-2 border-b border-gray-200 whitespace-nowrap">{inline(c, `${key}h${j}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rest.map((r, ri) => (
                <tr key={ri} className="odd:bg-white even:bg-gray-50 align-top">
                  {cells(r).map((c, j) => (
                    <td key={j} className="px-3 py-2 border-b border-gray-100">{inline(c, `${key}r${ri}c${j}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const size = ['text-xl', 'text-lg', 'text-base', 'text-sm'][h[1].length - 1];
      blocks.push(<p key={key} className={`${size} font-bold text-black mt-4`}>{inline(h[2], key)}</p>);
      i++;
      continue;
    }

    const li = /^(\s*)([-*•]|\d+[.)])\s+(.*)$/.exec(line);
    if (li) {
      const items: React.ReactNode[] = [];
      while (i < lines.length) {
        const m = /^(\s*)([-*•]|\d+[.)])\s+(.*)$/.exec(lines[i]);
        if (!m) break;
        items.push(
          <li key={i} style={{ marginLeft: `${Math.min(m[1].length, 8) * 0.5}rem` }}>
            {/\d/.test(m[2]) ? `${m[2]} ` : ''}
            {inline(m[3], `${key}l${i}`)}
          </li>
        );
        i++;
      }
      blocks.push(<ul key={key} className="space-y-1 list-none pl-2 border-l-2 border-primary-200">{items}</ul>);
      continue;
    }

    if (/^\s*-{3,}\s*$/.test(line)) {
      blocks.push(<hr key={key} className="border-gray-200" />);
      i++;
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(\s*```|\s*\||#{1,4}\s|\s*([-*•]|\d+[.)])\s)/.test(lines[i])) {
      para.push(lines[i++]);
    }
    if (!para.length) para.push(lines[i++]); // chốt an toàn: không bao giờ lặp vô tận
    blocks.push(
      <p key={key} className="leading-relaxed whitespace-pre-wrap">
        {inline(para.join('\n'), key)}
      </p>
    );
  }

  return <div className="space-y-3 text-sm text-gray-800">{blocks}</div>;
}
