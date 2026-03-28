// Updated camera parsing with improved error handling and support for various COLMAP formats
class CameraParser {
    constructor() {
        this.supportedFormats = ['.bin', '.txt'];
        this.errors = [];
    }

    parseCameraData(data, format = '.bin') {
        try {
            if (format === '.bin') {
                return this.parseBinaryFormat(data);
            } else if (format === '.txt') {
                return this.parseTextFormat(data);
            } else {
                throw new Error(`Unsupported format: ${format}`);
            }
        } catch (error) {
            this.errors.push(error.message);
            console.error('Camera parsing error:', error);
            return null;
        }
    }

    parseBinaryFormat(data) {
        // Improved binary parsing with better error handling
        if (!data || data.length < 24) {
            throw new Error('Invalid binary camera data: too short');
        }

        const view = new DataView(data);
        const cameras = [];
        
        for (let i = 0; i < data.byteLength; ) {
            try {
                const camera = {
                    id: view.getUint32(i, true),
                    focal_length: view.getFloat64(i + 4, true),
                    k1: view.getFloat64(i + 12, true),
                    k2: view.getFloat64(i + 20, true)
                };
                
                cameras.push(camera);
                i += 24; // Move to next camera
            } catch (e) {
                throw new Error(`Error parsing camera at position ${i}: ${e.message}`);
            }
        }
        
        return cameras;
    }

    parseTextFormat(data) {
        // Improved text parsing with validation
        const lines = data.split('\n').filter(line => line.trim() && !line.startsWith('#'));
        const cameras = [];
        
        for (const line of lines) {
            try {
                const parts = line.trim().split(/\s+/);
                if (parts.length < 5) {
                    throw new Error(`Invalid camera line: ${line}`);
                }
                
                const camera = {
                    id: parseInt(parts[0]),
                    focal_length: parseFloat(parts[1]),
                    k1: parseFloat(parts[2]),
                    k2: parseFloat(parts[3]),
                    width: parseInt(parts[4]) || 1920,
                    height: parseInt(parts[5]) || 1080
                };
                
                cameras.push(camera);
            } catch (e) {
                throw new Error(`Error parsing text camera line "${line}": ${e.message}`);
            }
        }
        
        return cameras;
    }

    validateCamera(camera) {
        const errors = [];
        
        if (!camera.id || camera.id <= 0) {
            errors.push('Invalid camera ID');
        }
        
        if (!camera.focal_length || camera.focal_length <= 0) {
            errors.push('Invalid focal length');
        }
        
        if (camera.k1 !== undefined && isNaN(camera.k1)) {
            errors.push('Invalid k1 value');
        }
        
        if (camera.k2 !== undefined && isNaN(camera.k2)) {
            errors.push('Invalid k2 value');
        }
        
        return errors;
    }
}

// Export for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CameraParser;
} else if (typeof window !== 'undefined') {
    window.CameraParser = CameraParser;
}
