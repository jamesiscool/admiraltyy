# TV Specification

## Overview
The TV section lets users browse their tracked TV series library, filter and sort the collection, view detailed episode information organized by season, and add new series via TVDB search.

### Episode Status Definitions
- **Downloaded**: Episode has a file on disk
- **Missing**: Episode's air date has passed but no file has been downloaded (urgent - needs action)
- **Continuing**: Episode has a future air date and is being monitored for release

## User Flows
- Browse all tracked TV series in a responsive card grid
- Search series by title using the search box
- Filter by status (missing/downloaded/continuing), quality, monitored/unmonitored, year range
- Sort by title, next airing date, date added, or file size
- Hover over a card to access quick actions (auto-search, manual search, delete) and a three-dot menu
- Click a series card to view the detail page
- On the detail page: view synopsis, cast, and series info at top
- On the detail page: view episodes in tables organized by season (most recent season first)
- Toggle monitoring at series, season, or individual episode level
- Trigger search, delete, or edit quality profile from the detail page
- Navigate to Add TV page to search TVDB and add new series (monitors all seasons/episodes by default)
- Quickly identify series with missing episodes via yellow card styling (indicates episodes past air date without download)

### Monitoring Behavior
- **Series-level monitoring:** When a series is set to unmonitored, all season and episode monitor buttons become disabled but maintain their current monitored/unmonitored state. When the series is set back to monitored, season and episode buttons become enabled again with their previous states intact.
- **Season-level monitoring:** When a season is set to monitored, all episodes within that season are automatically set to monitored. When a season is set to unmonitored, all episodes within that season are automatically set to unmonitored.
- **Episode-level monitoring:** Individual episodes can be toggled between monitored and unmonitored states, but only when both the parent series and parent season are monitored. Episode toggles are disabled when the series is unmonitored.

## UI Requirements
- **Page header:** Title "TV" on the left, search box on the right
- **Filter/sort controls:** Below header, allowing status, quality, monitored, and year filters plus sort order
- **Series cards:** Poster-dominant with title and year at bottom; permanent badge for download status
- **Card status colors:**
  - **Green (emerald):** Complete - all episodes downloaded
  - **Blue (sky):** Continuing - has episodes with future air dates being monitored
  - **Yellow (amber):** Missing - has episodes past their air date without a download (needs attention)
- **Card border styling:** Series with missing episodes get a yellow glow/border to draw attention
- **Card hover state:** Action icons (auto-search, manual search, delete) and three-dot more menu
- **Series detail page:** Series info header with action buttons, followed by season sections
- **Episode tables:** One table per season; columns: Episode #, Title, Air Date, Status, Quality, Size
- **Season ordering:** Most recent season appears first
- **Monitoring toggles:** Available at series header, season header, and per-episode row
- **Add TV page:** Search bar at top, TVDB search results below for adding series

## Configuration
- shell: true

