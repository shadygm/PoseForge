// Test for camera.bin parsing issue
// According to COLMAP binary format specification:
// Each camera record should be:
// 1. camera_id (uint64)
// 2. model_id (int32)
// 3. width (uint64)
// 4. height (uint64)
// 5. num_params (uint64) - THIS IS MISSING in current code!
// 6. params (float64[num_params])

// Simple reproduction of the parsing logic
class TestColmapReader {
  constructor(buffer) {
    this.view = new DataView(buffer);
    this.offset = 0;
  }

  readUint64() { 
    const v = Number(this.view.getBigUint64(this.offset, true)); 
    this.offset += 8; 
    return v; 
  }
  
  readInt32() { 
    const v = this.view.getInt32(this.offset, true); 
    this.offset += 4; 
    return v; 
  }
  
  readFloat64() { 
    const v = this.view.getFloat64(this.offset, true); 
    this.offset += 8; 
    return v; 
  }
  
  readFloat64Array(n) { 
    const arr = []; 
    for (let i = 0; i < n; i++) arr.push(this.readFloat64()); 
    return arr; 
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

  // Current (BROKEN) readCameras method
  readCameras_BROKEN() {
    const numCameras = this.readUint64();
    const cameras = {};
    for (let i = 0; i < numCameras; i++) {
      const cameraId = this.readUint64();
      const modelId = this.readInt32();
      const width = this.readUint64();
      const height = this.readUint64();
      const numParams = TestColmapReader.CAMERA_MODEL_PARAMS[modelId] ?? 4;
      const params = this.readFloat64Array(numParams);
      cameras[cameraId] = {
        id: cameraId,
        modelId,
        modelName: TestColmapReader.CAMERA_MODEL_NAMES[modelId] ?? `UNKNOWN_${modelId}`,
        width, height, params
      };
    }
    return cameras;
  }

  // Fixed readCameras method
  readCameras_FIXED() {
    const numCameras = this.readUint64();
    const cameras = {};
    for (let i = 0; i < numCameras; i++) {
      const cameraId = this.readUint64();
      const modelId = this.readInt32();
      const width = this.readUint64();
      const height = this.readUint64();
      
      // Read the actual num_params from the binary file (CRITICAL FIX)
      const numParams = this.readUint64();
      
      const params = this.readFloat64Array(numParams);
      cameras[cameraId] = {
        id: cameraId,
        modelId,
        modelName: TestColmapReader.CAMERA_MODEL_NAMES[modelId] ?? `UNKNOWN_${modelId}`,
        width, height, params
      };
    }
    return cameras;
  }
}

// Create a minimal valid camera.bin buffer
function createTestCameraBin() {
  // Simple pinhole camera: 1 parameter (focal length)
  const modelId = 1; // PINHOLE
  const width = 640;
  const height = 480;
  const numParams = 1;
  const params = [800.0]; // focal length
  
  const buffer = new ArrayBuffer(
    8 + 4 + 8 + 8 + 8 + (numParams * 8) // camera_id + model_id + width + height + num_params + params
  );
  
  const view = new DataView(buffer);
  let offset = 0;
  
  // camera_id
  view.setBigUint64(offset, BigInt(1), true); offset += 8;
  // model_id  
  view.setInt32(offset, modelId, true); offset += 4;
  // width
  view.setBigUint64(offset, BigInt(width), true); offset += 8;
  // height
  view.setBigUint64(offset, BigInt(height), true); offset += 8;
  // num_params - THIS IS MISSING in current code!
  view.setBigUint64(offset, BigInt(numParams), true); offset += 8;
  // params
  for (let i = 0; i < numParams; i++) {
    view.setFloat64(offset, params[i], true);
    offset += 8;
  }
  
  return buffer;
}

console.log('Testing camera.bin parsing...');
const testBuffer = createTestCameraBin();

console.log('\n=== Testing BROKEN version (should fail) ===');
try {
  const reader1 = new TestColmapReader(testBuffer);
  const cameras1 = reader1.readCameras_BROKEN();
  console.log('Unexpected success! Parsed camera:', cameras1[1]);
} catch (error) {
  console.error('Error parsing with BROKEN version:', error.message);
}

console.log('\n=== Testing FIXED version (should succeed) ===');
try {
  const reader2 = new TestColmapReader(testBuffer);
  const cameras2 = reader2.readCameras_FIXED();
  console.log('Success! Parsed camera:', cameras2[1]);
} catch (error) {
  console.error('Error parsing with FIXED version:', error.message);
}