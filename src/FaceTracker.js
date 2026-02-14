import * as tf from '@tensorflow/tfjs'
import { TinyFaceDetector } from './TinyFaceDetector.js'
import { FaceLandmark68Net } from './FaceLandmark68Net.js'
import { drawResults } from './drawing.js'

export function calculateFaceOrientation(landmarks) {
  if (!landmarks || landmarks.length < 68) {
    return { yaw: 0, pitch: 0, roll: 0 }
  }

  const leftEye = landmarks[36]
  const rightEye = landmarks[45]
  const noseTip = landmarks[30]

  const eyeDist = Math.sqrt(
    (rightEye.x - leftEye.x) ** 2 + (rightEye.y - leftEye.y) ** 2
  )
  if (eyeDist === 0) return { yaw: 0, pitch: 0, roll: 0 }

  const hOffset = ((leftEye.x + rightEye.x) / 2) - noseTip.x
  const vOffset = noseTip.y - ((leftEye.y + rightEye.y) / 2)

  return {
    yaw: (hOffset / eyeDist) * 30,
    pitch: (vOffset / eyeDist) * 30,
    roll: Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI),
  }
}

export class FaceTracker {
  constructor() {
    this.faceDetector = new TinyFaceDetector()
    this.landmarkNet = new FaceLandmark68Net()
    this.isLoaded = false
  }

  async loadModels(baseUrl = '/models/') {
    try {
      await this.faceDetector.load(baseUrl)
      await this.landmarkNet.load(baseUrl)
      this.isLoaded = true
      return true
    } catch (error) {
      console.error('Failed to load models:', error)
      return false
    }
  }

  async detectFacesWithLandmarks(input, options) {
    if (!this.isLoaded) throw new Error('Models not loaded')

    const faces = await this.faceDetector.detect(input, options)
    if (faces.length === 0) return []

    const imgTensor = tf.browser.fromPixels(input)
    const results = []

    for (const face of faces) {
      const landmarks = await this.landmarkNet.detectLandmarks(imgTensor, face.box)
      results.push({ detection: face, landmarks })
    }

    imgTensor.dispose()
    return results
  }

  calculateFaceOrientation(landmarks) {
    return calculateFaceOrientation(landmarks)
  }

  drawResults(ctx, results, canvasWidth, canvasHeight) {
    return drawResults(ctx, results, canvasWidth, canvasHeight)
  }
}
