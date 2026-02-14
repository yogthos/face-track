import * as THREE from 'three'

const SKIN = 0xf5c6a0
const LIP_COLOR = 0xd4736a
const EYE_WHITE = 0xf8f8f8
const IRIS_COLOR = 0x4a7c59
const PUPIL_COLOR = 0x1a1a1a
const BROW_COLOR = 0x5c3a1e
const EYELID_COLOR = 0xe8b090

// Compute z on the head surface at a given (x, y) so features sit flush
function headSurfaceZ(x, y) {
  // Head ellipsoid: (x/1)^2 + (y/1.15)^2 + (z/0.95)^2 = 1
  const val = 1 - (x * x) - (y / 1.15) ** 2
  if (val <= 0) return 0.95
  return Math.sqrt(val) * 0.95
}

export function createAvatar(scene) {
  const group = new THREE.Group()

  // Head — slightly elongated sphere
  const headGeo = new THREE.SphereGeometry(1, 32, 32)
  headGeo.scale(1, 1.15, 0.95)
  const headMat = new THREE.MeshStandardMaterial({
    color: SKIN,
    roughness: 0.7,
    metalness: 0.0,
  })
  const head = new THREE.Mesh(headGeo, headMat)
  group.add(head)

  // Nose — small sphere
  const noseGeo = new THREE.SphereGeometry(0.12, 16, 16)
  noseGeo.scale(1, 0.9, 0.8)
  const nose = new THREE.Mesh(noseGeo, headMat)
  nose.position.set(0, -0.1, headSurfaceZ(0, -0.1) + 0.02)
  group.add(nose)

  // Ears
  const earGeo = new THREE.SphereGeometry(0.15, 12, 12)
  earGeo.scale(0.5, 1, 0.7)
  const leftEar = new THREE.Mesh(earGeo, headMat)
  leftEar.position.set(-0.95, 0.1, 0)
  group.add(leftEar)
  const rightEar = new THREE.Mesh(earGeo.clone(), headMat)
  rightEar.position.set(0.95, 0.1, 0)
  group.add(rightEar)

  // Eyes — position on head surface + offset outward
  const eyeY = 0.18
  const eyeX = 0.32
  const eyeZ = headSurfaceZ(eyeX, eyeY) + 0.02

  const leftEye = createEye()
  leftEye.position.set(-eyeX, eyeY, eyeZ)
  group.add(leftEye)

  const rightEye = createEye()
  rightEye.position.set(eyeX, eyeY, eyeZ)
  group.add(rightEye)

  // Eyelids — positioned above eyes, slide down to cover on blink
  const lidZ = eyeZ + 0.04
  const lidOpenY = eyeY + 0.18  // resting above the eye (open)
  const lidClosedY = eyeY - 0.02 // covering the eye center (closed)

  const leftEyelid = createEyelid()
  leftEyelid.position.set(-eyeX, lidOpenY, lidZ)
  group.add(leftEyelid)

  const rightEyelid = createEyelid()
  rightEyelid.position.set(eyeX, lidOpenY, lidZ)
  group.add(rightEyelid)

  // Eyebrows — above eyes, on surface
  const browY = 0.42
  const browZ = headSurfaceZ(eyeX, browY) + 0.02

  const browGeo = new THREE.BoxGeometry(0.28, 0.045, 0.06)
  const browMat = new THREE.MeshStandardMaterial({
    color: BROW_COLOR,
    roughness: 0.9,
  })

  const leftBrow = new THREE.Mesh(browGeo, browMat)
  leftBrow.position.set(-eyeX, browY, browZ)
  group.add(leftBrow)

  const rightBrow = new THREE.Mesh(browGeo.clone(), browMat)
  rightBrow.position.set(eyeX, browY, browZ)
  group.add(rightBrow)

  // Mouth — on surface at mouth position
  const mouthY = -0.4
  const mouthZ = headSurfaceZ(0, mouthY) + 0.02

  const mouth = createMouth()
  mouth.position.set(0, mouthY, mouthZ)
  group.add(mouth)

  scene.add(group)

  return {
    group,
    leftEye,
    rightEye,
    leftEyelid,
    rightEyelid,
    leftBrow,
    rightBrow,
    mouth,
    // Rest positions for animation
    leftBrowRestY: leftBrow.position.y,
    rightBrowRestY: rightBrow.position.y,
    lidOpenY,
    lidClosedY,
  }
}

function createEye() {
  const eyeGroup = new THREE.Group()

  // White of eye
  const whiteGeo = new THREE.SphereGeometry(0.14, 20, 20)
  whiteGeo.scale(1.1, 1, 0.5)
  const whiteMat = new THREE.MeshStandardMaterial({
    color: EYE_WHITE,
    roughness: 0.3,
  })
  const white = new THREE.Mesh(whiteGeo, whiteMat)
  eyeGroup.add(white)

  // Iris
  const irisGeo = new THREE.SphereGeometry(0.07, 16, 16)
  const irisMat = new THREE.MeshStandardMaterial({
    color: IRIS_COLOR,
    roughness: 0.4,
  })
  const iris = new THREE.Mesh(irisGeo, irisMat)
  iris.position.z = 0.06
  eyeGroup.add(iris)

  // Pupil
  const pupilGeo = new THREE.SphereGeometry(0.035, 12, 12)
  const pupilMat = new THREE.MeshStandardMaterial({
    color: PUPIL_COLOR,
    roughness: 0.2,
  })
  const pupil = new THREE.Mesh(pupilGeo, pupilMat)
  pupil.position.z = 0.09
  eyeGroup.add(pupil)

  return eyeGroup
}

