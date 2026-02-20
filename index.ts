#!/usr/bin/env bun

import {
  createCliRenderer,
  RGBA,
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
  BoxGeometry,
  CylinderGeometry,
  ConeGeometry,
  DodecahedronGeometry,
  Group,
} from "three"
import { MeshPhongNodeMaterial } from "three/webgpu"
import { lights, color } from "three/tsl"
import { ThreeRenderable } from "@opentui/core/3d"

interface SceneDef {
  title: string
  build: () => { scene: Scene; animate: (time: number, deltaTime: number) => void }
  orbitRadius: number
  orbitHeight: number
  orbitSpeed: number
}

// ─── Scene 1: Solar System ───────────────────────────────────────────

function buildSolarSystem(): { scene: Scene; animate: (time: number, deltaTime: number) => void } {
  const scene = new Scene()

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

  // Sun
  const sunMat = new MeshPhongNodeMaterial({ color: 0x111111 })
  sunMat.emissiveNode = color(0xffaa22)
  sunMat.lights = false
  const sunMesh = new Mesh(new IcosahedronGeometry(1.2, 3), sunMat)
  scene.add(sunMesh)

  // Orbital bodies
  interface OrbitalBody {
    group: Group; mesh: Mesh; orbitRadius: number; orbitSpeed: number
    rotationSpeed: number; tilt: number; yOffset: number
  }
  const bodies: OrbitalBody[] = []

  function createBody(geometry: any, hexColor: number, orbitRadius: number,
    orbitSpeed: number, rotationSpeed: number, tilt = 0, yOffset = 0): OrbitalBody {
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

  bodies.push(createBody(new IcosahedronGeometry(0.5, 2), 0x2266cc, 3.5, 1.2, 2.0, 0.1))

  const redPlanet = createBody(new OctahedronGeometry(0.6, 2), 0xcc4422, 5.5, 0.7, 1.5, -0.15)
  bodies.push(redPlanet)
  const ringMat = new MeshPhongNodeMaterial({ color: 0xaa8866 })
  ringMat.lightsNode = allLights
  ringMat.opacity = 0.7
  const ring = new Mesh(new TorusGeometry(1.0, 0.05, 8, 32), ringMat)
  ring.rotation.x = Math.PI / 2.2
  redPlanet.mesh.add(ring)

  bodies.push(createBody(new SphereGeometry(0.9, 16, 12), 0x22aa44, 8.0, 0.4, 0.8, 0.2))
  bodies.push(createBody(new IcosahedronGeometry(0.35, 1), 0x8844cc, 10.5, 0.25, 3.0, -0.1, 0.5))
  bodies.push(createBody(new OctahedronGeometry(0.45, 3), 0xccaa22, 13.0, 0.15, 1.2, 0.05))

  // Moons
  interface Moon { mesh: Mesh; orbitRadius: number; speed: number }
  const moons: Moon[] = []
  function addMoon(parent: OrbitalBody, moonColor: number, radius: number, speed: number) {
    const mat = new MeshPhongNodeMaterial({ color: moonColor })
    mat.lightsNode = allLights
    const moonMesh = new Mesh(new SphereGeometry(0.12, 8, 6), mat)
    parent.mesh.add(moonMesh)
    moons.push({ mesh: moonMesh, orbitRadius: radius, speed })
  }
  addMoon(bodies[2], 0x88ccaa, 1.5, 2.5)
  addMoon(bodies[2], 0xaabb88, 2.0, 1.8)
  addMoon(bodies[4], 0xeedd88, 1.0, 3.0)

  // Comet
  const cometMat = new MeshPhongNodeMaterial({ color: 0x44ddff })
  cometMat.shininess = 120
  cometMat.lightsNode = allLights
  const comet = new Mesh(new TorusKnotGeometry(0.3, 0.08, 64, 8, 2, 3), cometMat)
  scene.add(comet)

  // Starfield
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

  return {
    scene,
    animate(time, deltaTime) {
      const pulse = 1.0 + Math.sin(time * 2) * 0.05
      sunMesh.scale.set(pulse, pulse, pulse)
      sunMesh.rotation.y = time * 0.3

      for (const body of bodies) {
        body.group.rotation.y = time * body.orbitSpeed
        body.group.rotation.z = body.tilt
        body.mesh.rotation.y += body.rotationSpeed * deltaTime
        body.mesh.rotation.x += body.rotationSpeed * 0.3 * deltaTime
        body.mesh.position.y = body.yOffset + Math.sin(time * body.orbitSpeed * 0.5) * 0.3
      }
      for (const moon of moons) {
        const a = time * moon.speed
        moon.mesh.position.set(Math.cos(a) * moon.orbitRadius, Math.sin(a * 0.7) * 0.2, Math.sin(a) * moon.orbitRadius)
      }

      const ca = time * 0.6
      comet.position.set(Math.cos(ca) * 16, Math.sin(ca * 2) * 3, Math.sin(ca) * 8)
      comet.rotation.x = time * 2
      comet.rotation.z = time * 1.5

      accentLight1.position.set(Math.sin(time * 0.3) * 12, Math.cos(time * 0.4) * 5, Math.cos(time * 0.2) * 12)
      accentLight2.position.set(Math.cos(time * 0.25) * 10, Math.sin(time * 0.35) * 4, Math.sin(time * 0.3) * 10)
    },
  }
}

// ─── Scene 2: Geometric Garden ───────────────────────────────────────

function buildGeometricGarden(): { scene: Scene; animate: (time: number, deltaTime: number) => void } {
  const scene = new Scene()

  const light1 = new PointLight(0xff6633, 1, 60)
  light1.power = 2000
  light1.decay = 2
  const light2 = new PointLight(0x33ccff, 1, 60)
  light2.power = 2000
  light2.decay = 2
  const light3 = new PointLight(0xaaff33, 1, 60)
  light3.power = 1500
  light3.decay = 2
  const ambient = new AmbientLight(0x221133, 0.4)
  scene.add(light1, light2, light3, ambient)

  const allLights3 = lights([light1, light2, light3])

  const geometries = [
    new BoxGeometry(1, 1, 1),
    new OctahedronGeometry(0.7, 0),
    new IcosahedronGeometry(0.6, 0),
    new DodecahedronGeometry(0.6, 0),
    new TorusKnotGeometry(0.4, 0.15, 64, 8, 2, 3),
    new TorusGeometry(0.5, 0.2, 8, 16),
    new ConeGeometry(0.5, 1.2, 6),
    new CylinderGeometry(0.3, 0.5, 1, 8),
  ]
  const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff, 0xff8833, 0x88ff33]

  const shapes: { mesh: Mesh; baseY: number; idx: number }[] = []

  // Arrange in a spiral
  for (let i = 0; i < geometries.length; i++) {
    const angle = (i / geometries.length) * Math.PI * 2
    const radius = 3 + i * 0.8
    const mat = new MeshPhongNodeMaterial({ color: colors[i] })
    mat.shininess = 80
    mat.lightsNode = allLights3
    const mesh = new Mesh(geometries[i], mat)
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    mesh.position.set(x, 0, z)
    scene.add(mesh)
    shapes.push({ mesh, baseY: 0, idx: i })
  }

  // Center piece - large emissive torus knot
  const centerMat = new MeshPhongNodeMaterial({ color: 0x111111 })
  centerMat.emissiveNode = color(0xff33aa)
  centerMat.lights = false
  const center = new Mesh(new TorusKnotGeometry(0.8, 0.25, 128, 16, 3, 5), centerMat)
  scene.add(center)

  // Ground ring
  const groundMat = new MeshPhongNodeMaterial({ color: 0x443366 })
  groundMat.lightsNode = allLights3
  const ground = new Mesh(new TorusGeometry(10, 0.08, 4, 64), groundMat)
  ground.rotation.x = Math.PI / 2
  ground.position.y = -2
  scene.add(ground)

  return {
    scene,
    animate(time) {
      center.rotation.x = time * 0.5
      center.rotation.y = time * 0.3
      const cp = 1.0 + Math.sin(time * 3) * 0.1
      center.scale.set(cp, cp, cp)

      for (const s of shapes) {
        s.mesh.rotation.x = time * (0.5 + s.idx * 0.15)
        s.mesh.rotation.y = time * (0.3 + s.idx * 0.1)
        s.mesh.position.y = Math.sin(time * 1.5 + s.idx * 0.8) * 1.5
      }

      light1.position.set(Math.sin(time * 0.7) * 8, 4, Math.cos(time * 0.5) * 8)
      light2.position.set(Math.cos(time * 0.6) * 8, -2, Math.sin(time * 0.8) * 8)
      light3.position.set(Math.sin(time * 0.4) * 6, Math.cos(time * 0.9) * 4, Math.cos(time * 0.3) * 6)
    },
  }
}

