/**
 * @module point-coloring
 * Computes vertex colors for point cloud based on selected mode.
 */

import * as THREE from 'three';

/** Heatmap: t ∈ [0,1] → blue→cyan→green→yellow→red */
function heatmapColor(t) {
  t = Math.max(0, Math.min(1, t));
  const r = t < 0.5 ? 0 : Math.min(1, (t - 0.5) * 2);
  const g = t < 0.25 ? t * 4 : t < 0.75 ? 1 : 1 - (t - 0.75) * 4;
  const b = t < 0.5 ? Math.min(1, (0.5 - t) * 2) : 0;
  return { r, g, b };
}

/**
 * Compute colors array for point cloud.
 * @param {Object[]} pointArray - array of COLMAP point objects
 * @param {string} mode - 'rgb' | 'error' | 'trackLength'
 * @returns {Float32Array} flat RGB array (length = pointArray.length * 3)
 */
export function computePointColors(pointArray, mode = 'rgb') {
  const colors = new Float32Array(pointArray.length * 3);

  if (mode === 'rgb') {
    for (let i = 0; i < pointArray.length; i++) {
      const p = pointArray[i];
      // Normalize 0–255 to 0–1; fall back to 0 if undefined
      const r = typeof p.r === 'number' ? p.r : 0;
      const g = typeof p.g === 'number' ? p.g : 0;
      const b = typeof p.b === 'number' ? p.b : 0;
      colors[i * 3] = r / 255;
      colors[i * 3 + 1] = g / 255;
      colors[i * 3 + 2] = b / 255;
    }
    return colors;
  }

  if (mode === 'error') {
    let maxErr = 0;
    for (const p of pointArray) maxErr = Math.max(maxErr, p.error);
    if (maxErr === 0) maxErr = 1;
    for (let i = 0; i < pointArray.length; i++) {
      const c = heatmapColor(pointArray[i].error / maxErr);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return colors;
  }

  if (mode === 'trackLength') {
    let maxTrack = 0;
    for (const p of pointArray) maxTrack = Math.max(maxTrack, p.track.length);
    if (maxTrack === 0) maxTrack = 1;
    for (let i = 0; i < pointArray.length; i++) {
      const c = heatmapColor(pointArray[i].track.length / maxTrack);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return colors;
  }

  return colors;
}

/** Color mode cycle order */
export const COLOR_MODES = ['rgb', 'error', 'trackLength'];
export const COLOR_MODE_LABELS = { rgb: 'RGB', error: 'Reprojection Error', trackLength: 'Track Length' };
