/**
 * @module ui-controller
 * Wires together viewer, file handling, camera list, and UI controls.
 */

import { readColmapBinaryFile } from './colmap-reader.js';
import { readColmapTextFile } from './colmap-text-reader.js';
import { setupFileDrop, setupFileInputs, hasAllFiles, isTextFile } from './file-handler.js';
import { buildCameraList, highlightCameraItem } from './camera-list.js';
import { filterPoints } from './point-filtering.js';
import { COLOR_MODES, COLOR_MODE_LABELS } from './point-coloring.js';
import { updateStats } from './stats-display.js';
import { setupKeyboardShortcuts } from './keyboard-shortcuts.js';
import * as THREE from 'three';

const CAMERA_MODES = ['frustum', 'arrow', 'imagePlane'];
const CAMERA_MODE_LABELS = { frustum: 'Frustums', arrow: 'Arrows', imagePlane: 'Image Planes' };

class PoseForgeUI {
  constructor(viewer) {
    this.viewer = viewer;
    this._colorIdx = 0;
    this._cameraIdx = 0;
    this._cameras = {};
    this._images = {};
    this._points = {};
    this.setupFileHandling();
    this.setupToggles();
    this.setupNewControls();
    this.viewer.onCameraClick = (id) => this.jumpToCamera(id);
    setupKeyboardShortcuts(viewer, this);
  }

  async readColmapFile(file, method) {
    if (isTextFile(file)) {
      return (await readColmapTextFile(file))[method]();
    }
    return (await readColmapBinaryFile(file))[method]();
  }

  setupFileHandling() {
    setupFileDrop({
      onDrop: (files) => this.loadFiles(files),
      onError: (msg) => this.setStatus(msg, 'error'),
      setStatus: (msg, type) => this.setStatus(msg, type),
    });
    setupFileInputs({
      onFiles: (files) => this.loadFiles(files),
      onError: (msg) => this.setStatus(msg, 'error'),
    });
  }

  async loadFiles(files) {
    this.setStatus('Loading...', 'info');
    try {
      this.setStatus('Parsing cameras...', 'info');
      const cameras = await this.readColmapFile(files.cameras, 'readCameras');
      this.setStatus('Parsing images...', 'info');
      const images = await this.readColmapFile(files.images, 'readImages');
      this.setStatus('Parsing points...', 'info');
      const points = await this.readColmapFile(files.points3D, 'readPoints3D');

      this._cameras = cameras;
      this._images = images;
      this._points = points;

      const nc = Object.keys(cameras).length;
      const ni = Object.keys(images).length;
      const np = Object.keys(points).length;
      this.setStatus(`Loaded ${nc} cameras, ${ni} images, ${np} points`, 'success');

      buildCameraList(images, (id) => this.jumpToCamera(id));
      document.getElementById('drop-zone').classList.add('hidden');
      document.getElementById('controls').classList.remove('hidden');
      this.viewer.loadImageData(cameras, images, points);
      this.refreshFilters();
    } catch (err) {
      console.error(err);
      this.setStatus('Error: ' + err.message, 'error');
    }
  }

  jumpToCamera(imageId) {
    this.viewer.jumpToCamera(imageId);
    highlightCameraItem(imageId, this.viewer.images);
  }

  setupToggles() {
    document.getElementById('toggle-points').addEventListener('change', e => this.viewer.togglePoints(e.target.checked));
    document.getElementById('toggle-cameras').addEventListener('change', e => this.viewer.toggleCameras(e.target.checked));
    document.getElementById('toggle-trajectory').addEventListener('change', e => this.viewer.toggleTrajectory(e.target.checked));
    document.getElementById('point-size').addEventListener('input', e => this.viewer.setPointSize(parseFloat(e.target.value)));
    document.getElementById('fit-view-btn').addEventListener('click', () => this.viewer.fitView());
    document.getElementById('reload-btn').addEventListener('click', () => {
      document.getElementById('drop-zone').classList.remove('hidden');
      document.getElementById('controls').classList.add('hidden');
    });
  }

