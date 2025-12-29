import type { Folders, Folder } from "@/../product/sections/settings/types";
import { Film, Tv, Star, Trash2, Plus } from "lucide-react";

interface FolderSectionProps {
  folders: Folders;
  onAdd?: (type: "movies" | "tv") => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSetDefault?: (id: string, type: "movies" | "tv") => void;
  onSave?: (folder: Folder, type: "movies" | "tv") => void;
}

interface FolderListProps {
  title: string;
  type: "movies" | "tv";
  icon: typeof Film;
  iconColor: string;
  folders: Folder[];
  onAdd?: () => void;
  onDelete?: (id: string) => void;
  onSetDefault?: (id: string) => void;
}

function FolderList({
  title,
  type,
  icon: Icon,
  iconColor,
  folders,
  onAdd,
  onDelete,
  onSetDefault,
}: FolderListProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          {title}
        </h3>
      </div>
      <div className="bg-white dark:bg-slate-900/50 rounded-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {folders.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-500">
              No folders configured
            </p>
          </div>
        ) : (
          <div>
            {folders.map((folder, index) => (
              <div
                key={folder.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  index !== folders.length - 1
                    ? "border-b border-slate-200 dark:border-slate-800"
                    : ""
                }`}
              >
                <code className="flex-1 text-sm font-mono text-slate-700 dark:text-slate-300 truncate">
                  {folder.path}
                </code>

                {folder.isDefault ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                    <Star className="w-3 h-3 fill-current" />
                    Default
                  </span>
                ) : (
                  <button
                    onClick={() => onSetDefault?.(folder.id)}
                    className="px-2 py-0.5 text-xs font-medium rounded-sm text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                  >
                    Set default
                  </button>
                )}

                <button
                  onClick={() => onDelete?.(folder.id)}
                  disabled={folder.isDefault}
                  className="p-1.5 rounded-sm text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onAdd}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 border-t border-slate-200 dark:border-slate-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Folder
        </button>
      </div>
    </div>
  );
}

export function FolderSection({
  folders,
  onAdd,
  onDelete,
  onSetDefault,
}: FolderSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FolderList
        title="Movies"
        type="movies"
        icon={Film}
        iconColor="text-amber-500 dark:text-amber-400"
        folders={folders.movies}
        onAdd={() => onAdd?.("movies")}
        onDelete={onDelete}
        onSetDefault={(id) => onSetDefault?.(id, "movies")}
      />
      <FolderList
        title="TV Shows"
        type="tv"
        icon={Tv}
        iconColor="text-sky-500 dark:text-sky-400"
        folders={folders.tv}
        onAdd={() => onAdd?.("tv")}
        onDelete={onDelete}
        onSetDefault={(id) => onSetDefault?.(id, "tv")}
      />
    </div>
  );
}

