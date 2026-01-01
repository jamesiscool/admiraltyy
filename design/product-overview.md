# Admiraltyy

## Description

A modern, unified Usenet media automation platform that combines the intelligence of Sonarr and Radarr with the reliability of NZBGet, wrapped in a fast, API-first Bun and TypeScript application. The system orchestrates media discovery, quality selection, and library organization while delegating downloads to NZBGet's proven engine.

## Problems & Solutions

### Problem 1: Too many apps to juggle
Single platform for movies, TV series, and download management — no more context-switching between Sonarr, Radarr, and NZBGet.

### Problem 2: Scattered configuration and inconsistent UX
One opinionated, modern web interface with sensible defaults for quality rules, prioritization, and organization.

### Problem 3: Complex deployment and maintenance
Lightweight Bun-based app with fast startup and simple Docker/macOS deployment, nzbget is expected to be in the path.

### Problem 4: Opaque automation behavior
Transparent rules engine with explicit quality/size/language preferences — no hidden magic.

## Key Features

- Unified movie and TV series management in one interface
- TMDB integration for movies (tmdbId), TheTVDB for TV series (tvdbId)
- Indexer integration for searching and scoring releases
- Configurable quality, size, language, and format rules
- NZBGet integration via JSON-RPC for reliable downloads
- Automatic folder organization (movie folders, series/season folders)
- Queue tracking and download history
- Modern web UI powered by a clean Hono API
- Future IMDB feed integration for discovery

## Sections

### 1. Dashboard
Overview of your media library with quick stats, recent activity, and at-a-glance status of downloads and library health.

### 2. Movies
Browse your tracked movies, discover new films via TMDB, view available releases, and toggle monitoring. Movies without a file are considered wanted.

### 3. TV
Browse your tracked TV series, discover new shows via TVDB, view available releases, and toggle monitoring at series, season, or episode level. Episodes without a file are considered wanted.

### 4. Activity
Monitor the download queue, view history, and track the status of current and completed grabs.

### 5. Settings
Connect indexers, configure NZBGet, set up folder organization, manage quality profiles, size limits, language preferences, format priorities, and system preferences.

