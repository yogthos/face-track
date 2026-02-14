import { describe, it, expect } from 'vitest'
import { TinyFaceDetector } from './TinyFaceDetector.js'
import { DETECTOR_ANCHORS } from './constants.js'

describe('TinyFaceDetector', () => {
  it('constructor initializes with null weights', () => {
    const detector = new TinyFaceDetector()
    expect(detector.weights).toBeNull()
  })

  describe('decodeOutput', () => {
    const detector = new TinyFaceDetector()
    const numAnchors = DETECTOR_ANCHORS.length
    const boxEncoding = 5

    function makeGrid(numCells, fillFn) {
      const data = new Float32Array(numCells * numCells * numAnchors * boxEncoding)
      for (let row = 0; row < numCells; row++) {
        for (let col = 0; col < numCells; col++) {
          for (let a = 0; a < numAnchors; a++) {
            const offset = ((row * numCells + col) * numAnchors + a) * boxEncoding
            fillFn(data, offset, row, col, a)
          }
        }
      }
      return data
    }

    it('returns empty when all scores below threshold', () => {
      const numCells = 2
      const data = makeGrid(numCells, (d, off) => {
        d[off + 4] = -10 // very low objectness → sigmoid ≈ 0
      })
      const boxes = detector.decodeOutput(data, numCells, 320, 320, 0.5)
      expect(boxes).toEqual([])
    })

    it('detects box when objectness exceeds threshold', () => {
      const numCells = 2
      const data = makeGrid(numCells, (d, off, row, col, a) => {
        if (row === 0 && col === 0 && a === 0) {
          d[off + 0] = 0 // tx
          d[off + 1] = 0 // ty
          d[off + 2] = 0 // tw (exp(0)=1)
          d[off + 3] = 0 // th (exp(0)=1)
          d[off + 4] = 10 // high objectness → sigmoid ≈ 1
        } else {
          d[off + 4] = -10
        }
      })
      const boxes = detector.decodeOutput(data, numCells, 320, 320, 0.5)
      expect(boxes.length).toBe(1)
      expect(boxes[0].score).toBeCloseTo(1, 2)
      expect(boxes[0].box.width).toBeGreaterThan(0)
      expect(boxes[0].box.height).toBeGreaterThan(0)
    })

    it('applies correction factors for non-square images', () => {
      const numCells = 2
      const data = makeGrid(numCells, (d, off, row, col, a) => {
        if (row === 1 && col === 1 && a === 0) {
          d[off + 0] = 0
          d[off + 1] = 0
          d[off + 2] = 0
          d[off + 3] = 0
          d[off + 4] = 10
        } else {
          d[off + 4] = -10
        }
      })

      // Wide image: 640x320, maxDim=640, corrX=640/640=1, corrY=640/320=2
      const boxesWide = detector.decodeOutput(data, numCells, 640, 320, 0.5)
      // Tall image: 320x640, maxDim=640, corrX=640/320=2, corrY=640/640=1
      const boxesTall = detector.decodeOutput(data, numCells, 320, 640, 0.5)

      expect(boxesWide.length).toBe(1)
      expect(boxesTall.length).toBe(1)
      // Correction factors scale differently — box sizes should differ
      const wideBox = boxesWide[0].box
      const tallBox = boxesTall[0].box
      // Wide image: corrY=2 makes height double vs corrY=1 for tall image
      expect(wideBox.height).not.toBeCloseTo(tallBox.height, 0)
    })

    it('clamps boxes to image boundaries', () => {
      const numCells = 2
      const data = makeGrid(numCells, (d, off, row, col, a) => {
        if (row === 0 && col === 0 && a === 4) {
          // Large anchor, placed at top-left → box extends past origin
          d[off + 0] = 0
          d[off + 1] = 0
          d[off + 2] = 2 // exp(2) ≈ 7.4 → large width
          d[off + 3] = 2
          d[off + 4] = 10
        } else {
          d[off + 4] = -10
        }
      })
      const boxes = detector.decodeOutput(data, numCells, 100, 100, 0.5)
      for (const { box } of boxes) {
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.y).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width).toBeLessThanOrEqual(100)
        expect(box.y + box.height).toBeLessThanOrEqual(100)
      }
    })

    it('rejects boxes completely outside image boundaries', () => {
      const numCells = 1
      const data = makeGrid(numCells, (d, off, row, col, a) => {
        if (a === 0) {
          d[off + 0] = 20 // large tx pushes box far right
          d[off + 1] = 20 // large ty pushes box far down
          d[off + 2] = 0
          d[off + 3] = 0
          d[off + 4] = 10
        } else {
          d[off + 4] = -10
        }
      })
      const boxes = detector.decodeOutput(data, numCells, 100, 100, 0.5)
      for (const { box } of boxes) {
        expect(box.width).toBeGreaterThan(0)
        expect(box.height).toBeGreaterThan(0)
      }
    })

    it('filters zero-area boxes', () => {
      const numCells = 2
      const data = makeGrid(numCells, (d, off, row, col, a) => {
        if (row === 0 && col === 0 && a === 0) {
          d[off + 0] = 0
          d[off + 1] = 0
          d[off + 2] = -20 // exp(-20) ≈ 0 → zero width
          d[off + 3] = -20
          d[off + 4] = 10
        } else {
          d[off + 4] = -10
        }
      })
      const boxes = detector.decodeOutput(data, numCells, 320, 320, 0.5)
      // Very tiny boxes that result in ~0 area should be filtered
      for (const { box } of boxes) {
        expect(box.width).toBeGreaterThan(0)
        expect(box.height).toBeGreaterThan(0)
      }
    })
  })
})
