# Activity Tests

## User Flows

### View Download Queue
1. **Given** there are active downloads
2. **When** the user visits /activity
3. **Then** the Queue tab is active by default
4. **And** they see a table of downloads with progress

### Queue Table Columns
1. **Given** the queue is displayed
2. **Then** columns show: Title, Progress, Speed, ETA, Size, Status, Actions

### Real-time Progress
1. **Given** a download is in progress
2. **When** the progress updates
3. **Then** the progress bar and percentage update
4. **And** speed and ETA values update

### Pause Download
1. **Given** a download is actively downloading
2. **When** the user clicks the Pause button
3. **Then** `onPause` is called with the download ID
4. **And** the status changes to "paused"
5. **And** the Pause button becomes Resume

### Resume Download
1. **Given** a download is paused
2. **When** the user clicks the Resume button
3. **Then** `onResume` is called with the download ID
4. **And** the status changes to "downloading"

### Cancel Download
1. **Given** a download is in the queue
2. **When** the user clicks the Cancel button
3. **Then** `onCancel` is called with the download ID
4. **And** the item is removed from the queue

### Force Start Download
1. **Given** a download is queued (not active)
2. **When** the user clicks the Force Start button (lightning bolt)
3. **Then** `onForceStart` is called with the download ID
4. **And** the download starts immediately
5. **And** multiple downloads can now run simultaneously

### Reorder Queue
1. **Given** there are multiple items in the queue
2. **When** the user clicks the up/down arrow on an item
3. **Then** `onReorder` is called with the ID and direction
4. **And** the item moves position in the queue

## Alert Banner

### Display Alert
1. **Given** there is an active alert
2. **When** the user views the Activity page
3. **Then** the alert banner is visible at the top
4. **And** it shows the alert message with appropriate styling (error=red)

### Dismiss Alert
1. **Given** an alert is dismissible
2. **When** the user clicks the X button
3. **Then** `onDismissAlert` is called with the alert ID
4. **And** the banner is removed

### Non-dismissible Alert
1. **Given** an alert is not dismissible
2. **Then** no X button is shown
3. **And** the alert persists

## History Tab

### Switch to History
1. **Given** the Queue tab is active
2. **When** the user clicks the History tab
3. **Then** the History tab becomes active
4. **And** the history table is displayed

### History Table Columns
1. **Given** the history is displayed
2. **Then** columns show: Title, Date/Time, Status, Size, Quality

### Filter History by Status
1. **Given** history items exist with various statuses
2. **When** the user selects "Failed" from the status filter
3. **Then** only failed items are shown

### Search History
1. **Given** history items exist
2. **When** the user types in the search box
3. **Then** results are filtered by title

### Failed Item Error Tooltip
1. **Given** a history item has failed status
2. **When** the user hovers over the item
3. **Then** a tooltip shows the error message

### Retry Failed Download
1. **Given** a failed history item is visible
2. **When** the user clicks the Retry button
3. **Then** `onRetry` is called with the item ID

### Delete History Item
1. **Given** a history item is visible
2. **When** the user clicks the Delete button
3. **Then** `onDeleteHistory` is called with the item ID
4. **And** the item is removed

### Clear All History
1. **Given** there are history items
2. **When** the user clicks "Clear History"
3. **Then** a confirmation dialog appears
4. **And** confirming calls `onClearHistory`
5. **And** all history items are removed

## Empty States

### Empty Queue
1. **Given** there are no active downloads
2. **When** viewing the Queue tab
3. **Then** "No active downloads" message is shown
4. **And** "Your download queue is empty" is displayed

### Empty History
1. **Given** there is no download history
2. **When** viewing the History tab
3. **Then** "No download history" message is shown
4. **And** "Completed downloads will appear here" is displayed

### No History Search Results
1. **Given** the user searches history
2. **When** no items match
3. **Then** "No matching downloads found" is shown

## Status Styling

### Download Status Colors
1. **Given** items with different statuses
2. **Then** downloading items have blue styling
3. **And** paused items have yellow styling
4. **And** queued items have gray styling
5. **And** unpacking items have purple styling
6. **And** completed items have green styling
7. **And** failed items have red styling

## Accessibility

### Tab Navigation
1. **Given** the Activity page is displayed
2. **When** the user tabs through elements
3. **Then** tabs are focusable and operable
4. **And** action buttons are reachable

### Screen Reader Support
1. **Given** a screen reader is active
2. **When** navigating the queue
3. **Then** download progress is announced
4. **And** status is clearly communicated

