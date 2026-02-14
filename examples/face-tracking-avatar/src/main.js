import './style.css'
import * as tf from '@tensorflow/tfjs'
import * as THREE from 'three'
import { FaceTracker, calculateFaceOrientation, postProcessLandmarks } from 'face-track'
import { createAvatar, updateAvatar } from './avatar.js'
import { extractExpressions } from './expressions.js'

const video = document.getElementById('video')
const canvas = document.getElementById('avatar-canvas')
const status = document.getElementById('status')

// Three.js setup
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setClearColor(0x1a1a2e)

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.set(0, 0, 4.5)

const ambient = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambient)
const key = new THREE.DirectionalLight(0xffffff, 1.0)
key.position.set(2, 3, 4)
scene.add(key)
const fill = new THREE.DirectionalLight(0x8899bb, 0.4)
fill.position.set(-2, 1, 3)
scene.add(fill)
const rim = new THREE.DirectionalLight(0xffffff, 0.3)
rim.position.set(0, 2, -3)
scene.add(rim)

const avatar = createAvatar(scene)
const tracker = new FaceTracker()

function resize() {
  const w = window.innerWidth
  const h = window.innerHeight
  renderer.setSize(w, h)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}
window.addEventListener('resize', resize)
resize()

// --- Optimized inference pipeline ---
//
// The library's detectLandmarks() does per frame:
//   fromPixels(full video) → tf.slice → tf.pad → resizeBilinear → mean tensor alloc → forward
//
// We replace fromPixels+slice+pad+resize with a single canvas.drawImage() call
// (hardware-accelerated crop+pad+resize), then fromPixels on a tiny 112x112 canvas.
// The mean tensor is cached. This eliminates 4 GPU tensor ops per frame.

const DETECT_INTERVAL = 500
const DETECT_INPUT_SIZE = 160
const LANDMARK_SIZE = 112

// Pre-allocated canvas for face cropping (matches landmark net input)
const cropCanvas = document.createElement('canvas')
cropCanvas.width = LANDMARK_SIZE
cropCanvas.height = LANDMARK_SIZE
const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: false })

// Cached mean tensor — the library creates a new one every frame
let meanTensor = null

let cachedBox = null
let lastDetectTime = 0
let inferring = false

async function detectBox() {
  const faces = await tracker.faceDetector.detect(video, {
    inputSize: DETECT_INPUT_SIZE,
    scoreThreshold: 0.5,
  })
  cachedBox = faces.length > 0 ? faces[0].box : null
}

// Fast landmark detection: canvas crop+resize replaces 4 tensor ops
async function fastLandmarks(box) {
  const x = Math.max(0, Math.floor(box.x))
  const y = Math.max(0, Math.floor(box.y))
  const w = Math.min(Math.floor(box.width), video.videoWidth - x)
  const h = Math.min(Math.floor(box.height), video.videoHeight - y)
  if (w <= 0 || h <= 0) return null

  // Mirror the library's pad-to-square + resize logic, but on canvas
  const maxDim = Math.max(w, h)
  const scale = LANDMARK_SIZE / maxDim
  const destW = w * scale
  const destH = h * scale
  const destX = (LANDMARK_SIZE - destW) / 2
  const destY = (LANDMARK_SIZE - destH) / 2

  // One hardware-accelerated call: crop from video + pad + resize to 112x112
  cropCtx.clearRect(0, 0, LANDMARK_SIZE, LANDMARK_SIZE)
  cropCtx.drawImage(video, x, y, w, h, destX, destY, destW, destH)

  if (!meanTensor) meanTensor = tf.tensor1d([122.782, 117.001, 104.298])

  // fromPixels on 112x112 canvas (37K elements) vs full video (230K)
  const preprocessed = tf.tidy(() => {
    const pixels = tf.browser.fromPixels(cropCanvas)
    return tf.div(tf.sub(pixels.expandDims(0).toFloat(), meanTensor), 255)
  })

  const output = tracker.landmarkNet.forward(preprocessed)
  preprocessed.dispose()

  const rawData = await output.data()
  output.dispose()

  return postProcessLandmarks(rawData, box, w, h)
}

async function runInference() {
  if (inferring || !tracker.isLoaded) return null
  inferring = true
  try {
    const now = performance.now()

    if (!cachedBox || now - lastDetectTime > DETECT_INTERVAL) {
      await detectBox()
      lastDetectTime = now
    }

    if (!cachedBox) return null

    const landmarks = await fastLandmarks(cachedBox)
    if (!landmarks) return null

    return {
      expressions: extractExpressions(landmarks),
      orientation: calculateFaceOrientation(landmarks),
    }
  } catch (e) {
    console.error('Detection error:', e)
    return null
  } finally {
    inferring = false
  }
}

const neutralOrientation = { yaw: 0, pitch: 0, roll: 0 }
const neutralExpressions = {
  eyeBlinkLeft: 0, eyeBlinkRight: 0,
  mouthOpen: 0, mouthSmile: 0, browRaise: 0,
}
let lastResult = null

// Debug overlay — toggle with 'd' key
const debug = document.getElementById('debug')
let showDebug = false
document.addEventListener('keydown', e => {
  if (e.key === 'd') {
    showDebug = !showDebug
    debug.classList.toggle('hidden', !showDebug)
  }
})

function updateDebug(expressions, orientation) {
  if (!showDebug) return
  const fmt = v => v.toFixed(2)
  debug.textContent = [
    `blinkL: ${fmt(expressions.eyeBlinkLeft)}  blinkR: ${fmt(expressions.eyeBlinkRight)}`,
    `mouth:  ${fmt(expressions.mouthOpen)}  smile: ${fmt(expressions.mouthSmile)}`,
    `brow:   ${fmt(expressions.browRaise)}`,
    `yaw: ${fmt(orientation.yaw)}  pitch: ${fmt(orientation.pitch)}  roll: ${fmt(orientation.roll)}`,
  ].join('\n')
}

function loop() {
  requestAnimationFrame(loop)

  runInference().then(result => {
    if (result) lastResult = result
  })

  if (lastResult) {
    updateAvatar(avatar, lastResult.expressions, lastResult.orientation)
    updateDebug(lastResult.expressions, lastResult.orientation)
  } else {
    updateAvatar(avatar, neutralExpressions, neutralOrientation)
  }

  renderer.render(scene, camera)
}

async function init() {
  try {
    await tf.setBackend('webgl')
    await tf.ready()

    status.textContent = 'Loading face detection models...'
    await tracker.loadModels('/models/')

    status.textContent = 'Starting camera...'
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240, facingMode: 'user' },
    })
    video.srcObject = stream

    await new Promise((resolve, reject) => {
      if (video.readyState >= 2) {
        resolve()
        return
      }
      video.addEventListener('loadeddata', resolve, { once: true })
      video.addEventListener('error', reject, { once: true })
    })
    await video.play()

    status.textContent = 'Face tracking active'
    setTimeout(() => status.classList.add('hidden'), 2000)

    loop()
  } catch (err) {
    status.textContent = 'Error: ' + err.message
    console.error(err)
  }
}

init()
