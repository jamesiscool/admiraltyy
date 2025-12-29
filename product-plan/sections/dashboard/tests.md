# Dashboard Tests

## User Flows

### View Wanted Movies
1. **Given** there are wanted movies in the library
2. **When** the user visits the dashboard
3. **Then** they see a grid of movie poster cards
4. **And** each card shows the movie title, cinema release date, and digital release date
5. **And** dates are humanized ("Tomorrow", "Wednesday", "Jan 15")

### View All Movies Overflow
1. **Given** there are more wanted movies than fit in 2 rows
2. **When** the user views the dashboard
3. **Then** a "View All" card appears showing the count of remaining movies
4. **And** clicking it navigates to the Movies page filtered to wanted

### Movie Card Hover Actions
1. **Given** a wanted movie card is visible
2. **When** the user hovers over the card
3. **Then** action buttons appear: Auto Search, Manual Search, Delete
4. **And** clicking Auto Search triggers `onMovieAutoSearch`
5. **And** clicking Manual Search triggers `onMovieManualSearch`
6. **And** clicking Delete triggers `onMovieDelete`

### Movie Card Click
1. **Given** a wanted movie card is visible
2. **When** the user clicks the card (not on action buttons)
3. **Then** `onMovieClick` is called with the movie ID

### View Wanted Series
1. **Given** there are series with wanted episodes
2. **When** the user visits the dashboard
3. **Then** they see a grid of series poster cards
4. **And** each card shows the next wanted episode (S01E01 format)
5. **And** missing episodes show an amber "Missing" badge
6. **And** airing episodes show a blue date badge

### Series Card Hover Actions
1. **Given** a series card is visible
2. **When** the user hovers over the card
3. **Then** action buttons appear: Auto Search, Manual Search, Delete
4. **And** clicking Auto Search triggers `onSeriesAutoSearch`

### View Recent Downloads
1. **Given** there are recent downloads
2. **When** the user visits the dashboard
3. **Then** they see a table of up to 10 recent downloads
4. **And** each row shows: Type icon, Title, Quality, Size, Date, Status
5. **And** downloading items show a progress bar

### Download Row Click
1. **Given** a download row is visible
2. **When** the user clicks the row
3. **Then** `onDownloadClick` is called with the download object

## Empty States

### No Wanted Movies
1. **Given** all movies have been downloaded
2. **When** the user visits the dashboard
3. **Then** they see "No wanted movies" message
4. **And** they see "All your movies have been downloaded"

### No Wanted Series
1. **Given** all series are up to date
2. **When** the user visits the dashboard
3. **Then** they see "No upcoming episodes" message
4. **And** they see "All your series are up to date"

### No Recent Downloads
1. **Given** there are no downloads in history
2. **When** the user visits the dashboard
3. **Then** they see "No recent downloads" in the table area

## Responsive Behavior

### Mobile Grid
1. **Given** the viewport is mobile-sized (< 640px)
2. **When** viewing the dashboard
3. **Then** cards are 160px wide
4. **And** fewer cards fit per row

### Desktop Grid
1. **Given** the viewport is desktop-sized (> 640px)
2. **When** viewing the dashboard
3. **Then** cards are 180px wide
4. **And** more cards fit per row

### Responsive Table Columns
1. **Given** the viewport changes size
2. **When** viewing the downloads table
3. **Then** columns hide/show appropriately:
   - Title: Always visible
   - Progress: Hidden on mobile
   - Quality: Hidden on mobile
   - Size: Hidden on mobile/tablet
   - Date: Hidden on mobile/tablet
   - Status: Always visible

## Accessibility

### Keyboard Navigation
1. **Given** the dashboard is focused
2. **When** the user tabs through elements
3. **Then** all interactive elements are focusable
4. **And** focus order is logical

### Screen Reader Support
1. **Given** a screen reader is active
2. **When** navigating the dashboard
3. **Then** movie/series cards have descriptive labels
4. **And** status badges are announced
5. **And** table headers describe columns

