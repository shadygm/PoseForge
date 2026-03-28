/**
 * @module frustum-builder
 * Builds point cloud and camera frustum meshes for the PoseForge viewer.
 */

import * as THREE from 'three';

export function buildPointCloud(points, size = 0.02) {
  const pts = Object.values(points);
  if (pts.length === 0) return null;

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(pts.length * 3);
  const colors = new Float32Array(pts.length * 3);

  pts.forEach((p, i) => {
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;
    colors[i * 3] = p.r / 255;
    colors[i * 3 + 1] = p.g / 255;
    colors[i * 3 + 2] = p.b / 255;
  });

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  return new THREE.Points(geometry, new THREE.PointsMaterial({ size, vertexColors: true, sizeAttenuation: true }));
}

/**
 * Build camera visualization meshes.
 * @param {Function} quatFn - quaternion converter
 * @param {Function} posFn - position converter (colmapToThree)
 * @param {string} mode - 'frustum' | 'arrow' | 'imagePlane'
 */
export function buildCameraFrustums(cameras, images, quatFn, posFn, mode = 'frustum') {
  const group = new THREE.Group();
  const hitboxes = [];
  const imgEntries = Object.values(images);
  if (imgEntries.length === 0) return { group, hitboxes };

  for (const img of imgEntries) {
    const cam = cameras[img.cameraId];
    if (!cam) continue;

    const q = quatFn(img.q);
    const t = posFn(img.t);
    const invQ = q.clone().invert();
    const pos = t.clone().applyQuaternion(invQ).negate();

    let vis, hitbox;
    if (mode === 'arrow') {
      ({ vis, hitbox } = buildArrow(invQ, pos, img));
    } else if (mode === 'imagePlane') {
      ({ vis, hitbox } = buildImagePlane(invQ, pos, cam, img));
    } else {
      ({ vis, hitbox } = buildFrustum(invQ, pos, cam, img));
    }

    group.add(vis);
    hitboxes.push(hitbox);
  }

  return { group, hitboxes };
}

function computePose(invQ, t) {
  const q = invQ;
  const pos = t.clone().applyQuaternion(q).negate();
  return { q, pos };
}

function buildFrustum(invQ, pos, cam, img) {
  const focalLength = cam.params[0];
  const frustumLen = 0.3;
  const scale = frustumLen / focalLength;
  const w = cam.width * scale, h = cam.height * scale;

  const verts = new Float32Array([
    0, 0, 0, -w/2, -h/2, frustumLen, w/2, -h/2, frustumLen,
    w/2, h/2, frustumLen, -w/2, h/2, frustumLen,
  ]);
  const indices = [0,1,2, 0,2,3, 0,3,4, 0,4,1, 1,2,3, 1,3,4];

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  const mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({
    color: 0x6366f1, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false,
  }));
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geom),
    new THREE.LineBasicMaterial({ color: 0x818cf8 })
  );

  const fg = new THREE.Group();
  fg.add(mesh);
  fg.add(edges);
  fg.position.copy(pos);
  fg.quaternion.copy(invQ);
  fg.userData = { imageId: img.id, imageName: img.name };

  const hitbox = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.8, h * 0.8, frustumLen * 0.8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitbox.position.copy(pos);
  hitbox.quaternion.copy(invQ);
  hitbox.userData.imageId = img.id;

  return { vis: fg, hitbox };
}

function buildArrow(invQ, pos, img) {
  const len = 0.3;
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(invQ);
  const origin = pos.clone();
  const arrowHelper = new THREE.ArrowHelper(dir, origin, len, 0x6366f1, len * 0.2, len * 0.1);
  arrowHelper.userData = { imageId: img.id, imageName: img.name };

  const hitbox = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 6, 6),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitbox.position.copy(pos);
  hitbox.userData.imageId = img.id;

  return { vis: arrowHelper, hitbox };
}

function buildImagePlane(invQ, pos, cam, img) {
  const focalLength = cam.params[0];
  const scale = 0.3 / focalLength;
  const w = cam.width * scale, h = cam.height * scale;

  const geom = new THREE.PlaneGeometry(w, h);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x6366f1, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
  });
  const plane = new THREE.Mesh(geom, mat);
  plane.position.copy(pos);
  plane.quaternion.copy(invQ);
  plane.userData = { imageId: img.id, imageName: img.name };

  const hitbox = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitbox.position.copy(pos);
  hitbox.quaternion.copy(invQ);
  hitbox.userData.imageId = img.id;

  return { vis: plane, hitbox };
}
