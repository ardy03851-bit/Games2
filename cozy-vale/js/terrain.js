/* Cozy Vale — advanced hand-crafted-feel terrain generation.
   Domain-warped fBm quantized into terraces (carved cliffs), a meandering river
   spline with waterfalls wherever it crosses a terrace edge, artist-placed POIs
   (ruins, meadow, grove), a dirt path network, connectivity repair, blue-noise-ish
   scatter of trees/bushes/rocks, per-tile grass tufts, and hand-wobble jitter. */
(function () {
  const CV = window.CV;
  CV.TW = 76; CV.TH = 30; CV.SHEAR = 0.22; CV.Z = 34;
  CV.T = { GRASS: 0, DIRT: 1, STONE: 2, SAND: 3, WATER: 4 };

  // world-tile coords -> world px (before camera). z = height level.
  CV.proj = function (x, y, z) {
    return [(x + y * CV.SHEAR) * CV.TW, y * CV.TH - (z || 0) * CV.Z];
  };

  function distSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = CV.clamp(t, 0, 1);
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
  }

  function chaikin(pts) {
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      out.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
      out.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  CV.genWorld = function (seedNum, seedStr) {
    const W = 22, H = 22;
    const rng = CV.mulberry32(seedNum);
    const nz = CV.makeNoise(seedNum);
    const idx = (x, y) => y * W + x;
    const h = new Uint8Array(W * H);
    const type = new Uint8Array(W * H); // default GRASS

    // ---- 1) terraced base heights (domain-warped fBm, quantized = carved cliffs) ----
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let n = nz.warp(x * 0.105 + 13.7, y * 0.105 + 7.3, 2.4, 4);
      let hh = Math.floor(n * 4.4) + Math.floor(((x + y) / (W + H)) * 1.4);
      h[idx(x, y)] = CV.clamp(hh, 0, 4);
    }

    // ---- 2) meandering river spline across the map ----
    const edge = (rng() * 4) | 0;
    const edgePt = (side, t) => {
      if (side === 0) return { x: t * (W - 1), y: 0 };
      if (side === 1) return { x: W - 1, y: t * (H - 1) };
      if (side === 2) return { x: t * (W - 1), y: H - 1 };
      return { x: 0, y: t * (H - 1) };
    };
    const sideB = (edge + 2) % 4;
    let ctrl = [edgePt(edge, 0.15 + rng() * 0.7), edgePt(sideB, 0.15 + rng() * 0.7)];
    const midN = 4 + (rng() * 3 | 0);
    for (let i = 1; i <= midN; i++) {
      const t = i / (midN + 1);
      const a = ctrl[0], b = ctrl[1];
      const mx = CV.lerp(a.x, b.x, t) + (rng() - 0.5) * 7;
      const my = CV.lerp(a.y, b.y, t) + (rng() - 0.5) * 7;
      ctrl.splice(ctrl.length - 1, 0, { x: mx, y: my });
    }
    let river = chaikin(chaikin(ctrl));
    const riverDist = new Float32Array(W * H).fill(99);
    const riverFlow = new Float32Array(W * H * 2);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let best = 99, bfx = 0, bfy = 1;
      for (let i = 0; i < river.length - 1; i++) {
        const a = river[i], b = river[i + 1];
        const d = distSeg(x + 0.5, y + 0.5, a.x, a.y, b.x, b.y);
        if (d < best) {
          best = d;
          const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
          bfx = dx / l; bfy = dy / l;
        }
      }
      riverDist[idx(x, y)] = best;
      riverFlow[idx(x, y) * 2] = bfx; riverFlow[idx(x, y) * 2 + 1] = bfy;
      if (best < 1.0 + 0.3 * nz.noise(x * 0.5 + 3, y * 0.5 + 9)) { type[idx(x, y)] = CV.T.WATER; h[idx(x, y)] = 0; }
      else if (best < 1.9) { type[idx(x, y)] = CV.T.SAND; h[idx(x, y)] = 0; }
    }

    // ---- 3) central build clearing ----
    const cx = W >> 1, cy = H >> 1;
    const spawnLevel = CV.clamp(h[idx(cx, cy)] || 2, 1, 3);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d < 4.6) { h[idx(x, y)] = spawnLevel; type[idx(x, y)] = CV.T.GRASS; }
    }
    const spawn = { x: cx, y: cy };

    // ---- 4) points of interest: ruins, meadow, grove ----
    const poiAngle = () => rng() * CV.TAU;
    const ruins = { x: CV.clamp(Math.round(cx + Math.cos(poiAngle()) * 7), 3, W - 4), y: CV.clamp(Math.round(cy + Math.sin(poiAngle()) * 6.5), 3, H - 4) };
    const meadow = { x: CV.clamp(Math.round(cx + Math.cos(poiAngle()) * (8 + rng() * 3)), 3, W - 4), y: CV.clamp(Math.round(cy + Math.sin(poiAngle()) * (7 + rng() * 3)), 3, H - 4) };
    const grove = { x: CV.clamp(Math.round(cx + Math.cos(poiAngle()) * 8.5), 3, W - 4), y: CV.clamp(Math.round(cy + Math.sin(poiAngle()) * 8), 3, H - 4) };
    function flatten(px, py, r, lv, ty) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const d = Math.hypot(x - px, y - py);
        if (d < r) { h[idx(x, y)] = lv; if (ty != null || d < r * 0.72) type[idx(x, y)] = (d < r * 0.72 ? ty : CV.T.GRASS); }
      }
    }
    flatten(ruins.x, ruins.y, 3.0, CV.clamp(h[idx(ruins.x, ruins.y)] || 2, 1, 3), CV.T.STONE);
    flatten(meadow.x, meadow.y, 2.6, CV.clamp(h[idx(meadow.x, meadow.y)] || 2, 1, 3), CV.T.GRASS);
    flatten(grove.x, grove.y, 3.2, CV.clamp(h[idx(grove.x, grove.y)] || 2, 1, 3), CV.T.GRASS);

    // shallow sandy banks along the river so stepping stones are always crossable (|dh|<=1)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      if (type[i] === CV.T.WATER) continue;
      let adj = false;
      for (let dy = -1; dy <= 1 && !adj; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < W && ny < H && type[idx(nx, ny)] === CV.T.WATER) { adj = true; break; }
      }
      if (adj && h[i] > 1) { h[i] = 1; if (type[i] === CV.T.GRASS) type[i] = CV.T.SAND; }
    }

    // ---- 5) dirt path network from spawn to POIs (+ a river ford) ----
    const props = [];
    const propAt = new Int16Array(W * H).fill(-1); // index into props, -1 none (big props block paths)
    const walkCost = (x, y) => {
      const t = type[idx(x, y)];
      let c = 1;
      if (t === CV.T.WATER) c += 9;
      if (t === CV.T.DIRT) c -= 0.4;
      if (propAt[idx(x, y)] >= 0) c += 4;
      return c;
    };
    const passable = (x, y) => true;
    function carvePath(goal) {
      const path = CV.astar(W, H, passable, walkCost, spawn, goal, 6000);
      if (!path) return;
      // greedy line-of-sight smoothing
      const smooth = [path[0]];
      let i = 0;
      while (i < path.length - 1) {
        let j = path.length - 1;
        for (; j > i + 1; j--) {
          let ok = true;
          const steps = Math.max(Math.abs(path[j].x - path[i].x), Math.abs(path[j].y - path[i].y));
          for (let s = 0; s <= steps; s++) {
            const x = Math.round(CV.lerp(path[i].x, path[j].x, s / steps));
            const y = Math.round(CV.lerp(path[i].y, path[j].y, s / steps));
            if (type[idx(x, y)] === CV.T.WATER && steps > 2) { ok = false; break; }
          }
          if (ok) break;
        }
        smooth.push(path[j]); i = j;
      }
      // mark EVERY tile along each smoothed segment (endpoints-only marking left gaps)
      for (let k = 0; k < smooth.length - 1; k++) {
        const a = smooth[k], b = smooth[k + 1];
        const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y), 1);
        for (let s = 0; s <= steps; s++) {
          const x = Math.round(CV.lerp(a.x, b.x, s / steps));
          const y = Math.round(CV.lerp(a.y, b.y, s / steps));
          const t = type[idx(x, y)];
          if (t === CV.T.GRASS) type[idx(x, y)] = CV.T.DIRT;
          if (t === CV.T.WATER && !props.some((pp) => pp.kind === 'stepping' && pp.x === x && pp.y === y))
            props.push({ kind: 'stepping', x, y, variant: (rng() * 3) | 0, scale: 0.9 + rng() * 0.2, phase: rng() * CV.TAU });
        }
      }
    }
    carvePath(ruins); carvePath(meadow); carvePath(grove);
    // ford to a river bank
    let ford = null;
    for (let y = 0; y < H && !ford; y++) for (let x = 0; x < W && !ford; x++)
      if (type[idx(x, y)] === CV.T.SAND && Math.hypot(x - cx, y - cy) > 4) ford = { x, y };
    if (ford) carvePath(ford);

    // ---- 6) connectivity repair: flatten steps along a fallback path ----
    function bfs() {
      const seen = new Uint8Array(W * H);
      const q = [idx(spawn.x, spawn.y)]; seen[q[0]] = 1;
      while (q.length) {
        const c = q.pop(), x = c % W, y = (c / W) | 0;
        for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + d[0], ny = y + d[1];
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const ni = idx(nx, ny);
          if (seen[ni]) continue;
          if (type[ni] === CV.T.WATER) {
            if (!props.some((p) => p.kind === 'stepping' && p.x === nx && p.y === ny)) continue;
          }
          if (Math.abs(h[ni] - h[c]) > 1) continue;
          seen[ni] = 1; q.push(ni);
        }
      }
      return seen;
    }
    let seen = bfs();
    [ruins, meadow, grove].forEach((p) => {
      if (seen[idx(p.x, p.y)]) return;
      // carve a straight dirt causeway and clamp steps
      const steps = Math.max(Math.abs(p.x - spawn.x), Math.abs(p.y - spawn.y));
      let prevH = h[idx(spawn.x, spawn.y)];
      for (let s = 0; s <= steps; s++) {
        const x = Math.round(CV.lerp(spawn.x, p.x, s / steps));
        const y = Math.round(CV.lerp(spawn.y, p.y, s / steps));
        const i = idx(x, y);
        if (type[i] !== CV.T.WATER) {
          type[i] = CV.T.DIRT;
          let adjWater = false;
          for (let dy = -1; dy <= 1 && !adjWater; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < W && ny < H && type[idx(nx, ny)] === CV.T.WATER) { adjWater = true; break; }
          }
          h[i] = adjWater ? Math.min(h[i], 1) : CV.clamp(h[i], prevH - 1, prevH + 1);
        }
        else if (!props.some((pp) => pp.kind === 'stepping' && pp.x === x && pp.y === y))
          props.push({ kind: 'stepping', x, y, variant: 0, scale: 1, phase: 0 });
        prevH = h[i];
      }
      seen = bfs();
    });

    // ---- 7) waterfalls where the river crosses a terrace edge ----
    const waterfalls = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (type[idx(x, y)] === CV.T.WATER) continue;
      if (h[idx(x, y)] < 1) continue;
      if (x + 1 < W && type[idx(x + 1, y)] === CV.T.WATER) waterfalls.push({ x, y, dir: 'E', drop: h[idx(x, y)] });
      if (y + 1 < H && type[idx(x, y + 1)] === CV.T.WATER) waterfalls.push({ x, y, dir: 'S', drop: h[idx(x, y)] });
    }
    waterfalls.sort((a, b) => b.drop - a.drop);
    const waterfallList = waterfalls.slice(0, 6);
    // overlook POI at the biggest waterfall
    let overlook = null;
    if (waterfallList.length) {
      const wf = waterfallList[0];
      overlook = { x: wf.x, y: wf.y };
      props.push({ kind: 'sign', x: wf.x, y: Math.max(0, wf.y - 1), variant: 0, scale: 1, phase: rng() * CV.TAU });
    }

    // ---- 8) scatter: forest frame at edges, POI dressing, blue-noise-ish spacing ----
    const order = [];
    for (let i = 0; i < W * H; i++) order.push(i);
    for (let i = order.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; const t = order[i]; order[i] = order[j]; order[j] = t; }
    let treeCount = 0, bushCount = 0;
    const nearTree = (x, y) => {
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const pi = propAt[idx(nx, ny)];
        if (pi >= 0 && (props[pi].kind === 'pine' || props[pi].kind === 'roundtree')) return true;
      }
      return false;
    };
    const freeForTree = (x, y) => {
      if (Math.hypot(x - cx, y - cy) < 5.4) return false;
      if (Math.hypot(x - ruins.x, y - ruins.y) < 3.4) return false;
      if (Math.hypot(x - grove.x, y - grove.y) < 1.6) return false;
      if (type[idx(x, y)] !== CV.T.GRASS) return false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const pi = propAt[idx(nx, ny)];
        if (pi >= 0 && (props[pi].kind === 'pine' || props[pi].kind === 'roundtree' || props[pi].kind === 'rock')) return false;
      }
      return true;
    };
    for (const i of order) {
      const x = i % W, y = (i / W) | 0;
      const t = type[i];
      const edgeD = Math.min(x, y, W - 1 - x, H - 1 - y);
      const r = rng();
      if (t === CV.T.WATER) { if (r < 0.3) props.push({ kind: 'lilypad', x, y, variant: (rng() * 3) | 0, scale: 0.7 + rng() * 0.5, phase: rng() * CV.TAU }); continue; }
      if (t === CV.T.GRASS || t === CV.T.SAND) {
        let pTree = edgeD < 4 ? 0.62 : edgeD < 7 ? 0.24 : 0.09;
        if (h[i] >= 3) pTree += 0.18;
        if (Math.hypot(x - grove.x, y - grove.y) < 3.2) pTree = 0.85; // the grove
        if (r < pTree && treeCount < 85 && freeForTree(x, y)) {
          const kind = (h[i] >= 2 || edgeD < 4 || rng() < 0.45) ? 'pine' : 'roundtree';
          props.push({ kind, x, y, variant: (rng() * 3) | 0, scale: 0.9 + rng() * 0.55, phase: rng() * CV.TAU });
          propAt[i] = props.length - 1; treeCount++; continue;
        }
        const inMeadow = Math.hypot(x - meadow.x, y - meadow.y) < 2.6;
        if (r < (inMeadow ? 0.85 : 0.17) && t === CV.T.GRASS)
          props.push({ kind: 'flowers', x, y, variant: (rng() * 3) | 0, scale: 0.8 + rng() * 0.6, phase: rng() * CV.TAU });
        else if (r < 0.17 + 0.22 && bushCount < 115 && t === CV.T.GRASS && Math.hypot(x - cx, y - cy) > 4.8) {
          props.push({ kind: 'bush', x, y, variant: (rng() * 3) | 0, scale: 0.8 + rng() * 0.7, phase: rng() * CV.TAU });
          bushCount++;
        } else if (r < 0.17 + 0.22 + 0.06 && t !== CV.T.SAND && Math.hypot(x - cx, y - cy) > 4.6) {
          props.push({ kind: 'rock', x, y, variant: (rng() * 3) | 0, scale: 0.7 + rng() * 0.8, phase: rng() * CV.TAU });
          propAt[i] = props.length - 1;
        } else if (r < 0.17 + 0.22 + 0.06 + 0.05 && (nearTree(x, y) || inMeadow)) {
          props.push({ kind: 'mushroom', x, y, variant: (rng() * 2) | 0, scale: 0.8 + rng() * 0.5, phase: rng() * CV.TAU });
        } else if (r < 0.17 + 0.22 + 0.06 + 0.05 + 0.03 && t === CV.T.GRASS) {
          props.push({ kind: 'log', x, y, variant: 0, scale: 0.9 + rng() * 0.4, rot: rng() * CV.TAU, phase: rng() * CV.TAU });
        }
      }
    }
    // ruins dressing: pillars ring + rocks
    for (let k = 0; k < 5 + (rng() * 2 | 0); k++) {
      const a = (k / 6) * CV.TAU + rng() * 0.5;
      const px = Math.round(ruins.x + Math.cos(a) * 2.1), py = Math.round(ruins.y + Math.sin(a) * 2.1);
      if (px > 1 && py > 1 && px < W - 2 && py < H - 2) {
        props.push({ kind: 'pillar', x: px, y: py, variant: (rng() * 2) | 0, scale: 0.9 + rng() * 0.4, phase: rng() * CV.TAU });
        propAt[idx(px, py)] = props.length - 1;
      }
    }
    props.push({ kind: 'rock', x: ruins.x + 1, y: ruins.y, variant: 0, scale: 1.1, phase: 0 }); propAt[idx(ruins.x + 1, ruins.y)] = props.length - 1;
    props.push({ kind: 'sign', x: Math.round(CV.lerp(spawn.x, ruins.x, 0.3)), y: Math.round(CV.lerp(spawn.y, ruins.y, 0.3)), variant: 0, scale: 1, phase: 0 });
    // grove mushrooms ring
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * CV.TAU;
      props.push({ kind: 'mushroom', x: Math.round(grove.x + Math.cos(a) * 2.6), y: Math.round(grove.y + Math.sin(a) * 2.6), variant: 1, scale: 0.9, phase: rng() * CV.TAU });
    }

    // ---- 9) grass tufts per tile (animated in render) ----
    const tufts = new Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const t = type[i], arr = [];
      const n = t === CV.T.GRASS ? 5 + (rng() * 4 | 0) : t === CV.T.DIRT ? 2 + (rng() * 2 | 0) : t === CV.T.SAND ? 2 : t === CV.T.STONE ? 1 + (rng() * 2 | 0) : 0;
      for (let k = 0; k < n; k++) arr.push({ dx: 6 + rng() * (CV.TW - 12), dy: 4 + rng() * (CV.TH - 8), s: 0.65 + rng() * 0.65, v: (rng() * 3) | 0 });
      tufts[i] = arr;
    }

    // keep the spawn area clear so the player can always build there
    for (let k = props.length - 1; k >= 0; k--) {
      if (props[k].kind !== 'stepping' && Math.hypot(props[k].x - spawn.x, props[k].y - spawn.y) < 1.7) props.splice(k, 1);
    }
    propAt.fill(-1);
    props.forEach((p, pi) => { if (CV.PROP_DEFS[p.kind] && CV.PROP_DEFS[p.kind].blocks) propAt[p.y * W + p.x] = pi; });

    // ---- props indexed by tile ----
    const propsByTile = new Array(W * H);
    for (let i = 0; i < W * H; i++) propsByTile[i] = [];
    props.forEach((p) => propsByTile[idx(p.x, p.y)].push(p));

    return {
      seedNum, seedStr, W, H, h, type, props, propsByTile, propAt, tufts,
      waterfalls: waterfallList, riverDist, riverFlow,
      spawn, pois: { ruins, meadow, grove, overlook }, buildings: [],
      timeOfDay: 0.32
    };
  };
})();
