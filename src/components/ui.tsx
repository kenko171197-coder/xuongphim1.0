import { useEffect, useState, type ReactNode } from 'react';
import { getImage } from '../lib/images';

type BtnKind = 'primary' | 'plain' | 'quiet' | 'danger';

export function Button(props: {
  children: ReactNode;
  onClick?: () => void;
  kind?: BtnKind;
  disabled?: boolean;
  busy?: boolean;
  title?: string;
  small?: boolean;
}) {
  const { kind = 'plain', small } = props;
  const base = `inline-flex items-center gap-2 font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
    small ? 'px-2.5 py-1 text-sm' : 'px-4 py-2'
  }`;
  const look: Record<BtnKind, string> = {
    primary: 'bg-ink text-white hover:bg-black',
    plain: 'bg-card border border-line hover:border-ink',
    quiet: 'text-mute hover:text-ink underline-offset-4 hover:underline',
    danger: 'text-bad hover:bg-bad-soft',
  };
  return (
    <button type="button" title={props.title} className={`${base} ${look[kind]}`} disabled={props.disabled || props.busy} onClick={props.onClick}>
      {props.busy && <span className="spinner" aria-hidden />}
      {props.children}
    </button>
  );
}

export const Tag = ({ tag }: { tag: string }) => <span className="tape">@{tag}</span>;

/** Hiện chữ có @tag thành băng dính vàng */
export function TagText({ text }: { text: string }) {
  const parts = text.split(/(@[a-z0-9-]+)/g);
  return (
    <>
      {parts.map((p, i) => (/^@[a-z0-9-]+$/.test(p) ? <Tag key={i} tag={p.slice(1)} /> : <span key={i}>{p}</span>))}
    </>
  );
}

export function ErrorNote({ message, onClose }: { message: string; onClose?: () => void }) {
  if (!message) return null;
  return (
    <div role="alert" className="border-l-4 border-bad bg-bad-soft px-4 py-3 text-sm flex gap-3 items-start">
      <span className="flex-1 whitespace-pre-wrap">{message}</span>
      {onClose && <button className="text-mute hover:text-ink" onClick={onClose} aria-label="Đóng">✕</button>}
    </div>
  );
}

export function Warnings({ items, title = 'Cần xem lại' }: { items: string[]; title?: string }) {
  if (!items?.length) return null;
  return (
    <div className="border-l-4 border-tape bg-tape-soft px-4 py-3 text-sm">
      <p className="font-semibold mb-1">{title}</p>
      <ul className="list-disc pl-5 space-y-0.5">
        {items.map((w, i) => (
          <li key={i}><TagText text={w} /></li>
        ))}
      </ul>
    </div>
  );
}

export function CopyBlock({ label, text, hint }: { label: string; text: string; hint?: string }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="border border-line rounded-md bg-card">
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-line">
        <span className="text-sm font-semibold flex-1">{label}</span>
        <button className="text-sm font-medium hover:underline underline-offset-4" onClick={copy}>
          {copied ? 'Đã chép' : 'Chép'}
        </button>
      </div>
      {hint && <p className="px-3 pt-2 text-sm text-mute">{hint}</p>}
      <pre className="px-3 py-2 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap break-words max-h-64 overflow-auto">{text}</pre>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold mb-1">{label}</span>
      {children}
      {hint && <span className="block text-sm text-mute mt-1">{hint}</span>}
    </label>
  );
}

export const inputCls = 'w-full rounded-md border border-line bg-card px-3 py-2 focus:border-ink outline-none';

/** Chọn một trong vài lựa chọn (nút liền nhau) */
export function Choice<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-md border border-line bg-card p-0.5" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 text-sm rounded ${value === o.value ? 'bg-ink text-white' : 'hover:bg-paper'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Ảnh lưu trong IndexedDB */
export function useImage(id?: string) {
  const [url, setUrl] = useState<string | undefined>();
  useEffect(() => {
    let alive = true;
    if (!id) {
      setUrl(undefined);
      return;
    }
    getImage(id).then((u) => alive && setUrl(u)).catch(() => alive && setUrl(undefined));
    return () => {
      alive = false;
    };
  }, [id]);
  return url;
}

export function SectionTitle({ children, aside, top }: { children: ReactNode; aside?: ReactNode; top?: boolean }) {
  return (
    <div className={`flex items-end gap-4 border-b-2 border-ink pb-1 mb-4 ${top ? 'mt-0' : 'mt-12'}`}>
      <h2 className="text-xl font-bold flex-1">{children}</h2>
      {aside}
    </div>
  );
}