// ─── Scene 3: Asteroid Field ─────────────────────────────────────────

function buildAsteroidField(): { scene: Scene; animate: (time: number, deltaTime: number) => void } {
  const scene = new Scene()

  // Distant star light
  const starLight = new PointLight(0xffeedd, 1, 200)
  starLight.power = 5000
  starLight.decay = 2
  starLight.position.set(30, 20, -30)

  const nebulaLight1 = new PointLight(0x6622cc, 1, 80)
  nebulaLight1.power = 1200
  nebulaLight1.decay = 2
  const nebulaLight2 = new PointLight(0xcc2255, 1, 80)
  nebulaLight2.power = 800
  nebulaLight2.decay = 2

  const ambient = new AmbientLight(0x0a0515, 0.2)
  scene.add(starLight, nebulaLight1, nebulaLight2, ambient)

  const allLightsA = lights([starLight, nebulaLight1, nebulaLight2])

  // Asteroids - randomized rocky shapes
  const asteroids: { mesh: Mesh; spinX: number; spinY: number; driftAngle: number; driftRadius: number; driftSpeed: number; baseY: number }[] = []
  const rockColors = [0x665544, 0x554433, 0x776655, 0x887766, 0x443322, 0x998877]

  for (let i = 0; i < 50; i++) {
    const geomChoice = Math.random()
    const size = 0.15 + Math.random() * 0.6
    const geom = geomChoice < 0.4
      ? new IcosahedronGeometry(size, 0)
      : geomChoice < 0.7
        ? new OctahedronGeometry(size, 0)
        : new DodecahedronGeometry(size, 0)

    const mat = new MeshPhongNodeMaterial({ color: rockColors[Math.floor(Math.random() * rockColors.length)] })
    mat.shininess = 20
    mat.lightsNode = allLightsA
    const mesh = new Mesh(geom, mat)

    const angle = Math.random() * Math.PI * 2
    const radius = 3 + Math.random() * 15
    const y = (Math.random() - 0.5) * 8
    mesh.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius)
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
    scene.add(mesh)
    asteroids.push({
      mesh, spinX: (Math.random() - 0.5) * 2, spinY: (Math.random() - 0.5) * 2,
      driftAngle: angle, driftRadius: radius, driftSpeed: 0.02 + Math.random() * 0.08, baseY: y,
    })
  }

  // A few glowing nebula clouds (large emissive spheres)
  const nebulaColors = [0x4411aa, 0xaa1155, 0x1144aa]
  for (let i = 0; i < 3; i++) {
    const mat = new MeshPhongNodeMaterial({ color: 0x000000 })
    mat.emissiveNode = color(nebulaColors[i])
    mat.lights = false
    const cloud = new Mesh(new SphereGeometry(2 + Math.random() * 2, 8, 6), mat)
    const a = (i / 3) * Math.PI * 2
    cloud.position.set(Math.cos(a) * 20, (Math.random() - 0.5) * 10, Math.sin(a) * 20)
    scene.add(cloud)
  }

  // Starfield
  for (let i = 0; i < 60; i++) {
    const mat = new MeshPhongNodeMaterial({ color: 0x111111 })
    mat.emissiveNode = color(0xddddff)
    mat.lights = false
    const star = new Mesh(new SphereGeometry(0.04, 4, 4), mat)
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI
    const r = 30 + Math.random() * 20
    star.position.set(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi))
    scene.add(star)
  }

  return {
    scene,
    animate(time, deltaTime) {
      for (const a of asteroids) {
        a.mesh.rotation.x += a.spinX * deltaTime
        a.mesh.rotation.y += a.spinY * deltaTime
        const angle = a.driftAngle + time * a.driftSpeed
        a.mesh.position.x = Math.cos(angle) * a.driftRadius
        a.mesh.position.z = Math.sin(angle) * a.driftRadius
        a.mesh.position.y = a.baseY + Math.sin(time * a.driftSpeed * 3) * 0.5
      }

      nebulaLight1.position.set(Math.sin(time * 0.15) * 15, Math.cos(time * 0.2) * 6, Math.cos(time * 0.1) * 15)
      nebulaLight2.position.set(Math.cos(time * 0.12) * 12, Math.sin(time * 0.18) * 5, Math.sin(time * 0.14) * 12)
    },
  }
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    targetFps: 30,
    useAlternateScreen: true,
  })
  renderer.start()

  const WIDTH = renderer.terminalWidth
  const HEIGHT = renderer.terminalHeight

  const sceneDefs: SceneDef[] = [
    { title: "Solar System", build: buildSolarSystem, orbitRadius: 18, orbitHeight: 6, orbitSpeed: 0.08 },
    { title: "Geometric Garden", build: buildGeometricGarden, orbitRadius: 14, orbitHeight: 5, orbitSpeed: 0.12 },
    { title: "Asteroid Field", build: buildAsteroidField, orbitRadius: 20, orbitHeight: 4, orbitSpeed: 0.05 },
  ]

  const camera = new PerspectiveCamera(60, 1, 0.01, 200)
  camera.position.set(0, 8, 18)
  camera.lookAt(0, 0, 0)

  // Build initial scene
  let currentIndex = 0
  let { scene: currentScene, animate: currentAnimate } = sceneDefs[0].build()
  currentScene.add(camera)

  const threeView = new ThreeRenderable(renderer, {
    id: "scene-3d",
    width: WIDTH,
    height: HEIGHT,
    zIndex: 10,
    scene: currentScene,
    camera,
    renderer: {
      backgroundColor: RGBA.fromValues(0.02, 0.0, 0.05, 1.0),
    },
  })
  renderer.root.add(threeView)
  const engine = threeView.renderer

  function switchScene(index: number) {
    if (index === currentIndex || index < 0 || index >= sceneDefs.length) return
    currentScene.remove(camera)
    currentIndex = index
    const built = sceneDefs[index].build()
    currentScene = built.scene
    currentAnimate = built.animate
    currentScene.add(camera)
    threeView.setScene(currentScene)
    titleText.content = `✦ ${sceneDefs[index].title} ✦`
    camOffset.x = 0
    camOffset.y = 0
    camOffset.z = 0
    camOffset.rotY = 0
  }

  // --- HUD Text ---
  const titleText = new TextRenderable(renderer, {
    id: "title",
    content: `✦ ${sceneDefs[0].title} ✦`,
    position: "absolute",
    fg: "#FFDD44",
    zIndex: 20,
    left: 2,
    top: 0,
  })
  renderer.root.add(titleText)

  const controlsText = new TextRenderable(renderer, {
    id: "controls",
    content: "Arrows/WASD: Move | QE: Rotate | ZX: Zoom | 1-3: Scene | R: Reset | Ctrl+C: Exit",
    position: "absolute",
    fg: "#888888",
    zIndex: 20,
    left: 2,
    top: HEIGHT - 1,
  })
  renderer.root.add(controlsText)

  // --- Resize handler ---
  renderer.on("resize", (w: number, h: number) => {
    controlsText.y = h - 1
  })

  // --- Keyboard controls ---
  const camOffset = { x: 0, y: 0, z: 0, rotY: 0 }
  renderer.keyInput.on("keypress", (key: KeyEvent) => {
    const speed = 0.5
    if (key.name === "w" || key.name === "up") camOffset.y += speed
    if (key.name === "s" || key.name === "down") camOffset.y -= speed
    if (key.name === "a" || key.name === "left") camOffset.x -= speed
    if (key.name === "d" || key.name === "right") camOffset.x += speed
    if (key.name === "q") camOffset.rotY += 0.08
    if (key.name === "e") camOffset.rotY -= 0.08
    if (key.name === "z") camOffset.z += 1
    if (key.name === "x") camOffset.z -= 1
    if (key.name === "u") engine.toggleSuperSampling()
    if (key.name === "r") {
      camOffset.x = 0
      camOffset.y = 0
      camOffset.z = 0
      camOffset.rotY = 0
    }
    if (key.name === "1") switchScene(0)
    if (key.name === "2") switchScene(1)
    if (key.name === "3") switchScene(2)
  })

  // --- Animation loop ---
  renderer.setFrameCallback(async (deltaTime: number) => {
    const time = performance.now() / 1000
    const def = sceneDefs[currentIndex]

    currentAnimate(time, deltaTime)

    // Camera orbit + user offsets
    const camAngle = time * def.orbitSpeed + camOffset.rotY
    const orbitRadius = def.orbitRadius + camOffset.z
    camera.position.x = Math.sin(camAngle) * orbitRadius + camOffset.x
    camera.position.z = Math.cos(camAngle) * orbitRadius
    camera.position.y = def.orbitHeight + Math.sin(time * 0.15) * 3 + camOffset.y
    camera.lookAt(camOffset.x, camOffset.y, 0)
  })
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
