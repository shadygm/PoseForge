// Test for camera.bin parsing issue
// According to COLMAP binary format specification:
// Each camera record should be:
// 1. camera_id (uint64)
// 2. model_id (int32)
// 3. width (uint64)
// 4. height (uint64)
// 5. num_params (uint64) - THIS IS MISSING in current code!
// 6. params (float64[num_params])

const { ColmapReader } = await import('./js/colmap-reader.js');

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
const reader = new ColmapReader(testBuffer);

try {
  const cameras = reader.readCameras();
  console.log('Success! Parsed camera:', cameras[1]);
} catch (error) {
  console.error('Error parsing camera.bin:', error);
  console.log('This confirms the DataView offset out of bounds issue');
}