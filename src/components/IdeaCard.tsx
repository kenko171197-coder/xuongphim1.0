import React from 'react';
import { Heart, ThumbsDown, Shuffle, Check, Users, MessageSquare, Film } from 'lucide-react';
import type { Idea } from '../types';
import { VEO_LEVEL } from '../lib/modules';

interface Props {
  idea: Idea;
  liked?: boolean;
  disliked?: boolean;
  selected?: boolean;
  busy?: boolean;
  badge?: string;
  onLike?: () => void;
  onDislike?: () => void;
  onVariations?: () => void;
  onSelect?: () => void;
  selectLabel?: string;
  children?: React.ReactNode;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-2 text-sm leading-relaxed">
      <span className="font-bold text-primary-700">{label}</span>
      <span className="text-gray-800">{children}</span>
    </div>
  );
}

export default function IdeaCard({
  idea,
  liked,
  disliked,
  selected,
  busy,
  badge,
  onLike,
  onDislike,
  onVariations,
  onSelect,
  selectLabel = 'Chọn ý tưởng này',
  children,
}: Props) {
  const level = VEO_LEVEL[idea.veoLevel] || VEO_LEVEL.vua;

  return (
    <article
      className={`bg-white border rounded-2xl p-5 sm:p-6 flex flex-col gap-4 transition-all ${
        selected
          ? 'border-primary-400 ring-2 ring-primary-400 shadow-lg shadow-primary-400/20'
          : 'border-gray-200 hover:border-primary-400 shadow-sm'
      } ${disliked ? 'opacity-50' : ''}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {badge && (
              <span className="px-2.5 py-0.5 rounded-full bg-black text-primary-400 text-xs font-bold">{badge}</span>
            )}
            <span className="px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-800 text-xs font-bold border border-primary-200">
              {idea.frame}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${level.className}`}>{level.label}</span>
          </div>
          <h3 className={`text-lg font-bold text-black ${disliked ? 'line-through decoration-red-500/60' : ''}`}>
            {idea.title}
          </h3>
          <p className="text-sm text-gray-600 mt-1">{idea.logline}</p>
        </div>

        {(onLike || onDislike) && (
          <div className="flex gap-1 shrink-0">
            {onLike && (
              <button
                onClick={onLike}
                title={liked ? 'Bỏ khỏi kho ý tưởng' : 'Lưu vào kho ý tưởng'}
                aria-pressed={!!liked}
                className={`p-2 rounded-full transition-colors ${
                  liked ? 'bg-primary-400 text-black' : 'bg-gray-100 text-gray-500 hover:bg-primary-100 hover:text-black'
                }`}
              >
                <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
              </button>
            )}
            {onDislike && (
              <button
                onClick={onDislike}
                title={disliked ? 'Khôi phục ý tưởng' : 'Không thích — AI sẽ tránh kiểu này'}
                aria-pressed={!!disliked}
                className={`p-2 rounded-full transition-colors ${
                  disliked ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600'
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </header>

      <div className="space-y-1.5 bg-primary-50 border border-primary-100 rounded-xl p-4">
        <Row label="Móc">
          {idea.hook}
          {idea.hookQuestion && <span className="block text-gray-500 italic">{idea.hookQuestion}</span>}
        </Row>
        <Row label="Lật">{idea.turn}</Row>
        <Row label="Chốt">{idea.ending}</Row>
      </div>

      <div className="space-y-1.5 text-sm text-gray-700">
        {idea.characters.length > 0 && (
          <p className="flex gap-2">
            <Users className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
            <span>{idea.characters.join(' · ')}</span>
          </p>
        )}
        <p className="flex gap-2">
          <MessageSquare className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
          <span>{idea.dialogue}</span>
        </p>
        <p className="flex gap-2">
          <Film className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
          <span>
            {idea.form} · khoảng {idea.beats} beat{idea.seconds ? ` (~${idea.seconds} giây)` : ''}
          </span>
        </p>
        {idea.module && (
          <p className="flex flex-wrap gap-1.5 pt-1">
            <span className="px-2 py-0.5 rounded-full bg-black text-primary-400 text-xs font-bold">
              {idea.module}
              {idea.secondary ? ` + ${idea.secondary}` : ''}
            </span>
            {idea.aspect && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">{idea.aspect}</span>}
            {idea.dialogueMode && (
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
                {idea.dialogueMode === 'co' ? 'Có thoại' : 'Không thoại'}
              </span>
            )}
          </p>
        )}
      </div>

      <p className="text-sm text-gray-600 border-l-4 border-gray-200 pl-3">
        <span className="font-bold text-gray-800">Rủi ro Veo: </span>
        {idea.veoNote}
      </p>

      {idea.message && <p className="text-sm text-gray-500 italic">{idea.message}</p>}

      {children}

      {(onVariations || onSelect) && !disliked && (
        <footer className="flex flex-col sm:flex-row gap-2 mt-auto pt-1">
          {onVariations && (
            <button
              onClick={onVariations}
              disabled={busy}
              className="flex-1 py-2.5 rounded-xl border border-primary-400/40 bg-primary-400/10 hover:bg-primary-400/20 text-primary-800 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            >
              <Shuffle className="w-4 h-4" />
              Tạo biến thể
            </button>
          )}
          {onSelect && (
            <button
              onClick={onSelect}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                selected ? 'bg-black text-primary-400' : 'bg-primary-400 hover:bg-primary-300 text-black'
              }`}
            >
              <Check className="w-4 h-4" />
              {selected ? 'Đang chọn' : selectLabel}
            </button>
          )}
        </footer>
      )}
    </article>
  );
}