  setupNewControls() {
    // Color mode
    const colorSelect = document.getElementById('color-mode');
    if (colorSelect) {
      COLOR_MODES.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = COLOR_MODE_LABELS[m];
        colorSelect.appendChild(opt);
      });
      colorSelect.addEventListener('change', () => this.refreshFilters());
    }

    // Camera mode button
    const camBtn = document.getElementById('camera-mode-btn');
    if (camBtn) {
      camBtn.addEventListener('click', () => this.cycleCameraMode());
    }

    // Filter sliders
    ['track-filter', 'error-filter', 'thin-filter', 'opacity-slider'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => this.refreshFilters());
    });

    // Import COLMAP button
    const importBtn = document.getElementById('import-colmap-btn');
    if (importBtn) {
      importBtn.addEventListener('click', () => this.showImportDialog());
    }
  }

  refreshFilters() {
    const pointArray = Object.values(this._points);
    const minTrack = parseInt(document.getElementById('track-filter')?.value ?? '0');
    const maxError = parseFloat(document.getElementById('error-filter')?.value ?? 'Infinity');
    const thinStep = parseInt(document.getElementById('thin-filter')?.value ?? '1');
    const opacity = parseFloat(document.getElementById('opacity-slider')?.value ?? '1');
    const colorMode = document.getElementById('color-mode')?.value || 'rgb';
    const cameraMode = CAMERA_MODES[this._cameraIdx];

    const filtered = filterPoints(pointArray, { minTrack, maxError: isNaN(maxError) ? Infinity : maxError, thinStep });

    this.viewer.applyFiltersAndColors(filtered, colorMode, cameraMode);
    this.viewer.setPointOpacity(opacity);

    // Stats
    const box = new THREE.Box3();
    if (this.viewer.pointCloud) box.expandByObject(this.viewer.pointCloud);
    const size = box.getSize(new THREE.Vector3());
    updateStats({
      totalPoints: pointArray.length,
      visiblePoints: filtered.length,
      totalCameras: Object.keys(this._images).length,
      bboxSize: size,
    });
  }

  cycleColorMode() {
    this._colorIdx = (this._colorIdx + 1) % COLOR_MODES.length;
    const select = document.getElementById('color-mode');
    if (select) select.value = COLOR_MODES[this._colorIdx];
    this.refreshFilters();
  }

  cycleCameraMode() {
    this._cameraIdx = (this._cameraIdx + 1) % CAMERA_MODES.length;
    const btn = document.getElementById('camera-mode-btn');
    if (btn) btn.textContent = CAMERA_MODE_LABELS[CAMERA_MODES[this._cameraIdx]];
    this.refreshFilters();
  }

  adjustPointSize(factor) {
    const slider = document.getElementById('point-size');
    const newVal = Math.max(0.001, Math.min(0.2, parseFloat(slider.value) * factor));
    slider.value = newVal;
    this.viewer.setPointSize(newVal);
  }

  setStatus(msg, type) {
    const el = document.getElementById('status');
    el.textContent = msg;
    el.className = 'status ' + type;
  }

  showImportDialog() {
    // Show the drop overlay
    const overlay = document.getElementById('drop-overlay');
    overlay.classList.remove('hidden');
    
    // Focus on the file inputs
    document.getElementById('folder-input').click();
    
    // Hide overlay when files are selected or user clicks outside
    const hideOverlay = () => {
      overlay.classList.add('hidden');
      overlay.removeEventListener('click', hideOverlay);
    };
    
    overlay.addEventListener('click', hideOverlay);
    
    // Handle files when selected
    const handleFiles = (files) => {
      hideOverlay();
      if (files && files.length > 0) {
        this.loadFiles(files);
      }
    };
    
    // Set up event listeners for file inputs
    const folderInput = document.getElementById('folder-input');
    const fileInput = document.getElementById('file-input');
    
    const folderHandler = () => {
      const selectedFiles = Array.from(folderInput.files);
      if (selectedFiles.length >= 3) { // Basic validation for cameras.bin, images.bin, points3D.bin
        handleFiles(selectedFiles);
      } else {
        this.setStatus('Please select a folder containing COLMAP files', 'error');
      }
      folderInput.removeEventListener('change', folderHandler);
    };
    
    const fileHandler = () => {
      const selectedFiles = Array.from(fileInput.files);
      if (selectedFiles.length >= 3) {
        handleFiles(selectedFiles);
      } else {
        this.setStatus('Please select at least 3 COLMAP files (cameras.bin, images.bin, points3D.bin)', 'error');
      }
      fileInput.removeEventListener('change', fileHandler);
    };
    
    folderInput.addEventListener('change', folderHandler);
    fileInput.addEventListener('change', fileHandler);
    
    // Auto-hide after 10 seconds
    setTimeout(hideOverlay, 10000);
  }

  async loadFiles(files) {
    this.setStatus('Loading...', 'info');
    
    try {
      // Clear existing visualization data
      this._cameras = {};
      this._images = {};
      this._points = {};
      
      // Reset UI elements
      document.getElementById('drop-zone').classList.add('hidden');
      document.getElementById('controls').classList.remove('hidden');
      document.getElementById('camera-list').innerHTML = '';
      
      this.setStatus('Parsing cameras...', 'info');
      const cameras = await this.readColmapFile(files.cameras, 'readCameras');
      this.setStatus('Parsing images...', 'info');
      const images = await this.readColmapFile(files.images, 'readImages');
      this.setStatus('Parsing points...', 'info');
      const points = await this.readColmapFile(files.points3D, 'readPoints3D');

      this._cameras = cameras;
      this._images = images;
      this._points = points;

      const nc = Object.keys(cameras).length;
      const ni = Object.keys(images).length;
      const np = Object.keys(points).length;
      this.setStatus(`Loaded ${nc} cameras, ${ni} images, ${np} points`, 'success');

      buildCameraList(images, (id) => this.jumpToCamera(id));
      this.viewer.loadImageData(cameras, images, points);
      this.resetControls();
      this.refreshFilters();
    } catch (err) {
      console.error(err);
      this.setStatus('Error: ' + err.message, 'error');
    }
  }

  resetControls() {
    // Reset all UI controls to defaults
    document.getElementById('toggle-points').checked = true;
    document.getElementById('toggle-cameras').checked = true;
    document.getElementById('toggle-trajectory').checked = true;
    document.getElementById('point-size').value = 0.02;
    document.getElementById('opacity-slider').value = 1;
    document.getElementById('track-filter').value = 0;
    document.getElementById('error-filter').value = 10;
    document.getElementById('thin-filter').value = 1;
    
    // Reset color mode to default
    const colorSelect = document.getElementById('color-mode');
    if (colorSelect) {
      colorSelect.value = 'rgb';
    }
    
    // Reset camera mode to default
    this._cameraIdx = 0;
    const camBtn = document.getElementById('camera-mode-btn');
    if (camBtn) {
      camBtn.textContent = CAMERA_MODE_LABELS[CAMERA_MODES[0]];
    }
  }
}

window.PoseForgeUI = PoseForgeUI;
export { PoseForgeUI };
