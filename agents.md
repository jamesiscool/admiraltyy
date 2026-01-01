# Agents Guide for innovation-apps

- In all interactions and commit messages, be extremely concise and sacrifice grammar for the sake of concision.

## Very important !!!!!!!!!!!!!!!!

- After finishing file changes, run `bun fix && bun tsc` and fix any errors before responding

## Design
- When I refer to the design I want to to reference the design in here `./design` Look at the code examples, particularly those in `design/code` and also the screen shots
- The design server is already running and is available at `http://localhost:3000/sections/dashboard/screen-designs/DashboardView/fullscreen`

## UI

- The vite dev server will already be run and the site is at !!!! `http://localhost:2828`
- Global Tailwind design tokens live at `src/client/index.css`.
- `--color-*: initial;` resets all default Tailwind colors. Use project tokens (blue-100, navy-500, etc.) not default Tailwind colors (sky, slate, emerald, amber etc.)
- After every UI change test that it works in the browser 
- When using Playwright, don't use the browser_wait_for and just pass it a time. The browser renders in the time it takes you to think. 
- When using Playwright, don't bother to close the browser at the end 
- Never add any rings or outlines. Leave the base ones there for accessibility. For hover change the background if you must 

## Rules (must follow)
- !!!!! Use the shadcn/ui components. Request to add components that you might need. Use the product plan as a guide but implemented using ShadCN components

## External APIs

-- The OpenAPI spec for TMDB can be found here `reference/tmdb.openapi.json`. Use it as a reference when developing code to interact with it 

## Plans

- At the end of each plan, give me a list of unresolved questions to answer, if any. Make the questions extremely concise. Sacrifice grammar for the sake of concision.

## Naming conventions

Use these rules when generating, editing, or suggesting code. Keep them consistent.

Use kebab case for React component file names

### Function prefixes

- `find*`: may return null.  
- `get*`: guaranteed non null; usually implemented by calling the corresponding `find*` and throwing if null.  
- `list*`: returns an array; never use `getAll*`.  
- `is*` / `has*`: return boolean.  
- `my*`: operates on behalf of the authenticated user.  
- `create*`: create a new entity.  
- `update*`: modify an existing entity.  
- `fetch*`: retrieve data from external services/APIs.  
- `parse*` (or short `p*`): convert unstructured input into structured values.

### Naming style

- Prefer clear, descriptive names over abbreviations.  
- Short names only for tiny local scopes (like loop counters).  
- More distance from declaration requires more explicit naming.

### Numeric and time values

- Always include units in names: `timeoutMs`, `heightPx`, `progressPercent`.  
- Use `*At` for timestamps (points in time).  
- Use `*Ms` or similar for durations.

### File/component naming

- Non component files: short names, one or two words.  
- React components: one component per file; file name matches component name.

### Consistency

- Prefix semantics must remain strict:
  - `find` = maybe null  
  - `get` = non null  
  - `list` = array  
  - `is`/`has` = boolean  
  - `my` = user scoped  
- Prefer renaming to follow rules when safe.  
- Never mix meanings (e.g., avoid `getAll*`, avoid null returning `get*`).

### Null handling pattern

- Implement `findX` as the core lookup.  
- Implement `getX` by calling `findX` and applying a shared null check (e.g., `ensure`).
