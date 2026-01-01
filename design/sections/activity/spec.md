# Activity Specification

## Overview
The Activity section provides visibility into download operations through two views: Queue (active downloads) and History (completed grabs). Users can monitor progress, manage queue priorities, and review past activity with filtering and search.

## User Flows
- View active downloads in the Queue with real-time progress, speed, ETA, and status
- Pause, resume, or cancel individual downloads
- Reorder queue priority by moving items up or down
- Force start a queued download to begin immediately (bypasses the single-download limit)
- Switch to History to view completed, failed, or removed items
- Filter history by status (completed, failed, removed)
- Search history by media title
- Hover over failed items to see error message in tooltip
- Dismiss activity-related alerts (e.g., "Couldn't get a response from Usenet server")

## Download Concurrency Rules
- **Single Download Limit**: By default, only one item downloads at a time. Other items remain in "queued" status until the active download completes.
- **Force Start Exception**: Users can force start a queued item, which allows multiple downloads to run simultaneously. Force start bypasses the normal queue order and single-download limit.
- **Queue Management**: Items can be reordered to change priority, but queued items will not start until the active download completes (unless force started).

## UI Requirements
- Two-tab interface: Queue and History
- Table layout for both views
- Queue table columns: Title, Progress (%), Speed, ETA, File Size, Status, Actions
- History table columns: Title, Date/Time, Status, File Size, Quality
- Alert banner at top for dismissible activity-related notifications
- Error tooltips on failed history items
- Empty table state when no items exist
- Search input and status filter for History view
- Force start button (lightning bolt icon) for queued items in the Actions column
- Pause button for downloading items, Resume button for paused items

## Out of Scope
- Detailed logs or log viewer

## Configuration
- shell: true

