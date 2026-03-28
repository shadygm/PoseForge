# PR Standards

## Scope
- Keep PRs focused on one concern
- Maximum ~500 lines changed per PR
- Small, incremental changes preferred

## Branch Naming
- `feat/description` for features
- `fix/description` for bug fixes
- `docs/description` for documentation

## Commit Messages
- Use conventional commits: `Feat:`, `Fix:`, `Chore:`, `Docs:`, `Refactor:`
- Example: `Feat: add text format support for COLMAP files`

## Quality Bar
- Code must be modular, clean, and well-commented
- Each JS module should be under ~120 lines
- ES module imports/exports used consistently
- No lint errors (if a linter is added)

## Validation
- Test in browser: load sample COLMAP data
- Verify new features don't break existing ones
- Check keyboard shortcuts still work

## Review
- No single-word approvals ("LGTM" minimum)
- Must verify the change works as described
