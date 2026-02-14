import { describe, it, expect } from 'vitest'
import { sigmoid, iou, nms } from './utils.js'

describe('sigmoid', () => {
  it('returns 0.5 for input 0', () => {
    expect(sigmoid(0)).toBe(0.5)
  })

  it('returns ~1 for large positive input', () => {
    expect(sigmoid(10)).toBeCloseTo(1, 4)
  })

  it('returns ~0 for large negative input', () => {
    expect(sigmoid(-10)).toBeCloseTo(0, 4)
  })

  it('handles ±1 correctly', () => {
    expect(sigmoid(1)).toBeCloseTo(0.7310585786, 5)
    expect(sigmoid(-1)).toBeCloseTo(0.2689414214, 5)
  })
})

describe('iou', () => {
  it('returns 1 for identical boxes', () => {
    const box = { x: 0, y: 0, width: 10, height: 10 }
    expect(iou(box, box)).toBe(1)
  })

  it('returns 0 for non-overlapping boxes', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 }
    const b = { x: 20, y: 20, width: 10, height: 10 }
    expect(iou(a, b)).toBe(0)
  })

  it('handles partial overlap', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 }
    const b = { x: 5, y: 5, width: 10, height: 10 }
    // Intersection: 5x5=25, Union: 100+100-25=175
    expect(iou(a, b)).toBeCloseTo(25 / 175, 5)
  })

  it('handles containment', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 }
    const b = { x: 2, y: 2, width: 4, height: 4 }
    // Intersection: 4x4=16, Union: 100+16-16=100
    expect(iou(a, b)).toBeCloseTo(16 / 100, 5)
  })

  it('returns 0 for edge-touching boxes', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 }
    const b = { x: 10, y: 0, width: 10, height: 10 }
    expect(iou(a, b)).toBe(0)
  })
})

describe('nms', () => {
  it('returns empty array for empty input', () => {
    expect(nms([], 0.5)).toEqual([])
  })

  it('returns single box unchanged', () => {
    const boxes = [{ box: { x: 0, y: 0, width: 10, height: 10 }, score: 0.9 }]
    expect(nms(boxes, 0.5)).toEqual(boxes)
  })

  it('keeps non-overlapping boxes', () => {
    const boxes = [
      { box: { x: 0, y: 0, width: 10, height: 10 }, score: 0.9 },
      { box: { x: 50, y: 50, width: 10, height: 10 }, score: 0.8 },
    ]
    expect(nms(boxes, 0.5)).toHaveLength(2)
  })

  it('suppresses overlapping boxes, keeping higher score', () => {
    const boxes = [
      { box: { x: 0, y: 0, width: 10, height: 10 }, score: 0.7 },
      { box: { x: 1, y: 1, width: 10, height: 10 }, score: 0.9 },
    ]
    const result = nms(boxes, 0.3)
    expect(result).toHaveLength(1)
    expect(result[0].score).toBe(0.9)
  })

  it('does not mutate input', () => {
    const boxes = [
      { box: { x: 0, y: 0, width: 10, height: 10 }, score: 0.9 },
      { box: { x: 1, y: 1, width: 10, height: 10 }, score: 0.7 },
    ]
    const copy = [...boxes]
    nms(boxes, 0.3)
    expect(boxes).toEqual(copy)
  })
})
