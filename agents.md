# Agents Guide for innovation-apps

- In all interactions and commit messages, be extremely concise and sacrifice grammar for the sake of concision.

# Very important linting !!!!!!!!!!!!!!!!
- !!!ALWAYS!!! Check for TypeScript errors through the lsp
- !!!ALWAYS!!! Check for linting error with the built in tool

## UI

- The vite dev server will already be run and the site is at `http://localhost:2829`
- Global Tailwind design tokens live at `src/client/index.css`.

## Rules (must follow)
- !!!!! Use the shadcn/ui components. Request to add components that you might need. Use the product plan as a guide but implemented using ShadCN components

 
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
