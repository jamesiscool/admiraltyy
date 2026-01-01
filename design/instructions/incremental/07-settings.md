# Milestone 7: Settings

The Settings section is a single scrolling page for all system-wide configuration.

## Overview

A long-form settings page with sections for: Indexers, Servers, Folders, Quality, Languages, Formats, and Authentication. A sticky sidebar on the right provides quick navigation.

## Components to Implement

### 1. Settings

Main settings page with all sections.

```typescript
interface SettingsProps {
  indexers: Indexer[];
  servers: Server[];
  folders: Folders;
  qualityTiers: QualityTier[];
  languageSettings: LanguageSettings;
  formatSettings: FormatSettings;
  authSettings: AuthSettings;
  // ... callbacks for each setting type
}
```

### 2. IndexerCard

Indexer configuration card.

**View mode:**
- Name, URL (truncated), enabled toggle
- Edit button

**Edit mode:**
- Name input
- URL input
- API Key input (password field)
- Test Connection button
- Save / Cancel buttons

### 3. ServerCard

Usenet server configuration card.

**Fields:**
- Name
- Host
- Port
- Username
- Password
- SSL toggle
- Priority (0-999)
- Connections count

**Features:**
- Drag handle for reordering
- Test Connection button
- Enable/disable toggle

### 4. FolderSection

Movie and TV folder configuration.

**Features:**
- Separate lists for Movies and TV
- Each folder shows path
- Default folder marked with star
- Click to set as default
- Add/Delete folders

### 5. QualitySection

Quality tier size settings.

**For each tier (480p, 720p, 1080p, 2160p):**
- Min GB/hour input
- Target GB/hour input
- Max GB/hour input

### 6. LanguagesSection

Language preference configuration.

**Sections:**
- Subtitle languages (reorderable list)
- "Original audio preferred" toggle
- Audio languages (reorderable list)
- "Accept any audio fallback" toggle

### 7. FormatsSection

Format priority configuration.

**Lists (each reorderable):**
- Codecs (x265, x264, AV1, etc.)
- HDR Formats (Dolby Vision, HDR10+, HDR10, SDR)
- Audio Formats (Atmos, TrueHD, DTS-HD MA, etc.)

**Each format row:**
- Drag handle
- Format name
- Edit button → expands to show:
  - Match terms (comma-separated)
  - Exclude terms (comma-separated)
- Delete button

### 8. AuthSection

Authentication configuration.

**Fields:**
- Authentication method: None / Form Login / Basic Auth
- Username (when auth enabled)
- Password (when auth enabled)
- API Key: view/copy/regenerate

## Layout

```
┌──────────────────────────────────┬───────────────┐
│                                  │ Quick Nav     │
│ Indexers                         │ ○ Indexers    │
│ ┌────────────────────────────┐   │ ○ Servers     │
│ │ NZBgeek         [✓] [Edit] │   │ ○ Folders     │
│ ├────────────────────────────┤   │ ○ Quality     │
│ │ DrunkenSlug     [✓] [Edit] │   │ ○ Languages   │
│ ├────────────────────────────┤   │ ○ Formats     │
│ │ [+ Add Indexer]            │   │ ○ Auth        │
│ └────────────────────────────┘   │               │
│                                  │               │
│ Servers                          │               │
│ ┌────────────────────────────┐   │               │
│ │ ≡ Newshosting   0   [Edit] │   │               │
│ ├────────────────────────────┤   │               │
│ │ ≡ Blocknews     1   [Edit] │   │               │
│ ├────────────────────────────┤   │               │
│ │ [+ Add Server]             │   │               │
│ └────────────────────────────┘   │               │
│                                  │               │
│ ... more sections ...            │               │
└──────────────────────────────────┴───────────────┘
```

## Sticky Sidebar

```jsx
<nav className="sticky top-20 space-y-2">
  {sections.map(section => (
    <a
      key={section.id}
      href={`#${section.id}`}
      className={cn(
        "block px-3 py-2 text-sm rounded-sm",
        activeSection === section.id
          ? "bg-blue-50 text-blue-600"
          : "text-slate-600 hover:bg-slate-100"
      )}
    >
      {section.label}
    </a>
  ))}
</nav>
```

## Drag and Drop

For servers, languages, and formats, implement drag-to-reorder:

```typescript
// Using a library like @dnd-kit/core
import { DndContext, closestCenter, useSortable } from '@dnd-kit/core';

function SortableItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  // ...
}
```

## Test Connection

For indexers and servers, implement test connection:

```typescript
const handleTestConnection = async (id: string) => {
  setTestingId(id);
  try {
    const result = await testConnection(id);
    if (result.success) {
      toast.success('Connection successful');
    } else {
      toast.error(`Connection failed: ${result.error}`);
    }
  } finally {
    setTestingId(null);
  }
};
```

## API Key Management

```jsx
function ApiKeySection({ apiKey, onRegenerate }) {
  const [showKey, setShowKey] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    toast.success('API key copied');
  };
  
  const handleRegenerate = async () => {
    if (confirm('Are you sure? This will invalidate the current API key.')) {
      await onRegenerate();
    }
  };
  
  return (
    <div className="flex items-center gap-2">
      <input
        type={showKey ? 'text' : 'password'}
        value={apiKey}
        readOnly
        className="flex-1 font-mono text-sm"
      />
      <button onClick={() => setShowKey(!showKey)}>
        {showKey ? <EyeOff /> : <Eye />}
      </button>
      <button onClick={handleCopy}><Copy /></button>
      <button onClick={handleRegenerate}><RefreshCw /></button>
    </div>
  );
}
```

## API Endpoints

```typescript
// Get all settings
GET /api/settings

// Update settings
PATCH /api/settings

// Indexers
GET /api/settings/indexers
POST /api/settings/indexers
PATCH /api/settings/indexers/:id
DELETE /api/settings/indexers/:id
POST /api/settings/indexers/:id/test

// Servers
GET /api/settings/servers
POST /api/settings/servers
PATCH /api/settings/servers/:id
DELETE /api/settings/servers/:id
POST /api/settings/servers/:id/test
POST /api/settings/servers/reorder

// Folders
GET /api/settings/folders
POST /api/settings/folders
DELETE /api/settings/folders/:id
POST /api/settings/folders/:id/set-default

// Auth
POST /api/settings/auth/regenerate-key
```

## Verification

- [ ] All sections render correctly
- [ ] Sticky sidebar navigation works
- [ ] Indexer add/edit/delete works
- [ ] Test connection shows result
- [ ] Server drag-to-reorder works
- [ ] Server priority updates correctly
- [ ] Folder default selection works
- [ ] Quality tier inputs save correctly
- [ ] Language lists reorder correctly
- [ ] Format match/exclude terms work
- [ ] Auth method toggle works
- [ ] API key copy/regenerate works

