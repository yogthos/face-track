import * as tf from '@tensorflow/tfjs'
import { LANDMARK_MEAN_RGB, LANDMARK_INPUT_SIZE } from './constants.js'

// Cached mean tensor — tf.keep() prevents tf.tidy() from disposing it
let landmarkMeanTensor = null
function getLandmarkMean() {
  if (!landmarkMeanTensor) landmarkMeanTensor = tf.keep(tf.tensor1d(LANDMARK_MEAN_RGB))
  return landmarkMeanTensor
}

export function postProcessLandmarks(rawData, box, cropW, cropH) {
  const maxDim = Math.max(cropW, cropH)
  const scale = LANDMARK_INPUT_SIZE / maxDim
  const scaledW = cropW * scale
  const scaledH = cropH * scale
  const padX = cropW < cropH ? Math.abs(cropW - cropH) / 2 : 0
  const padY = cropH < cropW ? Math.abs(cropW - cropH) / 2 : 0

  // Pre-compute transformation constants
  const padXScaled = padX * scale
  const padYScaled = padY * scale
  const scaleX = cropW / scaledW
  const scaleY = cropH / scaledH

  const landmarks = []
  for (let i = 0; i < 68; i++) {
    landmarks.push({
      x: (rawData[i * 2] * LANDMARK_INPUT_SIZE - padXScaled) * scaleX + box.x,
      y: (rawData[i * 2 + 1] * LANDMARK_INPUT_SIZE - padYScaled) * scaleY + box.y,
    })
  }

  return landmarks
}

export class FaceLandmark68Net {
  constructor() {
    this.weights = null
  }

  async load(baseUrl) {
    const resp = await fetch(baseUrl + 'face_landmark_68_model-weights_manifest.json')
    const manifest = await resp.json()
    this.weights = await tf.io.loadWeights(manifest, baseUrl)
  }

  denseBlock(x, prefix, isFirstLayer) {
    const w = this.weights

    let out1
    if (isFirstLayer) {
      out1 = tf.add(
        tf.conv2d(x, w[`${prefix}/conv0/filters`], 2, 'same'),
        w[`${prefix}/conv0/bias`]
      )
    } else {
      out1 = tf.add(
        tf.separableConv2d(
          x,
          w[`${prefix}/conv0/depthwise_filter`],
          w[`${prefix}/conv0/pointwise_filter`],
          2, 'same'
        ),
        w[`${prefix}/conv0/bias`]
      )
    }
    out1 = tf.relu(out1)

    const out2 = tf.add(
      tf.separableConv2d(
        out1,
        w[`${prefix}/conv1/depthwise_filter`],
        w[`${prefix}/conv1/pointwise_filter`],
        1, 'same'
      ),
      w[`${prefix}/conv1/bias`]
    )

    const in3 = tf.relu(tf.add(out1, out2))
    const out3 = tf.add(
      tf.separableConv2d(
        in3,
        w[`${prefix}/conv2/depthwise_filter`],
        w[`${prefix}/conv2/pointwise_filter`],
        1, 'same'
      ),
      w[`${prefix}/conv2/bias`]
    )

    const in4 = tf.relu(tf.addN([out1, out2, out3]))
    const out4 = tf.add(
      tf.separableConv2d(
        in4,
        w[`${prefix}/conv3/depthwise_filter`],
        w[`${prefix}/conv3/pointwise_filter`],
        1, 'same'
      ),
      w[`${prefix}/conv3/bias`]
    )

    return tf.relu(tf.addN([out1, out2, out3, out4]))
  }

  forward(x) {
    return tf.tidy(() => {
      let out = this.denseBlock(x, 'dense0', true)
      out = this.denseBlock(out, 'dense1', false)
      out = this.denseBlock(out, 'dense2', false)
      out = this.denseBlock(out, 'dense3', false)

      out = tf.avgPool(out, [7, 7], [2, 2], 'valid')
      out = tf.reshape(out, [out.shape[0], -1])

      const w = this.weights
      out = tf.add(tf.matMul(out, w['fc/weights']), w['fc/bias'])

      return out
    })
  }

  async detectLandmarks(imageTensor, box) {
    const [imgH, imgW] = imageTensor.shape

    const x = Math.max(0, Math.floor(box.x))
    const y = Math.max(0, Math.floor(box.y))
    const w = Math.min(Math.floor(box.width), imgW - x)
    const h = Math.min(Math.floor(box.height), imgH - y)
    if (w <= 0 || h <= 0) return []

    const preprocessed = tf.tidy(() => {
      let face = tf.slice(imageTensor, [y, x, 0], [h, w, 3])

      const maxDim = Math.max(w, h)
      const padX = Math.floor((maxDim - w) / 2)
      const padY = Math.floor((maxDim - h) / 2)
      face = tf.pad(face, [
        [padY, maxDim - h - padY],
        [padX, maxDim - w - padX],
        [0, 0],
      ])

      face = tf.image.resizeBilinear(face, [LANDMARK_INPUT_SIZE, LANDMARK_INPUT_SIZE])

      const batched = face.expandDims(0).toFloat()
      return tf.div(tf.sub(batched, getLandmarkMean()), 255)
    })

    const output = this.forward(preprocessed)
    preprocessed.dispose()

    const rawData = await output.data()
    output.dispose()

    return postProcessLandmarks(rawData, box, w, h)
  }
}
