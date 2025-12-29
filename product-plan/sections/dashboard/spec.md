# Dashboard Specification

## Overview
The dashboard provides an at-a-glance view of wanted content and recent activity. It displays wanted movies awaiting release, upcoming TV episodes, and a history of recent downloads — all without stats or chrome, just the content.

## User Flows
- View wanted movies with their cinema and digital release dates
- View tracked TV series with their next airing dates
- Hover over a movie/series card to access quick actions (auto-search, manual search, delete)
- Scan recent downloads in a table showing status and details
- Click a download row to navigate to that movie or series
- Click "View all" to see the full list when items overflow the 2-row grid

## UI Requirements
- **Wanted Movies grid:** Responsive grid (flex-wrap), max 2 rows of poster cards; if overflow, last item is a "View all" card
- **Movie cards:** Poster, cinema release date, digital release date
- **Upcoming TV grid:** Same responsive grid pattern, max 2 rows; "View all" if overflow
- **TV cards:** Series poster, next airing date
- **Humanized dates:** "tomorrow", day of week (within 1 week), or full date
- **Card hover actions:** Icon bar with auto-search, manual search, and delete
- **Recent Downloads table:** 10 rows max; columns: Type, Title, Quality, Size, Date Downloaded, Status
- **Table rows:** Clickable, navigate to movie/series detail page
- **No stats section** — dashboard jumps straight into content areas

## Configuration
- shell: true

