/**
 * @module file-handler
 * Handles drag-and-drop and file/folder input for COLMAP .bin and .txt files.
 */

const COLMAP_BIN = ['cameras.bin', 'images.bin', 'points3D.bin'];
const COLMAP_TXT = ['cameras.txt', 'images.txt', 'points3D.txt'];
const ALL_COLMAP = [...COLMAP_BIN, ...COLMAP_TXT];

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif'];

function isImageFile(name) {
  const lower = name.toLowerCase();
  return IMAGE_EXTS.some(ext => lower.endsWith(ext));
}

function classifyFile(file, map) {
  const name = file.name;
  if (name === 'cameras.bin' || name === 'cameras.txt')  map.cameras  = file;
  else if (name === 'images.bin' || name === 'images.txt')  map.images  = file;
  else if (name === 'points3D.bin' || name === 'points3D.txt') map.points3D = file;
  else if (isImageFile(name)) {
    if (!map.imageFiles) map.imageFiles = {};
    map.imageFiles[name] = file;
  }
}

/** Check if any key has a file assigned. */
export function hasAllFiles(files) {
  return !!(files.cameras && files.images && files.points3D);
}

/** Get a human-readable list of found vs missing files. */
export function getFileStatus(files) {
  const found = [];
  const missing = [];
  if (files.cameras) found.push(files.cameras.name);
  else missing.push('cameras.bin/txt');
  if (files.images) found.push(files.images.name);
  else missing.push('images.bin/txt');
  if (files.points3D) found.push(files.points3D.name);
  else missing.push('points3D.bin/txt');
  return { found, missing };
}

/** Detect if a file is text format based on extension. */
export function isTextFile(file) {
  return file.name.endsWith('.txt');
}

/**
 * Recursively read all File entries from a FileSystemDirectoryEntry.
 * Handles the browser readEntries() batch limitation by reading until empty.
 * Limits recursion to 10 levels deep to prevent runaway.
 */
async function readDirectoryEntries(dirEntry, depth = 0) {
  if (depth > 10) return [];
  const reader = dirEntry.createReader();
  const all = [];

  // readEntries() may return batches; keep calling until empty
  const readBatch = () => new Promise((resolve, reject) => {
    reader.readEntries(
      entries => {
        if (entries.length === 0) { resolve(); return; }
        for (const e of entries) all.push(e);
        readBatch().then(resolve, reject);
      },
      reject
    );
  });
  await readBatch();

  const files = [];
  for (const entry of all) {
    if (entry.isFile) {
      files.push(await new Promise((resolve, reject) => entry.file(resolve, reject)));
    } else if (entry.isDirectory) {
      files.push(...await readDirectoryEntries(entry, depth + 1));
    }
  }
  return files;
}

export async function extractColmapFiles(dataTransfer) {
  const files = {};
  if (dataTransfer.items && dataTransfer.items.length > 0) {
    const entries = [];
    for (const item of dataTransfer.items) {
      const entry = item.webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }
    if (entries.length > 0) {
      const allFiles = [];
      for (const entry of entries) {
        if (entry.isDirectory) allFiles.push(...await readDirectoryEntries(entry));
        else if (entry.isFile) allFiles.push(await new Promise(r => entry.file(r)));
      }
      for (const f of allFiles) classifyFile(f, files);
    }
  }
  if (!hasAllFiles(files) && dataTransfer.files) {
    for (const f of dataTransfer.files) classifyFile(f, files);
  }
  return files;
}

export function classifyInputFiles(fileList) {
  const files = {};
  for (const f of fileList) {
    // Use webkitRelativePath to match files in subdirectories (e.g. sparse/0/cameras.bin)
    const path = f.webkitRelativePath || f.name;
    const name = f.name;
    if (name === 'cameras.bin' || name === 'cameras.txt') files.cameras = f;
    else if (name === 'images.bin' || name === 'images.txt') files.images = f;
    else if (name === 'points3D.bin' || name === 'points3D.txt') files.points3D = f;
  }
  return files;
}

export function setupFileDrop({ onDrop, onError, setStatus }) {
  const overlay = document.getElementById('drop-overlay');
  let dragCounter = 0;
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
    document.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); }, false);
  });
  document.addEventListener('dragenter', () => { dragCounter++; if (overlay) overlay.classList.remove('hidden'); });
  document.addEventListener('dragleave', () => {
    dragCounter--;
    if (dragCounter <= 0) { dragCounter = 0; if (overlay) overlay.classList.add('hidden'); }
  });
  document.addEventListener('drop', async e => {
    dragCounter = 0;
    if (overlay) overlay.classList.add('hidden');
    const files = await extractColmapFiles(e.dataTransfer);
    if (hasAllFiles(files)) await onDrop(files);
    else {
      const status = getFileStatus(files);
      onError(`Missing files: ${status.missing.join(', ')}. Found: ${status.found.join(', ') || 'none'}`);
    }
  });
}

export function setupFileInputs({ onFiles, onError }) {
  document.getElementById('folder-input').addEventListener('change', async e => {
    const files = classifyInputFiles(e.target.files);
    if (hasAllFiles(files)) await onFiles(files);
    else {
      const status = getFileStatus(files);
      onError(`Missing files: ${status.missing.join(', ')}. Found: ${status.found.join(', ') || 'none'}`);
    }
    e.target.value = '';
  });
  document.getElementById('file-input').addEventListener('change', async e => {
    const files = classifyInputFiles(e.target.files);
    if (hasAllFiles(files)) await onFiles(files);
    else {
      const status = getFileStatus(files);
      onError(`Missing files: ${status.missing.join(', ')}. Found: ${status.found.join(', ') || 'none'}`);
    }
    e.target.value = '';
  });
}
