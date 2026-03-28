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
import { getImageViewer } from './image-viewer.js';
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
    /** Map of base filename → File object for raw images */
    this._imageFiles = {};
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
      this._imageFiles = files.imageFiles || {};

      const nc = Object.keys(cameras).length;
      const ni = Object.keys(images).length;
      const np = Object.keys(points).length;
      this.setStatus(`Loaded ${nc} cameras, ${ni} images, ${np} points`, 'success');

      const hasImgFiles = Object.keys(this._imageFiles).length > 0;
      buildCameraList(
        images,
        (id) => this.jumpToCamera(id),
        hasImgFiles ? (id) => this.openImageViewer(id) : null
      );
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

  /**
   * Open the image viewer popup for a given image ID.
   * Looks up the corresponding File by the image name stored in the COLMAP images dict.
   * @param {number} imageId
   */
  openImageViewer(imageId) {
    const img = this._images[imageId];
    if (!img) return;

    // Try direct lookup first, then fall back to basename for relative paths like "images/foo.jpg"
    const imgName = img.name || '';
    let file = this._imageFiles[imgName];
    if (!file && imgName) {
      const baseName = imgName.split(/[/\\]/).pop();
      if (baseName) file = this._imageFiles[baseName] || null;
    }

    if (!file) {
      // Image file not available — show a notice in the viewer
      const viewer = getImageViewer();
      const camera = this._cameras[img.cameraId] || null;
      viewer.show(null, imgName + ' (image file not loaded)', camera);
      return;
    }

    // Revoke any previously created object URL before creating a new one
    if (this._currentImageObjectUrl) {
      URL.revokeObjectURL(this._currentImageObjectUrl);
      this._currentImageObjectUrl = null;
    }

    const url = URL.createObjectURL(file);
    this._currentImageObjectUrl = url;

    const viewer = getImageViewer();
    const camera = this._cameras[img.cameraId] || null;
    viewer.show(url, imgName, camera);
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
}

window.PoseForgeUI = PoseForgeUI;
export { PoseForgeUI };
