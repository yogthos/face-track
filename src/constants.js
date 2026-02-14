export const DETECTOR_ANCHORS = [
  { x: 1.603231, y: 2.094468 },
  { x: 6.041143, y: 7.080126 },
  { x: 2.882459, y: 3.518061 },
  { x: 4.266906, y: 5.178857 },
  { x: 9.041765, y: 10.66308 },
]

export const DETECTOR_MEAN_RGB = [117.001, 114.697, 97.404]
export const LANDMARK_MEAN_RGB = [122.782, 117.001, 104.298]
export const LANDMARK_INPUT_SIZE = 112

export const FACE_LANDMARKS = {
  JAW: Array.from({ length: 17 }, (_, i) => i),
  RIGHT_EYEBROW: Array.from({ length: 5 }, (_, i) => i + 17),
  LEFT_EYEBROW: Array.from({ length: 5 }, (_, i) => i + 22),
  NOSE_BRIDGE: Array.from({ length: 4 }, (_, i) => i + 27),
  NOSE_TIP: Array.from({ length: 5 }, (_, i) => i + 31),
  RIGHT_EYE: Array.from({ length: 6 }, (_, i) => i + 36),
  LEFT_EYE: Array.from({ length: 6 }, (_, i) => i + 42),
  OUTER_LIPS: Array.from({ length: 12 }, (_, i) => i + 48),
  INNER_LIPS: Array.from({ length: 8 }, (_, i) => i + 60),
}
