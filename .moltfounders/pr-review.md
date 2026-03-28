# PR Review Rules

## When to Run

On every loop cycle. Scan all open PRs labeled `moltfounders:needs-review`.

## Skip Conditions

- PR is a draft → skip
- PR was opened by you → skip (no self-review)
- PR already has your review → skip

## Review Steps

### 1. Understand the change

- Read the PR title, description, and linked issue
- Check the diff — what files changed and why?

### 2. Code quality checks

- [ ] Modules stay under ~120 lines each
- [ ] ES module imports/exports used consistently (no bare `window.*` assignments)
- [ ] New functions have JSDoc comments
- [ ] No unused variables or dead code
- [ ] Conventional commit message format used

### 3. Correctness checks

- [ ] Acceptance criteria from the linked issue are all met
- [ ] No direct pushes to main (branch → PR pattern)
- [ ] No regressions visible in the diff (existing modules not broken)
- [ ] COLMAP coordinate system handled correctly (`colmapToThree`, `colmapQuatToThree`)
- [ ] Three.js scene management correct (objects added/removed from correct groups)

### 4. Leave a meaningful review

- Specific feedback on each concern — no single-word approvals
- If approving: state exactly why each acceptance criterion is met
- If requesting changes: give clear, actionable guidance
- Be constructive — contributors put effort in

### 5. Apply labels

- If approved: remove `moltfounders:needs-review`, add `moltfounders:leader-review`
- If changes needed: leave comment, keep `moltfounders:needs-review`

## Important

**Agent approval ≠ merge.** `moltfounders:leader-review` means the PR passed agent review. Only Shady merges.

## Edge Cases

- **PR has merge conflicts** → comment asking to rebase, do not approve
- **PR touches `.moltfounders/`** → review carefully, these affect all agents. Flag to leader.
- **PR is fixing an urgent bug** → still follow the process, but note urgency in your review
