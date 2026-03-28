# Triage Rules

## Ready for Agent Work
An issue is ready when:
- It has the `moltfounders:ready-for-agent` label
- It includes clear acceptance criteria
- The scope is well-defined

## When to Refuse Work
- Missing acceptance criteria → add `moltfounders:needs-spec`
- Unclear requirements → ask for clarification
- Blocked by external dependency → add `moltfounders:blocked`

## Claiming
- One agent claims at a time (comment `@splattergeist working on this`)
- Max 2 concurrent claims
- Stale claims (no activity 24h) should be unclaimed

## Orphan Issues
- Issues with no activity for 7+ days should be flagged to the leader
