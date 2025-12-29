import type { TVListProps, Series } from "@/../product/sections/tv/types";
import { TvSeriesCard } from "./TvSeriesCard";
import {
  Search,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  X,
  Tv,
} from "lucide-react";
import { useState, useMemo } from "react";

type SortOption = "title" | "nextAiring" | "dateAdded" | "fileSize";
type StatusFilter = "all" | "missing" | "continuing" | "complete" | "ended";
type QualityFilter = "all" | "2160p" | "1080p" | "720p" | "480p";
type MonitoredFilter = "all" | "monitored" | "unmonitored";

export function TvList({
  series,
  searchQuery: controlledSearchQuery,
  onSearchChange,
  onViewSeries,
  onAutoSearch,
  onManualSearch,
  onDeleteSeries,
  onToggleSeriesMonitored,
  onEditQualityProfile,
  onAddSeries,
}: TVListProps) {
  // Search and filter state
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const searchQuery = controlledSearchQuery ?? internalSearchQuery;
  const setSearchQuery = onSearchChange ?? setInternalSearchQuery;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>("all");
  const [monitoredFilter, setMonitoredFilter] =
    useState<MonitoredFilter>("all");
  const [yearRange, setYearRange] = useState<[number, number]>([1900, 2030]);
  const [sortBy, setSortBy] = useState<SortOption>("dateAdded");
  const [sortDesc, setSortDesc] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort series
  const filteredSeries = useMemo(() => {
    let result = [...series];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.network.toLowerCase().includes(query)
      );
    }

    // Helper: check if series has missing episodes (past air date, not downloaded)
    const hasMissingEpisodes = (s: Series) =>
      s.seasons.some((season) =>
        season.episodes.some((ep) => ep.status === "missing")
      );

    // Helper: check if series has continuing episodes (future air date)
    const hasContinuingEpisodes = (s: Series) =>
      s.seasons.some((season) =>
        season.episodes.some((ep) => ep.status === "airing")
      );

    // Status filter
    if (statusFilter === "missing") {
      result = result.filter((s) => hasMissingEpisodes(s));
    } else if (statusFilter === "complete") {
      result = result.filter((s) => s.downloadedEpisodes === s.totalEpisodes);
    } else if (statusFilter === "continuing") {
      result = result.filter((s) => hasContinuingEpisodes(s));
    } else if (statusFilter === "ended") {
      result = result.filter((s) => s.status === "ended");
    }

    // Quality filter
    if (qualityFilter !== "all") {
      result = result.filter((s) => s.qualityPreference === qualityFilter);
    }

    // Monitored filter
    if (monitoredFilter === "monitored") {
      result = result.filter((s) => s.monitored);
    } else if (monitoredFilter === "unmonitored") {
      result = result.filter((s) => !s.monitored);
    }

    // Year range filter
    result = result.filter(
      (s) => s.year >= yearRange[0] && s.year <= yearRange[1]
    );

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "nextAiring":
          const dateA = a.nextAiring ? new Date(a.nextAiring).getTime() : 0;
          const dateB = b.nextAiring ? new Date(b.nextAiring).getTime() : 0;
          // Put series with upcoming episodes first
          if (dateA === 0 && dateB === 0) comparison = 0;
          else if (dateA === 0) comparison = 1;
          else if (dateB === 0) comparison = -1;
          else comparison = dateA - dateB;
          break;
        case "dateAdded":
          comparison =
            new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
          break;
        case "fileSize":
          // Sum up all episode sizes
          const getSizeSum = (s: Series) =>
            s.seasons.reduce(
              (sum, season) =>
                sum +
                season.episodes.reduce(
                  (eSum, ep) => eSum + (ep.size ?? 0),
                  0
                ),
              0
            );
          comparison = getSizeSum(a) - getSizeSum(b);
          break;
      }
      return sortDesc ? -comparison : comparison;
    });

    return result;
  }, [
    series,
    searchQuery,
    statusFilter,
    qualityFilter,
    monitoredFilter,
    yearRange,
    sortBy,
    sortDesc,
  ]);

  // Helper functions for stats
  const hasMissingEpisodes = (s: Series) =>
    s.seasons.some((season) =>
      season.episodes.some((ep) => ep.status === "missing")
    );
  
  const hasContinuingEpisodes = (s: Series) =>
    s.seasons.some((season) =>
      season.episodes.some((ep) => ep.status === "airing")
    );

  // Helper to calculate total size of a series (sizes are already in GB)
  const getSeriesSize = (s: Series) =>
    s.seasons.reduce(
      (sum, season) =>
        sum + season.episodes.reduce((eSum, ep) => eSum + (ep.size ?? 0), 0),
      0
    );

  // Format GB to human readable
  const formatSize = (gb: number) => {
    if (gb === 0) return "0 GB";
    if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
    return `${gb.toFixed(1)} GB`;
  };

  // Stats
  const totalSeries = series.length;
  const completeSeries = series.filter(
    (s) => s.downloadedEpisodes === s.totalEpisodes
  ).length;
  const missingSeries = series.filter((s) => hasMissingEpisodes(s)).length;
  const continuingSeries = series.filter((s) => hasContinuingEpisodes(s)).length;
  
  // Size stats
  const totalSize = series.reduce((sum, s) => sum + getSeriesSize(s), 0);
  const filteredSize = filteredSeries.reduce((sum, s) => sum + getSeriesSize(s), 0);

  // Active filter count
  const activeFilterCount = [
    statusFilter !== "all",
    qualityFilter !== "all",
    monitoredFilter !== "all",
    yearRange[0] !== 1900 || yearRange[1] !== 2030,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setStatusFilter("all");
    setQualityFilter("all");
    setMonitoredFilter("all");
    setYearRange([1900, 2030]);
  };

  return (
    <div className="flex flex-col flex-1 bg-white dark:bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-[1400px] mx-auto px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Title */}
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              TV Series
            </h1>

            {/* Search and Add */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:flex-initial sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search series..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-1.5 rounded-sm bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-500/50 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => onAddSeries?.()}
                className="flex items-center gap-2 px-4 py-1.5 rounded-sm bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-600/20 transition-all hover:shadow-blue-500/30 hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Series</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border transition-all ${
                showFilters || activeFilterCount > 0
                  ? "bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-500/30 text-blue-700 dark:text-blue-400"
                  : "bg-white dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-sm font-medium">Filters</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-semibold bg-blue-600 text-white rounded-sm">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Quick Filters */}
            <div className="flex items-center gap-2">
              <QuickFilterButton
                active={statusFilter === "all"}
                onClick={() => setStatusFilter("all")}
              >
                All
              </QuickFilterButton>
              <QuickFilterButton
                active={statusFilter === "missing"}
                onClick={() => setStatusFilter("missing")}
                color="amber"
              >
                Missing
              </QuickFilterButton>
              <QuickFilterButton
                active={statusFilter === "continuing"}
                onClick={() => setStatusFilter("continuing")}
                color="sky"
              >
                Continuing
              </QuickFilterButton>
              <QuickFilterButton
                active={statusFilter === "complete"}
                onClick={() => setStatusFilter("complete")}
                color="emerald"
              >
                Complete
              </QuickFilterButton>
              <QuickFilterButton
                active={statusFilter === "ended"}
                onClick={() => setStatusFilter("ended")}
              >
                Ended
              </QuickFilterButton>
            </div>

            {/* Sort */}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-500">Sort by</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="appearance-none pl-3 pr-8 py-1.5 rounded-sm bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                >
                  <option value="dateAdded">Date Added</option>
                  <option value="title">Title</option>
                  <option value="nextAiring">Next Airing</option>
                  <option value="fileSize">File Size</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
              </div>
              <button
                onClick={() => setSortDesc(!sortDesc)}
                className="p-1.5 rounded-sm bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                title={sortDesc ? "Descending" : "Ascending"}
              >
                <svg
                  className={`w-4 h-4 transition-transform ${
                    sortDesc ? "" : "rotate-180"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 p-4 rounded-sm bg-white dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Quality Filter */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Quality
                  </label>
                  <select
                    value={qualityFilter}
                    onChange={(e) =>
                      setQualityFilter(e.target.value as QualityFilter)
                    }
                    className="w-full appearance-none px-3 py-2 rounded-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="all">All Qualities</option>
                    <option value="2160p">4K (2160p)</option>
                    <option value="1080p">Full HD (1080p)</option>
                    <option value="720p">HD (720p)</option>
                    <option value="480p">SD (480p)</option>
                  </select>
                </div>

                {/* Monitored Filter */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Monitored
                  </label>
                  <select
                    value={monitoredFilter}
                    onChange={(e) =>
                      setMonitoredFilter(e.target.value as MonitoredFilter)
                    }
                    className="w-full appearance-none px-3 py-2 rounded-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="all">All</option>
                    <option value="monitored">Monitored Only</option>
                    <option value="unmonitored">Unmonitored Only</option>
                  </select>
                </div>

                {/* Year Range */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Year From
                  </label>
                  <input
                    type="number"
                    min="1900"
                    max="2030"
                    value={yearRange[0]}
                    onChange={(e) =>
                      setYearRange([Number(e.target.value), yearRange[1]])
                    }
                    className="w-full px-3 py-2 rounded-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Year To
                  </label>
                  <input
                    type="number"
                    min="1900"
                    max="2030"
                    value={yearRange[1]}
                    onChange={(e) =>
                      setYearRange([yearRange[0], Number(e.target.value)])
                    }
                    className="w-full px-3 py-2 rounded-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>

              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="mt-4 flex items-center gap-2 px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Series Grid */}
      <div className="flex-1 max-w-[1400px] mx-auto px-6 py-8 w-full">
        {filteredSeries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="p-4 rounded-sm bg-slate-100 dark:bg-slate-800/30 mb-4">
              <Tv className="w-12 h-12 text-slate-400 dark:text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
              No series found
            </h3>
            <p className="text-slate-500 dark:text-slate-500 max-w-md">
              {searchQuery
                ? `No series match "${searchQuery}". Try a different search term.`
                : "No series match the current filters. Try adjusting your filters or add some series."}
            </p>
            {(searchQuery || activeFilterCount > 0) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  clearFilters();
                }}
                className="mt-4 px-4 py-2 rounded-sm bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                Clear search & filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, 190px)', justifyContent: 'start' }}>
              {filteredSeries.map((s) => (
                <TvSeriesCard
                  key={s.id}
                  series={s}
                  onView={() => onViewSeries?.(s.id)}
                  onAutoSearch={() => onAutoSearch?.(s.id)}
                  onManualSearch={() => onManualSearch?.(s.id)}
                  onDelete={() => onDeleteSeries?.(s.id)}
                  onToggleMonitored={(monitored) =>
                    onToggleSeriesMonitored?.(s.id, monitored)
                  }
                  onEditQualityProfile={() => onEditQualityProfile?.(s.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Stats Footer */}
      <div className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="max-w-[1400px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between text-sm">
            {/* Left side - Status counts */}
            <div className="flex items-center gap-4">
              <span className="text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-900 dark:text-white">{totalSeries}</span>{" "}
                Total
              </span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {completeSeries}
                </span>{" "}
                Complete
              </span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {missingSeries}
                </span>{" "}
                Missing
              </span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-sky-600 dark:text-sky-400">
                  {continuingSeries}
                </span>{" "}
                Continuing
              </span>
            </div>

            {/* Right side - Selection and size stats */}
            <div className="flex items-center gap-4">
              <span className="text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-900 dark:text-white">{filteredSeries.length}</span>{" "}
                Selected
              </span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-900 dark:text-white">{formatSize(filteredSize)}</span>
              </span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-900 dark:text-white">{totalSeries}</span>{" "}
                Total
              </span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-900 dark:text-white">{formatSize(totalSize)}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Quick filter button component
function QuickFilterButton({
  active,
  onClick,
  children,
  color = "blue",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: "blue" | "amber" | "emerald" | "sky";
}) {
  const colorClasses = {
    blue: active
      ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-500/30"
      : "",
    amber: active
      ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30"
      : "",
    emerald: active
      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30"
      : "",
    sky: active
      ? "bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400 border border-sky-300 dark:border-sky-500/30"
      : "",
  };

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-sm text-sm font-medium transition-all ${
        active
          ? colorClasses[color]
          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
      }`}
    >
      {children}
    </button>
  );
}

