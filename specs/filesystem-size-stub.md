# Filesystem Size Stubbing

## Problem

memfs `Buffer.alloc()` can't simulate realistic file sizes (1.5GB+) without memory issues.

## Solution

Encode size in filename with `__<size>GB` suffix. Use `spyfs` to intercept stat calls and return stubbed size.

```
Inception.2010.1080p__1.5GB.mkv  →  stat returns 1.5GB (1610612736 bytes)
Episode.S01E01__0.3GB.mkv        →  stat returns 0.3GB (322122547 bytes)
```

## Implementation

### Dependencies

```bash
bun add -D spyfs
```

### Filename Pattern

```
<original-name>__<size>GB.<ext>
```

- Double underscore delimiter
- Decimal GB value (0.1 to 999)
- Regex: `/__(\d+(?:\.\d+)?)GB\.[^.]+$/`

### Interceptor

Wrap memfs vol with spyfs, intercept all stat variants:

```typescript
import { spy } from 'spyfs'
import { vol } from 'memfs'

const SIZE_PATTERN = /__(\d+(?:\.\d+)?)GB\.[^.]+$/

function parseGbFromPath(path: string): number | null {
  const match = path.match(SIZE_PATTERN)
  return match ? parseFloat(match[1]) : null
}

function gbToBytes(gb: number): number {
  return Math.round(gb * 1024 * 1024 * 1024)
}

export function createTestFilesystem() {
  vol.reset()
  vol.fromJSON(SAMPLE_LIBRARY)

  const sfs = spy(vol)

  // Sync variants
  for (const method of ['statSync', 'lstatSync']) {
    sfs.on(method, (action) => {
      action.exec()
      const gb = parseGbFromPath(action.args[0])
      if (gb !== null) {
        action.result.size = gbToBytes(gb)
      }
      action.resolve(action.result)
    })
  }

  // Async variants
  for (const method of ['stat', 'lstat']) {
    sfs.on(method, (action) => {
      action.exec()
      const gb = parseGbFromPath(action.args[0])
      if (gb !== null) {
        action.result[0].size = gbToBytes(gb)
      }
      action.resolve(action.result)
    })
  }

  return sfs
}
```

### Sample Library Update

```typescript
export const SAMPLE_LIBRARY = {
  // Size from filename, content is empty string
  '/media/movies/Inception (2010)/Inception.2010.1080p__1.5GB.mkv': '',
  '/media/movies/The Dark Knight (2008)/The.Dark.Knight.2008.2160p__4.2GB.mkv': '',
  '/media/tv/Breaking Bad/S01/Breaking.Bad.S01E01__0.4GB.mkv': '',

  // Non-video files, no size stub needed
  '/media/movies/Inception (2010)/Inception.2010.srt': 'Subtitle content',
}
```

## Caveats

- Only works for GB (not MB/TB) - sufficient for media files
- Pattern must be before final extension only
- `action.result` for async is array, sync is direct value
