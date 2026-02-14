export function sigmoid(x) {
  return 1 / (1 + Math.exp(-x))
}

export function iou(a, b) {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.width, b.x + b.width)
  const y2 = Math.min(a.y + a.height, b.y + b.height)
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
  const union = a.width * a.height + b.width * b.height - inter
  return inter / union
}

export function nms(boxes, iouThreshold) {
  if (boxes.length === 0) return []
  const sorted = [...boxes].sort((a, b) => b.score - a.score)
  const selected = []
  while (sorted.length > 0) {
    const current = sorted.shift()
    selected.push(current)
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (iou(current.box, sorted[i].box) > iouThreshold) {
        sorted.splice(i, 1)
      }
    }
  }
  return selected
}
