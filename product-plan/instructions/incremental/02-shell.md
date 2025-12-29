# Milestone 2: Application Shell

Implement the persistent navigation and layout that wraps all sections.

## Overview

The shell provides a top navigation bar that persists across all views. It features the brand logo on the left, main navigation items in the center, and a user menu on the right.

## Components to Implement

### 1. AppShell

Main layout wrapper that contains the navigation and content area.

```typescript
interface AppShellProps {
  children: React.ReactNode;
  navigationItems: Array<{ label: string; href: string; isActive?: boolean }>;
  user?: { name: string; avatarUrl?: string };
  onNavigate?: (href: string) => void;
  onLogout?: () => void;
}
```

**Requirements:**
- Full viewport height
- Flex column layout
- Background: `bg-slate-50 dark:bg-slate-950`
- Navigation at top, content fills remaining space

### 2. MainNav

Top navigation bar with logo, nav items, and user menu.

```typescript
interface MainNavProps {
  navigationItems: Array<{ label: string; href: string; isActive?: boolean }>;
  user?: { name: string; avatarUrl?: string };
  onNavigate?: (href: string) => void;
  onLogout?: () => void;
}
```

**Requirements:**
- Sticky top position (`sticky top-0 z-50`)
- 64px height (`h-16`)
- Border bottom for separation
- Backdrop blur effect
- Max width container (1400px)

**Desktop layout (md+):**
- Logo on the left
- Nav items horizontally after logo
- User menu on the right

**Mobile layout (< md):**
- Logo on the left
- Hamburger menu button on the right
- Mobile menu slides down when open

### 3. UserMenu

Avatar with dropdown menu.

```typescript
interface UserMenuProps {
  user?: { name: string; avatarUrl?: string };
  onLogout?: () => void;
}
```

**Requirements:**
- Display avatar image or initials fallback
- Click opens dropdown menu
- Dropdown contains: Sign out option
- Click outside closes dropdown

## Navigation Items

```typescript
const navigationItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Movies', href: '/movies' },
  { label: 'TV', href: '/tv' },
  { label: 'Activity', href: '/activity' },
  { label: 'Settings', href: '/settings' },
];
```

## Styling

**Active nav item:**
```css
bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400
```

**Inactive nav item:**
```css
text-slate-600 hover:bg-slate-100 hover:text-slate-900
dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white
```

**Avatar fallback:**
```css
bg-blue-500 text-white (with initials)
```

## Routing Setup

Set up client-side routing with your preferred router (e.g., React Router, TanStack Router):

```typescript
const routes = [
  { path: '/', element: <DashboardPage /> },
  { path: '/movies', element: <MoviesListPage /> },
  { path: '/movies/:id', element: <MovieDetailPage /> },
  { path: '/tv', element: <TVListPage /> },
  { path: '/tv/:id', element: <TVDetailPage /> },
  { path: '/activity', element: <ActivityPage /> },
  { path: '/settings', element: <SettingsPage /> },
];
```

## Dark Mode

Implement dark mode support:

1. Detect system preference with `prefers-color-scheme`
2. Allow manual toggle (store in localStorage)
3. Apply `dark` class to `<html>` element
4. Use Tailwind's `dark:` variant for all colors

## Verification

After implementing the shell:
- [ ] Navigation bar appears on all pages
- [ ] Logo links to home
- [ ] Nav items highlight correctly based on current route
- [ ] Mobile menu opens/closes properly
- [ ] User menu dropdown works
- [ ] Dark mode toggles correctly
- [ ] Content area scrolls independently of nav

