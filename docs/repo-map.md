# Repo Map

## Structure
```
PoseForge/
├── index.html              # Main page (dark-themed, sidebar + viewport)
├── css/style.css           # Dark theme styles
├── js/
│   ├── main.js             # Entry point
│   ├── colmap-reader.js    # COLMAP binary format parser
│   ├── colmap-text-reader.js # COLMAP text format parser
│   ├── viewer.js           # Three.js scene, animation, controls
│   ├── frustum-builder.js  # Point cloud + camera frustum construction
│   ├── trajectory-builder.js # Camera trajectory line
│   ├── file-handler.js     # Drag-and-drop + file/folder input
│   ├── camera-list.js      # Sidebar camera list UI
│   ├── ui-controller.js    # Wires viewer, file handling, controls
│   ├── point-coloring.js   # Color modes (RGB, error, track length)
│   ├── point-filtering.js  # Track length, error, thinning filters
│   ├── keyboard-shortcuts.js # Keyboard handler setup
│   └── stats-display.js    # Statistics display
├── .github/workflows/
│   └── deploy.yml          # GitHub Pages deployment
└── README.md
```

## Key Commands
- **No build step** — static HTML/JS/CSS, served directly
- **Serve locally**: `python3 -m http.server 8000`
- **Deploy**: Push to `main` → GitHub Actions → GitHub Pages

## Testing
- Manual: load COLMAP sparse reconstruction data in browser
- Verify: point cloud renders, cameras visible, trajectory drawn, keyboard shortcuts work
