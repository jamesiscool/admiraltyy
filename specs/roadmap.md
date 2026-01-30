# Admiraltyy Roadmap

## Phase 1: Foundation (Task System)

### 1.1 Import Pipeline
- [ ] Audit import flow end-to-end (verify happy path works)
- [ ] Add retry logic for failed imports
- [ ] Manual re-import trigger from UI

### 1.2 Poller Tuning
- [ ] Adjust timing: 1s when active, 1min when idle
- [ ] Extend cooldown: 5min after last download activity

### 1.3 Task Scheduler Infrastructure
- [ ] Design task scheduler (separate discussion)
- [ ] SQLite-backed task storage (schedules, last run, history)
- [ ] Support cron or English-language scheduling
- [ ] Task UI: view scheduled tasks, manual trigger, run history

## Phase 2: Automation

### 2.1 Scheduled Tasks
- [ ] Library scan task (movies + TV)
- [ ] Auto-search for missing/wanted

### 2.2 Metadata
- [ ] Metadata refresh task

## Phase 3: Polish

- [ ] Upgrade existing files (grab better quality when available)
- [ ] Notifications

## Future / Nice-to-Have

- [ ] IMDB list sync (public lists → auto-add to wanted)
- [ ] RSS sync from indexers
