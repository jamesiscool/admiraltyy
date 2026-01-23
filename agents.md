# Agents Guide for innovation-apps

- In all interactions and commit messages, be extremely concise and sacrifice grammar for the sake of concision.

## Very important !!!!!!!!!!!!!!!!

- After all changes, before the summery run `bun fix && bun tsgo` and fix any errors

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
