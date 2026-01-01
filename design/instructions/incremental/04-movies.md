# Milestone 4: Movies

The Movies section lets users browse their tracked movie library, filter and sort the collection, view detailed information, and add new movies via TMDB search.

## Overview

Movies without a downloaded file are considered "wanted." The UI provides a responsive grid of movie posters with filtering, sorting, and quick actions.

## Components to Implement

### 1. MoviesList

Main movie library grid view.

```typescript
interface MoviesListProps {
  movies: Movie[];
  onView?: (id: string) => void;
  onAutoSearch?: (id: string) => void;
  onManualSearch?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleMonitored?: (id: string, monitored: boolean) => void;
  onEditQuality?: (id: string) => void;
  onAddMovie?: () => void;
}
```

**Features:**
- Page header: "Movies" title + search box
- Filter controls: status, quality, monitored, year range
- Sort controls: title, release date, date added, file size
- Responsive poster grid
- Add Movie button

### 2. MovieCard

Individual movie poster card.

**Display:**
- Poster image (fills card)
- Title and year at bottom (gradient overlay)
- Status badge: "Downloaded" (green) or "Wanted" (amber)
- Quality badge if downloaded

**Hover state:**
- Action icons appear: auto-search, manual search, delete
- Three-dot menu for additional actions

### 3. MovieDetail

Full movie detail page.

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ [← Back]                     [Actions buttons]  │
├─────────────────────────────────────────────────┤
│ ┌──────────┐  Movie Title (Year)                │
│ │          │  Genre • Runtime                   │
│ │  Poster  │  ⭐ Quality Preference             │
│ │          │  [Monitored toggle]                │
│ └──────────┘                                    │
├─────────────────────────────────────────────────┤
│ Synopsis                                        │
│ Lorem ipsum dolor sit amet...                   │
├─────────────────────────────────────────────────┤
│ Cast                                            │
│ Actor Name as Character, Actor Name as Char...  │
├─────────────────────────────────────────────────┤
│ Release Dates                                   │
│ Cinema: Nov 15, 2024                           │
│ Digital: Jan 14, 2025                          │
├─────────────────────────────────────────────────┤
│ File Details (if downloaded)                    │
│ Path: /media/movies/Title (Year)/file.mkv      │
│ Size: 22.5 GB • Quality: 2160p                 │
│ Source: WEB-DL • Codec: H.265                  │
└─────────────────────────────────────────────────┘
```

**Action buttons:**
- Auto Search
- Manual Search
- Edit Quality
- Delete

### 4. AddMovie (Modal/Page)

TMDB search interface for adding new movies.

**Features:**
- Search input at top
- Results grid with poster cards
- Each result shows: poster, title, year, overview preview
- Click to add with quality selection
- Cancel/close option

## Filtering

```typescript
interface MovieFilters {
  search: string;
  status: 'all' | 'wanted' | 'downloaded';
  quality: 'all' | '480p' | '720p' | '1080p' | '2160p';
  monitored: 'all' | 'monitored' | 'unmonitored';
  yearFrom?: number;
  yearTo?: number;
}
```

## Sorting

```typescript
type MovieSort = 
  | 'title-asc' | 'title-desc'
  | 'release-asc' | 'release-desc'
  | 'added-asc' | 'added-desc'
  | 'size-asc' | 'size-desc';
```

## API Endpoints

```typescript
// List movies
GET /api/movies
  ?search=term
  &status=wanted|downloaded
  &quality=1080p
  &monitored=true
  &yearFrom=2020
  &yearTo=2024
  &sort=title-asc

// Get movie detail
GET /api/movies/:id

// Add movie
POST /api/movies
  { tmdbId: number, qualityPreference: string }

// Update movie
PATCH /api/movies/:id
  { monitored?: boolean, qualityPreference?: string }

// Delete movie
DELETE /api/movies/:id

// Search TMDB
GET /api/search/movies?q=term

// Trigger search for releases
POST /api/movies/:id/search
```

## Empty States

**No movies in library:**
- Icon: Film
- Title: "No movies yet"
- Description: "Add movies to start tracking them"
- Action: "Add Movie" button

**No search results:**
- Title: "No movies found"
- Description: "Try adjusting your search or filters"

## Keyboard Shortcuts

Consider implementing:
- `/` — Focus search box
- `Escape` — Clear search/close modal
- `Enter` on card — View detail

## Verification

- [ ] Movie grid displays responsively
- [ ] Filters work correctly
- [ ] Sorting works correctly
- [ ] Card hover shows actions
- [ ] Detail page shows all movie info
- [ ] Add Movie search returns TMDB results
- [ ] Monitoring toggle updates correctly
- [ ] Delete removes movie with confirmation
- [ ] Empty states display appropriately

