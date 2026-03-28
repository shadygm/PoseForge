/**
 * @module camera-list
 * Builds and manages the camera list UI in the sidebar.
 */

/**
 * Populate the camera list sidebar from COLMAP images.
 * @param {Object} images - COLMAP images dict
 * @param {Function} onJump - callback(imageId) — left click jumps to camera in 3D
 * @param {Function} [onViewImage] - optional callback(imageId) — icon click opens image viewer
 */
export function buildCameraList(images, onJump, onViewImage) {
  const list = document.getElementById('camera-list');
  list.innerHTML = '';

  const entries = Object.values(images).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true })
  );

  for (const img of entries) {
    const div = document.createElement('div');
    div.className = 'camera-item';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'camera-item-name';
    nameSpan.textContent = img.name;
    div.appendChild(nameSpan);

    if (onViewImage) {
      const imgBtn = document.createElement('button');
      imgBtn.className = 'camera-item-img-btn';
      imgBtn.title = 'View image';
      imgBtn.textContent = '🖼';
      imgBtn.setAttribute('aria-label', 'View image');
      imgBtn.addEventListener('click', e => {
        e.stopPropagation();
        onViewImage(img.id);
      });
      div.appendChild(imgBtn);
    }

    div.addEventListener('click', () => onJump(img.id));
    list.appendChild(div);
  }
}

/**
 * Highlight the active camera item in the sidebar list.
 * @param {number} imageId
 * @param {Object} images - COLMAP images dict
 */
export function highlightCameraItem(imageId, images) {
  document.querySelectorAll('.camera-item').forEach(el => el.classList.remove('active'));

  const sorted = Object.values(images).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true })
  );
  const idx = sorted.findIndex(e => e.id === imageId);
  const items = document.querySelectorAll('.camera-item');
  if (idx >= 0 && items[idx]) items[idx].classList.add('active');
}
