# Face Tracking Implementation

This project implements real-time face landmark detection using React and TensorFlow.js, inspired by face-api.js functionality.

## Features

- **Real-time Face Detection**: Uses webcam to detect faces in real-time
- **68-Point Landmark Detection**: Tracks 68 facial landmarks including:
  - Jaw line (17 points)
  - Eyebrows (10 points)
  - Nose (9 points)
  - Eyes (12 points)
  - Lips (20 points)
- **Face Orientation**: Calculates yaw, pitch, and roll angles
- **Visualization**: Real-time overlay of landmarks on video feed

## Architecture

### Core Components

1. **FaceDetector Class** (`src/utils/faceDetection.js`)
   - Model loading and management
   - Face detection pipeline
   - Landmark extraction
   - Face orientation calculation

2. **FaceTracker Component** (`src/components/FaceTracker.jsx`)
   - Camera stream management
   - Real-time tracking loop
   - UI state management
   - Canvas visualization

3. **Landmark Visualization**
   - Canvas overlay for real-time drawing
   - Color-coded landmark points and connections

### Key Implementation Details

#### Face Landmark Structure
```javascript
export const FACE_LANDMARKS = {
  JAW: Array.from({ length: 17 }, (_, i) => i),
  RIGHT_EYEBROW: Array.from({ length: 5 }, (_, i) => i + 17),
  LEFT_EYEBROW: Array.from({ length: 5 }, (_, i) => i + 22),
  NOSE_BRIDGE: Array.from({ length: 4 }, (_, i) => i + 27),
  NOSE_TIP: Array.from({ length: 5 }, (_, i) => i + 31),
  RIGHT_EYE: Array.from({ length: 6 }, (_, i) => i + 36),
  LEFT_EYE: Array.from({ length: 6 }, (_, i) => i + 42),
  OUTER_LIPS: Array.from({ length: 12 }, (_, i) => i + 48),
  INNER_LIPS: Array.from({ length: 8 }, (_, i) => i + 60)
};
```

#### Real-time Tracking Pipeline
1. **Camera Access**: Request user camera permissions
2. **Frame Processing**: Process video frames at 60fps
3. **Face Detection**: Detect face bounding boxes
4. **Landmark Extraction**: Extract 68-point landmarks
5. **Orientation Calculation**: Compute face angles
6. **Visualization**: Draw landmarks on canvas overlay

#### Face Orientation Calculation
- **Yaw**: Horizontal head rotation (left/right)
- **Pitch**: Vertical head rotation (up/down)
- **Roll**: Head tilt (side to side)

## Usage

1. **Start Development Server**:
   ```bash
   npm run dev
   ```

2. **Access Application**: Open `http://localhost:5173/`

3. **Start Tracking**: Click "Start Face Tracking" button

4. **Grant Camera Permissions**: Allow camera access when prompted

## Technical Implementation

### Dependencies
- **React 19**: Modern React with hooks
- **TensorFlow.js**: Machine learning runtime
- **Vite**: Fast development build tool

### Performance Considerations
- Uses `requestAnimationFrame` for smooth 60fps tracking
- Canvas-based visualization for efficient rendering
- TensorFlow.js optimized for browser inference

### Extension Points

#### Model Integration
Currently uses mock data for demonstration. To integrate real models:

1. **Face Detection Model**: Replace mock detection with TensorFlow.js model
2. **Landmark Model**: Implement 68-point landmark detection network
3. **Model Weights**: Load pre-trained weights from external source

#### Additional Features
- Face expression recognition
- Age and gender estimation
- Multiple face tracking
- Export landmark data

## Browser Compatibility

- Modern browsers with WebRTC support
- Camera access permissions required
- TensorFlow.js WebGL backend for GPU acceleration

## Future Enhancements

1. **Real Model Integration**: Replace mock data with actual TensorFlow.js models
2. **Performance Optimization**: Implement web workers for background processing
3. **Mobile Support**: Optimize for mobile devices and touch interfaces
4. **Data Export**: Export landmark data for analysis
5. **Custom Models**: Support for custom landmark detection models