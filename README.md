# face-track

Real-time face detection and 68-point landmark tracking using TensorFlow.js. Ships with pre-trained model weights — no external downloads needed.

## Install

```bash
npm install face-track @tensorflow/tfjs
```

`@tensorflow/tfjs` is a peer dependency.

## Usage

```js
import * as tf from '@tensorflow/tfjs'
import { FaceTracker, calculateFaceOrientation, drawResults } from 'face-track'

const tracker = new FaceTracker()
await tracker.loadModels('/models/')

// Detect faces + landmarks from a video element
const results = await tracker.detectFacesWithLandmarks(videoElement)

for (const { detection, landmarks } of results) {
  console.log('Box:', detection.box)        // { x, y, width, height }
  console.log('Landmarks:', landmarks)       // 68 points with { x, y }

  const orientation = calculateFaceOrientation(landmarks)
  console.log('Yaw/Pitch/Roll:', orientation) // { yaw, pitch, roll } in degrees
}

// Draw results on a canvas
const ctx = canvas.getContext('2d')
drawResults(ctx, results, canvas.width, canvas.height)
```

## API

| Export | Description |
|---|---|
| `FaceTracker` | High-level class: load models, detect faces + landmarks |
| `calculateFaceOrientation(landmarks)` | Estimate yaw/pitch/roll from 68 landmarks |
| `drawResults(ctx, results, w, h)` | Draw bounding boxes + landmarks on canvas |
| `drawLandmarkPoints(ctx, landmarks)` | Draw landmark dots |
| `drawLandmarkConnections(ctx, landmarks)` | Draw landmark group connections |
| `FACE_LANDMARKS` | Named index groups (JAW, LEFT_EYE, NOSE_TIP, etc.) |
| `TinyFaceDetector` | Low-level face detection network |
| `FaceLandmark68Net` | Low-level landmark network |
| `postProcessLandmarks(raw, box, w, h)` | Convert raw network output to pixel coordinates |

## Models

Pre-trained weights are in the `models/` directory. Pass the serving URL to `loadModels()`:

```js
// Serve models from your public directory
await tracker.loadModels('/models/')

// Or from a CDN/custom path
await tracker.loadModels('https://cdn.example.com/face-track-models/')
```

## Demo

See `examples/react-demo/` for a working React app:

```bash
cd examples/react-demo
npm install
npm run dev
```

## License

MIT
