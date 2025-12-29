import type { WantedMovie } from "@/../product/sections/dashboard/types";
import {
  Search,
  Crosshair,
  Trash2,
  Film,
} from "lucide-react";
import { useState } from "react";

interface WantedMovieCardProps {
  movie: WantedMovie;
  onView?: () => void;
  onAutoSearch?: () => void;
  onManualSearch?: () => void;
  onDelete?: () => void;
}

/**
 * Format a date string to a humanized relative date.
 * "tomorrow", day of week (within 1 week), or full date.
 */
function formatReleaseDate(dateStr: string | null): string | null {
  if (!dateStr) return null;

  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    // Already released
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function WantedMovieCard({
  movie,
  onView,
  onAutoSearch,
  onManualSearch,
  onDelete,
}: WantedMovieCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const cinemaRelease = formatReleaseDate(movie.cinemaReleaseDate);
  const digitalRelease = formatReleaseDate(movie.digitalReleaseDate);

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
          src={movie.posterUrl}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        {/* Fallback poster placeholder */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 -z-10">
          <Film className="w-12 h-12 text-slate-600" />
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

      {/* Top-left badge: Wanted status */}
      <div className="absolute top-2 left-2 z-10">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide shadow-lg bg-amber-500/90 text-white">
          Wanted
        </span>
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

      {/* Movie info - bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-2.5 z-10">
        <h3 className="font-semibold text-white text-base leading-tight tracking-tight line-clamp-2 mb-1">
          {movie.title}
        </h3>
        
        {/* Release dates */}
        <div className="flex flex-col gap-[1px] mt-1">
          {cinemaRelease && (
            <div className="flex items-center  gap-2 text-sm">
              <span className="text-slate-400 font-medium">Cinema</span>
              <span className="text-slate-200 font-medium tabular-nums">{cinemaRelease}</span>
            </div>
          )}
          {digitalRelease && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400 font-medium">Digital</span>
              <span className="text-slate-200 font-medium tabular-nums">{digitalRelease}</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

