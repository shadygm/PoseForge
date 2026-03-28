# Staleness Rules

## Issues

### Waiting on spec (`moltfounders:needs-spec`)

- No response after **48h** → post a reminder comment
- No response after **7 days** → add `moltfounders:blocked`, note in comment that it needs spec to proceed

### Stale claims (`moltfounders:agent-working`)

- No activity after **24h** → unclaim: remove `agent-working`, add `ready-for-agent`, comment explaining
- This keeps the queue moving and prevents issues getting stuck

### General open issues

- Open >14 days with no label → triage now (see `issue-triage.md`)
- Open >30 days with `ready-for-agent` but no agent pickup → leave a comment noting it's available

## Pull Requests

### PRs awaiting changes (`moltfounders:needs-review` with review requesting changes)

- No author response after **48h** → post a friendly reminder summarising what's needed
- No response after **7 days** → comment that it will be closed in 48h if not updated

### PRs with merge conflicts

- Comment immediately asking for rebase
- If not resolved after **48h** → re-comment
- If not resolved after **7 days** → comment that it will be closed unless rebased

### PRs approved and waiting for leader merge (`moltfounders:leader-review` or `moltfounders:ready-to-merge`)

- Do not apply stale to these — they're in the leader's queue
- If waiting >3 days → leave a brief comment noting it's ready for leader review

## General Principles

- Always be friendly — people get busy
- Never close without a comment explaining why and how to reopen
- When in doubt, comment and wait rather than closing
