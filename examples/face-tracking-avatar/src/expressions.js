// Extract expression weights from 68 facial landmarks.
// Uses auto-calibrating ranges — observes actual min/max over time
// and maps to 0–1 accordingly. All values smoothed with EMA.

const LERP_FACTOR = 0.3

function dist(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v))
}

// Eye Aspect Ratio — ratio of vertical to horizontal eye opening
function ear(landmarks, indices) {
  const [p1, p2, p3, p4, p5, p6] = indices.map(i => landmarks[i])
  const vertical1 = dist(p2, p6)
  const vertical2 = dist(p3, p5)
  const horizontal = dist(p1, p4)
  if (horizontal < 0.001) return 0
  return (vertical1 + vertical2) / (2 * horizontal)
}

// Auto-calibrating range tracker
// Starts with a seed range, then expands as it observes real data.
// Slowly contracts back toward observed values to adapt to changes.
function createRange(seedMin, seedMax) {
  return {
    min: seedMin,
    max: seedMax,
    hasData: false,
  }
}

function updateRange(range, value) {
  if (!range.hasData) {
    // First observation — set narrow initial range around it
    range.min = value - (range.max - range.min) * 0.1
    range.max = value + (range.max - range.min) * 0.1
    range.hasData = true
  }
  // Expand instantly to encompass new extremes
  if (value < range.min) range.min = value
  if (value > range.max) range.max = value
  // Slowly contract toward recent values to adapt over time
  range.min += (value - range.min) * 0.001
  range.max += (value - range.max) * 0.001
}

function mapRange(range, value, invert) {
  const span = range.max - range.min
  if (span < 0.001) return 0
  const t = (value - range.min) / span
  return clamp01(invert ? 1 - t : t)
}

// State
let smoothed = null
const ranges = {
  leftEAR: createRange(0.05, 0.35),
  rightEAR: createRange(0.05, 0.35),
  mouthGap: createRange(0.0, 0.5),
  mouthWidth: createRange(0.8, 1.2),
  browDist: createRange(0.2, 0.6),
}

export function extractExpressions(landmarks) {
  const interEye = dist(landmarks[36], landmarks[45])
  if (interEye < 1) return smoothed || defaultWeights()

  // --- Eye blinks ---
  const leftEAR = ear(landmarks, [42, 43, 44, 45, 46, 47])
  const rightEAR = ear(landmarks, [36, 37, 38, 39, 40, 41])

  updateRange(ranges.leftEAR, leftEAR)
  updateRange(ranges.rightEAR, rightEAR)

  // EAR is high when open, low when closed → invert
  const eyeBlinkLeft = mapRange(ranges.leftEAR, leftEAR, true)
  const eyeBlinkRight = mapRange(ranges.rightEAR, rightEAR, true)

  // --- Mouth open ---
  const innerTop = landmarks[62]
  const innerBottom = landmarks[66]
  const mouthGap = dist(innerTop, innerBottom) / interEye

  updateRange(ranges.mouthGap, mouthGap)
  const mouthOpen = mapRange(ranges.mouthGap, mouthGap, false)

  // --- Mouth smile ---
  const mouthWidth = dist(landmarks[48], landmarks[54]) / interEye

  updateRange(ranges.mouthWidth, mouthWidth)
  const mouthSmile = mapRange(ranges.mouthWidth, mouthWidth, false)

  // --- Brow raise ---
  // Brow Y relative to eye center Y, normalized by inter-eye distance
  // Lower pixel Y = higher on screen = raised brow = larger distance
  const leftBrowY = (landmarks[22].y + landmarks[23].y + landmarks[24].y + landmarks[25].y + landmarks[26].y) / 5
  const rightBrowY = (landmarks[17].y + landmarks[18].y + landmarks[19].y + landmarks[20].y + landmarks[21].y) / 5
  const leftEyeY = (landmarks[42].y + landmarks[45].y) / 2
  const rightEyeY = (landmarks[36].y + landmarks[39].y) / 2

  const leftBrowDist = (leftEyeY - leftBrowY) / interEye
  const rightBrowDist = (rightEyeY - rightBrowY) / interEye
  const avgBrowDist = (leftBrowDist + rightBrowDist) / 2

  updateRange(ranges.browDist, avgBrowDist)
  const browRaise = mapRange(ranges.browDist, avgBrowDist, false)

  const raw = { eyeBlinkLeft, eyeBlinkRight, mouthOpen, mouthSmile, browRaise }

  // Exponential moving average for smoothing
  if (!smoothed) {
    smoothed = { ...raw }
  } else {
    for (const key in raw) {
      smoothed[key] += (raw[key] - smoothed[key]) * LERP_FACTOR
    }
  }

  return { ...smoothed }
}

function defaultWeights() {
  return {
    eyeBlinkLeft: 0,
    eyeBlinkRight: 0,
    mouthOpen: 0,
    mouthSmile: 0,
    browRaise: 0,
  }
}

export function resetExpressions() {
  smoothed = null
  for (const key in ranges) {
    ranges[key].hasData = false
  }
}
