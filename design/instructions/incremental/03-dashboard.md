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
- Within 1 week: day name ("Wednesday")
- Beyond: full date ("Jan 15")


## Dynamic Grid Sizing

Calculate how many cards fit in 2 rows based on container width:


## Empty States

Show appropriate empty states when:
- No wanted movies: "No wanted movies — All your movies have been downloaded"
- No wanted series: "No upcoming episodes — All your series are up to date"
- No recent downloads: "No recent downloads"

## Verification

- [ ] Wanted movies display in responsive grid
- [ ] "View all" card appears when overflow
- [ ] Card hover shows action buttons
- [ ] Dates are humanized correctly
- [ ] Downloads table is clickable
- [ ] Empty states display when no data
- [ ] Section icons use correct colors

