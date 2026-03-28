// COLMAP binary format parser
// Supports cameras.bin, images.bin, points3D.bin

class ColmapReader {
  constructor(buffer) {
    this.view = new DataView(buffer);
    this.offset = 0;
  }

  readUint8() { const v = this.view.getUint8(this.offset); this.offset += 1; return v; }
  readUint64() { const v = Number(this.view.getBigUint64(this.offset, true)); this.offset += 8; return v; }
  readInt32() { const v = this.view.getInt32(this.offset, true); this.offset += 4; return v; }
  readFloat64() { const v = this.view.getFloat64(this.offset, true); this.offset += 8; return v; }
  readFloat64Array(n) { const arr = []; for (let i = 0; i < n; i++) arr.push(this.readFloat64()); return arr; }

  readNullTerminatedString() {
    const chars = [];
    while (this.offset < this.view.byteLength) {
      const c = this.readUint8();
      if (c === 0) break;
      chars.push(String.fromCharCode(c));
    }
    return chars.join('');
  }

  static CAMERA_MODEL_PARAMS = {
    0: 0, // Simple pinhole
    1: 1, // Pinhole
    2: 3, // Simple radial
    3: 4, // Radial
    4: 5, // OpenCV
  };

  static CAMERA_MODEL_NAMES = {
    0: 'SIMPLE_PINHOLE',
    1: 'PINHOLE',
    2: 'SIMPLE_RADIAL',
    3: 'RADIAL',
    4: 'OPENCV',
  };

  readCameras() {
    const numCameras = this.readUint64();
    const cameras = {};
    for (let i = 0; i < numCameras; i++) {
      const cameraId = this.readUint64();
      const modelId = this.readInt32();
      const width = this.readUint64();
      const height = this.readUint64();
      
      // FIX: Read num_params field from COLMAP binary (CRITICAL)
      // Real COLMAP format includes num_params field after height
      const numParams = this.readUint64();
      
      const params = this.readFloat64Array(numParams);
      cameras[cameraId] = {
        id: cameraId,
        modelId,
        modelName: ColmapReader.CAMERA_MODEL_NAMES[modelId] ?? `UNKNOWN_${modelId}`,
        width, height, params
      };
    }
    return cameras;
  }

  readImages() {
    const numImages = this.readUint64();
    const images = {};
    for (let i = 0; i < numImages; i++) {
      const imageId = this.readUint64();
      const qw = this.readFloat64();
      const qx = this.readFloat64();
      const qy = this.readFloat64();
      const qz = this.readFloat64();
      const tx = this.readFloat64();
      const ty = this.readFloat64();
      const tz = this.readFloat64();
      const cameraId = this.readUint64();
      const name = this.readNullTerminatedString();

      // Read 2D points
      const numPoints2D = this.readUint64();
      const points2D = [];
      for (let j = 0; j < numPoints2D; j++) {
        const x = this.readFloat64();
        const y = this.readFloat64();
        const point3DId = this.readInt64(); // can be -1 if no correspondence
        points2D.push({ x, y, point3DId });
      }

      images[imageId] = {
        id: imageId,
        q: { w: qw, x: qx, y: qy, z: qz },
        t: { x: tx, y: ty, z: tz },
        cameraId,
        name,
        points2D
      };
    }
    return images;
  }

  readInt64() {
    const v = Number(this.view.getBigInt64(this.offset, true));
    this.offset += 8;
    return v;
  }

  readPoints3D() {
    const numPoints = this.readUint64();
    const points = {};
    for (let i = 0; i < numPoints; i++) {
      const pointId = this.readUint64();
      const x = this.readFloat64();
      const y = this.readFloat64();
      const z = this.readFloat64();
      const r = this.readUint8();
      const g = this.readUint8();
      const b = this.readUint8();
      // COLMAP binary format: RGB is 3×uint8 with NO padding before float64 error.
      // The extra readUint8() previously here was incorrect and shifted all
      // subsequent reads by 1 byte, corrupting point positions and colors.
      const error = this.readFloat64();

      const trackLength = this.readUint64();
      const track = [];
      for (let j = 0; j < trackLength; j++) {
        // COLMAP track format: pairs of uint32 (image_id, point2D_idx)
        const imageId = this.view.getUint32(this.offset, true); this.offset += 4;
        const point2DIdx = this.view.getUint32(this.offset, true); this.offset += 4;
        track.push({ imageId, point2DIdx });
      }

      points[pointId] = { id: pointId, x, y, z, r, g, b, error, track };
    }
    return points;
  }
}

async function readColmapBinaryFile(file) {
  const buffer = await file.arrayBuffer();
  return new ColmapReader(buffer);
}

export { ColmapReader, readColmapBinaryFile };
window.ColmapReader = ColmapReader;
window.readColmapBinaryFile = readColmapBinaryFile;
