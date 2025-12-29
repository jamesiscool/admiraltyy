# Milestone 6: Activity

The Activity section provides visibility into download operations through Queue and History views.

## Overview

Two-tab interface showing active downloads (Queue) and past downloads (History). Includes alert banner for connectivity issues.

## Download Concurrency Rules

- **Single Download Limit**: Only one item downloads at a time by default
- **Force Start Exception**: Users can force start queued items for parallel downloads
- **Queue Management**: Items can be reordered but only start when active download completes

## Components to Implement

### 1. Activity

Main activity view with tabs.

```typescript
interface ActivityProps {
  alerts: ActivityAlert[];
  queue: QueueItem[];
  history: HistoryItem[];
  onDismissAlert?: (id: string) => void;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onCancel?: (id: string) => void;
  onReorder?: (id: string, direction: 'up' | 'down') => void;
  onForceStart?: (id: string) => void;
  onRetry?: (id: string) => void;
  onDeleteHistory?: (id: string) => void;
  onClearHistory?: () => void;
}
```

### 2. AlertBanner

Dismissible error/warning banner at top.

```typescript
interface ActivityAlert {
  id: string;
  type: 'info' | 'warning' | 'error';
  message: string;
  dismissible: boolean;
}
```

**Styling:**
- Error: Red background
- Warning: Yellow background
- Info: Blue background
- X button to dismiss (if dismissible)

### 3. QueueTable

Table of active downloads.

**Columns:**
- Title
- Progress (% with bar)
- Speed (e.g., "12.5 MB/s")
- ETA (e.g., "4m 12s")
- Size (e.g., "18.4 GB")
- Status (downloading/paused/queued/unpacking/verifying)
- Actions

**Actions column:**
- For downloading: Pause button
- For paused: Resume button
- For queued: Force Start button (lightning bolt)
- For all: Cancel button (X)
- Reorder buttons (up/down arrows)

**Progress bar:**
```jsx
<div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full">
  <div 
    className="h-full bg-blue-500 rounded-full transition-all" 
    style={{ width: `${progress}%` }}
  />
</div>
```

### 4. HistoryTable

Table of past downloads.

**Columns:**
- Title
- Date/Time
- Status (completed/failed/removed)
- Size
- Quality

**Features:**
- Status filter dropdown
- Search input
- Failed items show error tooltip on hover
- Retry button for failed items
- Delete button for each row
- Clear History button

## Status Styling

```typescript
const statusStyles = {
  downloading: 'text-blue-600 bg-blue-50',
  paused: 'text-yellow-600 bg-yellow-50',
  queued: 'text-slate-600 bg-slate-50',
  unpacking: 'text-purple-600 bg-purple-50',
  verifying: 'text-indigo-600 bg-indigo-50',
  completed: 'text-green-600 bg-green-50',
  failed: 'text-red-600 bg-red-50',
  removed: 'text-slate-400 bg-slate-50',
};
```

## Layout

```
┌─────────────────────────────────────────────────┐
│ ⚠️ Connection refused: Unable to reach...  [X] │
├─────────────────────────────────────────────────┤
│ [Queue]  [History]                              │
├─────────────────────────────────────────────────┤
│ Queue Tab:                                      │
│ ┌────────┬────────┬───────┬─────┬──────┬─────┐ │
│ │ Title  │Progress│ Speed │ ETA │Status│ Act │ │
│ ├────────┼────────┼───────┼─────┼──────┼─────┤ │
│ │Gladiat.│ ▓▓▓░░  │12MB/s │4:12 │ ⬇️   │⏸️❌│ │
│ │LastOfUs│ ░░░░░  │  --   │ --  │Queued│⚡❌│ │
│ └────────┴────────┴───────┴─────┴──────┴─────┘ │
├─────────────────────────────────────────────────┤
│ History Tab:                                    │
│ [Search...] [Status: All ▼] [Clear History]     │
│ ┌────────┬──────────┬────────┬──────┬───────┐  │
│ │ Title  │ Date     │ Status │ Size │Quality│  │
│ ├────────┼──────────┼────────┼──────┼───────┤  │
│ │The Bear│ 2h ago   │   ✓    │1.2GB │ 1080p │  │
│ │Interst.│ 4h ago   │   ✗    │45GB  │ 2160p │  │
│ └────────┴──────────┴────────┴──────┴───────┘  │
└─────────────────────────────────────────────────┘
```

## Error Tooltip

For failed history items, show error message on hover:

```jsx
<div className="group relative">
  <span className="text-red-600">Failed</span>
  <div className="hidden group-hover:block absolute z-10 bg-slate-900 text-white text-sm rounded p-2 -mt-1">
    {item.errorMessage}
  </div>
</div>
```

## API Endpoints

```typescript
// Get queue
GET /api/activity/queue

// Get history
GET /api/activity/history
  ?status=completed|failed|removed
  &search=term

// Pause download
POST /api/activity/queue/:id/pause

// Resume download
POST /api/activity/queue/:id/resume

// Force start queued item
POST /api/activity/queue/:id/force

// Cancel download
DELETE /api/activity/queue/:id

// Reorder queue
POST /api/activity/queue/reorder
  { id: string, direction: 'up' | 'down' }

// Retry failed download
POST /api/activity/history/:id/retry

// Delete history item
DELETE /api/activity/history/:id

// Clear all history
DELETE /api/activity/history
```

## Real-time Updates

Consider implementing real-time updates for the queue:
- WebSocket connection for progress updates
- Poll every 2 seconds as fallback

```typescript
// Simple polling approach
useEffect(() => {
  const interval = setInterval(() => {
    refetchQueue();
  }, 2000);
  return () => clearInterval(interval);
}, []);
```

## Empty States

**Empty queue:**
- "No active downloads"
- "Your download queue is empty"

**Empty history:**
- "No download history"
- "Completed downloads will appear here"

## Verification

- [ ] Tabs switch between Queue and History
- [ ] Alert banner appears and dismisses
- [ ] Queue shows real-time progress
- [ ] Pause/Resume/Cancel work correctly
- [ ] Force Start allows parallel downloads
- [ ] History filtering works
- [ ] Failed items show error tooltip
- [ ] Retry/Delete work for history items
- [ ] Clear History works with confirmation

