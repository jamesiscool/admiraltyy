import type { Server } from "@/../product/sections/settings/types";
import {
  GripVertical,
  Pencil,
  Trash2,
  Zap,
  Check,
  X,
  Loader2,
  ChevronUp,
  ChevronDown,
  Lock,
} from "lucide-react";
import { useState } from "react";

interface ServerCardProps {
  server: Server;
  isFirst: boolean;
  isLast: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onTest?: () => Promise<boolean>;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onSave?: (server: Server) => void;
}

export function ServerCard({
  server,
  isFirst,
  isLast,
  onEdit,
  onDelete,
  onTest,
  onMoveUp,
  onMoveDown,
  onSave,
}: ServerCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [editForm, setEditForm] = useState({
    name: server.name,
    host: server.host,
    port: server.port,
    username: server.username,
    password: "",
    ssl: server.ssl,
    priority: server.priority,
    connections: server.connections,
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
      ...server,
      name: editForm.name,
      host: editForm.host,
      port: editForm.port,
      username: editForm.username,
      password: editForm.password || server.password,
      ssl: editForm.ssl,
      priority: editForm.priority,
      connections: editForm.connections,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm({
      name: server.name,
      host: server.host,
      port: server.port,
      username: server.username,
      password: "",
      ssl: server.ssl,
      priority: server.priority,
      connections: server.connections,
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 last:border-b-0 bg-blue-50/50 dark:bg-blue-950/20">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                Host
              </label>
              <input
                type="text"
                value={editForm.host}
                onChange={(e) =>
                  setEditForm({ ...editForm, host: e.target.value })
                }
                className="w-full px-3 py-2 rounded-sm bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Port
              </label>
              <input
                type="number"
                value={editForm.port}
                onChange={(e) =>
                  setEditForm({ ...editForm, port: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-sm bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={editForm.username}
                onChange={(e) =>
                  setEditForm({ ...editForm, username: e.target.value })
                }
                className="w-full px-3 py-2 rounded-sm bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={editForm.password}
                onChange={(e) =>
                  setEditForm({ ...editForm, password: e.target.value })
                }
                placeholder="••••••••••••"
                className="w-full px-3 py-2 rounded-sm bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <input
                type="number"
                min="0"
                max="999"
                value={editForm.priority}
                onChange={(e) =>
                  setEditForm({ ...editForm, priority: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-sm bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Connections
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={editForm.connections}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    connections: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 rounded-sm bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                SSL
              </label>
              <button
                onClick={() =>
                  setEditForm({ ...editForm, ssl: !editForm.ssl })
                }
                className={`w-full px-3 py-2 rounded-sm text-sm font-medium border transition-colors ${
                  editForm.ssl
                    ? "bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                    : "bg-white dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50 text-slate-600 dark:text-slate-400"
                }`}
              >
                {editForm.ssl ? "Enabled" : "Disabled"}
              </button>
            </div>
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
      } ${!server.enabled ? "opacity-60" : ""}`}
    >
      {/* Drag Handle */}
      <div className="text-slate-400 dark:text-slate-600 cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Priority Badge */}
      <div className="w-8 h-8 rounded-sm bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-400">
        {server.priority}
      </div>

      {/* Server Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900 dark:text-white truncate">
            {server.name}
          </span>
          {server.ssl && (
            <Lock className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
          )}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-500 truncate">
          {server.host}:{server.port} · {server.connections} connections
        </p>
      </div>

      {/* Reorder Buttons */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="p-1 rounded-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="p-1 rounded-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

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

