import type { WantedSeries } from "@/../product/sections/dashboard/types";
import {
  Search,
  Crosshair,
  Trash2,
  Tv,
  Calendar,
} from "lucide-react";
import { useState } from "react";

interface WantedSeriesCardProps {
  wantedSeries: WantedSeries;
  onView?: () => void;
  onAutoSearch?: () => void;
  onManualSearch?: () => void;
  onDelete?: () => void;
}

/**
 * Format a date string to a humanized relative date.
 * "tomorrow", day of week (within 1 week), or full date.
 */
function formatAirDate(dateStr: string | null): string | null {
  if (!dateStr) return null;

  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    // Already aired
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function WantedSeriesCard({
  wantedSeries,
  onView,
  onAutoSearch,
  onManualSearch,
  onDelete,
}: WantedSeriesCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const { series, nextWantedEpisode } = wantedSeries;
  const nextAirDate = nextWantedEpisode?.airDate
    ? formatAirDate(nextWantedEpisode.airDate)
    : null;

  // Determine badge color based on episode status
  const isMissing = nextWantedEpisode?.status === "missing";
  const isAiring = nextWantedEpisode?.status === "airing";

  return (
    <div
      className="group relative w-[160px] sm:w-[180px] aspect-[2/3] rounded-sm overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:z-10 flex-shrink-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      {/* Hover overlay with actions */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Top-left badge: Next airing date or Missing status */}
      <div className="absolute top-2 left-2 z-10">
        {isAiring && nextAirDate ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-blue-600/90 text-white shadow-lg">
            <Calendar className="w-2.5 h-2.5" />
            {nextAirDate}
          </span>
        ) : isMissing ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide shadow-lg bg-amber-500/90 text-white">
            Missing
          </span>
        ) : null}
      </div>

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
      </div>

      {/* Series info - bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-2.5 z-10">
        <h3 className="font-semibold text-white text-base leading-tight tracking-tight line-clamp-2 mb-1">
          {series.title}
        </h3>

        {/* Next episode info */}
        {nextWantedEpisode && (
          <div className="flex items-center gap-1.5 text-sm text-slate-300">
            <span className="font-medium">
              S{String(nextWantedEpisode.seasonNumber).padStart(2, "0")}E
              {String(nextWantedEpisode.episodeNumber).padStart(2, "0")}
            </span>
          </div>
        )}
      </div>


    </div>
  );
}

