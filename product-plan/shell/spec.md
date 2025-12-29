# Application Shell Specification

## Overview

The admiraltyy shell provides a top navigation bar that persists across all views. It features the brand logo on the left, main navigation items in the center, and a user menu on the right. The design uses a clean, modern aesthetic with the slate/blue color palette.

## Navigation Structure

- **Dashboard** → Overview and quick stats
- **Movies** → Browse movies, view releases, manage states
- **TV** → Browse TV series, view releases, manage states
- **Activity** → Download queue and history
- **Settings** → Indexers, NZBGet, folders, rules, preferences

## User Menu

Located in the top right corner:
- User avatar (with fallback to initials)
- User name
- Dropdown with: Profile, Logout

## Layout Pattern

**Top Navigation Bar:**
- Fixed height (~64px)
- Logo/brand on the left
- Navigation items centered or left-aligned after logo
- User menu on the right
- Subtle bottom border or shadow to separate from content

**Content Area:**
- Full width below the nav bar
- Scrollable independently
- Padded appropriately for content

## Responsive Behavior

- **Desktop (lg+):** Full horizontal nav with all items visible, user menu with avatar
- **Tablet (md):** Same as desktop, items may condense slightly
- **Mobile (< md):** Hamburger menu icon replaces nav items, slides out a mobile menu overlay

## Design Notes

- Use Inter font family throughout
- Primary actions and active states use blue-500/600
- Neutral backgrounds use slate palette
- Support light and dark mode with appropriate contrast
- Icons from lucide-react for navigation items
- Smooth transitions for hover states and mobile menu

