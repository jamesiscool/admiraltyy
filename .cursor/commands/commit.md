## Context

- Lint fix: !`bun run fix`
- Current git status: !`git status`
- Staged changes: !`git diff --cached`
- Unstaged changes: !`git diff`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`

## Your task

1. Check if there are staged changes (from `git diff --cached`)
   - If staged changes exist: use ONLY staged changes for the commit message, do NOT stage additional files
   - If no staged changes: use all unstaged changes and stage them before committing
2. Analyze the relevant diff to understand the nature and purpose of the changes
3. Generate 3 commit message candidates based on the changes
   - Each candidate should be concise, clear, and capture the essence of the changes
   - Prefer Conventional Commits format (feat:, fix:, docs:, refactor:, etc.)
4. Select the most appropriate commit message from the 3 candidates and explain the reasoning for your choice
5. Stage changes if necessary (only if no staged changes existed)
6. Execute git commit using the selected commit message