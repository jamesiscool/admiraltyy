import type { Indexer } from "@/../product/sections/settings/types";
import {
  Pencil,
  Trash2,
  Zap,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { useState } from "react";

interface IndexerCardProps {
  indexer: Indexer;
  isFirst: boolean;
  isLast: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onTest?: () => Promise<boolean>;
  onToggle?: (enabled: boolean) => void;
  onSave?: (indexer: Indexer) => void;
}

export function IndexerCard({
  indexer,
  isFirst,
  isLast,
  onEdit,
  onDelete,
  onTest,
  onToggle,
  onSave,
}: IndexerCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [editForm, setEditForm] = useState({
    name: indexer.name,
    url: indexer.url,
    apiKey: indexer.apiKey,
  });

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await onTest?.();
      setTestResult(result ?? true);
    } catch {
      setTestResult(false);
    } finally {
      setIsTesting(false);
      setTimeout(() => setTestResult(null), 3000);
    }
  };

  const handleSave = () => {
    onSave?.({
      ...indexer,
      name: editForm.name,
      url: editForm.url,
      apiKey: editForm.apiKey,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm({
      name: indexer.name,
      url: indexer.url,
      apiKey: indexer.apiKey,
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 last:border-b-0 bg-blue-50/50 dark:bg-blue-950/20">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                className="w-full px-3 py-2 rounded-sm bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                URL
              </label>
              <input
                type="text"
                value={editForm.url}
                onChange={(e) =>
                  setEditForm({ ...editForm, url: e.target.value })
                }
                className="w-full px-3 py-2 rounded-sm bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              API Key
            </label>
            <input
              type="password"
              value={editForm.apiKey}
              onChange={(e) =>
                setEditForm({ ...editForm, apiKey: e.target.value })
              }
              className="w-full px-3 py-2 rounded-sm bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 font-mono"
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleTest}
              disabled={isTesting}
              className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors disabled:opacity-50"
            >
              {isTesting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : testResult === true ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : testResult === false ? (
                <X className="w-4 h-4 text-red-500" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              Test Connection
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-sm text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-sm text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
        !isLast ? "border-b border-slate-200 dark:border-slate-800" : ""
      } ${!indexer.enabled ? "opacity-60" : ""}`}
    >
      {/* Indexer Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900 dark:text-white truncate">
            {indexer.name}
          </span>
          {!indexer.enabled && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              Disabled
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-500 truncate">
          {indexer.url}
        </p>
      </div>

      {/* Toggle */}
      <button
        onClick={() => onToggle?.(!indexer.enabled)}
        className={`relative w-10 h-6 rounded-full transition-colors ${
          indexer.enabled
            ? "bg-blue-600"
            : "bg-slate-300 dark:bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
            indexer.enabled ? "left-5" : "left-1"
          }`}
        />
      </button>

      {/* Edit Button */}
      <button
        onClick={() => {
          setIsEditing(true);
          onEdit?.();
        }}
        className="p-1.5 rounded-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Pencil className="w-4 h-4" />
      </button>

      {/* Delete Button */}
      <button
        onClick={onDelete}
        className="p-1.5 rounded-sm text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
