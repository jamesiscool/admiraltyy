import type { Movie } from "@/../product/sections/movies/types";
import {
  Search,
  Crosshair,
  Trash2,
  MoreVertical,
  Eye,
  EyeOff,
  Settings,
  Film,
} from "lucide-react";
import { useState } from "react";

interface MovieCardProps {
  movie: Movie;
  onView?: () => void;
  onAutoSearch?: () => void;
  onManualSearch?: () => void;
  onDelete?: () => void;
  onToggleMonitored?: (monitored: boolean) => void;
  onEditQuality?: () => void;
}

export function MovieCard({
  movie,
  onView,
  onAutoSearch,
  onManualSearch,
  onDelete,
  onToggleMonitored,
  onEditQuality,
}: MovieCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const hasFile = movie.file !== null;
  const statusLabel = hasFile ? "Downloaded" : "Wanted";
  const statusColor = hasFile
    ? "bg-emerald-500/90 text-white"
    : "bg-amber-500/90 text-white";

  // Format file size for display (bytes to GB)
  const formatFileSize = (bytes: number) => {
    const gb = bytes / 1_000_000_000;
    return `${gb.toFixed(1)} GB`;
  };

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
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      {/* Hover overlay with actions */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Top-left badge: Status Badge */}
      <div className="absolute top-2 left-2 z-10">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide shadow-lg ${statusColor}`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Monitoring indicator */}
      {!movie.monitored && (
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
                  onToggleMonitored?.(!movie.monitored);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
              >
                {movie.monitored ? (
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
                  onEditQuality?.();
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

      {/* Movie info - bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
        <h3 className="font-semibold text-white text-base leading-tight tracking-tight line-clamp-2 mb-1">
          {movie.title}
        </h3>
        <div className="flex items-center gap-1.5 text-sm text-slate-300">
          <span className="font-medium">{movie.year}</span>
          <span className="text-slate-500">•</span>
          <span className="font-mono text-sky-400">{movie.qualityPreference}</span>
        </div>
        {/* File size and runtime */}
        <div className="mt-1 text-xs text-slate-400">
          {movie.runtime} min
          {hasFile && movie.file && (
            <span> • {formatFileSize(movie.file.size)}</span>
          )}
        </div>
      </div>

      {/* Hover glow effect */}
      <div
        className={`absolute inset-0 ring-2 rounded-sm transition-opacity duration-300 pointer-events-none ${
          hasFile
            ? "ring-emerald-500/50"
            : "ring-amber-500/50"
        } ${isHovered ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
