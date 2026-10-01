import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Project, Event, Character } from '../types';
import { ChevronLeft, ChevronDown, ChevronRight, Edit3, FileText, Plus } from 'lucide-react';
import ScriptEditor from './ScriptEditor';
import FullScriptViewer from './FullScriptViewer';
import { BilingualText } from './BilingualText';
import { AddEventModal } from './AddEventModal';
import { CharacterEditorModal } from './CharacterEditorModal';
import { RenameCharacterModal } from './RenameCharacterModal';
import { generateNewEvent } from '../services/ai';

const InsertEventButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <div className="h-6 -my-3 relative group/insert flex items-center justify-center z-10 cursor-pointer" onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <div className="absolute inset-x-0 h-0.5 bg-primary-400/0 group-hover/insert:bg-primary-400/50 transition-colors"></div>
      <div className="w-6 h-6 rounded-full bg-white border border-primary-400 text-primary-500 flex items-center justify-center opacity-0 group-hover/insert:opacity-100 transition-all scale-75 group-hover/insert:scale-100 shadow-lg shadow-primary-400/20">
        <Plus className="w-4 h-4" />
      </div>
    </div>
  );
};

interface ProjectEditorProps {
  project: Project;
  onSave: (project: Project) => void;
  onClose: () => void;
}

