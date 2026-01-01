# TV Tests

## User Flows

### Browse TV Library
1. **Given** there are TV series in the library
2. **When** the user visits /tv
3. **Then** they see a responsive grid of series poster cards
4. **And** each card shows the series title and progress

### Series Status Colors
1. **Given** a series has all episodes downloaded
2. **Then** the card has a green (emerald) status
3. **Given** a series has future episodes being monitored
4. **Then** the card has a blue (sky) status
5. **Given** a series has episodes past air date without files
6. **Then** the card has a yellow (amber) status with border glow

### Search Series
1. **Given** the TV library is displayed
2. **When** the user types in the search box
3. **Then** the grid filters to matching series

### Filter by Status
1. **Given** there are series in various states
2. **When** the user selects "Missing" filter
3. **Then** only series with missing episodes are shown
4. **When** the user selects "Complete" filter
5. **Then** only series with all episodes downloaded are shown

### View Series Detail
1. **Given** a series card is visible
2. **When** the user clicks the card
3. **Then** they navigate to the series detail page
4. **And** they see series info at the top
5. **And** they see seasons with episode tables below

### Season Ordering
1. **Given** the series detail page is displayed
2. **Then** seasons are ordered by most recent first
3. **And** Season 3 appears before Season 2, etc.

### Toggle Series Monitoring
1. **Given** the series detail page is displayed
2. **When** the user toggles the series monitoring switch
3. **Then** `onToggleMonitored` is called
4. **And** all season/episode toggles become disabled (but retain state)

### Toggle Season Monitoring
1. **Given** a season is displayed
2. **When** the user toggles the season monitoring switch
3. **Then** `onToggleSeasonMonitored` is called
4. **And** all episodes in that season update to match

### Toggle Episode Monitoring
1. **Given** an episode row is displayed
2. **And** both the series and season are monitored
3. **When** the user toggles the episode monitoring
4. **Then** `onToggleEpisodeMonitored` is called

### Episode Monitoring Disabled State
1. **Given** the series is unmonitored
2. **Then** all episode monitoring toggles are disabled
3. **And** episode toggles maintain their previous state

## Episode Status Display

### Downloaded Episode
1. **Given** an episode has a downloaded file
2. **Then** the row shows a green checkmark
3. **And** the quality badge is displayed
4. **And** the file size is shown

### Missing Episode
1. **Given** an episode's air date has passed without a file
2. **Then** the row shows an amber/red warning icon
3. **And** the status shows "Missing"

### Airing Episode
1. **Given** an episode has a future air date
2. **Then** the row shows a blue calendar icon
3. **And** the air date is displayed
4. **And** size and quality are empty

## Add TV Series

### TVDB Search
1. **Given** the user clicks "Add TV"
2. **When** they search for a series title
3. **Then** TVDB results appear
4. **And** each result shows: poster, title, year, network

### Add Series
1. **Given** search results are displayed
2. **When** the user clicks a result
3. **Then** they can select quality preference
4. **And** confirming calls `onAddSeries` with tvdbId

### Default Monitoring
1. **Given** the user adds a new series
2. **Then** all seasons and episodes are monitored by default

## Card Interactions

### Card Hover Actions
1. **Given** a series card is visible
2. **When** the user hovers over it
3. **Then** action buttons appear: Auto Search, Manual Search, Delete

### Card Progress Badge
1. **Given** a series has 19 of 29 episodes downloaded
2. **Then** the card shows "19/29" or similar progress indicator

## Empty States

### No Series
1. **Given** the TV library is empty
2. **When** the user visits /tv
3. **Then** they see "No TV series yet"
4. **And** they see an "Add TV" button

### No Episodes in Season
1. **Given** a season has no episodes
2. **Then** the season table shows "No episodes in this season"

## Accessibility

### Episode Table Navigation
1. **Given** an episode table is displayed
2. **When** the user navigates with keyboard
3. **Then** they can tab through monitoring toggles
4. **And** toggles are operable with Space/Enter

### Status Announcements
1. **Given** a screen reader is active
2. **When** navigating episode rows
3. **Then** status is announced (e.g., "Downloaded, 1080p, 2.5 GB")

