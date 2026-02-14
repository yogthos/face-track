import { describe, it, expect } from 'vitest'
import * as tf from '@tensorflow/tfjs'
import { leakyRelu, TinyFaceDetector } from './TinyFaceDetector.js'
import { FaceLandmark68Net } from './FaceLandmark68Net.js'

describe('leakyRelu', () => {
  it('positive values pass through', () => {
    const input = tf.tensor1d([1, 2, 3])
    const output = leakyRelu(input)
    const data = output.dataSync()
    expect(data[0]).toBeCloseTo(1, 2)
    expect(data[1]).toBeCloseTo(2, 2)
    expect(data[2]).toBeCloseTo(3, 2)
    input.dispose()
    output.dispose()
  })

  it('negative values are scaled by ~0.1', () => {
    const input = tf.tensor1d([-1, -2, -10])
    const output = leakyRelu(input)
    const data = output.dataSync()
    expect(data[0]).toBeCloseTo(-0.1, 1)
    expect(data[1]).toBeCloseTo(-0.2, 1)
    expect(data[2]).toBeCloseTo(-1, 0)
    input.dispose()
    output.dispose()
  })

  it('preserves shape', () => {
    const input = tf.tensor2d([[1, -1], [2, -2]])
    const output = leakyRelu(input)
    expect(output.shape).toEqual([2, 2])
    input.dispose()
    output.dispose()
  })
})

describe('TinyFaceDetector forward pass', () => {
  it('input [1, 320, 320, 3] produces output [1, 10, 10, 25]', () => {
    const detector = new TinyFaceDetector()

    // Build fake random weights matching expected structure
    const weights = {}

    // conv0: standard conv2d [3,3,3,16]
    weights['conv0/filters'] = tf.randomNormal([3, 3, 3, 16])
    weights['conv0/bias'] = tf.zeros([16])

    // conv1-5: separable convs, channel doubling with some steps
    const channels = [16, 32, 64, 128, 256, 256]
    for (let i = 1; i <= 5; i++) {
      const inC = channels[i - 1]
      const outC = channels[i]
      weights[`conv${i}/depthwise_filter`] = tf.randomNormal([3, 3, inC, 1])
      weights[`conv${i}/pointwise_filter`] = tf.randomNormal([1, 1, inC, outC])
      weights[`conv${i}/bias`] = tf.zeros([outC])
    }

    // conv8: 1x1 conv to 25 outputs (5 anchors * 5 encoding)
    weights['conv8/filters'] = tf.randomNormal([1, 1, 256, 25])
    weights['conv8/bias'] = tf.zeros([25])

    detector.weights = weights

    const input = tf.randomNormal([1, 320, 320, 3])
    const output = detector.forward(input)

    expect(output.shape).toEqual([1, 10, 10, 25])

    input.dispose()
    output.dispose()
    Object.values(weights).forEach(w => w.dispose())
  })
})

describe('FaceLandmark68Net forward pass', () => {
  it('input [1, 112, 112, 3] produces output [1, 136]', () => {
    const net = new FaceLandmark68Net()

    const weights = {}

    // dense0: first layer uses conv2d (isFirstLayer=true)
    // conv0: [3,3,3,32] (in=3, out=32)
    weights['dense0/conv0/filters'] = tf.randomNormal([3, 3, 3, 32])
    weights['dense0/conv0/bias'] = tf.zeros([32])
    // conv1-3: separable convs in dense block
    for (let c = 1; c <= 3; c++) {
      weights[`dense0/conv${c}/depthwise_filter`] = tf.randomNormal([3, 3, 32, 1])
      weights[`dense0/conv${c}/pointwise_filter`] = tf.randomNormal([1, 1, 32, 32])
      weights[`dense0/conv${c}/bias`] = tf.zeros([32])
    }

    // dense1-3: separable conv layers
    const blockChannels = [[32, 64], [64, 128], [128, 256]]
    for (let b = 0; b < 3; b++) {
      const [inC, outC] = blockChannels[b]
      const prefix = `dense${b + 1}`
      // conv0: separable, stride 2, changes channels
      weights[`${prefix}/conv0/depthwise_filter`] = tf.randomNormal([3, 3, inC, 1])
      weights[`${prefix}/conv0/pointwise_filter`] = tf.randomNormal([1, 1, inC, outC])
      weights[`${prefix}/conv0/bias`] = tf.zeros([outC])
      // conv1-3: separable, stride 1, same channels
      for (let c = 1; c <= 3; c++) {
        weights[`${prefix}/conv${c}/depthwise_filter`] = tf.randomNormal([3, 3, outC, 1])
        weights[`${prefix}/conv${c}/pointwise_filter`] = tf.randomNormal([1, 1, outC, outC])
        weights[`${prefix}/conv${c}/bias`] = tf.zeros([outC])
      }
    }

    // FC layer: [256, 136]
    weights['fc/weights'] = tf.randomNormal([256, 136])
    weights['fc/bias'] = tf.zeros([136])

    net.weights = weights

    const input = tf.randomNormal([1, 112, 112, 3])
    const output = net.forward(input)

    expect(output.shape).toEqual([1, 136])

    input.dispose()
    output.dispose()
    Object.values(weights).forEach(w => w.dispose())
  })
})
