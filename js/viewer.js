/**
 * @module viewer
 * PoseForgeViewer — Three.js scene setup, animation loop, and camera helpers.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildCameraFrustums } from './frustum-builder.js';
import { buildTrajectory } from './trajectory-builder.js';
import { computePointColors } from './point-coloring.js';

class PoseForgeViewer {
  constructor(container) {
    this.container = container;
    this.cameras = {};
    this.images = {};
    this.points = {};
    this.pointArray = [];
    this.cameraMeshes = [];
    this.pointCloud = null;
    this.frustumGroup = new THREE.Group();
    this.pointGroup = new THREE.Group();
    this.trajectoryGroup = new THREE.Group();
    this.gridHelper = null;
    this.gridVisible = true;
    this.autoRotating = false;
    this.onCameraClick = null;
    this._currentColorMode = 'rgb';
    this._currentPointSize = 0.04;

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);

    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.01, 10000);
    this.camera.position.set(0, 5, 10);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 1.5;

    this.gridHelper = new THREE.GridHelper(100, 50, 0x222222, 0x111111);
    this.scene.add(this.gridHelper);
    this.scene.add(this.frustumGroup);
    this.scene.add(this.pointGroup);
    this.scene.add(this.trajectoryGroup);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 7);
    this.scene.add(dir);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));
    window.addEventListener('resize', () => this.onResize());
    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  onClick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.cameraMeshes);
    if (intersects.length > 0) {
      const id = intersects[0].object.userData.imageId;
      if (id !== undefined && this.onCameraClick) this.onCameraClick(id);
    }
  }

  /** Convert raw COLMAP quaternion (world-to-camera) to THREE.Quaternion. */
  quaternionFromColmap(q) {
    return new THREE.Quaternion(q.x, q.y, q.z, q.w);
  }

  /**
   * Convert a COLMAP world-space position to Three.js world space.
   *
   * COLMAP uses OpenCV convention: X right, Y down, Z forward (right-handed).
   * Three.js uses:                 X right, Y up,   Z backward (right-handed).
   *
   * The basis change is a 180° rotation around the X axis:
   *   x' =  x,  y' = -y,  z' = -z
   */
  colmapToThree(pos) {
    return new THREE.Vector3(pos.x, -pos.y, -pos.z);
  }

  /**
   * Convert a COLMAP world-to-camera quaternion to a Three.js camera-to-world quaternion.
   *
   * Steps:
   *   1. Invert to get camera-to-world rotation in COLMAP space.
   *   2. Apply the X-axis 180° basis change: multiply by Rx(180°) = (1, 0, 0, 0) on the left.
   *      Rx(180°) as quaternion = (sin90°, 0, 0, cos90°) = (1, 0, 0, 0) — i.e. pure i quaternion.
   *      Left-multiplying flips Y and Z axes of the rotation.
   */
  colmapQuatToThree(q) {
    // World-to-camera quaternion from COLMAP
    const wcq = new THREE.Quaternion(q.x, q.y, q.z, q.w);
    // Invert → camera-to-world in COLMAP space
    const cwq = wcq.clone().invert();
    // Basis change: 180° around X  →  (qx, qy, qz, qw) → (qw, qz, -qy, -qx) ... simplified:
    // Rx180 = quaternion(1, 0, 0, 0) (pure i)
    const rx180 = new THREE.Quaternion(1, 0, 0, 0);
    return rx180.multiply(cwq);
  }

  /** Clear all scene data and load new COLMAP data. */
  loadImageData(cameras, images, points) {
    this.cameras = cameras;
    this.images = images;
    this.points = points;
    this.pointArray = Object.values(points);
    this.clearScene();

    this._buildPointCloud(this.pointArray, this._currentColorMode);
    this._buildCameraFrustums('frustum');

    const traj = buildTrajectory(images, this.colmapQuatToThree.bind(this), this.colmapToThree.bind(this));
    if (traj) this.trajectoryGroup.add(traj);

    this.fitView();

    // Start at the first image view
    const firstImageId = Object.keys(images).sort((a, b) => Number(a) - Number(b))[0];
    if (firstImageId) {
      this.jumpToCamera(Number(firstImageId));
    }
  }

  _buildPointCloud(pointArray, colorMode) {
    this.pointGroup.clear();
    this.pointCloud = null;
    if (pointArray.length === 0) return;

    const positions = new Float32Array(pointArray.length * 3);
    const colorArr = computePointColors(pointArray, colorMode);

    pointArray.forEach((p, i) => {
      const tp = this.colmapToThree(p);
      positions[i * 3] = tp.x;
      positions[i * 3 + 1] = tp.y;
      positions[i * 3 + 2] = tp.z;
    });

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colorArr, 3));

    const mat = new THREE.PointsMaterial({
      size: this._currentPointSize, vertexColors: true, sizeAttenuation: true,
    });
    this.pointCloud = new THREE.Points(geom, mat);
    this.pointGroup.add(this.pointCloud);
  }

  _buildCameraFrustums(mode) {
    this.frustumGroup.clear();
    this.cameraMeshes.forEach(m => this.scene.remove(m));
    this.cameraMeshes = [];
    if (Object.keys(this.images).length === 0) return;

    const { group, hitboxes } = buildCameraFrustums(
      this.cameras, this.images, this.colmapQuatToThree.bind(this), this.colmapToThree.bind(this), mode
    );
    this.frustumGroup.add(group);
    this.cameraMeshes = hitboxes;
    hitboxes.forEach(m => this.scene.add(m));
  }

  clearScene() {
    this.frustumGroup.clear();
    this.pointGroup.clear();
    this.trajectoryGroup.clear();
    this.cameraMeshes.forEach(m => this.scene.remove(m));
    this.cameraMeshes = [];
    this.pointCloud = null;
  }

  fitView() {
    const box = new THREE.Box3();
    this.frustumGroup.traverse(c => { if (c.isMesh) box.expandByObject(c); });
    this.pointGroup.traverse(c => { if (c.isPoints) box.expandByObject(c); });
    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = maxDim * 1.5;

    this.camera.position.set(center.x + dist * 0.5, center.y + dist * 0.5, center.z + dist);
    this.controls.target.copy(center);
    this.camera.near = maxDim * 0.0001;
    this.camera.far = maxDim * 200;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  jumpToCamera(imageId) {
    const img = this.images[imageId];
    if (!img) return;

    // colmapQuatToThree returns camera-to-world quaternion
    const camToWorld = this.colmapQuatToThree(img.q);
    const t = this.colmapToThree(img.t);
    const worldToCam = camToWorld.clone().invert();
    const pos = t.clone().applyQuaternion(worldToCam).negate();
    // Camera forward in Three.js is -Z; rotate to world space using camera-to-world
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camToWorld);

    this.camera.position.copy(pos);
    this.controls.target.copy(pos.clone().add(forward.clone().multiplyScalar(2)));
    this.controls.update();
  }

  togglePoints(v)   { this.pointGroup.visible = v; }
  toggleCameras(v)  { this.frustumGroup.visible = v; this.cameraMeshes.forEach(m => m.visible = v); }
  toggleTrajectory(v) { this.trajectoryGroup.visible = v; }
  setPointSize(s)   { this._currentPointSize = s; if (this.pointCloud) this.pointCloud.material.size = s; }
  setPointOpacity(o) { if (this.pointCloud) this.pointCloud.material.opacity = o; this.pointCloud.material.transparent = o < 1; }

  toggleGrid() {
    this.gridVisible = !this.gridVisible;
    this.gridHelper.visible = this.gridVisible;
  }

  toggleAutoRotate() {
    this.autoRotating = !this.autoRotating;
    this.controls.autoRotate = this.autoRotating;
  }

  setAxisView(direction) {
    const box = new THREE.Box3();
    this.pointGroup.traverse(c => { if (c.isPoints) box.expandByObject(c); });
    this.frustumGroup.traverse(c => { if (c.isMesh) box.expandByObject(c); });
    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const dist = Math.max(size.x, size.y, size.z) * 1.2;

    const dirs = {
      front: [dist, 0, 0], back: [-dist, 0, 0],
      left: [0, 0, dist], right: [0, 0, -dist],
      top: [0, dist, 0], bottom: [0, -dist, 0],
    };
    const d = dirs[direction] || dirs.front;
    this.camera.position.set(center.x + d[0], center.y + d[1], center.z + d[2]);
    this.controls.target.copy(center);
    this.controls.update();
  }

  applyFiltersAndColors(filteredPoints, colorMode, cameraMode) {
    this._currentColorMode = colorMode;
    this._buildPointCloud(filteredPoints, colorMode);
    if (this.pointCloud) this.pointCloud.material.size = this._currentPointSize;
    this._buildCameraFrustums(cameraMode);
  }
}

window.PoseForgeViewer = PoseForgeViewer;
export { PoseForgeViewer };
