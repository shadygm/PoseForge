# PoseForge — Project Specification

## Problem

No easy way to visualize COLMAP 3D reconstructions in the browser without installing desktop software (COLMAP, MeshLab, CloudCompare). Users want to quickly inspect sparse reconstructions — point clouds, camera positions, trajectories — without a local COLMAP installation.

## Solution

A web-based viewer that accepts COLMAP sparse reconstruction data (binary and text formats) and renders point clouds, camera frustums, and trajectories interactively in the browser.

## Tech Stack

- **Three.js** — 3D rendering
- **Vanilla JavaScript** — no build step, ES module imports
- **HTML/CSS** — dark-themed UI
- **GitHub Pages** — static hosting

## Features

### MVP (Must Have)

- COLMAP binary + text format parsing
- Point cloud rendering
- Camera frustum visualization
- Trajectory lines between camera views
- Click-to-jump camera views
- Drag-and-drop file upload
- Dark theme
- Keyboard shortcuts

### Should Have

- Point filtering (track length, reprojection error, random thinning)
- Point coloring modes (RGB, error, track length)
- Camera display modes (frustums, arrows, image planes)
- Auto-rotate orbit

### Nice to Have

- Image-only gallery mode
- 360° equirectangular support
- Online reconstruction (COLMAP in browser via WASM)
- Export formats (PLY, OBJ, JSON)
- Screenshot / recording

## Non-Goals

- Server-side processing
- User accounts / authentication
- Paid features
- Dense reconstruction viewing
