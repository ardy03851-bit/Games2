# 🌿 Cozy Vale

A cozy **2.5D hand-painted valley building game** that runs entirely in the browser —
no build step, no dependencies, just `index.html` + Canvas2D. Optimized for any device,
including **iPad / touch screens** (virtual joystick + tap-to-walk + big touch buttons).

👉 **Play it on GitHub Pages** — open `index.html` from the repo root (Pages serves it automatically).

## 🎮 How to play

- **Walk:** WASD / arrow keys, the left touch-stick, or **tap the ground** to walk there.
- **Gather 🪓 (E):** stand near a tree or boulder → wood & stone (they regrow!).
- **Build 🧱 (B):** pick a piece from the palette, tap a tile to place it, **drag** to place
  fences/paths in a row, **⟳ (R)** rotates, **🗑️ (X)** removes with a 50% refund.
- **Make a home:** stone floors → walls (door & window variants) → roofs → chimney with smoke.
  Lamps, windows and campfires glow at night. Bridges & stepping stones cross the river.
- **🎲 New valley** from the menu: every seed generates a brand-new hand-crafted-looking world.
- The valley slowly cycles **day → dusk → night** (fireflies at night 🌙). Progress auto-saves.
- **The camera is fixed on purpose** — sit back and enjoy the diorama. 🍃

## 🖼️ Art

All art is **AI-generated** (painterly, simple, storybook style like the reference shots)
and stored as PNGs in `assets/` — grass/dirt/cliff/stone/water/sand tiles, three skies,
title art, UI panel, trees, bushes, rocks, mushrooms, flowers, ruins, fences, lamps, a
cottage kit (walls/roof/door/window/chimney), waterfall, glow, butterfly, cloud…
Magenta-keyed sprites are made transparent at load; grass tufts and bush/tree foliage are
pre-rendered in wind phases so **every blade and every leaf cluster moves independently**.
A procedural fallback painter covers any missing file, so the game never breaks.

## 🗺️ Terrain generation ("hand-made" look)

`js/terrain.js` — deterministic per seed:

1. **Domain-warped fBm value noise, quantized into terraces** → carved cliff plateaus.
2. A **meandering river spline** (jittered control points, Chaikin-smoothed) is carved
   through the map with sandy banks; wherever it crosses a terrace edge a **waterfall** spawns.
3. A flat central **build clearing**, plus artist-placed POIs: stone **ruins**, a flower
   **meadow**, a tree **grove**, a waterfall **overlook** with a signpost.
4. A* **dirt path network** with line-of-sight smoothing; stepping stones where it fords the river.
5. **Connectivity repair** (BFS flood fill — the causeway clamps height steps so every POI is reachable).
6. Blue-noise-ish **scatter**: dense pine forest framing the edges (the dark vignette of the
   reference art), bushes, boulders, mushroom rings, flower patches, lily pads.
7. Per-tile **grass tufts** and **hand-wobble jitter** on every quad edge so nothing looks grid-perfect.

## 🛠️ Tech

- Custom **Canvas2D 2.5D engine** (`js/render.js`): oblique projection with height levels
  (`screen = (x + y·shear)·TW, y·TH − z·Z`), terrain baked once to an offscreen canvas,
  dynamic wind/water/particles/glows on top. Chosen over WebGL for instant load, tiny size
  and buttery performance on iPads.
- Plain scripts, no frameworks — works from any static host (GitHub Pages included).
- Procedural WebAudio ambience (wind, birds, crickets, waterfall, campfire) — mutable 🔊.

## 📁 Files

```
index.html         entry point (GitHub Pages serves this)
css/style.css      cozy UI + vignette frame
js/                engine: util, assets, sprites, terrain, props, particles,
                   character, render, build, input, audio, ui, main
assets/            AI-generated art (PNG)
.nojekyll          serve as-is on Pages
```

Made with ♥ (and a simple cube with no eyes) for cozy gamers everywhere.
