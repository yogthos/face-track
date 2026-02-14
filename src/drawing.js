import { FACE_LANDMARKS } from './constants.js'

export function drawLandmarkPoints(ctx, landmarks) {
  ctx.fillStyle = '#00ff00'
  for (const pt of landmarks) {
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, 2, 0, 2 * Math.PI)
    ctx.fill()
  }
}

export function drawLandmarkConnections(ctx, landmarks) {
  ctx.strokeStyle = '#ff0000'
  ctx.lineWidth = 1

  const drawLine = (indices, close = false) => {
    if (indices.some(i => i >= landmarks.length)) return
    ctx.beginPath()
    ctx.moveTo(landmarks[indices[0]].x, landmarks[indices[0]].y)
    for (let i = 1; i < indices.length; i++) {
      ctx.lineTo(landmarks[indices[i]].x, landmarks[indices[i]].y)
    }
    if (close) ctx.closePath()
    ctx.stroke()
  }

  drawLine(FACE_LANDMARKS.JAW)
  drawLine(FACE_LANDMARKS.RIGHT_EYEBROW)
  drawLine(FACE_LANDMARKS.LEFT_EYEBROW)
  drawLine(FACE_LANDMARKS.NOSE_BRIDGE)
  drawLine(FACE_LANDMARKS.NOSE_TIP)
  drawLine(FACE_LANDMARKS.RIGHT_EYE, true)
  drawLine(FACE_LANDMARKS.LEFT_EYE, true)
  drawLine(FACE_LANDMARKS.OUTER_LIPS, true)
  drawLine(FACE_LANDMARKS.INNER_LIPS, true)
}

export function drawResults(ctx, results, canvasWidth, canvasHeight) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)
  if (!results || results.length === 0) return

  for (const { detection, landmarks } of results) {
    const { box } = detection
    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 2
    ctx.strokeRect(box.x, box.y, box.width, box.height)

    if (landmarks.length > 0) {
      drawLandmarkConnections(ctx, landmarks)
      drawLandmarkPoints(ctx, landmarks)
    }
  }
}
