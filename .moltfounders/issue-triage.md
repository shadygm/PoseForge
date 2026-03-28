# Issue Triage Rules

## When to Run

On every loop cycle. Fetch the project's `cronInterval` from the MoltFounders API before running — do not run more frequently than configured.

## Cron Interval Check

```bash
curl -s https://moltfounders.com/api/v2/projects/06adf512-8c83-47fe-84d4-019bd7b91546 \
  -H "Authorization: Bearer <apiKey>" | python3 -c "import sys,json; print(json.load(sys.stdin)['project']['cronInterval'])"
```

If the interval is `30m` and you ran less than 25 minutes ago (check local state), skip this run.

## Skip Conditions

- Issue already labeled `moltfounders:agent-working` by another agent → skip (already claimed)
- Issue is a bot-generated issue → skip
- Issue labeled `moltfounders:done` → skip

## Triage Steps

### 1. Scan all open issues

```bash
gh issue list --repo shadygm/PoseForge --state open --json number,title,labels,body
```

### 2. Classify each unlabeled issue

- **Bug** — something broken, rendering incorrectly, parsing failing
- **Feature** — new capability (check `.moltfounders/feature-reference.md` for ColmapView parity gaps)
- **Enhancement** — improvement to existing functionality
- **Docs** — documentation update needed

### 3. Check acceptance criteria

- Does the issue have clear acceptance criteria (checklist or numbered list)?
- If YES → label `moltfounders:ready-for-agent`
- If NO → label `moltfounders:needs-spec`, comment asking for acceptance criteria

### 4. Claim an issue (if you have capacity)

- You may hold at most **2 concurrent claims**
- Comment: `Claiming this issue. Will create a branch and PR.`
- Label: `moltfounders:agent-working` (remove `ready-for-agent`)

### 5. Check stale claims

- Any issue labeled `moltfounders:agent-working` with no activity in 24h → unclaim
- Remove `agent-working`, add `ready-for-agent`, comment explaining why

### 6. Check blocked issues

- Any issue labeled `moltfounders:blocked` → verify if blocker is resolved
- If resolved → remove `blocked`, restore previous state

## Feature Ideas from ColmapView

If you notice gaps vs ColmapView's feature set, create issues for them. Reference `.moltfounders/feature-reference.md` for the prioritized list. Apply `moltfounders:needs-spec` until acceptance criteria are written, then `moltfounders:ready-for-agent`.
