import React, { useState } from 'react';
import { Copy, CheckCircle2, FolderPlus, FolderOpen, X } from 'lucide-react';

interface Props {
  brief: string;
  onSaveProject?: () => void;
  savedAsProject?: boolean;
  onClose?: () => void;
}

export default function BriefPanel({ brief, onSaveProject, savedAsProject, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(brief);
    } catch {
      // Trình duyệt chặn clipboard → dùng cách cũ
      const ta = document.createElement('textarea');
      ta.value = brief;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="bg-black text-white rounded-2xl p-5 sm:p-6 shadow-xl">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-primary-400">Hồ sơ ý tưởng</h3>
          <p className="text-sm text-gray-400 mt-0.5">
            Đủ thông tin mục 1.1 của LÕI. Lưu thành dự án để làm tiếp ngay trong app, hoặc sao chép dán vào Gem LÕI như cũ.
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10" title="Đóng">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed bg-white/5 border border-white/10 rounded-xl p-4 max-h-80 overflow-y-auto text-gray-100">
        {brief}
      </pre>

      <div className="flex flex-col sm:flex-row gap-2 mt-4">
        <button
          onClick={copy}
          className="flex-1 py-3 rounded-xl bg-primary-400 hover:bg-primary-300 text-black font-bold flex items-center justify-center gap-2 transition-colors"
        >
          {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Đã sao chép' : 'Sao chép cho Gem'}
        </button>
        {onSaveProject && (
          <button
            onClick={onSaveProject}
            className="flex-1 py-3 rounded-xl border border-white/20 hover:border-primary-400 hover:text-primary-400 font-bold flex items-center justify-center gap-2 transition-colors"
          >
            {savedAsProject ? <FolderOpen className="w-4 h-4" /> : <FolderPlus className="w-4 h-4" />}
            {savedAsProject ? 'Mở dự án' : 'Lưu thành dự án và làm tiếp'}
          </button>
        )}
      </div>
    </section>
  );
}
