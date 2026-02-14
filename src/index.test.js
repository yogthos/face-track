import { describe, it, expect } from 'vitest'
import * as faceTrack from './index.js'

describe('library exports', () => {
  it('exports FaceTracker', () => {
    expect(faceTrack.FaceTracker).toBeDefined()
    expect(typeof faceTrack.FaceTracker).toBe('function')
  })

  it('exports FACE_LANDMARKS', () => {
    expect(faceTrack.FACE_LANDMARKS).toBeDefined()
    expect(Object.keys(faceTrack.FACE_LANDMARKS)).toHaveLength(9)
  })

  it('exports calculateFaceOrientation', () => {
    expect(typeof faceTrack.calculateFaceOrientation).toBe('function')
  })

  it('exports drawing functions', () => {
    expect(typeof faceTrack.drawResults).toBe('function')
    expect(typeof faceTrack.drawLandmarkPoints).toBe('function')
    expect(typeof faceTrack.drawLandmarkConnections).toBe('function')
  })

  it('exports TinyFaceDetector', () => {
    expect(typeof faceTrack.TinyFaceDetector).toBe('function')
  })

  it('exports FaceLandmark68Net', () => {
    expect(typeof faceTrack.FaceLandmark68Net).toBe('function')
  })

  it('exports postProcessLandmarks', () => {
    expect(typeof faceTrack.postProcessLandmarks).toBe('function')
  })

  it('does NOT export internal utils', () => {
    expect(faceTrack.sigmoid).toBeUndefined()
    expect(faceTrack.iou).toBeUndefined()
    expect(faceTrack.nms).toBeUndefined()
  })
})
