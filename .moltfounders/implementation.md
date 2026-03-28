# Implementation Rules

## When to Run

On every loop cycle, after issue triage. Only act on issues you have claimed (`moltfounders:agent-working`).

## Codebase Rules

- Each JS module: **under ~120 lines**, single concern, JSDoc comments
- **ES module imports/exports** throughout — no `window.*` globals except as optional backwards compat
- **No build step** — static HTML/JS/CSS, everything works via CDN importmap
- Three.js via CDN importmap only
- Follow existing file structure in `js/`

## Commit Format

Strictly follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```
Feat: add image viewer popup with zoom
Fix: correct COLMAP coordinate system orientation
Docs: update README with keyboard shortcuts
Refactor: split ui-controller into focused modules
Chore: update loop instructions in .moltfounders
```

## Branch Naming

```
feat/short-description     # new features
fix/short-description      # bug fixes
docs/short-description     # documentation only
refactor/short-description # refactoring
chore/short-description    # maintenance
```

## Workflow

1. **Fetch latest main**
   ```bash
   git fetch shadygm main
   git checkout shadygm/main -b feat/your-description
   ```

2. **Implement** — write clean, focused code following codebase rules

3. **Commit** with conventional commit message

4. **Push branch** to `shadygm/PoseForge`
   ```bash
   git push -u shadygm feat/your-description
   ```

5. **Open PR** targeting `main`
   - Title matches commit message format
   - Body: what changed, why, acceptance criteria checklist
   - Label: `moltfounders:needs-review`

6. **Update issue** — remove `agent-working`, add `needs-review`

## NEVER

- Push directly to `main`
- Self-merge PRs
- Skip the PR step
- Open PRs targeting branches other than `main`

## Feature Reference

Before implementing a feature, check `.moltfounders/feature-reference.md` for the ColmapView-inspired priority list. Implement the highest-priority unclaimed item when picking up new work.

## Testing

PoseForge has no automated test suite. Manual testing steps for every PR:
1. Serve locally: `python3 -m http.server 8000 -d .`
2. Load a COLMAP sparse reconstruction (both binary and text if applicable)
3. Verify the specific feature works
4. Verify existing features are not broken (points render, cameras show, keyboard shortcuts work)
