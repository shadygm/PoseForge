// Test demonstrating the actual RangeError with real COLMAP binary structure
class TestColmapReader {
  constructor(buffer) {
    this.view = new DataView(buffer);
    this.offset = 0;
    this.maxOffset = buffer.byteLength;
  }

  readUint64() { 
    if (this.offset + 8 > this.maxOffset) throw new RangeError('DataView offset out of bounds');
    const v = Number(this.view.getBigUint64(this.offset, true)); 
    this.offset += 8; 
    return v; 
  }
  
  readInt32() { 
    if (this.offset + 4 > this.maxOffset) throw new RangeError('DataView offset out of bounds');
    const v = this.view.getInt32(this.offset, true); 
    this.offset += 4; 
    return v; 
  }
  
  readFloat64() { 
    if (this.offset + 8 > this.maxOffset) throw new RangeError('DataView offset out of bounds');
    const v = this.view.getFloat64(this.offset, true); 
    this.offset += 8; 
    return v; 
  }
  
  readFloat64Array(n) { 
    if (this.offset + (n * 8) > this.maxOffset) throw new RangeError('DataView offset out of bounds');
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

  // Current (BROKEN) readCameras method - causes RangeError
  readCameras_BROKEN() {
    const numCameras = this.readUint64();
    const cameras = {};
    for (let i = 0; i < numCameras; i++) {
      const cameraId = this.readUint64();
      const modelId = this.readInt32();
      const width = this.readUint64();
      const height = this.readUint64();
      
      // BROKEN: Missing num_params read, but tries to read params anyway
      // This causes RangeError when real COLMAP files have num_params field
      const numParams = TestColmapReader.CAMERA_MODEL_PARAMS[modelId] ?? 4;
      
      // This will throw RangeError because we're reading past the expected end
      // since we skipped the num_params field that real COLMAP files contain
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

  // Fixed readCameras method - handles real COLMAP format
  readCameras_FIXED() {
    const numCameras = this.readUint64();
    const cameras = {};
    for (let i = 0; i < numCameras; i++) {
      const cameraId = this.readUint64();
      const modelId = this.readInt32();
      const width = this.readUint64();
      const height = this.readUint64();
      
      // FIXED: Read the num_params field that real COLMAP files contain
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

// Create a test buffer that simulates a REAL COLMAP binary file with num_params field
function createRealColmapCameraBin() {
  // Real COLMAP format includes num_params field:
  // 1. camera_id (uint64): 8 bytes
  // 2. model_id (int32): 4 bytes  
  // 3. width (uint64): 8 bytes
  // 4. height (uint64): 8 bytes
  // 5. num_params (uint64): 8 bytes <- MISSING in current code
  // 6. params (float64[num_params]): 8 bytes * numParams
  
  const modelId = 1; // PINHOLE (1 parameter)
  const width = 640;
  const height = 480;
  const numParams = 1; // Actual number of parameters from binary
  const focalLength = 800.0;
  
  // Total size: 8+4+8+8+8+8 = 44 bytes
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);
  let offset = 0;
  
  console.log(`Creating REAL COLMAP binary: 44 bytes`);
  
  // Real COLMAP structure with num_params field
  view.setBigUint64(offset, BigInt(1), true); offset += 8; // camera_id
  view.setInt32(offset, modelId, true); offset += 4;      // model_id
  view.setBigUint64(offset, BigInt(width), true); offset += 8; // width
  view.setBigUint64(offset, BigInt(height), true); offset += 8; // height
  view.setBigUint64(offset, BigInt(numParams), true); offset += 8; // num_params
  view.setFloat64(offset, focalLength, true); offset += 8; // params
  
  console.log(`Expected end offset: ${offset}`);
  return buffer;
}

console.log('=== Testing RangeError issue with real COLMAP binary ===');
const realBuffer = createRealColmapCameraBin();

console.log('\n=== Testing BROKEN version (should throw RangeError) ===');
try {
  const reader1 = new TestColmapReader(realBuffer);
  const cameras1 = reader1.readCameras_BROKEN();
  console.log('ERROR: Should have thrown RangeError but didn\'t!');
} catch (error) {
  console.log('SUCCESS: Got expected RangeError:', error.message);
}

console.log('\n=== Testing FIXED version (should succeed) ===');
try {
  const reader2 = new TestColmapReader(realBuffer);
  const cameras2 = reader2.readCameras_FIXED();
  console.log('SUCCESS: Parsed camera:', JSON.stringify(cameras2[1], null, 2));
} catch (error) {
  console.error('Error with FIXED version:', error.message);
}

console.log('\n=== Test with incomplete buffer (simulating truncated file) ===');
const incompleteBuffer = realBuffer.slice(0, 36); // Missing num_params and params
console.log(`Incomplete buffer: ${incompleteBuffer.byteLength} bytes`);
try {
  const reader3 = new TestColmapReader(incompleteBuffer);
  const cameras3 = reader3.readCameras_BROKEN();
  console.log('ERROR: Should have thrown RangeError but didn\'t!');
} catch (error) {
  console.log('SUCCESS: Got expected RangeError with incomplete buffer:', error.message);
}