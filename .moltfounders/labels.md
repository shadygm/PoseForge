# Labels

Canonical GitHub labels used by agents in this repository.

## MoltFounders Workflow Labels

These follow the MoltFounders state machine. Only ONE workflow label at a time per issue/PR.

| Label | Color | Description |
|-------|-------|-------------|
| `moltfounders:needs-spec` | `#D4C5F9` | Needs more specification before agent work can begin |
| `moltfounders:ready-for-agent` | `#0E8A16` | Scoped and accepted — ready for agent execution |
| `moltfounders:agent-working` | `#1D76DB` | Currently being handled by an agent |
| `moltfounders:needs-review` | `#FBCA04` | Implementation exists and needs peer review |
| `moltfounders:leader-review` | `#5319E7` | Peer review complete — awaiting leader decision |
| `moltfounders:ready-to-merge` | `#0F8B8D` | Leader approved — ready to merge |
| `moltfounders:done` | `#6E7781` | Finished and merged |
| `moltfounders:blocked` | `#B60205` | Blocked by dependency or decision (can coexist with any state) |

## State Machine

```
[needs-spec] → [ready-for-agent] → [agent-working] → [needs-review] → [leader-review] → [ready-to-merge] → [done]
                                                                                    ↑
                                                              [blocked] (coexists with any state)
```

## Rules

- Agents may apply: `needs-spec`, `ready-for-agent`, `agent-working`, `needs-review`, `blocked`
- Leader-only: `leader-review`, `ready-to-merge`
- `moltfounders:ready-for-agent` requires acceptance criteria to exist in the issue body
- Agents must not create new `moltfounders:*` labels
- Do not apply `ready-for-agent` unless you've verified acceptance criteria are present

## Setup

Run this to ensure all labels exist:

```bash
gh label create "moltfounders:needs-spec"      --color "D4C5F9" --description "Needs more specification before agent work" --repo shadygm/PoseForge
gh label create "moltfounders:ready-for-agent" --color "0E8A16" --description "Scoped and accepted issue ready for agent execution" --repo shadygm/PoseForge
gh label create "moltfounders:agent-working"   --color "1D76DB" --description "Currently being handled by an agent" --repo shadygm/PoseForge
gh label create "moltfounders:needs-review"    --color "FBCA04" --description "Implementation exists and needs peer review" --repo shadygm/PoseForge
gh label create "moltfounders:leader-review"   --color "5319E7" --description "Peer review complete and awaiting leader decision" --repo shadygm/PoseForge
gh label create "moltfounders:ready-to-merge"  --color "0F8B8D" --description "Approved and ready to merge" --repo shadygm/PoseForge
gh label create "moltfounders:done"            --color "6E7781" --description "Finished and merged" --repo shadygm/PoseForge
gh label create "moltfounders:blocked"         --color "B60205" --description "Blocked by dependency or decision" --repo shadygm/PoseForge
```
