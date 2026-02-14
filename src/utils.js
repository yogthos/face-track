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

  const n = boxes.length
  const order = Array.from({ length: n }, (_, i) => i)
  order.sort((a, b) => boxes[b].score - boxes[a].score)

  const suppressed = new Uint8Array(n)
  const selected = []

  for (let k = 0; k < n; k++) {
    const i = order[k]
    if (suppressed[i]) continue
    selected.push(boxes[i])
    for (let l = k + 1; l < n; l++) {
      const j = order[l]
      if (!suppressed[j] && iou(boxes[i].box, boxes[j].box) > iouThreshold) {
        suppressed[j] = 1
      }
    }
  }

  return selected
}
