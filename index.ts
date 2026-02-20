#!/usr/bin/env bun

import {
  createCliRenderer,
  RGBA,
  FrameBufferRenderable,
  TextRenderable,
  type KeyEvent,
} from "@opentui/core"
import {
  Scene,
  Mesh,
  PerspectiveCamera,
  PointLight,
  AmbientLight,
  SphereGeometry,
  TorusGeometry,
  IcosahedronGeometry,
  OctahedronGeometry,
  TorusKnotGeometry,
  Group,
  Vector3,
} from "three"
import { MeshPhongNodeMaterial } from "three/webgpu"
import { lights } from "three/tsl"
import { color } from "three/tsl"
import { ThreeCliRenderer } from "@opentui/core/3d"

async function main() {
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    targetFps: 30,
    useAlternateScreen: true,
  })
  renderer.start()

  const WIDTH = renderer.terminalWidth
  const HEIGHT = renderer.terminalHeight

  // FrameBuffer for 3D rendering
  const fbRenderable = new FrameBufferRenderable(renderer, {
    id: "scene-fb",
    width: WIDTH,
    height: HEIGHT,
    zIndex: 10,
  })
  renderer.root.add(fbRenderable)
  const { frameBuffer } = fbRenderable

  // Three.js engine
  const engine = new ThreeCliRenderer(renderer, {
    width: WIDTH,
    height: HEIGHT,
    focalLength: 8,
    backgroundColor: RGBA.fromValues(0.02, 0.0, 0.05, 1.0),
  })
  await engine.init()

  const camera = new PerspectiveCamera(60, engine.aspectRatio, 0.01, 200)
  camera.position.set(0, 8, 18)
  camera.lookAt(0, 0, 0)

  const scene = new Scene()

  // --- Lights ---
  const sunLight = new PointLight(0xffdd44, 1, 100)
  sunLight.power = 3000
  sunLight.decay = 2
  sunLight.position.set(0, 0, 0)

  const accentLight1 = new PointLight(0x4488ff, 1, 80)
  accentLight1.power = 800
  accentLight1.decay = 2

  const accentLight2 = new PointLight(0xff4488, 1, 80)
  accentLight2.power = 600
  accentLight2.decay = 2

  const ambient = new AmbientLight(0x111122, 0.3)

  scene.add(sunLight, accentLight1, accentLight2, ambient)

  const allLights = lights([sunLight, accentLight1, accentLight2])

  // --- Sun (emissive center) ---
  const sunMat = new MeshPhongNodeMaterial({ color: 0x111111 })
  sunMat.emissiveNode = color(0xffaa22)
  sunMat.lights = false
  const sunMesh = new Mesh(new IcosahedronGeometry(1.2, 3), sunMat)
  scene.add(sunMesh)

  // --- Create orbital bodies ---
  interface OrbitalBody {
    group: Group
    mesh: Mesh
    orbitRadius: number
    orbitSpeed: number
    rotationSpeed: number
    tilt: number
    yOffset: number
  }

  const bodies: OrbitalBody[] = []

  function createBody(
    geometry: any,
    hexColor: number,
    orbitRadius: number,
    orbitSpeed: number,
    rotationSpeed: number,
    tilt: number = 0,
    yOffset: number = 0
  ): OrbitalBody {
    const mat = new MeshPhongNodeMaterial({ color: hexColor })
    mat.shininess = 60
    mat.lightsNode = allLights
    const mesh = new Mesh(geometry, mat)
    const group = new Group()
    group.add(mesh)
    mesh.position.x = orbitRadius
    scene.add(group)
    return { group, mesh, orbitRadius, orbitSpeed, rotationSpeed, tilt, yOffset }
  }

  // Planet 1 - Blue rocky world
  bodies.push(createBody(
    new IcosahedronGeometry(0.5, 2),
    0x2266cc, 3.5, 1.2, 2.0, 0.1
  ))

  // Planet 2 - Red desert with rings (torus around it)
  const redPlanet = createBody(
    new OctahedronGeometry(0.6, 2),
    0xcc4422, 5.5, 0.7, 1.5, -0.15
  )
  bodies.push(redPlanet)
  // Ring around red planet
  const ringMat = new MeshPhongNodeMaterial({ color: 0xaa8866 })
  ringMat.lightsNode = allLights
  ringMat.opacity = 0.7
  const ring = new Mesh(new TorusGeometry(1.0, 0.05, 8, 32), ringMat)
  ring.rotation.x = Math.PI / 2.2
  redPlanet.mesh.add(ring)

  // Planet 3 - Green gas giant
  bodies.push(createBody(
    new SphereGeometry(0.9, 16, 12),
    0x22aa44, 8.0, 0.4, 0.8, 0.2
  ))

  // Planet 4 - Purple ice world
  bodies.push(createBody(
    new IcosahedronGeometry(0.35, 1),
    0x8844cc, 10.5, 0.25, 3.0, -0.1, 0.5
  ))

  // Planet 5 - Gold metallic
  bodies.push(createBody(
    new OctahedronGeometry(0.45, 3),
    0xccaa22, 13.0, 0.15, 1.2, 0.05
  ))

  // --- Orbiting moons (smaller bodies orbiting planets) ---
  interface Moon {
    mesh: Mesh
    parent: Mesh
    orbitRadius: number
    speed: number
  }
  const moons: Moon[] = []

  function addMoon(parent: OrbitalBody, moonColor: number, radius: number, speed: number) {
    const mat = new MeshPhongNodeMaterial({ color: moonColor })
    mat.lightsNode = allLights
    const moonMesh = new Mesh(new SphereGeometry(0.12, 8, 6), mat)
    parent.mesh.add(moonMesh)
    moons.push({ mesh: moonMesh, parent: parent.mesh, orbitRadius: radius, speed })
  }

  addMoon(bodies[2], 0x88ccaa, 1.5, 2.5) // Green planet moon
  addMoon(bodies[2], 0xaabb88, 2.0, 1.8)  // Second moon
  addMoon(bodies[4], 0xeedd88, 1.0, 3.0)  // Gold planet moon

  // --- Floating torus knot (asteroid/comet) ---
  const cometMat = new MeshPhongNodeMaterial({ color: 0x44ddff })
  cometMat.shininess = 120
  cometMat.lightsNode = allLights
  const comet = new Mesh(new TorusKnotGeometry(0.3, 0.08, 64, 8, 2, 3), cometMat)
  scene.add(comet)

  // --- Starfield (distant small spheres) ---
  for (let i = 0; i < 40; i++) {
    const starMat = new MeshPhongNodeMaterial({ color: 0x222222 })
    starMat.emissiveNode = color(0xffffff)
    starMat.lights = false
    const star = new Mesh(new SphereGeometry(0.05, 4, 4), starMat)
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI
    const r = 25 + Math.random() * 15
    star.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta) - 5 + Math.random() * 10,
      r * Math.cos(phi)
    )
    scene.add(star)
  }

  engine.setActiveCamera(camera)
  scene.add(camera)

  // --- HUD Text ---
  const titleText = new TextRenderable(renderer, {
    id: "title",
    content: "✦ Terminal Solar System ✦",
    position: "absolute",
    fg: "#FFDD44",
    zIndex: 20,
    left: 2,
    top: 0,
  })
  renderer.root.add(titleText)

  const controlsText = new TextRenderable(renderer, {
    id: "controls",
    content: "WASD: Move | QE: Rotate | ZX: Zoom | Ctrl+C: Exit",
    position: "absolute",
    fg: "#888888",
    zIndex: 20,
    left: 2,
    top: HEIGHT - 1,
  })
  renderer.root.add(controlsText)

  // --- Resize handler ---
  renderer.on("resize", (w: number, h: number) => {
    frameBuffer.resize(w, h)
    engine.setSize(w, h)
    camera.aspect = engine.aspectRatio
    camera.updateProjectionMatrix()
    controlsText.y = h - 1
  })

  // --- Keyboard controls ---
  renderer.keyInput.on("keypress", (key: KeyEvent) => {
    const speed = 0.5
    if (key.name === "w") camera.translateY(speed)
    if (key.name === "s") camera.translateY(-speed)
    if (key.name === "a") camera.translateX(-speed)
    if (key.name === "d") camera.translateX(speed)
    if (key.name === "q") camera.rotateY(0.08)
    if (key.name === "e") camera.rotateY(-0.08)
    if (key.name === "z") camera.translateZ(1)
    if (key.name === "x") camera.translateZ(-1)
    if (key.name === "u") engine.toggleSuperSampling()
    if (key.name === "r") {
      camera.position.set(0, 8, 18)
      camera.rotation.set(0, 0, 0)
      camera.quaternion.set(0, 0, 0, 1)
      camera.up.set(0, 1, 0)
      camera.lookAt(0, 0, 0)
    }
  })

  // --- Animation loop ---
  const animate = async (deltaTime: number) => {
    const time = performance.now() / 1000

    // Sun pulsation
    const pulse = 1.0 + Math.sin(time * 2) * 0.05
    sunMesh.scale.set(pulse, pulse, pulse)
    sunMesh.rotation.y = time * 0.3

    // Orbit planets
    for (const body of bodies) {
      const angle = time * body.orbitSpeed
      body.group.rotation.y = angle
      body.group.rotation.z = body.tilt
      body.mesh.rotation.y += body.rotationSpeed * deltaTime
      body.mesh.rotation.x += body.rotationSpeed * 0.3 * deltaTime
      body.mesh.position.y = body.yOffset + Math.sin(time * body.orbitSpeed * 0.5) * 0.3
    }

    // Orbit moons
    for (const moon of moons) {
      const mAngle = time * moon.speed
      moon.mesh.position.x = Math.cos(mAngle) * moon.orbitRadius
      moon.mesh.position.z = Math.sin(mAngle) * moon.orbitRadius
      moon.mesh.position.y = Math.sin(mAngle * 0.7) * 0.2
    }

    // Comet on elliptical orbit
    const cometAngle = time * 0.6
    comet.position.x = Math.cos(cometAngle) * 16
    comet.position.z = Math.sin(cometAngle) * 8
    comet.position.y = Math.sin(cometAngle * 2) * 3
    comet.rotation.x = time * 2
    comet.rotation.z = time * 1.5

    // Moving accent lights
    accentLight1.position.x = Math.sin(time * 0.3) * 12
    accentLight1.position.y = Math.cos(time * 0.4) * 5
    accentLight1.position.z = Math.cos(time * 0.2) * 12

    accentLight2.position.x = Math.cos(time * 0.25) * 10
    accentLight2.position.y = Math.sin(time * 0.35) * 4
    accentLight2.position.z = Math.sin(time * 0.3) * 10

    // Slow camera orbit
    const camAngle = time * 0.08
    camera.position.x = Math.sin(camAngle) * 18
    camera.position.z = Math.cos(camAngle) * 18
    camera.position.y = 6 + Math.sin(time * 0.15) * 3
    camera.lookAt(0, 0, 0)

    await engine.drawScene(scene, frameBuffer, deltaTime)
  }

  renderer.on("frame", animate)
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
