# Terminal 3D Solar System

A WebGPU-accelerated 3D solar system rendered directly in your terminal using [OpenTUI](https://github.com/anomalyco/opentui) and Three.js.

![terminal-3d](https://img.shields.io/badge/terminal-3D-blueviolet)

## What it looks like

A glowing golden sun at the center, surrounded by 5 orbiting planets (blue, red with rings, green gas giant, purple ice world, gold metallic), moons, a spiraling torus-knot comet, and a starfield backdrop. The camera slowly orbits the scene. Colored point lights sweep across the scene creating dynamic shadows and highlights.

## Requirements

- **macOS** (Apple Silicon recommended) or Linux
- **[Bun](https://bun.sh)** runtime (required by OpenTUI's native Zig layer)
- Terminal with 24-bit color support (iTerm2, Ghostty, Kitty, Alacritty, etc.)

## Setup

```bash
bun install
```

## Run

```bash
bun index.ts
```

## Controls

| Key | Action |
|-----|--------|
| `W/A/S/D` | Move camera |
| `Q/E` | Rotate camera |
| `Z/X` | Zoom in/out |
| `R` | Reset camera |
| `U` | Toggle supersampling |
| `Ctrl+C` | Exit |
