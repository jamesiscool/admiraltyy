import type { Series } from "@/../product/sections/tv/types";
import {
  Search,
  Crosshair,
  Trash2,
  MoreVertical,
  Eye,
  EyeOff,
  Settings,
  Calendar,
  Tv,
} from "lucide-react";
import { useState } from "react";

interface TvSeriesCardProps {
  series: Series;
  onView?: () => void;
  onAutoSearch?: () => void;
  onManualSearch?: () => void;
  onDelete?: () => void;
  onToggleMonitored?: (monitored: boolean) => void;
  onEditQualityProfile?: () => void;
}

export function TvSeriesCard({
  series,
  onView,
  onAutoSearch,
  onManualSearch,
  onDelete,
  onToggleMonitored,
  onEditQualityProfile,
}: TvSeriesCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Check for missing episodes (past air date, not downloaded)
  const hasMissingEpisodes = series.seasons.some((season) =>
    season.episodes.some((ep) => ep.status === "missing")
  );

  // Check for continuing episodes (future air date)
  const hasContinuingEpisodes = series.seasons.some((season) =>
    season.episodes.some((ep) => ep.status === "airing")
  );

  // Count missing episodes
  const missingEpisodeCount = series.seasons.reduce(
    (count, season) =>
      count + season.episodes.filter((ep) => ep.status === "missing").length,
    0
  );

  // Calculate download status
  const isFullyDownloaded = series.downloadedEpisodes === series.totalEpisodes;

  const getStatusLabel = (): string | null => {
    if (isFullyDownloaded) return "Complete";
    if (hasMissingEpisodes) return `${missingEpisodeCount} Missing`;
    // Don't show episode count pill for continuing series (they have the next airing date badge)
    if (hasContinuingEpisodes) return null;
    return `${series.downloadedEpisodes}/${series.totalEpisodes}`;
  };

  const getStatusColor = () => {
    if (isFullyDownloaded) return "bg-emerald-500/90 text-white";
    if (hasMissingEpisodes) return "bg-amber-500/90 text-white";
    if (hasContinuingEpisodes) return "bg-sky-500/90 text-white";
    return "bg-slate-500/90 text-white";
  };

  // Format next airing date
  const formatNextAiring = (dateStr: string | null) => {
    if (!dateStr) return null;

    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return null;
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays <= 7) {
      return date.toLocaleDateString("en-US", { weekday: "long" });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const nextAiringLabel = formatNextAiring(series.nextAiring);

  return (
    <div
      className="group relative w-[190px] aspect-[2/3] rounded-sm overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:z-10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setMenuOpen(false);
      }}
      onClick={() => onView?.()}
    >
      {/* Poster Image */}
      <div className="absolute inset-0 bg-slate-800">
        <img
          src={series.posterUrl}
          alt={series.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        {/* Fallback poster placeholder */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 -z-10">
          <Tv className="w-12 h-12 text-slate-600" />
        </div>
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      {/* Hover overlay with actions */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Top-left badge: Next Airing Date OR Status Badge */}
      <div className="absolute top-2 left-2 z-10">
        {nextAiringLabel && series.monitored ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-blue-600/90 text-white shadow-lg">
            <Calendar className="w-2.5 h-2.5" />
            {nextAiringLabel}
          </span>
        ) : getStatusLabel() ? (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide shadow-lg ${getStatusColor()}`}
          >
            {getStatusLabel()}
          </span>
        ) : null}
      </div>

      {/* Monitoring indicator */}
      {!series.monitored && (
        <div className="absolute top-9 left-2 z-10">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-800/90 text-slate-400">
            <EyeOff className="w-2.5 h-2.5" />
            Unmonitored
          </span>
        </div>
      )}

      {/* Action buttons - visible on hover */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 transition-all duration-200 ${
          isHovered ? "opacity-100 scale-100" : "opacity-0 scale-90"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onAutoSearch?.()}
          className="p-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/30 transition-all duration-200 hover:scale-110"
          title="Auto Search"
        >
          <Crosshair className="w-4 h-4" />
        </button>
        <button
          onClick={() => onManualSearch?.()}
          className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 text-white shadow-xl transition-all duration-200 hover:scale-110"
          title="Manual Search"
        >
          <Search className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete?.()}
          className="p-2 rounded-full bg-slate-700 hover:bg-red-600 text-white shadow-xl transition-all duration-200 hover:scale-110"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* More menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 text-white shadow-xl transition-all duration-200 hover:scale-110"
            title="More Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 py-1 bg-slate-800 rounded-sm shadow-2xl border border-slate-700 z-20">
              <button
                onClick={() => {
                  onToggleMonitored?.(!series.monitored);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
              >
                {series.monitored ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Unmonitor
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Monitor
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  onEditQualityProfile?.();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Edit Quality Profile
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Series info - bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
        <h3 className="font-semibold text-white text-base leading-tight tracking-tight line-clamp-2 mb-1">
          {series.title}
        </h3>
        <div className="flex items-center gap-1.5 text-sm text-slate-300">
          <span className="font-medium">{series.year}</span>
          <span className="text-slate-500">•</span>
          <span className="font-mono text-sky-400">{series.qualityPreference}</span>
        </div>
        {/* Episode count and status */}
        <div className="mt-1 text-xs text-slate-400">
          {series.seasons.length} Season{series.seasons.length !== 1 ? "s" : ""}{" "}
          • {series.totalEpisodes} Ep{series.totalEpisodes !== 1 ? "s" : ""}
          {series.status === "ended" && (
            <span> • Ended</span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {series.totalEpisodes > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800/80">
          <div
            className={`h-full transition-all duration-500 ${
              isFullyDownloaded
                ? "bg-emerald-500"
                : hasMissingEpisodes
                  ? "bg-amber-500"
                  : hasContinuingEpisodes
                    ? "bg-sky-500"
                    : "bg-slate-500"
            }`}
            style={{
              width: `${(series.downloadedEpisodes / series.totalEpisodes) * 100}%`,
            }}
          />
        </div>
      )}

      {/* Hover glow effect */}
      <div
        className={`absolute inset-0 ring-2 rounded-sm transition-opacity duration-300 pointer-events-none ${
          isFullyDownloaded
            ? "ring-emerald-500/50"
            : hasContinuingEpisodes
              ? "ring-sky-500/50"
              : "ring-blue-500/50"
        } ${isHovered ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}

