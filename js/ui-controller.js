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
    this.viewer.onCameraClick = (id) => this.showImageViewer(id);
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

  showImageViewer(imageId) {
    const img = this.viewer.images[imageId];
    if (!img) return;

    // Update modal title and image
    const modal = document.getElementById('image-viewer-modal');
    const title = document.getElementById('image-viewer-title');
    const image = document.getElementById('image-viewer-image');
    const cameraInfo = document.getElementById('camera-info');

    title.textContent = img.name;
    image.src = `images/${img.name}`;
    image.alt = img.name;

    // Update camera information
    const camera = this.viewer.cameras[img.cameraId];
    if (camera) {
      cameraInfo.innerHTML = `
        <div>Camera ID: ${camera.id}</div>
        <div>Model: ${camera.modelName}</div>
        <div>Resolution: ${camera.width}×${camera.height}</div>
        <div>Parameters: ${camera.params.map(p => p.toFixed(3)).join(', ')}</div>
      `;
    } else {
      cameraInfo.innerHTML = `
        <div>Camera ID: ${img.cameraId}</div>
        <div>No camera parameters available</div>
      `;
    }

    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('show');

    // Reset zoom and pan
    this.resetImageViewer();

    // Setup event listeners
    this.setupImageViewerEvents(imageId);
  }

  setupImageViewerEvents(imageId) {
    const modal = document.getElementById('image-viewer-modal');
    const image = document.getElementById('image-viewer-image');
    const closeBtn = document.getElementById('image-viewer-close');
    const zoomIn = document.getElementById('zoom-in');
    const zoomOut = document.getElementById('zoom-out');
    const zoomReset = document.getElementById('zoom-reset');

    // Close button
    closeBtn.onclick = () => this.closeImageViewer();

    // Close on Escape key
    const onKeydown = (e) => {
      if (e.key === 'Escape') this.closeImageViewer();
      else if (e.key === '+' || e.key === '=') this.zoomImageViewer(1.2);
      else if (e.key === '-' || e.key === '_') this.zoomImageViewer(0.8);
      else if (e.key === '0') this.resetImageViewer();
    };
    document.addEventListener('keydown', onKeydown);

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeImageViewer();
    });

    // Zoom controls
    zoomIn.onclick = () => this.zoomImageViewer(1.2);
    zoomOut.onclick = () => this.zoomImageViewer(0.8);
    zoomReset.onclick = () => this.resetImageViewer();

    // Mouse wheel zoom
    image.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoomImageViewer(zoomFactor);
    }, { passive: false });

    // Pan functionality
    let isPanning = false;
    let startX, startY, startScrollLeft, startScrollTop;

    image.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left mouse button
        isPanning = true;
        startX = e.pageX - image.offsetLeft;
        startY = e.pageY - image.offsetTop;
        startScrollLeft = image.scrollLeft;
        startScrollTop = image.scrollTop;
        image.style.cursor = 'grabbing';
      }
    });

    image.addEventListener('mouseleave', () => {
      isPanning = false;
      image.style.cursor = 'grab';
    });

    image.addEventListener('mouseup', () => {
      isPanning = false;
      image.style.cursor = 'grab';
    });

    image.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      e.preventDefault();
      const x = e.pageX - image.offsetLeft;
      const y = e.pageY - image.offsetTop;
      const walkX = (x - startX) * 2;
      const walkY = (y - startY) * 2;
      image.scrollLeft = startScrollLeft - walkX;
      image.scrollTop = startScrollTop - walkY;
    });

    // Store cleanup function for later
    this.currentImageViewerCleanup = () => {
      document.removeEventListener('keydown', onKeydown);
      modal.removeEventListener('click', this.closeImageViewer);
      zoomIn.onclick = null;
      zoomOut.onclick = null;
      zoomReset.onclick = null;
      image.removeEventListener('wheel', null);
      image.removeEventListener('mousedown', null);
      image.removeEventListener('mouseleave', null);
      image.removeEventListener('mouseup', null);
      image.removeEventListener('mousemove', null);
    };
  }

  zoomImageViewer(factor) {
    const image = document.getElementById('image-viewer-image');
    const currentTransform = image.style.transform || 'scale(1)';
    const currentScale = parseFloat(currentTransform.match(/scale\(([\d.]+)\)/)?.[1] || 1);
    const newScale = Math.max(0.1, Math.min(5, currentScale * factor));
    image.style.transform = `scale(${newScale})`;
  }

  resetImageViewer() {
    const image = document.getElementById('image-viewer-image');
    image.style.transform = 'scale(1)';
    image.scrollLeft = 0;
    image.scrollTop = 0;
  }

  closeImageViewer() {
    const modal = document.getElementById('image-viewer-modal');
    modal.classList.remove('show');
    modal.classList.add('hidden');
    
    // Cleanup event listeners
    if (this.currentImageViewerCleanup) {
      this.currentImageViewerCleanup();
      this.currentImageViewerCleanup = null;
    }
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
    const newVal = Math.max(0.001, Math.min(0.5, parseFloat(slider.value) * factor));
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
