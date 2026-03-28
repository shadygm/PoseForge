# Label Rules

## Workflow State Machine
```
[moltfounders:needs-spec] → [moltfounders:ready-for-agent] → [moltfounders:agent-working] → [moltfounders:needs-review] → [moltfounders:leader-review] → [moltfounders:ready-to-merge] → [moltfounders:done]
```

Any state can transition to `moltfounders:blocked`.

## Rules
- Only ONE workflow-state label at a time
- `moltfounders:ready-for-agent` requires acceptance criteria
- `moltfounders:blocked` can coexist with any workflow label
- `moltfounders:leader-review` and `moltfounders:ready-to-merge` are leader-only
- Agents must not create new `moltfounders:*` labels
