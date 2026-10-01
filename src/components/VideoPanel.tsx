import React, { useState } from 'react';
import { Clapperboard } from 'lucide-react';
import { VIDEO_PROFILES } from '../../shared/models';
import { loadVideoPrefs, saveVideoPrefs } from '../lib/videoPrefs';

export default function VideoPanel() {
  const [prefs, setPrefs] = useState(loadVideoPrefs);
  const update = (patch: Partial<typeof prefs>) => {
    const next = { ...prefs, ...patch };
    if (next.platform !== 'omni-flash') next.allow10 = false;
    setPrefs(next);
    saveVideoPrefs(next);
  };
  const current = VIDEO_PROFILES.find((v) => v.id === prefs.platform)!;

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-6 lg:col-span-2">
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-primary-400 text-black p-2.5 rounded-xl">
          <Clapperboard className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-lg text-black">Model tạo video (trên Flow)</h2>
          <p className="text-sm text-gray-500">Biên kịch viết beat theo giới hạn của model này; mỗi beat có hướng dẫn "Cách chạy trên Flow".</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Model tạo video">
        {VIDEO_PROFILES.map((v) => (
          <button
            key={v.id}
            role="radio"
            aria-checked={prefs.platform === v.id}
            onClick={() => update({ platform: v.id })}
            className={`text-left rounded-xl border px-3 py-2.5 transition-colors ${
              prefs.platform === v.id ? 'bg-primary-400 border-primary-400' : 'bg-gray-50 border-gray-200 hover:border-primary-400'
            }`}
          >
            <span className="block font-bold text-sm text-black">{v.name}</span>
            <span className="block text-xs text-gray-600">
              {v.maxRefs} ảnh tham chiếu · {v.durations.join('/')} giây
            </span>
          </button>
        ))}
      </div>
      <p className="text-sm text-gray-600 mt-3">{current.note}</p>
      {prefs.platform === 'omni-flash' && (
        <label className="flex items-start gap-2 mt-4 text-sm">
          <input type="checkbox" checked={prefs.allow10} onChange={(e) => update({ allow10: e.target.checked })} className="accent-black mt-0.5" />
          <span>
            <b>Cho phép beat 10 giây.</b> Nới luật 4/6/8 giây của LÕI: phim dài bớt khoảng 20% số clip, mỗi beat vẫn chỉ một chuyển biến. Áp dụng cho scene và beat viết từ lúc bật.
          </span>
        </label>
      )}
    </section>
  );
}
