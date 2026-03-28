/**
 * @module trajectory-builder
 * Builds a trajectory line through sorted camera positions.
 */

import * as THREE from 'three';

/**
 * Build a line connecting camera positions sorted by image name.
 * @param {Object} images - COLMAP images dict
 * @param {Function} quatFn - quaternion converter
 * @param {Function} posFn - position converter (colmapToThree)
 * @returns {THREE.Line|null}
 */
export function buildTrajectory(images, quatFn, posFn) {
  const imgEntries = Object.values(images);
  if (imgEntries.length === 0) return null;

  const sorted = [...imgEntries].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true })
  );

  const positions = sorted.map(img => {
    const q = quatFn(img.q);
    const t = posFn(img.t);
    const invQ = q.clone().invert();
    return t.clone().applyQuaternion(invQ).negate();
  });

  const geometry = new THREE.BufferGeometry().setFromPoints(positions);
  const material = new THREE.LineBasicMaterial({
    color: 0x22d3ee, opacity: 0.6, transparent: true,
  });

  return new THREE.Line(geometry, material);
}
