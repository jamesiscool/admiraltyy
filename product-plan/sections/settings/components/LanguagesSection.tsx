import type { LanguageSettings, Language } from "@/../product/sections/settings/types";
import { GripVertical, ChevronUp, ChevronDown, X, Plus } from "lucide-react";
import { useState } from "react";

interface LanguagesSectionProps {
  settings: LanguageSettings;
  onReorderSubtitles?: (codes: string[]) => void;
  onReorderAudio?: (codes: string[]) => void;
  onTogglePreferOriginal?: (enabled: boolean) => void;
  onToggleAcceptFallback?: (enabled: boolean) => void;
  onAdd?: (type: "subtitle" | "audio", code: string) => void;
  onRemove?: (type: "subtitle" | "audio", code: string) => void;
}

interface LanguageListProps {
  title: string;
  languages: Language[];
  onReorder: (codes: string[]) => void;
  onRemove: (code: string) => void;
  onAdd: (code: string) => void;
}

function LanguageList({
  title,
  languages,
  onReorder,
  onRemove,
  onAdd,
}: LanguageListProps) {
  const [showAddInput, setShowAddInput] = useState(false);
  const [newLanguage, setNewLanguage] = useState("");

  const moveUp = (index: number) => {
    if (index === 0) return;
    const codes = languages.map((l) => l.code);
    [codes[index - 1], codes[index]] = [codes[index], codes[index - 1]];
    onReorder(codes);
  };

  const moveDown = (index: number) => {
    if (index === languages.length - 1) return;
    const codes = languages.map((l) => l.code);
    [codes[index], codes[index + 1]] = [codes[index + 1], codes[index]];
    onReorder(codes);
  };

  const handleAdd = () => {
    if (newLanguage.trim()) {
      onAdd(newLanguage.trim());
      setNewLanguage("");
      setShowAddInput(false);
    }
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
        {title}
      </h3>
      <div className="bg-white dark:bg-slate-900/50 rounded-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {languages.map((lang, index) => (
          <div
            key={lang.code}
            className={`flex items-center gap-3 px-3 py-2.5 ${
              index !== languages.length - 1
                ? "border-b border-slate-200 dark:border-slate-800"
                : ""
            }`}
          >
            <div className="text-slate-400 dark:text-slate-600 cursor-grab">
              <GripVertical className="w-4 h-4" />
            </div>
            <span className="w-6 h-6 rounded-sm bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400">
              {index + 1}
            </span>
            <span className="flex-1 text-sm font-medium text-slate-900 dark:text-white">
              {lang.name}
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-500 uppercase">
              {lang.code}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => moveUp(index)}
                disabled={index === 0}
                className="p-1 rounded-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => moveDown(index)}
                disabled={index === languages.length - 1}
                className="p-1 rounded-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => onRemove(lang.code)}
              className="p-1 rounded-sm text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        {/* Add Language */}
        {showAddInput ? (
          <div className="flex items-center gap-2 px-3 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
            <input
              type="text"
              value={newLanguage}
              onChange={(e) => setNewLanguage(e.target.value)}
              placeholder="Language name"
              className="flex-1 px-3 py-1.5 rounded-sm bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") setShowAddInput(false);
              }}
            />
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-sm"
            >
              Add
            </button>
            <button
              onClick={() => setShowAddInput(false)}
              className="px-3 py-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddInput(true)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 border-t border-slate-200 dark:border-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Language
          </button>
        )}
      </div>
    </div>
  );
}

function Toggle({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-4 bg-white dark:bg-slate-900/50 rounded-sm border border-slate-200 dark:border-slate-800">
      <div>
        <div className="font-medium text-slate-900 dark:text-white">{label}</div>
        <p className="text-sm text-slate-500 dark:text-slate-500 mt-0.5">
          {description}
        </p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
          enabled ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
            enabled ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

export function LanguagesSection({
  settings,
  onReorderSubtitles,
  onReorderAudio,
  onTogglePreferOriginal,
  onToggleAcceptFallback,
  onAdd,
  onRemove,
}: LanguagesSectionProps) {
  return (
    <div className="space-y-6">
      {/* Toggles */}
      <div className="space-y-3">
        <Toggle
          label="Prefer Original Audio"
          description="Always prefer the original language audio track when available"
          enabled={settings.preferOriginalAudio}
          onChange={(enabled) => onTogglePreferOriginal?.(enabled)}
        />
        <Toggle
          label="Accept Any Audio Fallback"
          description="If preferred languages aren't available, accept any audio track"
          enabled={settings.acceptAnyAudioFallback}
          onChange={(enabled) => onToggleAcceptFallback?.(enabled)}
        />
      </div>

      {/* Language Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LanguageList
          title="Subtitle Languages"
          languages={settings.subtitleLanguages}
          onReorder={(codes) => onReorderSubtitles?.(codes)}
          onRemove={(code) => onRemove?.("subtitle", code)}
          onAdd={(code) => onAdd?.("subtitle", code)}
        />
        <LanguageList
          title="Audio Languages"
          languages={settings.audioLanguages}
          onReorder={(codes) => onReorderAudio?.(codes)}
          onRemove={(code) => onRemove?.("audio", code)}
          onAdd={(code) => onAdd?.("audio", code)}
        />
      </div>
    </div>
  );
}

