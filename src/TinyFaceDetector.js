import * as tf from '@tensorflow/tfjs'
import { sigmoid, nms } from './utils.js'
import { DETECTOR_ANCHORS, DETECTOR_MEAN_RGB } from './constants.js'

export function leakyRelu(x) {
  return tf.tidy(() => {
    const alpha = tf.scalar(0.10000000149011612)
    const min = tf.mul(x, alpha)
    return tf.add(tf.relu(tf.sub(x, min)), min)
  })
}

export class TinyFaceDetector {
  constructor() {
    this.weights = null
  }

  async load(baseUrl) {
    const resp = await fetch(baseUrl + 'tiny_face_detector_model-weights_manifest.json')
    const manifest = await resp.json()
    this.weights = await tf.io.loadWeights(manifest, baseUrl)
  }

  forward(x) {
    return tf.tidy(() => {
      const w = this.weights

      let out = tf.pad(x, [[0, 0], [1, 1], [1, 1], [0, 0]])
      out = tf.add(tf.conv2d(out, w['conv0/filters'], 1, 'valid'), w['conv0/bias'])
      out = leakyRelu(out)
      out = tf.maxPool(out, 2, 2, 'same')

      for (let i = 1; i <= 5; i++) {
        out = tf.pad(out, [[0, 0], [1, 1], [1, 1], [0, 0]])
        out = tf.separableConv2d(
          out,
          w[`conv${i}/depthwise_filter`],
          w[`conv${i}/pointwise_filter`],
          1, 'valid'
        )
        out = tf.add(out, w[`conv${i}/bias`])
        out = leakyRelu(out)
        out = tf.maxPool(out, 2, i === 5 ? 1 : 2, 'same')
      }

      out = tf.add(tf.conv2d(out, w['conv8/filters'], 1, 'valid'), w['conv8/bias'])

      return out
    })
  }

  async detect(input, options = {}) {
    const { inputSize = 320, scoreThreshold = 0.5 } = options

    const imgTensor = tf.browser.fromPixels(input)
    const [origH, origW] = imgTensor.shape

    const preprocessed = tf.tidy(() => {
      const maxDim = Math.max(origH, origW)
      const padded = tf.pad(imgTensor, [[0, maxDim - origH], [0, maxDim - origW], [0, 0]])
      const resized = tf.image.resizeBilinear(padded, [inputSize, inputSize])
      const batched = resized.expandDims(0).toFloat()
      const mean = tf.tensor1d(DETECTOR_MEAN_RGB)
      return tf.div(tf.sub(batched, mean), 256)
    })

    imgTensor.dispose()

    const output = this.forward(preprocessed)
    preprocessed.dispose()

    const outputData = await output.data()
    const numCells = output.shape[1]
    output.dispose()

    const boxes = this.decodeOutput(outputData, numCells, origW, origH, scoreThreshold)
    return nms(boxes, 0.4)
  }

  decodeOutput(data, numCells, origW, origH, threshold) {
    const numAnchors = DETECTOR_ANCHORS.length
    const boxEncoding = 5
    const boxes = []

    const maxDim = Math.max(origW, origH)
    const corrX = maxDim / origW
    const corrY = maxDim / origH

    for (let row = 0; row < numCells; row++) {
      for (let col = 0; col < numCells; col++) {
        for (let a = 0; a < numAnchors; a++) {
          const offset = ((row * numCells + col) * numAnchors + a) * boxEncoding

          const rawScore = data[offset + 4]
          const score = sigmoid(rawScore)
          if (score < threshold) continue

          const tx = data[offset]
          const ty = data[offset + 1]
          const tw = data[offset + 2]
          const th = data[offset + 3]

          const ctX = ((col + sigmoid(tx)) / numCells) * corrX
          const ctY = ((row + sigmoid(ty)) / numCells) * corrY
          const w = (Math.exp(tw) * DETECTOR_ANCHORS[a].x / numCells) * corrX
          const h = (Math.exp(th) * DETECTOR_ANCHORS[a].y / numCells) * corrY

          const x = (ctX - w / 2) * origW
          const y = (ctY - h / 2) * origH
          const width = w * origW
          const height = h * origH

          if (width > 0 && height > 0 && x + width > 0 && y + height > 0
              && x < origW && y < origH) {
            const clampedX = Math.max(0, x)
            const clampedY = Math.max(0, y)
            boxes.push({
              box: {
                x: clampedX,
                y: clampedY,
                width: Math.min(width, origW - clampedX),
                height: Math.min(height, origH - clampedY),
              },
              score,
            })
          }
        }
      }
    }

    return boxes
  }
}
