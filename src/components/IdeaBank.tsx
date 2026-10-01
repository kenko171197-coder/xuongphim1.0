import React, { useState } from 'react';
import { Heart, ThumbsDown, Trash2, Undo2 } from 'lucide-react';
import type { SavedIdea } from '../types';
import { moduleInfo } from '../lib/modules';
import IdeaCard from './IdeaCard';

interface Props {
  liked: SavedIdea[];
  disliked: SavedIdea[];
  onRemoveLiked: (id: string) => void;
  onRemoveDisliked: (id: string) => void;
  onUse: (idea: SavedIdea) => void;
}

/** Nhóm của một ý tưởng: kiểu kịch bản (mới) hoặc module (thẻ cũ). */
const groupOf = (i: SavedIdea) => i.settings.scriptType || i.settings.module;
const groupName = (i: SavedIdea) =>
  i.settings.scriptTypeName || `${i.settings.module} · ${moduleInfo(i.settings.module)?.name || ''}`;

export default function IdeaBank({ liked, disliked, onRemoveLiked, onRemoveDisliked, onUse }: Props) {
  const [filter, setFilter] = useState<string>('all');
  const match = (i: SavedIdea) => filter === 'all' || groupOf(i) === filter;
  const likedShown = liked.filter(match).sort((a, b) => b.createdAt - a.createdAt);
  const dislikedShown = disliked.filter(match).sort((a, b) => b.createdAt - a.createdAt);

  const groups = Array.from(
    new Map([...liked, ...disliked].map((i) => [groupOf(i), groupName(i)] as [string, string])).entries()
  ).map(([code, name]) => ({ code, name }));

  return (
    <div className="space-y-10">
      {groups.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc theo module">
          {[{ code: 'all', name: 'Tất cả' }, ...groups].map((m) => (
            <button
              key={m.code}
              onClick={() => setFilter(m.code)}
              aria-pressed={filter === m.code}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === m.code ? 'bg-black text-primary-400' : 'bg-gray-100 text-gray-600 hover:bg-primary-100 hover:text-black'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      )}

      <section>
        <h2 className="text-2xl font-bold text-black mb-5 flex items-center gap-2">
          <Heart className="w-6 h-6 text-primary-600" />
          Ý tưởng đã thích ({likedShown.length})
        </h2>
        {likedShown.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center text-gray-500">
            Bấm trái tim trên thẻ ý tưởng ở Phòng Ý tưởng để cất vào đây.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {likedShown.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                badge={idea.settings.scriptTypeName || idea.settings.module}
                onSelect={() => onUse(idea)}
                selectLabel="Dùng ý tưởng này"
              >
                <button
                  onClick={() => onRemoveLiked(idea.id)}
                  className="self-start text-xs text-gray-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Bỏ khỏi kho
                </button>
              </IdeaCard>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold text-black mb-2 flex items-center gap-2">
          <ThumbsDown className="w-6 h-6 text-red-500" />
          Ý tưởng đã loại ({dislikedShown.length})
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          Mỗi lần tạo ý tưởng, AI đọc danh sách này (theo đúng kiểu kịch bản) để tránh những kiểu bạn không thích.
        </p>
        {dislikedShown.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center text-gray-400">
            Chưa loại ý tưởng nào.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 border border-gray-200 rounded-2xl bg-white">
            {dislikedShown.map((idea) => (
              <li key={idea.id} className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="font-bold text-gray-500 line-through decoration-red-500/50">{idea.title}</p>
                  <p className="text-sm text-gray-400 line-clamp-2">{idea.logline}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {groupName(idea)}
                  </p>
                </div>
                <button
                  onClick={() => onRemoveDisliked(idea.id)}
                  title="Khôi phục: AI không tránh ý tưởng này nữa"
                  className="shrink-0 flex items-center gap-1 text-sm text-gray-500 hover:text-black px-3 py-1.5 rounded-full bg-gray-100 hover:bg-primary-100 transition-colors"
                >
                  <Undo2 className="w-4 h-4" />
                  Khôi phục
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
