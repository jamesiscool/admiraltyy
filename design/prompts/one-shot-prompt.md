# One-Shot Implementation Prompt

Copy and paste this prompt to implement Admiraltyy in one session.

---

## Prompt

I need you to implement **Admiraltyy**, a Usenet media automation platform. This is a full-stack application.

### Before You Start

Please ask me the following clarifying questions:

1. **Authentication**: Do you want user authentication? If so, what method (form login, basic auth, OAuth)?
2. **Database**: What database should we use? (SQLite, PostgreSQL, etc.)
3. **Deployment**: How will this be deployed? (Docker, bare metal, cloud service)
4. **API Keys**: Do you have API keys for TMDB and TheTVDB, or should I set up placeholder configuration?

### Reference Materials

I'm providing you with:
- `product-overview.md` — Product description and features
- `instructions/one-shot-instructions.md` — Complete implementation guide with all milestones
- `design-system/` — Color and typography tokens
- `data-model/data-model.md` — Entity definitions
- `shell/` — Application shell specification and components
- `sections/` — Each section with spec, types, sample data, and test instructions

### Implementation Approach

Please implement in this order:
1. **Foundation** — Project setup, dependencies, database schema
2. **Shell** — Navigation, layout, theming
3. **Dashboard** — Wanted items overview, recent downloads
4. **Movies** — Movie library, detail view, TMDB search
5. **TV** — Series library, episode management, TVDB search
6. **Activity** — Download queue and history
7. **Settings** — All configuration panels

For each section, follow the TDD approach:
1. Review the `tests.md` file for test cases
2. Write tests first (unit and integration)
3. Implement to make tests pass
4. Verify against the specification

### Key Technical Requirements

- **Frontend**: React + TypeScript + Tailwind CSS v4
- **Backend**: Bun + Hono API
- **Design System**: Blue primary, slate neutrals, Inter font
- **Responsive**: Mobile-first with dark mode support
- **Components**: All UI components accept data via props (no direct imports)

Let's begin!

