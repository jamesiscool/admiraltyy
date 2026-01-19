# Agents Guide for innovation-apps

- In all interactions and commit messages, be extremely concise and sacrifice grammar for the sake of concision.

## Very important !!!!!!!!!!!!!!!!

- After all changes, before the summery run `bun fix && bun tsc` and fix any errors

## Design
- When I refer to the design I want to to reference the design in here `./design` Look at the code examples, particularly those in `design/code` and also the screen shots
- The design server is already running and is available at `http://localhost:3000/sections/dashboard/screen-designs/DashboardView/fullscreen`

## UI

- The vite dev server will already be run and the site is at !!!! `http://localhost:2828`
- Global Tailwind design tokens live at `src/client/index.css`.
- `--color-*: initial;` resets all default Tailwind colors. Use project tokens (blue-100, navy-500, etc.) not default Tailwind colors (sky, slate, amber etc.)
- 
- After every UI change test that it works in the browser

### Playwright MCP Usage
- Use `browser_navigate` to open pages (e.g. `http://localhost:2828/tv`)
- Don't use `browser_wait_for` - the page renders during your thinking time
- Don't close the browser at the end


## Rules (must follow)
- !!!!! Use the shadcn/ui components. Request to add components that you might need. Use the product plan as a guide but implemented using ShadCN components

## External APIs

-- The OpenAPI spec for TMDB can be found here `reference/tmdb.openapi.json`. Use it as a reference when developing code to interact with it 

## Plans

- At the end of each plan, give me a list of unresolved questions to answer, if any. Make the questions extremely concise. Sacrifice grammar for the sake of concision.

## Naming conventions

Use these rules when generating, editing, or suggesting code. Keep them consistent.

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
- React components: one component per file; file name matches component name, use kebab case

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

### Route param naming

- Use descriptive param names: `:movieId`, `:downloadId`, not generic `:id`
- Inline zod schemas in validators: `zValidator('param', z.object({ movieId: z.string() }))`
- Don't extract param schemas to constants