export default function ProjectEditor({ project, onSave, onClose }: ProjectEditorProps) {
  const [expandedActs, setExpandedActs] = useState<string[]>(project.acts.map(a => a.id));
  const [editingEvent, setEditingEvent] = useState<{ actId: string; event: Event } | null>(null);
  const [viewingFullScript, setViewingFullScript] = useState(false);
  const [addingEvent, setAddingEvent] = useState<{ actId: string; index: number } | null>(null);
  const [isEditingCharacters, setIsEditingCharacters] = useState(false);
  const [isRenamingCharacter, setIsRenamingCharacter] = useState(false);
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const [scrollPos, setScrollPos] = useState(0);
  const [shouldRestoreScroll, setShouldRestoreScroll] = useState(false);

  useLayoutEffect(() => {
    if (shouldRestoreScroll && !editingEvent && !viewingFullScript) {
      window.scrollTo({ top: scrollPos, behavior: 'instant' });
      setShouldRestoreScroll(false);
    }
  }, [shouldRestoreScroll, editingEvent, viewingFullScript, scrollPos]);

  const toggleAct = (actId: string) => {
    setExpandedActs(prev =>
      prev.includes(actId) ? prev.filter(id => id !== actId) : [...prev, actId]
    );
  };

  const handleOpenEditor = (actId: string, event: Event) => {
    setScrollPos(window.scrollY);
    setEditingEvent({ actId, event });
  };

  const handleCloseEditor = () => {
    setEditingEvent(null);
    setShouldRestoreScroll(true);
  };

  const handleOpenFullScript = () => {
    setScrollPos(window.scrollY);
    setViewingFullScript(true);
  };

  const handleCloseFullScript = () => {
    setViewingFullScript(false);
    setShouldRestoreScroll(true);
  };

  const handleSaveEvent = (actId: string, updatedEvent: Event) => {
    const updatedActs = project.acts.map(act => {
      if (act.id === actId) {
        return {
          ...act,
          events: act.events.map(ev => ev.id === updatedEvent.id ? updatedEvent : ev)
        };
      }
      return act;
    });

    const updatedProject = {
      ...project,
      acts: updatedActs,
      updatedAt: Date.now()
    };

    onSave(updatedProject);
    // Update the editing event state so the editor stays open with the new data
    setEditingEvent({ actId, event: updatedEvent });
  };

  const handleAddEvent = async (idea: string) => {
    if (!addingEvent) return;
    
    const { actId, index } = addingEvent;
    const act = project.acts.find(a => a.id === actId);
    if (!act) return;

    const previousEventDesc = index > 0 ? act.events[index - 1].description : null;
    const nextEventDesc = index < act.events.length ? act.events[index].description : null;
    const projectSummary = project.acts.map(a => `${a.title}: ${a.summary}`).join('\n');

    const result = await generateNewEvent(
      projectSummary,
      act.title,
      act.summary,
      previousEventDesc,
      nextEventDesc,
      idea,
      project.openingStyle,
      project.endingStyle,
      project.messageStyle
    );

    const newEvent: Event = {
      id: `ev-${Date.now()}`,
      description: result.description,
      duration: result.duration,
      scriptVersions: [],
      currentVersionIndex: -1,
      isNew: true
    };

    const newEvents = [...act.events];
    newEvents.splice(index, 0, newEvent);

    const updatedActs = project.acts.map(a => {
      if (a.id === actId) {
        return { ...a, events: newEvents };
      }
      return a;
    });

    onSave({
      ...project,
      acts: updatedActs,
      updatedAt: Date.now()
    });
  };

  const handleSaveCharacters = (updatedCharacters: Character[]) => {
    // Check if characters actually changed
    const charactersChanged = JSON.stringify(project.characters) !== JSON.stringify(updatedCharacters);

    if (charactersChanged) {
      // Update characters and reset all scripts
      const updatedActs = project.acts.map(act => ({
        ...act,
        events: act.events.map(ev => ({
          ...ev,
          scriptVersions: [],
          currentVersionIndex: -1
        }))
      }));

      onSave({
        ...project,
        characters: updatedCharacters,
        acts: updatedActs,
        updatedAt: Date.now()
      });
    }
    
    setIsEditingCharacters(false);
  };

  if (viewingFullScript) {
    return (
      <FullScriptViewer
        project={project}
        onClose={handleCloseFullScript}
        onUpdateProject={onSave}
        onEditEvent={(actId, event) => {
          setViewingFullScript(false);
          setEditingEvent({ actId, event });
        }}
      />
    );
  }

  if (editingEvent) {
    return (
      <ScriptEditor
        project={project}
        actId={editingEvent.actId}
        event={editingEvent.event}
        onSave={(updatedEvent) => handleSaveEvent(editingEvent.actId, updatedEvent)}
        onSaveProject={onSave}
        onBack={handleCloseEditor}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-primary-600 hover:text-white transition-colors shadow-sm"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-black">{project.title}</h1>
            <p className="text-gray-500 text-sm mt-1">
              {project.duration} phút • {project.acts.length} hồi
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenFullScript}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-primary-600/20"
        >
          <FileText className="w-5 h-5" />
          Xem full kịch bản
        </button>
      </div>

      <div className="space-y-6">
        {project.characters && project.characters.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-3xl p-6 mb-8 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-black">Khắc họa nhân vật / Character Profiles</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsRenamingCharacter(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-primary-600 text-gray-600 hover:text-white rounded-lg transition-colors text-sm font-bold"
                >
                  <Edit3 className="w-4 h-4" />
                  Đổi tên nhân vật
                </button>
                <button 
                  onClick={() => {
                    setEditingCharacterId(null);
                    setIsEditingCharacters(true);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-primary-600 text-gray-600 hover:text-white rounded-lg transition-colors text-sm font-bold"
                >
                  <Plus className="w-4 h-4" />
                  Thêm nhân vật
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {project.characters.map((char, i) => (
                <div key={i} className="bg-gray-50 p-4 rounded-xl border border-gray-100 relative group transition-colors hover:border-primary-400/50">
                  <button
                    onClick={() => {
                      setEditingCharacterId(char.id);
                      setIsEditingCharacters(true);
                    }}
                    className="absolute top-4 right-4 p-2 bg-white hover:bg-primary-600 text-gray-400 hover:text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100 shadow-sm border border-gray-100"
                    title="Chỉnh sửa nhân vật này"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <h4 className="text-lg font-bold text-black mb-2 pr-10"><BilingualText text={char.name} /> <span className="text-gray-500 text-sm font-normal">({char.age})</span></h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 font-bold mb-1">Vai trò / Role:</p>
                      <div className="text-gray-900"><BilingualText text={char.role} /></div>
                    </div>
                    <div>
                      <p className="text-gray-500 font-bold mb-1">Tính cách / Personality:</p>
                      <div className="text-gray-900"><BilingualText text={char.personality} /></div>
                    </div>
                    <div>
                      <p className="text-gray-500 font-bold mb-1">Mối quan hệ / Relationships:</p>
                      <div className="text-gray-900"><BilingualText text={char.relationships} /></div>
                    </div>
                    <div>
                      <p className="text-gray-500 font-bold mb-1">Want & Need:</p>
                      <div className="text-gray-900"><span className="text-primary-600 font-bold">Want:</span> <BilingualText text={char.want} /></div>
                      <div className="text-gray-900"><span className="text-primary-600 font-bold">Need:</span> <BilingualText text={char.need} /></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {project.acts.map((act) => (
          <div key={act.id} className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
            <div
              onClick={() => toggleAct(act.id)}
              className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div>
                <h2 className="text-xl font-bold text-black"><BilingualText text={act.title} /></h2>
                <div className="text-gray-500 text-sm mt-1 line-clamp-1"><BilingualText text={act.summary} /></div>
              </div>
              <div className="text-primary-600">
                {expandedActs.includes(act.id) ? <ChevronDown className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
              </div>
            </div>

            {expandedActs.includes(act.id) && (
              <div className="p-6 pt-0 border-t border-gray-100 bg-gray-50/30">
                <div className="flex flex-col gap-2 mt-6">
                  <InsertEventButton onClick={() => setAddingEvent({ actId: act.id, index: 0 })} />
                  {act.events.map((ev, index) => (
                    <React.Fragment key={ev.id}>
                      <div
                        onClick={() => handleOpenEditor(act.id, ev)}
                        className={`group flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                          ev.isNew 
                            ? 'bg-red-50 border-red-100 hover:bg-red-100 hover:border-red-200' 
                            : 'bg-white border-gray-100 hover:bg-primary-50 hover:border-primary-400/50 shadow-sm'
                        }`}
                      >
                        <div className="flex-1 pr-4">
                          <div className="text-gray-900 text-sm leading-relaxed"><BilingualText text={ev.description} /></div>
                          {ev.scriptVersions.length > 0 && (
                            <span className="inline-block mt-2 text-xs font-bold text-primary-700 bg-primary-100 px-2 py-1 rounded border border-primary-200">
                              Đã có kịch bản (v{ev.scriptVersions.length})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className={`font-mono text-sm ${ev.isNew ? 'text-red-600 font-bold' : 'text-gray-400'}`}>{ev.duration}p</span>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                            ev.isNew 
                              ? 'bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white' 
                              : 'bg-gray-100 text-gray-400 group-hover:bg-primary-600 group-hover:text-white'
                          }`}>
                            <Edit3 className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                      <InsertEventButton onClick={() => setAddingEvent({ actId: act.id, index: index + 1 })} />
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <AddEventModal
        isOpen={addingEvent !== null}
        onClose={() => setAddingEvent(null)}
        onSubmit={handleAddEvent}
      />

      <CharacterEditorModal
        isOpen={isEditingCharacters}
        characters={project.characters || []}
        editingCharacterId={editingCharacterId}
        onClose={() => {
          setIsEditingCharacters(false);
          setEditingCharacterId(null);
        }}
        onSave={handleSaveCharacters}
      />

      <RenameCharacterModal
        isOpen={isRenamingCharacter}
        project={project}
        onClose={() => setIsRenamingCharacter(false)}
        onSave={onSave}
      />
    </div>
  );
}
