import { describe, it, expect } from 'vitest'
import {
  DETECTOR_ANCHORS,
  DETECTOR_MEAN_RGB,
  LANDMARK_MEAN_RGB,
  LANDMARK_INPUT_SIZE,
  FACE_LANDMARKS,
} from './constants.js'

describe('DETECTOR_ANCHORS', () => {
  it('has 5 anchors', () => {
    expect(DETECTOR_ANCHORS).toHaveLength(5)
  })

  it('each anchor has positive x and y', () => {
    for (const anchor of DETECTOR_ANCHORS) {
      expect(anchor.x).toBeGreaterThan(0)
      expect(anchor.y).toBeGreaterThan(0)
    }
  })
})

describe('DETECTOR_MEAN_RGB', () => {
  it('is a 3-element number array', () => {
    expect(DETECTOR_MEAN_RGB).toHaveLength(3)
    for (const v of DETECTOR_MEAN_RGB) {
      expect(typeof v).toBe('number')
    }
  })
})

describe('LANDMARK_MEAN_RGB', () => {
  it('is a 3-element number array', () => {
    expect(LANDMARK_MEAN_RGB).toHaveLength(3)
    for (const v of LANDMARK_MEAN_RGB) {
      expect(typeof v).toBe('number')
    }
  })
})

describe('LANDMARK_INPUT_SIZE', () => {
  it('is 112', () => {
    expect(LANDMARK_INPUT_SIZE).toBe(112)
  })
})

describe('FACE_LANDMARKS', () => {
  it('has 9 groups', () => {
    expect(Object.keys(FACE_LANDMARKS)).toHaveLength(9)
  })

  it('covers indices 0-67 contiguously', () => {
    const all = Object.values(FACE_LANDMARKS).flat().sort((a, b) => a - b)
    expect(all).toHaveLength(68)
    for (let i = 0; i < 68; i++) {
      expect(all[i]).toBe(i)
    }
  })

  it('has correct group names', () => {
    const expected = [
      'JAW', 'RIGHT_EYEBROW', 'LEFT_EYEBROW', 'NOSE_BRIDGE',
      'NOSE_TIP', 'RIGHT_EYE', 'LEFT_EYE', 'OUTER_LIPS', 'INNER_LIPS',
    ]
    expect(Object.keys(FACE_LANDMARKS)).toEqual(expected)
  })
})
