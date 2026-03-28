const CameraParser = require('./fix-camera-parsing.js');

const fs = require('fs');
const path = require('path');

// Test with mock data
function testCameraParser() {
    const parser = new CameraParser();
    
    // Test binary format
    const binaryData = new ArrayBuffer(48);
    const view = new DataView(binaryData);
    
    // Camera 1
    view.setUint32(0, 1, true);
    view.setFloat64(4, 500.0, true);
    view.setFloat64(12, 0.01, true);
    view.setFloat64(20, 0.001, true);
    
    // Camera 2
    view.setUint32(24, 2, true);
    view.setFloat64(28, 600.0, true);
    view.setFloat64(36, 0.02, true);
    view.setFloat64(44, 0.002, true);
    
    const cameras = parser.parseCameraData(binaryData, '.bin');
    console.log('Binary format test:', cameras);
    
    // Test text format
    const textData = `1 500.0 0.01 0.001 1920 1080
2 600.0 0.02 0.002 1920 1080`;
    
    const textCameras = parser.parseCameraData(textData, '.txt');
    console.log('Text format test:', textCameras);
    
    // Test validation
    console.log('Validation test:', parser.validateCamera(cameras[0]));
}

if (require.main === module) {
    testCameraParser();
}

module.exports = { testCameraParser };
