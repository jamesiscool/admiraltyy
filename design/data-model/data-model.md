# Data Model

## Entities

### Movie
A movie being tracked in the library, linked to TMDB via tmdbId. Can be monitored or unmonitored to control searching behavior. Can override the global default quality preference.

### Series
A TV series being tracked, linked to TheTVDB via tvdbId. Has a quality preference that applies to all its episodes. Monitored at the series level.

### Season
A season within a series. Can be individually monitored to control which seasons are actively searched.

### Episode
An episode within a season. Can be individually monitored or unmonitored. Inherits quality preference from its parent series.

### File
A media file on disk discovered by scanning the library paths. Matched to movies or episodes. Has detected quality information parsed from the filename and/or codec metadata.

### Release
An NZB release found on indexers. Contains metadata (size, quality, source, codec) used for scoring against user preferences. Belongs to a movie or episode.

### Download
A grabbed release being processed by NZBGet or already completed. Tracks status through the download lifecycle.

### Indexer
A configured Usenet indexer used for searching releases. Stores connection details and search capabilities.

### Quality
A resolution tier (480p, 720p, 1080p, 2160p) with file size targets (min, target, max per hour of runtime) and optional filename match patterns. Used both as a preference (on movies/series) and as detected metadata (on files).

## Global Settings

### Default Quality
The quality preference applied to new movies and series unless explicitly overridden.

### Source Preference
Global allowed and blocked sources (e.g., WEB-DL allowed, CAM blocked). Used when scoring releases.

### Codec Preference
Global preference order and blocklist for codecs (e.g., prefer x265 over x264). Used when scoring releases.

### Library Paths
Configured movie folder and TV folder locations. Periodically scanned to discover files and match them to tracked media.

## Relationships

- Movie has a Quality preference (overrides global default)
- Movie has many Files
- Series has a Quality preference (applies to all episodes)
- Series has many Seasons
- Season has many Episodes
- Episode has many Files
- File has a detected Quality
- Release belongs to a Movie or Episode
- Release comes from an Indexer
- Download belongs to a Release

## State Tracking

Movies, Seasons, and Episodes have one state flag:

- **Monitored** — Whether to actively search for and grab releases

### Derived States

- **Wanted** — A monitored item that does not have a file present. The system will actively search for releases.
- **Available** — An item that has a file present, regardless of monitored state.

