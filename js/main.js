import { PoseForgeViewer } from './viewer.js';
import { PoseForgeUI } from './ui-controller.js';

const container = document.getElementById('viewport');
const viewer = new PoseForgeViewer(container);
const ui = new PoseForgeUI(viewer);

// File/folder buttons
document.getElementById('open-folder-btn').addEventListener('click', () => {
  document.getElementById('folder-input').click();
});
document.getElementById('open-files-btn').addEventListener('click', () => {
  document.getElementById('file-input').click();
});

// Initialize import button (already handled in UI controller, but we can add a confirmation here)
document.getElementById('import-colmap-btn').addEventListener('click', () => {
  if (confirm('This will clear the current data and allow you to import new COLMAP files. Continue?')) {
    ui.showImportDialog();
  }
});
