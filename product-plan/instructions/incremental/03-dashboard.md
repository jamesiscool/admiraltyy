# Milestone 3: Dashboard

The dashboard provides an at-a-glance view of wanted content and recent activity.

## Overview

Display wanted movies, TV series with upcoming episodes, and recent download history. No stats or chrome — just the content.

## Components to Implement

### 1. Dashboard

Main dashboard view component.

```typescript
interface DashboardProps {
  wantedMovies: WantedMovie[];
  wantedSeries: WantedSeries[];
  recentDownloads: RecentDownload[];
  onMovieClick?: (id: string) => void;
  onMovieAutoSearch?: (id: string) => void;
  onMovieManualSearch?: (id: string) => void;
  onMovieDelete?: (id: string) => void;
  onSeriesClick?: (id: string) => void;
  onSeriesAutoSearch?: (id: string) => void;
  onSeriesManualSearch?: (id: string) => void;
  onSeriesDelete?: (id: string) => void;
  onDownloadClick?: (download: RecentDownload) => void;
  onViewAllMovies?: () => void;
  onViewAllTv?: () => void;
}
```

### 2. WantedMovieCard

Poster card for wanted movies.

**Display:**
- Movie poster (160x240px on mobile, 180x270px on larger)
- Cinema release date
- Digital release date
- Humanized date format

**Hover actions:**
- Auto-search (magnifying glass + sparkle)
- Manual search (magnifying glass)
- Delete (trash)

### 3. WantedSeriesCard

Poster card for series with wanted episodes.

**Display:**
- Series poster
- Next wanted episode info (S01E01 format)
- Air date
- Status indicator (missing = red, airing = blue)

### 4. ViewAllCard

Overflow card when items exceed 2 rows.

**Display:**
- Count of remaining items
- "more movies" or "more series" label
- Arrow icon

### 5. DownloadsTable

Table of recent downloads (max 10).

**Columns:**
- Type (movie/tv icon)
- Title
- Quality
- Size (formatted, e.g., "7.4 GB")
- Date Downloaded
- Status (with progress for active)

## Layout

```
┌─────────────────────────────────────────────────┐
│ Wanted Movies                          │ amber  │
│ 4 movies awaiting release                       │
├─────────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│ │      │ │      │ │      │ │      │ │ +5   │   │
│ │poster│ │poster│ │poster│ │poster│ │ more │   │
│ │      │ │      │ │      │ │      │ │      │   │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘   │
├─────────────────────────────────────────────────┤
│ Upcoming TV                            │  sky   │
│ 3 series with wanted episodes                   │
├─────────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐                      │
│ │      │ │      │ │      │                      │
│ │poster│ │poster│ │poster│                      │
│ │      │ │      │ │      │                      │
│ └──────┘ └──────┘ └──────┘                      │
├─────────────────────────────────────────────────┤
│ Recent Downloads                       │ green  │
│ Your latest download activity                   │
├─────────────────────────────────────────────────┤
│ Type │ Title           │ Quality │ Size │ Date │
│ 🎬   │ Conclave        │ 1080p   │ 7.4GB│ 2h   │
│ 📺   │ Severance S02E10│ 1080p   │ 3.0GB│ 1d   │
└─────────────────────────────────────────────────┘
```

## Date Formatting

Implement humanized dates:
- Within 24 hours: "X hours ago" or "just now"
- Tomorrow: "tomorrow"
- Within 1 week: day name ("Wednesday")
- Beyond: full date ("Jan 15, 2025")

```typescript
function humanizeDate(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays > 1 && diffDays <= 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
```

## Dynamic Grid Sizing

Calculate how many cards fit in 2 rows based on container width:

```typescript
function useMaxCardsInTwoRows(containerRef: React.RefObject<HTMLDivElement>) {
  const [maxCards, setMaxCards] = useState(8);

  useEffect(() => {
    const calculateMaxCards = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const cardWidth = 180;
      const gap = 16;
      const cardsPerRow = Math.floor((containerWidth + gap) / (cardWidth + gap));
      setMaxCards(cardsPerRow * 2);
    };

    const resizeObserver = new ResizeObserver(calculateMaxCards);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  return maxCards;
}
```

## Empty States

Show appropriate empty states when:
- No wanted movies: "No wanted movies — All your movies have been downloaded"
- No wanted series: "No upcoming episodes — All your series are up to date"
- No recent downloads: "No recent downloads"

## API Endpoints

```typescript
// Fetch dashboard data
const fetchDashboard = async () => {
  const [movies, series, downloads] = await Promise.all([
    fetch('/api/movies?wanted=true').then(r => r.json()),
    fetch('/api/series?wanted=true').then(r => r.json()),
    fetch('/api/activity/history?limit=10').then(r => r.json()),
  ]);
  return { wantedMovies: movies, wantedSeries: series, recentDownloads: downloads };
};
```

## Verification

- [ ] Wanted movies display in responsive grid
- [ ] "View all" card appears when overflow
- [ ] Card hover shows action buttons
- [ ] Dates are humanized correctly
- [ ] Downloads table is clickable
- [ ] Empty states display when no data
- [ ] Section icons use correct colors

