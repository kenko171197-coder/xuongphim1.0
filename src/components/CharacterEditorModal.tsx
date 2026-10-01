import React, { useState, useEffect } from 'react';
import { Character } from '../types';
import { X, Save, AlertTriangle, Plus, Trash2 } from 'lucide-react';

interface CharacterEditorModalProps {
  isOpen: boolean;
  characters: Character[];
  editingCharacterId?: string | null;
  onClose: () => void;
  onSave: (updatedCharacters: Character[]) => void;
}

export function CharacterEditorModal({ isOpen, characters, editingCharacterId, onClose, onSave }: CharacterEditorModalProps) {
  const [editedCharacter, setEditedCharacter] = useState<Character | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingCharacterId) {
        const char = characters.find(c => c.id === editingCharacterId);
        setEditedCharacter(char ? JSON.parse(JSON.stringify(char)) : null);
      } else {
        setEditedCharacter({
          id: `char-${Date.now()}`,
          name: '',
          age: '',
          role: '',
          personality: '',
          relationships: '',
          want: '',
          need: ''
        });
      }
      setShowConfirm(false);
    }
  }, [isOpen, characters, editingCharacterId]);

  if (!isOpen || !editedCharacter) return null;

  const handleRemoveCharacter = () => {
    const updatedCharacters = characters.filter(c => c.id !== editedCharacter.id);
    onSave(updatedCharacters);
    onClose();
  };

  const handleChange = (field: keyof Character, value: string) => {
    setEditedCharacter({ ...editedCharacter, [field]: value });
  };

  const handleSaveClick = () => {
    let hasChanged = false;
    if (editingCharacterId) {
      const originalChar = characters.find(c => c.id === editingCharacterId);
      hasChanged = JSON.stringify(originalChar) !== JSON.stringify(editedCharacter);
    } else {
      hasChanged = true; // New character
    }

    if (hasChanged) {
      setShowConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmSave = () => {
    let updatedCharacters;
    if (editingCharacterId) {
      updatedCharacters = characters.map(c => c.id === editingCharacterId ? editedCharacter : c);
    } else {
      updatedCharacters = [...characters, editedCharacter];
    }
    onSave(updatedCharacters);
    setShowConfirm(false);
    onClose();
  };

  if (showConfirm) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
        <div className="bg-white border border-gray-200 rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
          <button
            onClick={() => setShowConfirm(false)}
            className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <h2 className="text-2xl font-bold text-red-600 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            Cảnh báo quan trọng
          </h2>
          <p className="text-gray-600 mb-8">
            Việc thay đổi thông tin nhân vật sẽ làm <strong>xóa toàn bộ kịch bản chi tiết</strong> đã được tạo ở các phân đoạn bên dưới để đảm bảo tính nhất quán của câu chuyện. Bạn có chắc chắn muốn tiếp tục?
          </p>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirmSave}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-600/20"
            >
              Xác nhận & Reset kịch bản
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-200 rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold text-black mb-6 flex items-center gap-2 shrink-0">
          {editingCharacterId ? 'Chỉnh sửa nhân vật' : 'Thêm nhân vật mới'}
        </h2>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 relative">
            {editingCharacterId && (
              <button
                onClick={handleRemoveCharacter}
                className="absolute top-4 right-4 p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Xóa nhân vật"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 uppercase">Tên nhân vật / Name</label>
                <input
                  type="text"
                  value={editedCharacter.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl p-3 text-black focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 uppercase">Tuổi / Age</label>
                <input
                  type="text"
                  value={editedCharacter.age}
                  onChange={(e) => handleChange('age', e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl p-3 text-black focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-gray-500 uppercase">Vai trò / Role</label>
                <input
                  type="text"
                  value={editedCharacter.role}
                  onChange={(e) => handleChange('role', e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl p-3 text-black focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-gray-500 uppercase">Phong cách thiết kế / Style</label>
                <select
                  value={editedCharacter.style || 'Realism'}
                  onChange={(e) => handleChange('style', e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl p-3 text-black focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all appearance-none"
                >
                  <option value="Realism">Realism</option>
                  <option value="Semi-realism">Semi-realism</option>
                  <option value="3D Animation">3D Animation</option>
                  <option value="2D Animation">2D Animation</option>
                  <option value="Anime">Anime</option>
                  <option value="Oil Painting">Oil Painting</option>
                  <option value="Watercolor">Watercolor</option>
                  <option value="Sketch">Sketch</option>
                  <option value="Pixel Art">Pixel Art</option>
                  <option value="Cinematic">Cinematic</option>
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-gray-500 uppercase">Tính cách / Personality</label>
                <textarea
                  value={editedCharacter.personality}
                  onChange={(e) => handleChange('personality', e.target.value)}
                  className="w-full h-20 bg-white border border-gray-200 rounded-xl p-3 text-black focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all resize-none custom-scrollbar"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-gray-500 uppercase">Mối quan hệ / Relationships</label>
                <textarea
                  value={editedCharacter.relationships}
                  onChange={(e) => handleChange('relationships', e.target.value)}
                  className="w-full h-20 bg-white border border-gray-200 rounded-xl p-3 text-black focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all resize-none custom-scrollbar"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 uppercase">Want (Điều nhân vật muốn)</label>
                <textarea
                  value={editedCharacter.want}
                  onChange={(e) => handleChange('want', e.target.value)}
                  className="w-full h-24 bg-white border border-gray-200 rounded-xl p-3 text-black focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all resize-none custom-scrollbar"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 uppercase">Need (Điều nhân vật cần)</label>
                <textarea
                  value={editedCharacter.need}
                  onChange={(e) => handleChange('need', e.target.value)}
                  className="w-full h-24 bg-white border border-gray-200 rounded-xl p-3 text-black focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all resize-none custom-scrollbar"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 shrink-0 pt-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSaveClick}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary-600/20"
          >
            <Save className="w-5 h-5" />
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}
