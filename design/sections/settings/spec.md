# Settings Specification

## Overview
The Settings section is a single scrolling page where users configure all system-wide preferences. A sticky sidebar on the right provides quick-jump navigation to each section. Settings include indexer and server connections (with test functionality), folder paths, quality profiles with size limits, language preferences, format priorities, and authentication.

## User Flows

### Indexers
- View a stacked list of indexer cards (touching, table-like appearance like servers)
- Click "Add" button at bottom to expand an inline form card with name, URL, and API key fields
- Test connection before saving
- Enable/disable indexers without deleting
- Click edit button (opposite the name) on existing cards to convert to editable form
- Save or cancel changes

### Servers (Usenet)
- View a stacked list of server cards (touching, table-like appearance)
- Priority 0-999 (lower number = tried first); if a grab fails, tries next priority level
- Drag to reorder — automatically reassigns sequential priorities
- To use multiple servers simultaneously, manually edit priority numbers to match
- Same add/edit pattern as indexers with test connection
- Fields: name, host, port, username, password, SSL toggle, priority

### Folders
- Separate subsections for Movies and TV
- Each subsection has a list of folder paths
- One folder per subsection is marked as default (where new items are added)
- Other folders are scanned to detect existing files/completion status

### Quality
- Predefined quality tiers: 480p, 720p, 1080p, 2160p
- Each tier has min, target, and max file size settings in GB/hour (use decimals for values under 1 GB, e.g., 0.3)
- No custom profiles

### Languages
- **Subtitle languages:** Reorderable priority list
- **"Original audio preferred" toggle** (default: on) — always prefer original language audio
- **Audio languages:** Reorderable priority list (applies when original not preferred or for dubbed content)
- **"Accept any audio if preferred unavailable" toggle** — fallback behavior

### Formats
- Reorderable priority lists for:
  - Codec (e.g., x265 > x264)
  - HDR formats (e.g., Dolby Vision > HDR10+ > HDR10 > SDR)
  - Audio formats (e.g., Atmos > TrueHD > DTS-HD MA > DTS > AAC)
- Each format row:
  - Drag handle (six-dot grip) always visible
  - Edit button (right side) to expand/collapse match terms editor
  - Match terms: comma-separated strings used to match release names (e.g., x265 matches "x265, h265, hevc")
  - Exclude terms: comma-separated strings to reject (e.g., HDR10 excludes "hdr10+, hdr10plus" to avoid false matches)
  - Delete button to remove the format
- "Add Format" button at bottom of each list (same pattern as Languages)

### Authentication
- Configure authentication settings for the app
- Choose authentication method: none, form login, or basic auth
- When auth is enabled, configure username and password
- **API Key:** View and manage the API key used for external integrations (always required)
  - Editable text field to view or paste a custom API key
  - Copy button to copy API key to clipboard
  - Regenerate button to generate a new random API key (with confirmation)
  - API key is a 32-character alphanumeric string

## UI Requirements
- Single scrolling page layout
- Sticky vertical section nav on the right — clicking jumps to that section
- Stacked card lists for Indexers and Servers (touching, table-like appearance)
- Expandable "Add" button at bottom of each list (inside container, with top border)
- Edit button on existing cards converts to editable form with test/save buttons
- Test connection buttons for Indexers and Servers
- Drag-to-reorder for Servers, Languages lists, and Format priority lists

## Out of Scope
- Custom quality profiles
- File naming configuration
- Permissions and hardlinks settings
- Theme toggle (handled in UserMenu)

## Configuration
- shell: true

