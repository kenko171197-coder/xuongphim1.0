import React, { useState } from 'react';
import { Project } from '../types';
import { Clock, FileText, Download, Play, Trash2, X, AlertTriangle } from 'lucide-react';

interface StorageProps {
  projects: Project[];
  onOpenProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
}

export default function Storage({ projects, onOpenProject, onDeleteProject }: StorageProps) {
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const downloadJson = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", project.title + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <FileText className="w-16 h-16 mb-4" />
        <p className="text-lg">Chưa có dự án nào được lưu.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((p) => (
        <div
          key={p.id}
          onClick={() => onOpenProject(p)}
          className="group bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-primary-400/50 transition-all cursor-pointer relative overflow-hidden"
        >
          <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => downloadJson(p, e)}
              className="p-2 bg-primary-600/10 text-primary-600 rounded-full hover:bg-primary-600 hover:text-white transition-colors"
              title="Tải xuống JSON"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setProjectToDelete(p.id);
              }}
              className="p-2 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-colors"
              title="Xóa dự án"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <h3 className="text-xl font-bold text-black mb-2 pr-20 truncate">{p.title}</h3>
          <p className="text-gray-600 text-sm line-clamp-2 mb-4 h-10">{p.idea}</p>
          
          <div className="flex items-center gap-4 text-xs font-medium text-gray-500 mb-6">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {p.duration} phút
            </div>
            <div className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              {p.acts.length} hồi
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-400">
              {new Date(p.updatedAt).toLocaleDateString('vi-VN')}
            </span>
            <div className="flex items-center gap-1 text-primary-600 text-sm font-bold group-hover:translate-x-1 transition-transform">
              Mở dự án
              <Play className="w-4 h-4" />
            </div>
          </div>
        </div>
      ))}

      {projectToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setProjectToDelete(null)}
              className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold text-red-500 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              Xác nhận xóa
            </h2>
            <p className="text-gray-600 mb-8">
              Bạn có chắc chắn muốn xóa dự án này không? Hành động này không thể hoàn tác.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setProjectToDelete(null)}
                className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  onDeleteProject(projectToDelete);
                  setProjectToDelete(null);
                }}
                className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all"
              >
                Xóa dự án
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
