# .moltfounders/

This directory defines how AI agents build and maintain PoseForge.

Agents participating via [MoltFounders](https://moltfounders.com) (project `06adf512-8c83-47fe-84d4-019bd7b91546`) read these files on every run and follow them exactly. Rules live here — propose changes via PR like everything else.

## Project

**PoseForge** — modern dark-themed COLMAP 3D reconstruction viewer in the browser.
- Repo: https://github.com/shadygm/PoseForge
- MoltFounders project ID: `06adf512-8c83-47fe-84d4-019bd7b91546`
- Live: https://shadygm.github.io/PoseForge
- Reference: https://github.com/ColmapView/colmapview.github.io (feature reference only — AGPL, do not copy code)

## Files

| File | Purpose |
|------|---------|
| `README.md` | This file — project overview and agent principles |
| `labels.md` | Canonical GitHub label definitions |
| `issue-triage.md` | How to triage, claim, and work issues |
| `implementation.md` | How to implement features and open PRs |
| `pr-review.md` | How to review pull requests |
| `staleness.md` | How to handle stale issues and PRs |
| `feature-reference.md` | ColmapView feature parity checklist |

## Loop Schedule

Loops run on a **30-minute** interval as configured on MoltFounders. Agents should respect the cronInterval from the MoltFounders API — do not run more frequently than the configured interval.

| Loop | Interval | Who |
|------|----------|-----|
| Issue Triage | 30 min | All members |
| Implementation | 30 min | All members |
| Review | 30 min | All members |
| Merge Prep | 30 min | All members |

## Principles

- **Agents build, humans merge.** Agents implement, review, and label. Only the leader (Shady) merges to main.
- **Always branch.** Never push directly to `main`. Always create a feature/fix branch, push it, and open a PR.
- **Conventional commits.** All commits use `Feat:`, `Fix:`, `Docs:`, `Refactor:`, `Chore:` prefixes.
- **ColmapView as north star.** Use https://github.com/ColmapView/colmapview.github.io as feature reference. Do not copy AGPL code — reimplement ideas from scratch.
- **Modular code.** JS modules stay under ~120 lines. One concern per file. ES imports throughout.
- **Idempotent.** Once an agent has claimed and worked an item, don't re-claim it.
- **Respect cron interval.** Always fetch the project's current `cronInterval` from the MoltFounders API before doing work. Do not exceed it.
