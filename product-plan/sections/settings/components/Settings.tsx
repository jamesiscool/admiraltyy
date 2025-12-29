import type { SettingsProps } from "@/../product/sections/settings/types";
import { IndexerCard } from "./IndexerCard";
import { ServerCard } from "./ServerCard";
import { FolderSection } from "./FolderSection";
import { QualitySection } from "./QualitySection";
import { LanguagesSection } from "./LanguagesSection";
import { FormatsSection } from "./FormatsSection";
import { AuthSection } from "./AuthSection";
import {
  Radar,
  Server,
  FolderOpen,
  Gauge,
  Languages,
  FileVideo,
  ShieldCheck,
  Plus,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

const SECTIONS = [
  { id: "indexers", label: "Indexers", icon: Radar },
  { id: "servers", label: "Servers", icon: Server },
  { id: "folders", label: "Folders", icon: FolderOpen },
  { id: "quality", label: "Quality", icon: Gauge },
  { id: "languages", label: "Languages", icon: Languages },
  { id: "formats", label: "Formats", icon: FileVideo },
  { id: "authentication", label: "Auth", icon: ShieldCheck },
] as const;

export function Settings({
  indexers,
  servers,
  folders,
  qualityTiers,
  languageSettings,
  formatSettings,
  authSettings,
  onAddIndexer,
  onEditIndexer,
  onDeleteIndexer,
  onTestIndexer,
  onToggleIndexer,
  onSaveIndexer,
  onAddServer,
  onEditServer,
  onDeleteServer,
  onTestServer,
  onReorderServers,
  onSaveServer,
  onAddFolder,
  onEditFolder,
  onDeleteFolder,
  onSetDefaultFolder,
  onSaveFolder,
  onUpdateQualityTier,
  onReorderSubtitleLanguages,
  onReorderAudioLanguages,
  onTogglePreferOriginalAudio,
  onToggleAcceptAnyAudioFallback,
  onAddLanguage,
  onRemoveLanguage,
  onReorderCodecs,
  onReorderHdrFormats,
  onReorderAudioFormats,
  onAddFormat,
  onRemoveFormat,
  onUpdateFormatMatchTerms,
  onUpdateFormatExcludeTerms,
  onUpdateAuthSettings,
}: SettingsProps) {
  const [activeSection, setActiveSection] = useState<string>("indexers");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Intersection Observer for active section tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );

    SECTIONS.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-6">
          Settings
        </h1>

        <div className="flex gap-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-12">
            {/* Indexers Section */}
            <section
              id="indexers"
              ref={(el) => (sectionRefs.current["indexers"] = el)}
              className="scroll-mt-20"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-9 h-9 rounded-sm bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <Radar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Indexers
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-500">
                    Usenet indexers for searching releases
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900/50 rounded-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                {indexers.map((indexer, index) => (
                  <IndexerCard
                    key={indexer.id}
                    indexer={indexer}
                    isFirst={index === 0}
                    isLast={index === indexers.length - 1}
                    onEdit={() => onEditIndexer?.(indexer.id)}
                    onDelete={() => onDeleteIndexer?.(indexer.id)}
                    onTest={() => onTestIndexer?.(indexer.id)}
                    onToggle={(enabled) =>
                      onToggleIndexer?.(indexer.id, enabled)
                    }
                    onSave={onSaveIndexer}
                  />
                ))}

                <button
                  onClick={onAddIndexer}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-3 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 border-t border-slate-200 dark:border-slate-800 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Indexer
                </button>
              </div>
            </section>

            {/* Servers Section */}
            <section
              id="servers"
              ref={(el) => (sectionRefs.current["servers"] = el)}
              className="scroll-mt-20"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-9 h-9 rounded-sm bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Usenet Servers
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-500">
                    Download servers in priority order
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900/50 rounded-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                {servers.map((server, index) => (
                  <ServerCard
                    key={server.id}
                    server={server}
                    isFirst={index === 0}
                    isLast={index === servers.length - 1}
                    onEdit={() => onEditServer?.(server.id)}
                    onDelete={() => onDeleteServer?.(server.id)}
                    onTest={() => onTestServer?.(server.id)}
                    onMoveUp={() => {
                      const ids = servers.map((s) => s.id);
                      if (index > 0) {
                        [ids[index - 1], ids[index]] = [
                          ids[index],
                          ids[index - 1],
                        ];
                        onReorderServers?.(ids);
                      }
                    }}
                    onMoveDown={() => {
                      const ids = servers.map((s) => s.id);
                      if (index < servers.length - 1) {
                        [ids[index], ids[index + 1]] = [
                          ids[index + 1],
                          ids[index],
                        ];
                        onReorderServers?.(ids);
                      }
                    }}
                    onSave={onSaveServer}
                  />
                ))}

                <button
                  onClick={onAddServer}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-3 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 border-t border-slate-200 dark:border-slate-800 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Server
                </button>
              </div>
            </section>

            {/* Folders Section */}
            <section
              id="folders"
              ref={(el) => (sectionRefs.current["folders"] = el)}
              className="scroll-mt-20"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-9 h-9 rounded-sm bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Library Folders
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-500">
                    Media storage locations
                  </p>
                </div>
              </div>

              <FolderSection
                folders={folders}
                onAdd={onAddFolder}
                onEdit={onEditFolder}
                onDelete={onDeleteFolder}
                onSetDefault={onSetDefaultFolder}
                onSave={onSaveFolder}
              />
            </section>

            {/* Quality Section */}
            <section
              id="quality"
              ref={(el) => (sectionRefs.current["quality"] = el)}
              className="scroll-mt-20"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-9 h-9 rounded-sm bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Quality Profiles
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-500">
                    File size targets per resolution
                  </p>
                </div>
              </div>

              <QualitySection
                qualityTiers={qualityTiers}
                onUpdate={onUpdateQualityTier}
              />
            </section>

            {/* Languages Section */}
            <section
              id="languages"
              ref={(el) => (sectionRefs.current["languages"] = el)}
              className="scroll-mt-20"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-9 h-9 rounded-sm bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400">
                  <Languages className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Languages
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-500">
                    Subtitle and audio preferences
                  </p>
                </div>
              </div>

              <LanguagesSection
                settings={languageSettings}
                onReorderSubtitles={onReorderSubtitleLanguages}
                onReorderAudio={onReorderAudioLanguages}
                onTogglePreferOriginal={onTogglePreferOriginalAudio}
                onToggleAcceptFallback={onToggleAcceptAnyAudioFallback}
                onAdd={onAddLanguage}
                onRemove={onRemoveLanguage}
              />
            </section>

            {/* Formats Section */}
            <section
              id="formats"
              ref={(el) => (sectionRefs.current["formats"] = el)}
              className="scroll-mt-20"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-9 h-9 rounded-sm bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                  <FileVideo className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Format Preferences
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-500">
                    Codec, HDR, and audio priorities
                  </p>
                </div>
              </div>

              <FormatsSection
                settings={formatSettings}
                onReorderCodecs={onReorderCodecs}
                onReorderHdr={onReorderHdrFormats}
                onReorderAudio={onReorderAudioFormats}
                onAddFormat={onAddFormat}
                onRemoveFormat={onRemoveFormat}
                onUpdateMatchTerms={onUpdateFormatMatchTerms}
                onUpdateExcludeTerms={onUpdateFormatExcludeTerms}
              />
            </section>

            {/* Authentication Section */}
            <section
              id="authentication"
              ref={(el) => (sectionRefs.current["authentication"] = el)}
              className="scroll-mt-20"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-9 h-9 rounded-sm bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Authentication
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-500">
                    Access control settings
                  </p>
                </div>
              </div>

              <AuthSection
                settings={authSettings}
                onUpdate={onUpdateAuthSettings}
              />
            </section>
          </div>

          {/* Sticky Sidebar Navigation */}
          <nav className="hidden lg:block w-48 shrink-0">
            <div className="sticky top-20">
              <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-sm border border-slate-200 dark:border-slate-800 p-2">
                <div className="space-y-0.5">
                  {SECTIONS.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => scrollToSection(id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm font-medium transition-all ${
                        activeSection === id
                          ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}

