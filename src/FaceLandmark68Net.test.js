import { describe, it, expect } from 'vitest'
import { FaceLandmark68Net, postProcessLandmarks } from './FaceLandmark68Net.js'

describe('FaceLandmark68Net', () => {
  it('constructor initializes with null weights', () => {
    const net = new FaceLandmark68Net()
    expect(net.weights).toBeNull()
  })
})

describe('postProcessLandmarks', () => {
  function makeRawData(value) {
    const data = new Float32Array(136)
    for (let i = 0; i < 136; i++) {
      data[i] = value
    }
    return data
  }

  it('produces 68 landmarks with x,y', () => {
    const rawData = makeRawData(0.5)
    const box = { x: 100, y: 100, width: 100, height: 100 }
    const landmarks = postProcessLandmarks(rawData, box, 100, 100)
    expect(landmarks).toHaveLength(68)
    for (const pt of landmarks) {
      expect(pt).toHaveProperty('x')
      expect(pt).toHaveProperty('y')
    }
  })

  it('square crop: raw 0.5 maps to center of box', () => {
    const rawData = makeRawData(0.5)
    const box = { x: 100, y: 200, width: 80, height: 80 }
    const landmarks = postProcessLandmarks(rawData, box, 80, 80)
    // Center of box should be (140, 240)
    expect(landmarks[0].x).toBeCloseTo(140, 0)
    expect(landmarks[0].y).toBeCloseTo(240, 0)
  })

  it('raw 0 maps to top-left, raw 1 maps to bottom-right of box', () => {
    const box = { x: 50, y: 50, width: 100, height: 100 }

    const rawZero = makeRawData(0)
    const landmarksZero = postProcessLandmarks(rawZero, box, 100, 100)
    expect(landmarksZero[0].x).toBeCloseTo(50, 0)
    expect(landmarksZero[0].y).toBeCloseTo(50, 0)

    const rawOne = makeRawData(1)
    const landmarksOne = postProcessLandmarks(rawOne, box, 100, 100)
    expect(landmarksOne[0].x).toBeCloseTo(150, 0)
    expect(landmarksOne[0].y).toBeCloseTo(150, 0)
  })

  it('wide crop (w>h): vertical padding correction applied', () => {
    const rawData = makeRawData(0.5)
    const box = { x: 0, y: 0, width: 200, height: 100 }
    // Wide crop: maxDim=200, padY = (200-100)/2 = 50
    const landmarks = postProcessLandmarks(rawData, box, 200, 100)
    // Center should still be center of box
    expect(landmarks[0].x).toBeCloseTo(100, 0)
    expect(landmarks[0].y).toBeCloseTo(50, 0)
  })

  it('tall crop (h>w): horizontal padding correction applied', () => {
    const rawData = makeRawData(0.5)
    const box = { x: 0, y: 0, width: 100, height: 200 }
    // Tall crop: maxDim=200, padX = (200-100)/2 = 50
    const landmarks = postProcessLandmarks(rawData, box, 100, 200)
    // Center should still be center of box
    expect(landmarks[0].x).toBeCloseTo(50, 0)
    expect(landmarks[0].y).toBeCloseTo(100, 0)
  })
})
