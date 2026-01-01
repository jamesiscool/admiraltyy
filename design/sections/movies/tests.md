# Movies Tests

## User Flows

### Browse Movie Library
1. **Given** there are movies in the library
2. **When** the user visits /movies
3. **Then** they see a responsive grid of movie poster cards
4. **And** each card shows the movie title, year, and status badge

### Search Movies
1. **Given** the movie library is displayed
2. **When** the user types in the search box
3. **Then** the grid filters to show only matching movies
4. **And** search is case-insensitive

### Filter by Status
1. **Given** there are wanted and downloaded movies
2. **When** the user selects "Wanted" filter
3. **Then** only movies without files are shown
4. **When** the user selects "Downloaded" filter
5. **Then** only movies with files are shown

### Filter by Quality
1. **Given** movies have different quality preferences
2. **When** the user selects "1080p" quality filter
3. **Then** only movies with 1080p preference are shown

### Filter by Monitored State
1. **Given** there are monitored and unmonitored movies
2. **When** the user selects "Monitored" filter
3. **Then** only monitored movies are shown

### Sort Movies
1. **Given** the movie library is displayed
2. **When** the user selects "Date Added (Newest)"
3. **Then** movies are ordered by dateAdded descending
4. **When** the user selects "Title (A-Z)"
5. **Then** movies are ordered alphabetically

### View Movie Detail
1. **Given** a movie card is visible
2. **When** the user clicks the card
3. **Then** they navigate to the movie detail page
4. **And** they see: synopsis, cast, runtime, genres
5. **And** they see release dates (cinema and digital)
6. **And** they see file details if downloaded

### Toggle Monitoring
1. **Given** the movie detail page is displayed
2. **When** the user toggles the monitored switch
3. **Then** `onToggleMonitored` is called with the new state
4. **And** the UI updates to reflect the change

### Trigger Auto Search
1. **Given** the movie detail page is displayed
2. **When** the user clicks "Auto Search"
3. **Then** `onAutoSearch` is called
4. **And** a loading indicator is shown

### Delete Movie
1. **Given** the movie detail page is displayed
2. **When** the user clicks "Delete"
3. **Then** a confirmation dialog appears
4. **And** confirming calls `onDelete`
5. **And** the user is redirected to the movies list

### Add Movie via TMDB Search
1. **Given** the user clicks "Add Movie"
2. **When** they type a movie title
3. **Then** TMDB search results appear
4. **And** each result shows: poster, title, year, overview
5. **When** the user clicks a result
6. **Then** they can select a quality preference
7. **And** confirming calls `onAddMovie` with the tmdbId

## Card Interactions

### Card Hover State
1. **Given** a movie card is visible
2. **When** the user hovers over it
3. **Then** action buttons appear
4. **And** the poster slightly zooms

### Card Status Badge
1. **Given** a movie is downloaded
2. **Then** the card shows a green "Downloaded" badge
3. **Given** a movie is wanted
4. **Then** the card shows an amber "Wanted" badge

## Empty States

### No Movies
1. **Given** the library is empty
2. **When** the user visits /movies
3. **Then** they see "No movies yet"
4. **And** they see an "Add Movie" button

### No Search Results
1. **Given** the user searches for a movie
2. **When** no movies match the search
3. **Then** they see "No movies found"
4. **And** they see "Try adjusting your search or filters"

## Detail Page

### File Information Display
1. **Given** a movie has a downloaded file
2. **When** viewing the detail page
3. **Then** they see: file path, size, quality, source, codec, import date

### No File State
1. **Given** a movie is wanted (no file)
2. **When** viewing the detail page
3. **Then** the file details section shows "No file available"
4. **And** prominent search buttons are displayed

### Cast Display
1. **Given** a movie has cast information
2. **When** viewing the detail page
3. **Then** cast is displayed as "Actor Name as Character Name"
4. **And** multiple cast members are comma-separated

## Accessibility

### Focus Management
1. **Given** the user adds a movie
2. **When** the modal closes
3. **Then** focus returns to the "Add Movie" button

### Keyboard Navigation
1. **Given** the movie grid is displayed
2. **When** the user presses Tab
3. **Then** they can navigate through cards
4. **And** pressing Enter activates the focused card

