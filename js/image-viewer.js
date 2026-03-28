/**
 * @module image-viewer
 * Modal image viewer with zoom and pan for camera images.
 * Shows raw image, filename, and camera intrinsics.
 */

const MIN_SCALE = 0.5;
const MAX_SCALE = 10;
const ZOOM_STEP = 0.15;

class ImageViewer {
  constructor() {
    this._overlay = null;
    this._img = null;
    this._scale = 1;
    this._offsetX = 0;
    this._offsetY = 0;
    this._dragging = false;
    this._lastX = 0;
    this._lastY = 0;
    this._build();
  }

  _build() {
    // Overlay backdrop
    this._overlay = document.createElement('div');
    this._overlay.id = 'image-viewer-overlay';
    this._overlay.className = 'iv-overlay hidden';

    // Dialog box
    const dialog = document.createElement('div');
    dialog.className = 'iv-dialog';

    // Header bar
    const header = document.createElement('div');
    header.className = 'iv-header';

    this._titleEl = document.createElement('span');
    this._titleEl.className = 'iv-title';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'iv-close';
    closeBtn.textContent = '✕';
    closeBtn.title = 'Close (Esc)';
    closeBtn.addEventListener('click', () => this.hide());

    header.appendChild(this._titleEl);
    header.appendChild(closeBtn);

    // Image container
    this._container = document.createElement('div');
    this._container.className = 'iv-image-container';

    this._img = document.createElement('img');
    this._img.className = 'iv-image';
    this._img.draggable = false;
    this._container.appendChild(this._img);

    // Info bar
    this._infoEl = document.createElement('div');
    this._infoEl.className = 'iv-info';

    dialog.appendChild(header);
    dialog.appendChild(this._container);
    dialog.appendChild(this._infoEl);
    this._overlay.appendChild(dialog);
    document.body.appendChild(this._overlay);

    // Close on backdrop click
    this._overlay.addEventListener('click', e => {
      if (e.target === this._overlay) this.hide();
    });

    // Keyboard
    this._onKey = e => {
      if (e.key === 'Escape') this.hide();
    };

    // Wheel zoom
    this._container.addEventListener('wheel', e => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      this._zoom(delta, e.clientX, e.clientY);
    }, { passive: false });

    // Mouse drag
    this._container.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      this._dragging = true;
      this._lastX = e.clientX;
      this._lastY = e.clientY;
      this._container.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', e => {
      if (!this._dragging) return;
      this._offsetX += e.clientX - this._lastX;
      this._offsetY += e.clientY - this._lastY;
      this._lastX = e.clientX;
      this._lastY = e.clientY;
      this._applyTransform();
    });
    document.addEventListener('mouseup', () => {
      if (!this._dragging) return;
      this._dragging = false;
      this._container.style.cursor = 'grab';
    });
  }

  _zoom(delta, cx, cy) {
    const prevScale = this._scale;
    this._scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, this._scale + delta));
    if (this._scale === prevScale) return;

    // Zoom toward cursor position
    const rect = this._container.getBoundingClientRect();
    const px = cx - rect.left - rect.width / 2;
    const py = cy - rect.top - rect.height / 2;
    this._offsetX -= px * (this._scale / prevScale - 1);
    this._offsetY -= py * (this._scale / prevScale - 1);
    this._applyTransform();
  }

  _applyTransform() {
    // Scale before translate so pan speed stays in screen pixels regardless of zoom
    this._img.style.transform =
      `scale(${this._scale}) translate(${this._offsetX}px, ${this._offsetY}px)`;
  }

  _resetTransform() {
    this._scale = 1;
    this._offsetX = 0;
    this._offsetY = 0;
    this._applyTransform();
    this._container.style.cursor = 'grab';
  }

  /**
   * Show the viewer with a given image Blob/URL and metadata.
   * @param {string} src - object URL or data URL
   * @param {string} name - image filename
   * @param {Object|null} camera - COLMAP camera object (optional)
   */
  show(src, name, camera) {
    if (src) {
      this._img.src = src;
      this._img.classList.remove('hidden');
    } else {
      this._img.removeAttribute('src');
      this._img.classList.add('hidden');
    }

    this._titleEl.textContent = name;
    this._resetTransform();

    let infoText;
    if (camera) {
      const params = (camera.params || []).map(v => v.toFixed(2)).join(', ');
      const modelLabel = camera.modelName || camera.model || '';
      infoText = `Model: ${modelLabel} | ${camera.width}×${camera.height} | params: [${params}]`;
    } else {
      infoText = name;
    }

    if (!src) {
      const unavailableNote = 'Image not available';
      infoText = infoText ? `${infoText} — ${unavailableNote}` : unavailableNote;
    }

    this._infoEl.textContent = infoText;

    this._overlay.classList.remove('hidden');
    document.addEventListener('keydown', this._onKey);
  }

  hide() {
    this._overlay.classList.add('hidden');
    this._img.removeAttribute('src');
    this._img.classList.remove('hidden');
    document.removeEventListener('keydown', this._onKey);
  }
}

// Singleton
let _instance = null;

export function getImageViewer() {
  if (!_instance) _instance = new ImageViewer();
  return _instance;
}
