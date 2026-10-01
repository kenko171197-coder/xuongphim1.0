import React, { useState } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';
import { formatApiError } from '../utils/error';
import { useFakeProgress } from '../hooks/useFakeProgress';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (idea: string) => Promise<void>;
}

export function AddEventModal({ isOpen, onClose, onSubmit }: AddEventModalProps) {
  const [idea, setIdea] = useState('');
  const [loading, setLoading] = useState(false);

  const loadingProgress = useFakeProgress(loading, 10000);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim() || loading) return;
    
    setLoading(true);
    try {
      await onSubmit(idea);
      setIdea('');
      onClose();
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi tạo phân đoạn mới. ' + formatApiError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-200 rounded-3xl p-8 max-w-lg w-full shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold text-black mb-2 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary-600" />
          Thêm phân đoạn mới
        </h2>
        <p className="text-gray-600 mb-6">
          Bạn muốn bổ sung nội dung gì vào phần này? AI sẽ tự động viết mô tả chi tiết và ước tính thời lượng phù hợp.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Ví dụ: Thêm một cảnh nhân vật chính phát hiện ra sự thật về người mẹ..."
            className="w-full h-32 bg-gray-50 border border-gray-200 rounded-xl p-4 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all resize-none"
            autoFocus
          />

          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!idea.trim() || loading}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary-600/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {loading ? `Đang tạo... ${loadingProgress}%` : 'Tạo phân đoạn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
