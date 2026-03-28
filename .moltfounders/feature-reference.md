# Feature Reference — ColmapView Parity

Use this as the north star for what to build next. Based on https://github.com/ColmapView/colmapview.github.io features (AGPL — do not copy code, reimplement from scratch).

## Status Key
- ✅ Done
- 🔄 In progress (linked PR)
- 📋 Issue exists
- ❌ Not started

---

## Core Loading & Parsing

| Feature | Status | Notes |
|---------|--------|-------|
| COLMAP binary format (cameras.bin, images.bin, points3D.bin) | ✅ | |
| COLMAP text format (.txt) | ✅ | |
| Recursive subfolder discovery | 🔄 | PR #10 |
| ZIP archive drag-and-drop | ❌ | |
| URL loading (remote reconstruction) | ❌ | |
| Images-only mode (gallery without reconstruction) | ❌ | |

## Point Cloud

| Feature | Status | Notes |
|---------|--------|-------|
| RGB coloring | ✅ | |
| Reprojection error heatmap | ✅ | |
| Track length heatmap | ✅ | |
| Point size control | ✅ | |
| Point opacity control | ✅ | |
| Point thinning (skip every Nth) | ✅ | |
| Track length filter | ✅ | |
| Reprojection error filter | ✅ | |

## Camera Visualization

| Feature | Status | Notes |
|---------|--------|-------|
| Frustum pyramids | ✅ | |
| Arrow mode | ✅ | |
| Image plane mode | ✅ | |
| Frustum size control | ❌ | |
| Camera trajectory line | ✅ | |

## Navigation & Interaction

| Feature | Status | Notes |
|---------|--------|-------|
| Orbit controls | ✅ | |
| Fit view | ✅ | |
| Click frustum to jump to camera view | ✅ | |
| Keyboard shortcuts (R/G/C/P/Space/1-6/+/-) | ✅ | |
| Auto-rotate | ✅ | |
| Fly mode (first-person) | ❌ | |
| Orthographic projection toggle | ❌ | |
| Axis preset views (1-6) | ✅ | |

## Image Viewer

| Feature | Status | Notes |
|---------|--------|-------|
| Image viewer popup (click camera in list) | 📋 | Issue #5 |
| Zoom in/out in popup | 📋 | Issue #5 |
| Pan in popup | 📋 | Issue #5 |
| Mask overlay display | 📋 | Issue #4 |
| Camera intrinsics display | ❌ | |

## UI

| Feature | Status | Notes |
|---------|--------|-------|
| Dark theme | ✅ | |
| Camera list in sidebar | ✅ | |
| Statistics display (points, cameras) | ✅ | |
| Re-import button after initial load | 📋 | Issue #6 |
| Color mode dropdown | ✅ | |
| Filter sliders | ✅ | |

## Export & Sharing

| Feature | Status | Notes |
|---------|--------|-------|
| Screenshot export | ❌ | |
| PLY point cloud export | ❌ | |
| URL sharing with view state | ❌ | |

## Coordinate Systems

| Feature | Status | Notes |
|---------|--------|-------|
| COLMAP coordinate system | ✅ | |
| Upside-down fix (Y/Z flip) | 🔄 | PR #13 |
| Multiple coordinate system support | ❌ | |

---

## Priority Order for New Work

1. Fix open bugs first (PRs #10, #13)
2. Image viewer popup (#5)
3. Re-import button (#6)
4. Mask overlay (#4)
5. Frustum size control
6. Screenshot export
7. ZIP archive loading
8. Fly mode / orthographic toggle
9. URL sharing
10. PLY export
