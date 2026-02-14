import { describe, it, expect } from 'vitest'
import { calculateFaceOrientation } from './FaceTracker.js'

describe('calculateFaceOrientation', () => {
  it('returns zeros for null landmarks', () => {
    expect(calculateFaceOrientation(null)).toEqual({ yaw: 0, pitch: 0, roll: 0 })
  })

  it('returns zeros for insufficient landmarks', () => {
    const landmarks = Array.from({ length: 30 }, () => ({ x: 0, y: 0 }))
    expect(calculateFaceOrientation(landmarks)).toEqual({ yaw: 0, pitch: 0, roll: 0 })
  })

  it('zero yaw when nose centered between eyes', () => {
    const landmarks = Array.from({ length: 68 }, () => ({ x: 0, y: 0 }))
    landmarks[36] = { x: 100, y: 200 } // left eye
    landmarks[45] = { x: 200, y: 200 } // right eye
    landmarks[30] = { x: 150, y: 250 } // nose tip centered
    const result = calculateFaceOrientation(landmarks)
    expect(result.yaw).toBeCloseTo(0, 5)
  })

  it('positive yaw when nose is left of eye midpoint', () => {
    const landmarks = Array.from({ length: 68 }, () => ({ x: 0, y: 0 }))
    landmarks[36] = { x: 100, y: 200 }
    landmarks[45] = { x: 200, y: 200 }
    landmarks[30] = { x: 130, y: 250 } // nose left of center (150)
    const result = calculateFaceOrientation(landmarks)
    // hOffset = ((100+200)/2) - 130 = 150 - 130 = 20
    // eyeDist = 100
    // yaw = (20/100) * 30 = 6
    expect(result.yaw).toBeCloseTo(6, 5)
  })

  it('negative yaw when nose is right of eye midpoint', () => {
    const landmarks = Array.from({ length: 68 }, () => ({ x: 0, y: 0 }))
    landmarks[36] = { x: 100, y: 200 }
    landmarks[45] = { x: 200, y: 200 }
    landmarks[30] = { x: 170, y: 250 } // nose right of center (150)
    const result = calculateFaceOrientation(landmarks)
    expect(result.yaw).toBeLessThan(0)
  })

  it('positive pitch when nose below eyes', () => {
    const landmarks = Array.from({ length: 68 }, () => ({ x: 0, y: 0 }))
    landmarks[36] = { x: 100, y: 200 }
    landmarks[45] = { x: 200, y: 200 }
    landmarks[30] = { x: 150, y: 260 }
    const result = calculateFaceOrientation(landmarks)
    // vOffset = 260 - 200 = 60, pitch = (60/100)*30 = 18
    expect(result.pitch).toBeCloseTo(18, 5)
  })

  it('zero roll when eyes level', () => {
    const landmarks = Array.from({ length: 68 }, () => ({ x: 0, y: 0 }))
    landmarks[36] = { x: 100, y: 200 }
    landmarks[45] = { x: 200, y: 200 }
    landmarks[30] = { x: 150, y: 250 }
    const result = calculateFaceOrientation(landmarks)
    expect(result.roll).toBeCloseTo(0, 5)
  })

  it('non-zero roll when eyes tilted', () => {
    const landmarks = Array.from({ length: 68 }, () => ({ x: 0, y: 0 }))
    landmarks[36] = { x: 100, y: 200 }
    landmarks[45] = { x: 200, y: 220 } // right eye lower
    landmarks[30] = { x: 150, y: 250 }
    const result = calculateFaceOrientation(landmarks)
    // atan2(20, 100) ≈ 11.31°
    expect(result.roll).toBeCloseTo(Math.atan2(20, 100) * (180 / Math.PI), 2)
  })

  it('exact value: yaw=6 for known offset', () => {
    const landmarks = Array.from({ length: 68 }, () => ({ x: 0, y: 0 }))
    landmarks[36] = { x: 100, y: 200 }
    landmarks[45] = { x: 200, y: 200 }
    landmarks[30] = { x: 130, y: 200 }
    const result = calculateFaceOrientation(landmarks)
    expect(result.yaw).toBeCloseTo(6, 5)
  })
})
