# Agents Guide for innovation-apps

- In all interactions and commit messages, be extremely concise and sacrifice grammar for the sake of concision.

## Very important !!!!!!!!!!!!!!!!

- After all changes, before the summery run `bun fix && bun tsgo` and fix any errors

## UI

- The vite dev server will already be run and the site is at !!!! `http://localhost:2828`
- Global Tailwind design tokens live at `src/client/index.css`.
- `--color-*: initial;` resets all default Tailwind colors. Use project tokens (blue-100, navy-500, etc.) not default Tailwind colors (sky, slate, amber etc.)
- Prefer the use of Shadcn components.
- Shadcn reference `reference/shadcn-llms.txt`
- Add new components with `bunx --bun shadcn@latest add <component-name>` command.
- After every UI change test that it works in the browser

## Testing

### Commands
- Always `bun run test` not `bun test` (vitest, not bun's runner)
- E2E: `bun run test:e2e`

### When to run tests
- During dev: run relevant Vitest + E2E tests as needed
- After block of changes: run all Vitest tests (`bun run test`)
- Wrapping up major work: run Vitest + E2E (`bun run test && bun run test:e2e`)
- Feature complete: full test suite before returning

### When to write tests
- Almost every change. Exceptions: system/config changes, things not suited to testing
- Be pragmatic—use discretion on what's testable

### Test type selection
- Prefer property-based tests (fast-check) for unit tests 
- Integration tests for API routes with DB
- Add new E2E flows when adding new features

### Where tests live
- Colocated: `foo.ts` → `foo.test.ts` in same directory
- E2E: `e2e/*.spec.ts`

### Property-based patterns
```typescript
// Prefer this
test.prop([fc.string()])('sanitizePath blocks traversal', (input) => {
  expect(sanitizePath(input)).not.toContain('..');
});

// Over example-based
test('sanitizePath blocks ../', () => {
  expect(sanitizePath('../foo')).not.toContain('..');
});
```

## External APIs

-- The OpenAPI spec for TMDB can be found here `reference/tmdb.openapi.json`. Use it as a reference when developing code to interact with it 

## Plans

- At the end of each plan, give me a list of unresolved questions to answer, if any. Make the questions extremely concise. Sacrifice grammar for the sake of concision.

## Browser Automation

Use `agent-browser` for web automation. Run `agent-browser --help` for all commands.

Core workflow:
1. `agent-browser open <url>` - Navigate to page
2. `agent-browser snapshot -i` - Get interactive elements with refs (@e1, @e2)
3. `agent-browser click @e1` / `fill @e2 "text"` - Interact using refs
4. Re-snapshot after page changes

## Imports

- Never use dynamic `await import()`. Always use static imports at top of file.

## Naming style

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