function createEyelid() {
  // Skin-colored disc that slides down from above the eye to cover it.
  // Uses a clipping-style approach: a box that moves down over the eye.
  const lidGroup = new THREE.Group()

  const lidGeo = new THREE.PlaneGeometry(0.34, 0.18)
  const lidMat = new THREE.MeshStandardMaterial({
    color: EYELID_COLOR,
    roughness: 0.7,
    side: THREE.DoubleSide,
  })
  const lid = new THREE.Mesh(lidGeo, lidMat)
  lidGroup.add(lid)

  // Rest position: above the eye (open). Blink target: slide down over eye center.
  // Store the lid mesh for direct Y manipulation in updateAvatar.
  lidGroup.userData = { lid }

  return lidGroup
}

function createMouth() {
  const mouthGroup = new THREE.Group()

  // Upper lip
  const upperLipShape = new THREE.Shape()
  upperLipShape.moveTo(-0.2, 0)
  upperLipShape.quadraticCurveTo(-0.1, 0.03, 0, 0.04) // Cupid's bow
  upperLipShape.quadraticCurveTo(0.1, 0.03, 0.2, 0)
  upperLipShape.quadraticCurveTo(0.1, -0.01, 0, -0.02)
  upperLipShape.quadraticCurveTo(-0.1, -0.01, -0.2, 0)

  const lipMat = new THREE.MeshStandardMaterial({
    color: LIP_COLOR,
    roughness: 0.5,
    side: THREE.DoubleSide,
  })

  const upperLipGeo = new THREE.ShapeGeometry(upperLipShape)
  const upperLip = new THREE.Mesh(upperLipGeo, lipMat)
  upperLip.position.z = 0.01
  mouthGroup.add(upperLip)

  // Lower lip
  const lowerLipShape = new THREE.Shape()
  lowerLipShape.moveTo(-0.18, 0)
  lowerLipShape.quadraticCurveTo(-0.09, -0.01, 0, -0.02)
  lowerLipShape.quadraticCurveTo(0.09, -0.01, 0.18, 0)
  lowerLipShape.quadraticCurveTo(0.09, -0.06, 0, -0.07)
  lowerLipShape.quadraticCurveTo(-0.09, -0.06, -0.18, 0)

  const lowerLipGeo = new THREE.ShapeGeometry(lowerLipShape)
  const lowerLip = new THREE.Mesh(lowerLipGeo, lipMat)
  lowerLip.position.z = 0.01
  mouthGroup.add(lowerLip)

  // Dark interior (visible when mouth opens)
  const interiorGeo = new THREE.PlaneGeometry(0.3, 0.15)
  const interiorMat = new THREE.MeshStandardMaterial({
    color: 0x3a1a1a,
    roughness: 1,
    side: THREE.DoubleSide,
  })
  const interior = new THREE.Mesh(interiorGeo, interiorMat)
  interior.position.z = -0.005
  interior.position.y = -0.02
  interior.scale.y = 0 // Hidden when closed
  mouthGroup.add(interior)

  mouthGroup.userData = { upperLip, lowerLip, interior }
  // Store rest width for smile scaling
  mouthGroup.userData.restScaleX = 1

  return mouthGroup
}

export function updateAvatar(avatar, expressions, orientation) {
  const {
    group, leftEyelid, rightEyelid, leftBrow, rightBrow, mouth,
    leftBrowRestY, rightBrowRestY, lidOpenY, lidClosedY,
  } = avatar

  // Head rotation from orientation
  const yawRad = THREE.MathUtils.degToRad(orientation.yaw * 0.7)
  const pitchRad = THREE.MathUtils.degToRad(orientation.pitch * 0.7)
  const rollRad = THREE.MathUtils.degToRad(orientation.roll * 0.5)

  group.rotation.y += (yawRad - group.rotation.y) * 0.15
  group.rotation.x += (pitchRad - group.rotation.x) * 0.15
  group.rotation.z += (rollRad - group.rotation.z) * 0.15

  // Eye blinks — slide eyelids down from open to closed position
  const leftLidTargetY = lidOpenY + (lidClosedY - lidOpenY) * expressions.eyeBlinkLeft
  const rightLidTargetY = lidOpenY + (lidClosedY - lidOpenY) * expressions.eyeBlinkRight
  leftEyelid.position.y += (leftLidTargetY - leftEyelid.position.y) * 0.4
  rightEyelid.position.y += (rightLidTargetY - rightEyelid.position.y) * 0.4

  // Brow raise — move brows up (0.15 units at full raise, clearly visible)
  const browOffset = expressions.browRaise * 0.15
  leftBrow.position.y += ((leftBrowRestY + browOffset) - leftBrow.position.y) * 0.3
  rightBrow.position.y += ((rightBrowRestY + browOffset) - rightBrow.position.y) * 0.3

  // Mouth open — separate lips vertically, show interior
  const openAmount = expressions.mouthOpen
  const { upperLip, lowerLip, interior } = mouth.userData

  const targetUpperY = openAmount * 0.04
  const targetLowerY = -openAmount * 0.1
  upperLip.position.y += (targetUpperY - upperLip.position.y) * 0.3
  lowerLip.position.y += (targetLowerY - lowerLip.position.y) * 0.3
  interior.scale.y += (openAmount - interior.scale.y) * 0.3

  // Mouth smile — widen mouth
  const smileScale = 1 + expressions.mouthSmile * 0.3
  mouth.scale.x += (smileScale - mouth.scale.x) * 0.3

  // Slight upward curl on smile
  const smileRotation = expressions.mouthSmile * 0.1
  upperLip.rotation.z += (smileRotation - upperLip.rotation.z) * 0.3
}
