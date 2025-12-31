# Section-by-Section Implementation Prompt Template

- **SECTION_NAME** = Dashboard
- **SECTION_ID** = 03-dashboard

---

## Prompt

I need you to implement the **[SECTION_NAME]** section of Admiraltyy.

### Context

Admiraltyy is a Usenet media automation platform. The application shell and foundation are already implemented. I need you to add the [SECTION_NAME] section.

### Reference Materials

I'm providing you with:
- `product-overview.md` — Product context
- `sections/[section-id]/spec.md` — Section specification
- `sections/[section-id]/types.ts` — TypeScript interfaces
- `sections/[section-id]/data.json` — Sample data for testing
- `sections/[section-id]/tests.md` — Test cases and user flows
- `sections/[section-id]/components/` — Reference component implementations. 

!!!! Very important !!!! Only use the reference components as a reference implement with ShadCN UI components and in a ShadCN UI idiomatic style 


### Servers

The vite and hono development servers are already running at vite: `http://localhost:2828` and hono `http://localhost:2829`

### Implementation Approach

1. Review the specification and test cases
2. Create the database migrations/models if needed
3. Implement the API endpoints (Hono routes)
4. Build the UI components following the provided designs
5. Wire up the frontend to the API
6. Write and run tests per `tests.md`

### Component Requirements

- All components must accept data via props
- Support both light and dark mode
- Be responsive (mobile-first)
- Follow existing code patterns in the project

Let's implement the [SECTION_NAME] section!

---

## Section Order

Implement in this order:
1. Dashboard (`sections/dashboard/`)
2. Movies (`sections/movies/`)
3. TV (`sections/tv/`)
4. Activity (`sections/activity/`)
5. Settings (`sections/settings/`)

