import { describe, it, expect, vi } from 'vitest'
import { drawLandmarkPoints, drawLandmarkConnections, drawResults } from './drawing.js'

function createMockCtx() {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
  }
}

describe('drawLandmarkPoints', () => {
  it('draws a circle per landmark', () => {
    const ctx = createMockCtx()
    const landmarks = [
      { x: 10, y: 20 },
      { x: 30, y: 40 },
      { x: 50, y: 60 },
    ]
    drawLandmarkPoints(ctx, landmarks)
    expect(ctx.arc).toHaveBeenCalledTimes(3)
    expect(ctx.fill).toHaveBeenCalledTimes(3)
  })

  it('sets green fill', () => {
    const ctx = createMockCtx()
    drawLandmarkPoints(ctx, [{ x: 0, y: 0 }])
    expect(ctx.fillStyle).toBe('#00ff00')
  })
})

describe('drawLandmarkConnections', () => {
  it('strokes 9 groups', () => {
    const ctx = createMockCtx()
    const landmarks = Array.from({ length: 68 }, (_, i) => ({ x: i, y: i }))
    drawLandmarkConnections(ctx, landmarks)
    expect(ctx.stroke).toHaveBeenCalledTimes(9)
  })

  it('closePath for eyes and lips (4 calls)', () => {
    const ctx = createMockCtx()
    const landmarks = Array.from({ length: 68 }, (_, i) => ({ x: i, y: i }))
    drawLandmarkConnections(ctx, landmarks)
    // RIGHT_EYE, LEFT_EYE, OUTER_LIPS, INNER_LIPS
    expect(ctx.closePath).toHaveBeenCalledTimes(4)
  })
})

describe('drawResults', () => {
  it('clears canvas', () => {
    const ctx = createMockCtx()
    drawResults(ctx, [], 640, 480)
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 640, 480)
  })

  it('draws bounding box and landmarks', () => {
    const ctx = createMockCtx()
    const results = [{
      detection: { box: { x: 10, y: 20, width: 100, height: 120 } },
      landmarks: Array.from({ length: 68 }, (_, i) => ({ x: i, y: i })),
    }]
    drawResults(ctx, results, 640, 480)
    expect(ctx.strokeRect).toHaveBeenCalledWith(10, 20, 100, 120)
    // landmarks drawn: 68 arc calls from drawLandmarkPoints
    expect(ctx.arc).toHaveBeenCalledTimes(68)
  })
})
