import React, { useState, useEffect } from 'react';
import { Project, Character } from '../types';
import { X, Save, UserCheck } from 'lucide-react';

interface RenameCharacterModalProps {
  isOpen: boolean;
  project: Project;
  onClose: () => void;
  onSave: (project: Project) => void;
}

export function RenameCharacterModal({ isOpen, project, onClose, onSave }: RenameCharacterModalProps) {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [newName, setNewName] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (project.characters && project.characters.length > 0) {
        setSelectedCharacterId(project.characters[0].id);
      } else {
        setSelectedCharacterId('');
      }
      setNewName('');
    }
  }, [isOpen, project]);

  if (!isOpen) return null;

  const handleSaveClick = () => {
    if (!selectedCharacterId || !newName.trim()) return;

    const characterToRename = project.characters.find(c => c.id === selectedCharacterId);
    if (!characterToRename) return;

    const oldName = characterToRename.name;
    if (oldName === newName.trim()) {
      onClose();
      return;
    }

    const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    const replaceText = (text: string) => {
      if (!text) return text;
      let t = text;
      
      const upperOld = oldName.toUpperCase();
      const upperNew = newName.trim().toUpperCase();
      const normalNew = newName.trim();

      // Using unicode-aware boundary checking
      const upperRegex = new RegExp('(^|[^\\p{L}\\p{N}_])(' + escapeRegExp(upperOld) + ')([^\\p{L}\\p{N}_]|$)', 'gu');
      t = t.replace(upperRegex, `$1${upperNew}$3`);

      const normalRegex = new RegExp('(^|[^\\p{L}\\p{N}_])(' + escapeRegExp(oldName) + ')([^\\p{L}\\p{N}_]|$)', 'gu');
      t = t.replace(normalRegex, `$1${normalNew}$3`);

      return t;
    };

    const updatedCharacters = project.characters.map((c: Character) => {
      if (c.id === selectedCharacterId) {
        return {
          ...c,
          name: newName.trim(),
          relationships: replaceText(c.relationships || ''),
          personality: replaceText(c.personality || ''),
          want: replaceText(c.want || ''),
          need: replaceText(c.need || '')
        };
      }
      return {
        ...c,
        relationships: replaceText(c.relationships || ''),
        personality: replaceText(c.personality || ''),
        want: replaceText(c.want || ''),
        need: replaceText(c.need || '')
      };
    });

    const updatedActs = project.acts.map(act => ({
      ...act,
      title: replaceText(act.title),
      summary: replaceText(act.summary),
      events: act.events.map(ev => ({
        ...ev,
        description: replaceText(ev.description),
        approvedPrompts: ev.approvedPrompts ? ev.approvedPrompts.map(p => replaceText(p)) : [],
        scriptVersions: ev.scriptVersions.map(sv => ({
          ...sv,
          prompt: replaceText(sv.prompt || ''),
          content: sv.content.map(el => ({
            ...el,
            text: replaceText(el.text)
          }))
        }))
      }))
    }));

    const updatedProject = {
      ...project,
      title: replaceText(project.title),
      idea: replaceText(project.idea),
      globalInstructions: project.globalInstructions ? project.globalInstructions.map(p => replaceText(p)) : [],
      characters: updatedCharacters,
      acts: updatedActs,
      updatedAt: Date.now()
    };

    onSave(updatedProject);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-200 rounded-3xl p-8 max-w-lg w-full flex flex-col shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold text-black mb-2 flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-primary-600" />
          Đổi tên nhân vật
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Tên nhân vật sẽ được ĐỔI HÀNG LOẠT trong toàn bộ kịch bản, bản tóm tắt và hồ sơ nhân vật.
        </p>

        <div className="space-y-4 mb-8">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase">Chọn nhân vật</label>
            <select
              value={selectedCharacterId}
              onChange={(e) => setSelectedCharacterId(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl p-3 text-black focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all appearance-none"
            >
              {project.characters && project.characters.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              {(!project.characters || project.characters.length === 0) && (
                <option value="">Chưa có nhân vật nào</option>
              )}
            </select>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase">Tên mới</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nhập tên mới..."
              className="w-full bg-white border border-gray-200 rounded-xl p-3 text-black focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-auto shrink-0 pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSaveClick}
            disabled={!selectedCharacterId || !newName.trim()}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary-600/20 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            Đổi tên
          </button>
        </div>
      </div>
    </div>
  );
}
