# Movies Specification

## Overview
The Movies section lets users browse their tracked movie library, filter and sort the collection, view detailed information, and add new movies via TMDB search. Movies without a downloaded file are considered "wanted."

## User Flows
- Browse all tracked movies in a responsive card grid
- Search movies by title using the search box
- Filter by status (wanted/downloaded), quality, monitored/unmonitored, year range
- Sort by title, release date, date added, or file size
- Hover over a card to access quick actions (auto-search, manual search, delete) and a three-dot menu
- Click a movie card to view the detail page
- On the detail page: view synopsis, cast, quality info, file details, and release dates
- On the detail page: toggle monitoring, trigger search, delete, or edit quality profile
- Navigate to the Add Movie page to search TMDB and add new movies to track

## UI Requirements
- **Page header:** Title "Movies" on the left, search box on the right
- **Filter/sort controls:** Below header, allowing status, quality, monitored, and year filters plus sort order
- **Movie cards:** Poster-dominant with title and year (styled typography) at bottom; permanent badge for download status
- **Card hover state:** Action icons (auto-search, manual search, delete) and three-dot more menu
- **Movie detail page:** Full movie info with action buttons
- **Add Movie page:** Search bar at top, TMDB search results below for adding movies

## Configuration
- shell: true

