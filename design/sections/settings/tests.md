# Settings Tests

## User Flows

### Navigate Settings Sections
1. **Given** the user visits /settings
2. **Then** they see a scrolling page with all settings sections
3. **And** a sticky sidebar on the right shows section links
4. **When** the user clicks a sidebar link
5. **Then** the page scrolls to that section

### Sidebar Active State
1. **Given** the user is scrolling the settings page
2. **When** a section comes into view
3. **Then** the corresponding sidebar link highlights

## Indexers

### View Indexers
1. **Given** there are configured indexers
2. **Then** they appear as stacked cards in the Indexers section
3. **And** each card shows: name, enabled toggle

### Add Indexer
1. **Given** the user clicks "Add Indexer"
2. **Then** an inline form expands
3. **And** fields appear: Name, URL, API Key
4. **When** the user fills the form and clicks Save
5. **Then** `onSaveIndexer` is called with the new indexer data

### Edit Indexer
1. **Given** an indexer card is displayed
2. **When** the user clicks the Edit button
3. **Then** the card transforms into an editable form
4. **And** current values are pre-filled
5. **When** the user saves changes
6. **Then** `onSaveIndexer` is called with updated data

### Test Indexer Connection
1. **Given** an indexer form is open
2. **When** the user clicks "Test Connection"
3. **Then** `onTestIndexer` is called
4. **And** a loading indicator is shown
5. **And** success/failure is displayed

### Toggle Indexer Enabled
1. **Given** an indexer card is displayed
2. **When** the user toggles the enabled switch
3. **Then** `onToggleIndexer` is called

### Delete Indexer
1. **Given** an indexer card is displayed
2. **When** the user clicks Delete
3. **Then** a confirmation appears
4. **And** confirming calls `onDeleteIndexer`

## Servers

### View Servers
1. **Given** there are configured servers
2. **Then** they appear as stacked cards with drag handles
3. **And** each card shows: name, priority, enabled toggle

### Add Server
1. **Given** the user clicks "Add Server"
2. **Then** a form expands with fields: Name, Host, Port, Username, Password, SSL, Priority

### Drag to Reorder Servers
1. **Given** multiple servers exist
2. **When** the user drags a server card
3. **Then** the visual order updates
4. **And** `onReorderServers` is called with new order
5. **And** priorities are automatically reassigned

### Edit Server Priority Manually
1. **Given** a server form is open
2. **When** the user changes the priority number
3. **Then** the priority is saved with the server

### Test Server Connection
1. **Given** a server form is open
2. **When** the user clicks "Test Connection"
3. **Then** `onTestServer` is called
4. **And** result is displayed

## Folders

### View Folders
1. **Given** there are configured folders
2. **Then** Movies folders and TV folders appear in separate subsections
3. **And** each folder shows the path
4. **And** the default folder is marked with a star

### Add Folder
1. **Given** the user clicks "Add Folder" under Movies
2. **Then** a path input appears
3. **When** the user enters a path and saves
4. **Then** `onSaveFolder` is called with the folder and type

### Set Default Folder
1. **Given** multiple folders exist in a category
2. **When** the user clicks "Set as Default" on a non-default folder
3. **Then** `onSetDefaultFolder` is called
4. **And** the star moves to that folder

### Delete Folder
1. **Given** a folder is displayed
2. **When** the user clicks Delete
3. **Then** `onDeleteFolder` is called
4. **And** the folder is removed (unless it's the only one)

## Quality

### View Quality Tiers
1. **Given** the user views the Quality section
2. **Then** they see 4 tiers: 480p, 720p, 1080p, 2160p
3. **And** each tier shows min, target, and max GB/hour inputs

### Edit Quality Tier
1. **Given** a quality tier is displayed
2. **When** the user changes the target GB/hour value
3. **Then** `onUpdateQualityTier` is called with the updated tier

### Validation
1. **Given** the user edits quality values
2. **Then** min must be less than target
3. **And** target must be less than max

## Languages

### View Subtitle Languages
1. **Given** subtitle languages are configured
2. **Then** they appear as a reorderable list
3. **And** higher priority languages appear first

### Reorder Subtitle Languages
1. **Given** multiple subtitle languages exist
2. **When** the user drags a language
3. **Then** `onReorderSubtitleLanguages` is called with new order

### Toggle Original Audio Preference
1. **Given** the languages section is displayed
2. **When** the user toggles "Original audio preferred"
3. **Then** `onTogglePreferOriginalAudio` is called

### Add Language
1. **Given** the user clicks "Add Language" under Audio
2. **When** they select a language from the dropdown
3. **Then** `onAddLanguage` is called with type and code

### Remove Language
1. **Given** a language is in the list
2. **When** the user clicks the remove button
3. **Then** `onRemoveLanguage` is called

## Formats

### View Format Preferences
1. **Given** the Formats section is displayed
2. **Then** Codecs, HDR Formats, and Audio Formats lists appear
3. **And** each list is reorderable

### Reorder Formats
1. **Given** a format list is displayed
2. **When** the user drags a format
3. **Then** the appropriate reorder callback is called

### Edit Format Match Terms
1. **Given** a format row is displayed
2. **When** the user clicks the Edit button
3. **Then** the row expands to show Match Terms and Exclude Terms inputs
4. **When** the user edits and saves
5. **Then** `onUpdateFormatMatchTerms` is called

### Add Format
1. **Given** the user clicks "Add Format" in Codecs
2. **Then** a form appears for entering format name
3. **When** they save
4. **Then** `onAddFormat` is called with type and name

### Delete Format
1. **Given** a format row is displayed
2. **When** the user clicks Delete
3. **Then** `onRemoveFormat` is called

## Authentication

### View Auth Settings
1. **Given** the Auth section is displayed
2. **Then** the current auth method is shown
3. **And** username field (if auth enabled)
4. **And** API key field (always shown)

### Change Auth Method
1. **Given** auth method is "None"
2. **When** the user selects "Form Login"
3. **Then** username and password fields appear
4. **And** `onUpdateAuthSettings` is called

### View API Key
1. **Given** the API key field is displayed
2. **Then** it is masked by default
3. **When** the user clicks the eye icon
4. **Then** the key is revealed

### Copy API Key
1. **Given** the API key is displayed
2. **When** the user clicks Copy
3. **Then** the key is copied to clipboard
4. **And** a success toast appears

### Regenerate API Key
1. **Given** the API key section is displayed
2. **When** the user clicks Regenerate
3. **Then** a confirmation dialog appears
4. **When** confirmed
5. **Then** `onRegenerateApiKey` is called
6. **And** the new key is displayed

## Empty States

### No Indexers
1. **Given** no indexers are configured
2. **Then** "No indexers configured" message appears
3. **And** "Add Indexer" button is prominent

### No Servers
1. **Given** no servers are configured
2. **Then** "No servers configured" message appears

## Accessibility

### Form Labels
1. **Given** any settings form is displayed
2. **Then** all inputs have associated labels
3. **And** required fields are marked

### Keyboard Navigation
1. **Given** the settings page is displayed
2. **When** the user tabs through
3. **Then** all interactive elements are reachable
4. **And** drag handles are operable with keyboard (or alternative provided)

### Error Messages
1. **Given** a form validation error occurs
2. **Then** the error is associated with the input
3. **And** the error is announced to screen readers

