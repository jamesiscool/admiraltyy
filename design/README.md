# Admiraltyy - Product Plan Export

This package contains everything needed to implement Admiraltyy, a modern Usenet media automation platform.

## Quick Start

### Option 1: One-Shot Implementation
Use `prompts/one-shot-prompt.md` to implement the entire application in one session.

### Option 2: Incremental Implementation
Use `prompts/section-prompt.md` as a template for implementing one section at a time.

## Package Contents

```
product-plan/
├── README.md                      # This file
├── product-overview.md            # Product description and features
├── prompts/
│   ├── one-shot-prompt.md         # Full implementation prompt
│   └── section-prompt.md          # Section-by-section prompt template
├── instructions/
│   ├── one-shot-instructions.md   # Complete implementation guide
│   └── incremental/
│       ├── 01-foundation.md       # Project setup
│       ├── 02-shell.md            # Application shell
│       ├── 03-dashboard.md        # Dashboard section
│       ├── 04-movies.md           # Movies section
│       ├── 05-tv.md               # TV section
│       ├── 06-activity.md         # Activity section
│       └── 07-settings.md         # Settings section
├── design-system/
│   ├── colors.json                # Color palette tokens
│   └── typography.json            # Typography tokens
├── data-model/
│   └── data-model.md              # Entity definitions and relationships
├── shell/
│   ├── spec.md                    # Shell specification
│   └── components/                # Shell components
│       ├── AppShell.tsx
│       ├── MainNav.tsx
│       ├── UserMenu.tsx
│       └── index.ts
└── sections/
    ├── dashboard/
    │   ├── spec.md
    │   ├── types.ts
    │   ├── data.json
    │   ├── tests.md
    │   └── components/
    ├── movies/
    │   ├── spec.md
    │   ├── types.ts
    │   ├── data.json
    │   ├── tests.md
    │   └── components/
    ├── tv/
    │   ├── spec.md
    │   ├── types.ts
    │   ├── data.json
    │   ├── tests.md
    │   └── components/
    ├── activity/
    │   ├── spec.md
    │   ├── types.ts
    │   ├── data.json
    │   ├── tests.md
    │   └── components/
    └── settings/
        ├── spec.md
        ├── types.ts
        ├── data.json
        ├── tests.md
        └── components/
```

## Implementation Notes

### Tech Stack Recommendations
- **Frontend**: React + TypeScript + Tailwind CSS v4
- **Backend**: Bun + Hono (as specified in product overview)
- **Database**: SQLite or PostgreSQL
- **External APIs**: TMDB (movies), TheTVDB (TV series), NZBGet (downloads)

### Design System
- **Primary**: Blue (`blue-500`, `blue-600`)
- **Secondary**: Sky
- **Neutral**: Slate
- **Typography**: Inter (headings/body), JetBrains Mono (code)

### Key Features
1. Unified movie and TV series management
2. TMDB/TheTVDB integration for metadata
3. Indexer integration for searching releases
4. NZBGet integration for downloads
5. Configurable quality, size, language, and format rules
6. Modern responsive UI with dark mode support

## Screenshots

Reference screenshots are available in each section folder:
- `product/sections/dashboard/dashboard.png`
- `product/sections/movies/movies-list.png`
- `product/sections/movies/movie-detail.png`
- `product/sections/tv/tv-list.png`
- `product/sections/tv/tv-detail.png`
- `product/sections/activity/activity.png`
- `product/sections/settings/settings.png`
- `product/sections/settings/settings-edit.png`

