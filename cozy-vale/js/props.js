/* Cozy Vale — prop & building definitions + painters.
   Natural props (trees, bushes, rocks...) and placeable buildings.
   Foliage is drawn as many separate clusters, each with its own wind phase,
   so every part of a bush/tree moves independently. */
(function () {
  const CV = window.CV;

  CV.PROP_DEFS = {
    pine:      { blocks: true,  chop: { wood: 5 },  regrow: 90 },
    roundtree: { blocks: true,  chop: { wood: 4 },  regrow: 90 },
    rock:      { blocks: true,  chop: { stone: 4 }, regrow: 120 },
    pillar:    { blocks: true,  chop: { stone: 3 }, regrow: 0 },
    sign:      { blocks: true,  chop: { wood: 1 },  regrow: 60 },
    bush:      { blocks: false },
    mushroom:  { blocks: false },
    flowers:   { blocks: false },
    log:       { blocks: false },
    lilypad:   { blocks: false, water: true },
    stepping:  { blocks: false, water: true, walk: true },
    stump:     { blocks: false }
  };

  // placeable things. cat: build/decor/nature. need: 'wallfloor' | 'roof' | 'water'
  CV.BUILD_DEFS = {
    path:       { name: 'Dirt path',     cat: 'build',  cost: {},              size: [1, 1], ground: true,  walk: true,  render: 'path' },
    floor:      { name: 'Stone floor',   cat: 'build',  cost: { stone: 2 },   size: [1, 1], ground: true,  walk: true,  render: 'floor' },
    wall:       { name: 'Wood wall',     cat: 'build',  cost: { wood: 3 },    size: [1, 1], blocks: true, render: 'wall' },
    wall_door:  { name: 'Wall + door',   cat: 'build',  cost: { wood: 4 },    size: [1, 1], blocks: true, render: 'wall', door: true },
    wall_win:   { name: 'Wall + window', cat: 'build',  cost: { wood: 3 },    size: [1, 1], blocks: true, render: 'wall', win: true, glow: true },
    roof:       { name: 'Roof',          cat: 'build',  cost: { wood: 4 },    size: [1, 1], blocks: true, need: 'wallfloor', render: 'roof' },
    chimney:    { name: 'Chimney',       cat: 'build',  cost: { stone: 3 },   size: [1, 1], need: 'roof', render: 'chimney', smoke: true },
    pillar:     { name: 'Ruin pillar',   cat: 'build',  cost: { stone: 3 },   size: [1, 1], blocks: true, render: 'pillar' },
    bridge:     { name: 'Bridge',        cat: 'build',  cost: { wood: 6 },    size: [1, 1], water: true, walk: true, render: 'bridge' },
    fence:      { name: 'Fence',         cat: 'decor',  cost: { wood: 1 },    size: [1, 1], blocks: true, connect: true, render: 'fence' },
    gate:       { name: 'Gate',          cat: 'decor',  cost: { wood: 3 },    size: [1, 1], connect: true, render: 'gate' },
    lamp:       { name: 'Lamp post',     cat: 'decor',  cost: { wood: 2, stone: 1 }, size: [1, 1], blocks: true, render: 'lamp', glow: true },
    campfire:   { name: 'Campfire',      cat: 'decor',  cost: { wood: 2, stone: 4 }, size: [1, 1], blocks: true, render: 'campfire', fire: true, glow: true, smoke: true },
    bench:      { name: 'Bench',         cat: 'decor',  cost: { wood: 3 },    size: [1, 1], blocks: true, render: 'bench' },
    well:       { name: 'Well',          cat: 'decor',  cost: { stone: 6 },   size: [1, 1], blocks: true, render: 'well' },
    signpost:   { name: 'Signpost',      cat: 'decor',  cost: { wood: 2 },    size: [1, 1], blocks: true, render: 'sign' },
    flowerpot:  { name: 'Flower pot',    cat: 'decor',  cost: { wood: 1, stone: 1 }, size: [1, 1], blocks: true, render: 'flowerpot' },
    logseat:    { name: 'Log seat',      cat: 'decor',  cost: { wood: 2 },    size: [1, 1], blocks: true, render: 'log' },
    sapling_pine:  { name: 'Pine sapling',  cat: 'nature', cost: { wood: 1 }, size: [1, 1], grow: 'pine',      growTime: 75, render: 'sapling' },
    sapling_round: { name: 'Tree sapling',  cat: 'nature', cost: { wood: 1 }, size: [1, 1], grow: 'roundtree', growTime: 75, render: 'sapling' },
    bush:       { name: 'Plant bush',    cat: 'nature', cost: {},              size: [1, 1], render: 'bush' },
    flowers:    { name: 'Plant flowers', cat: 'nature', cost: {},              size: [1, 1], render: 'flowers' },
    mushroom:   { name: 'Plant mushrooms', cat: 'nature', cost: {},            size: [1, 1], render: 'mushroom' },
    rock:       { name: 'Place boulder', cat: 'nature', cost: { stone: 1 },   size: [1, 1], blocks: true, render: 'rock' }
  };
  CV.BUILD_CATS = [
    { id: 'build', label: '🧱 Build' },
    { id: 'decor', label: '🪴 Decor' },
    { id: 'nature', label: '🌿 Nature' }
  ];
  CV.WALL_H = 54; CV.ROOF_H = 30;

  // ---------- generic sprite painter ----------
  CV.drawSpriteAt = function (ctx, img, cx, baseY, destH, rot, alpha) {
    if (!img) return;
    const destW = destH * ((img.width || 1) / (img.height || 1));
    ctx.save();
    ctx.translate(cx, baseY);
    if (rot) ctx.rotate(rot);
    if (alpha != null) ctx.globalAlpha = alpha;
    ctx.drawImage(img, -destW / 2, -destH, destW, destH);
    ctx.restore();
  };

  CV.propBlocks = function (p) { const d = CV.PROP_DEFS[p.kind]; return !!(d && d.blocks); };

  // ---------- natural prop painter ----------
  CV.drawProp = function (ctx, p, w, t) {
    const S = CV.S;
    const i = p.y * w.W + p.x;
    const hgt = w.h[i];
    const base = CV.proj(p.x + 0.5, p.y + 0.82, hgt);
    const wb = CV.wind(t, p.x * 1.31 + 2, p.y * 1.73 + 5) + Math.sin(t * 0.9 + p.phase) * 0.25;
    const sc = p.scale || 1;
    ctx.fillStyle = 'rgba(8,18,6,0.28)';
    ctx.beginPath(); ctx.ellipse(base[0], base[1] + 2, 15 * sc, 5 * sc, 0, 0, CV.TAU); ctx.fill();
    switch (p.kind) {
      case 'pine': {
        const img = S.pine[p.variant % S.pine.length];
        CV.drawSpriteAt(ctx, img, base[0], base[1], (150 + hgt * 9) * sc, wb * 0.05 + Math.sin(t * 1.15 + p.phase) * 0.02);
        break;
      }
      case 'roundtree': {
        const img = S.roundtree[p.variant % S.roundtree.length];
        const destH = 128 * sc;
        CV.drawSpriteAt(ctx, img, base[0], base[1], destH, wb * 0.035 + Math.sin(t * 1.3 + p.phase) * 0.02);
        const blobs = S.canopyShape[p.variant % S.canopyShape.length];
        const topY = base[1] - destH * 0.7;
        for (const b of blobs) {
          const rot = wb * 0.06 + Math.sin(t * 1.8 + b.ph) * 0.1;
          CV.drawSpriteAt(ctx, S.canopy[b.ci], base[0] + b.dx * sc * 0.85, topY + b.dy * sc * 0.85, 44 * b.s * sc, rot);
        }
        break;
      }
      case 'bush': {
        const clumps = S.bushShape[p.variant % S.bushShape.length];
        for (const c of clumps) {
          const rot = wb * 0.11 + Math.sin(t * 2.1 + c.ph) * 0.12;
          CV.drawSpriteAt(ctx, S.leafC[c.ci], base[0] + c.dx * sc, base[1] + c.dy * sc, 42 * c.s * sc, rot);
        }
        break;
      }
      case 'rock': {
        const img = S.rockV[p.variant % S.rockV.length];
        CV.drawSpriteAt(ctx, img, base[0], base[1], 44 * sc, 0);
        break;
      }
      case 'pillar': CV.drawSpriteAt(ctx, S.pillar, base[0], base[1], 96 * sc, (p.phase % 0.2) - 0.1); break;
      case 'sign':   CV.drawSpriteAt(ctx, S.sign, base[0], base[1], 62 * sc, wb * 0.04); break;
      case 'log':    CV.drawSpriteAt(ctx, S.log, base[0], base[1], 46 * sc, p.rot || 0); break;
      case 'flowers': {
        const img = S.flowersV[p.variant % S.flowersV.length];
        CV.drawSpriteAt(ctx, img, base[0], base[1], 40 * sc, wb * 0.08 + Math.sin(t * 2.4 + p.phase) * 0.06);
        break;
      }
      case 'mushroom': CV.drawSpriteAt(ctx, S.mushroom, base[0], base[1], 34 * sc, wb * 0.05); break;
      case 'lilypad': {
        const c = CV.proj(p.x + 0.5, p.y + 0.55, 0);
        ctx.fillStyle = '#4d8f4a';
        ctx.beginPath(); ctx.ellipse(c[0], c[1], 16 * sc, 7 * sc, 0, 0.3, CV.TAU - 0.3); ctx.fill();
        ctx.fillStyle = '#6fae5c';
        ctx.beginPath(); ctx.ellipse(c[0] - 2, c[1] - 1.5, 12 * sc, 5 * sc, 0, 0, CV.TAU); ctx.fill();
        break;
      }
      case 'stepping': {
        const c = CV.proj(p.x + 0.5, p.y + 0.6, 0);
        ctx.fillStyle = '#7d8894';
        ctx.beginPath(); ctx.ellipse(c[0], c[1], 19 * sc, 8.5 * sc, 0, 0, CV.TAU); ctx.fill();
        ctx.fillStyle = '#a7b2bd';
        ctx.beginPath(); ctx.ellipse(c[0] - 2, c[1] - 2, 14 * sc, 6 * sc, 0, 0, CV.TAU); ctx.fill();
        break;
      }
      case 'stump': {
        ctx.fillStyle = '#6b4a2c';
        ctx.fillRect(base[0] - 9 * sc, base[1] - 14 * sc, 18 * sc, 14 * sc);
        ctx.fillStyle = '#a97e4e';
        ctx.beginPath(); ctx.ellipse(base[0], base[1] - 14 * sc, 9 * sc, 4 * sc, 0, 0, CV.TAU); ctx.fill();
        break;
      }
    }
  };

  // ---------- building painters ----------
  function topQuad(w, x, y, up) {
    const hgt = w.h[y * w.W + x] * CV.Z + (up || 0);
    return [CV.proj(x, y, 0), CV.proj(x + 1, y, 0), CV.proj(x + 1, y + 1, 0), CV.proj(x, y + 1, 0)]
      .map((p) => [p[0], p[1] - hgt]);
  }
  function quadPath(ctx, q) {
    ctx.beginPath();
    ctx.moveTo(q[0][0], q[0][1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(q[i][0], q[i][1]);
    ctx.closePath();
  }
  function texFill(ctx, q, img, seed) {
    quadPath(ctx, q); ctx.save(); ctx.clip();
    const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys), x1 = Math.max(...xs), y1 = Math.max(...ys);
    const s = 1.25;
    ctx.drawImage(img, x0 - (x1 - x0) * (s - 1) / 2 + (CV.hash2(seed, 7, 99) - 0.5) * 20,
      y0 - (y1 - y0) * (s - 1) / 2 + (CV.hash2(seed, 13, 55) - 0.5) * 20,
      (x1 - x0) * s, (y1 - y0) * s);
    ctx.restore();
  }

  CV.drawBuilding = function (ctx, b, w, t, ghost) {
    const S = CV.S;
    const def = CV.BUILD_DEFS[b.id];
    if (!def) return;
    const i = b.y * w.W + b.x;
    const hgt = w.h[i];
    const base = CV.proj(b.x + 0.5, b.y + 0.82, hgt);
    const seed = (b.x * 131 + b.y * 57) | 0;
    const alpha = ghost ? 0.55 : 1;
    const wb = CV.wind(t, b.x * 1.1, b.y * 1.4) + Math.sin(t + (b.x + b.y)) * 0.2;
    ctx.save();
    if (ghost) ctx.globalAlpha = alpha;

    switch (def.render) {
      case 'path': case 'floor': {
        const q = topQuad(w, b.x, b.y, 0);
        texFill(ctx, q, def.render === 'path' ? S.dirt[CV.hash2(b.x, b.y, 3) * 3 | 0] : S.stone[CV.hash2(b.x, b.y, 5) * 3 | 0], seed);
        break;
      }
      case 'wall': {
        const q = topQuad(w, b.x, b.y, CV.WALL_H);
        const qb = topQuad(w, b.x, b.y, 0);
        quadPath(ctx, [qb[2], qb[3], q[3], q[2]]); // front face of wall
        ctx.save(); ctx.clip();
        const xs = [qb[2][0], qb[3][0], q[3][0], q[2][0]], ys = [qb[2][1], qb[3][1], q[3][1], q[2][1]];
        const x0 = Math.min(...xs), y0 = Math.min(...ys), x1 = Math.max(...xs), y1 = Math.max(...ys);
        ctx.drawImage(S.housewall, x0 - 6, y0 - 6, (x1 - x0) + 12, (y1 - y0) + 12);
        const g = ctx.createLinearGradient(x0, 0, x1, 0);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,10,0,0.28)');
        ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        ctx.restore();
        ctx.strokeStyle = 'rgba(40,22,8,0.8)'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(q[3][0], q[3][1]); ctx.lineTo(q[2][0], q[2][1]); ctx.stroke();
        const midx = (qb[2][0] + qb[3][0]) / 2;
        if (def.door) CV.drawSpriteAt(ctx, S.door, midx, qb[2][1] + 2, 46, 0);
        if (def.win) CV.drawSpriteAt(ctx, S.window, midx, qb[2][1] - 2, 42, 0);
        break;
      }
      case 'roof': {
        const up = CV.WALL_H + CV.ROOF_H;
        const qTop = topQuad(w, b.x, b.y, up);
        const qMid = topQuad(w, b.x, b.y, CV.WALL_H);
        // front slope
        quadPath(ctx, [qMid[2], qMid[3], qTop[3], qTop[2]]);
        ctx.save(); ctx.clip();
        ctx.drawImage(S.roof, qMid[2][0] - 8, qTop[2][1] - 8, CV.TW + 16, up - CV.WALL_H + 16);
        ctx.fillStyle = 'rgba(60,20,5,0.30)'; ctx.fillRect(qMid[2][0] - 8, qTop[2][1] - 8, CV.TW + 16, up - CV.WALL_H + 16);
        ctx.restore();
        // top
        texFill(ctx, qTop, S.roof, seed);
        ctx.strokeStyle = 'rgba(50,25,8,0.7)'; ctx.lineWidth = 2;
        quadPath(ctx, qTop); ctx.stroke();
        break;
      }
      case 'chimney': {
        const c = CV.proj(b.x + 0.72, b.y + 0.42, hgt);
        CV.drawSpriteAt(ctx, S.chimney, c[0], c[1] - CV.WALL_H - CV.ROOF_H + 8, 44, 0);
        break;
      }
      case 'fence': {
        // rails to connected neighbours
        ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        const c0 = CV.proj(b.x + 0.5, b.y + 0.62, hgt);
        [[1, 0], [0, 1]].forEach((d) => {
          const nb = CV.buildingAt(w, b.x + d[0], b.y + d[1]);
          const nd = nb && CV.BUILD_DEFS[nb.id];
          if (nd && (nd.render === 'fence' || nd.render === 'gate')) {
            const c1 = CV.proj(b.x + d[0] + 0.5, b.y + d[1] + 0.62, hgt);
            ctx.beginPath(); ctx.moveTo(c0[0], c0[1] - 26); ctx.lineTo(c1[0], c1[1] - 26); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(c0[0], c0[1] - 12); ctx.lineTo(c1[0], c1[1] - 12); ctx.stroke();
          }
        });
        CV.drawSpriteAt(ctx, S.fence, c0[0], c0[1], 40, wb * 0.02);
        break;
      }
      case 'gate': CV.drawSpriteAt(ctx, S.gate, base[0], base[1], 66, wb * 0.02); break;
      case 'lamp': CV.drawSpriteAt(ctx, S.lamp, base[0], base[1], 78 * (b.scale || 1), wb * 0.03); break;
      case 'campfire': {
        CV.drawSpriteAt(ctx, S.campfire, base[0], base[1], 52, 0);
        // procedural flickering flame
        for (let k = 0; k < 3; k++) {
          const fh = (26 - k * 7) * (0.85 + 0.25 * Math.sin(t * 11 + k * 2.4 + b.x));
          const fw = 17 - k * 4;
          const fx = base[0] + Math.sin(t * 9 + k * 1.7) * 2.5;
          ctx.fillStyle = k === 0 ? 'rgba(255,140,50,0.9)' : k === 1 ? 'rgba(255,200,80,0.9)' : 'rgba(255,245,180,0.95)';
          ctx.beginPath(); ctx.ellipse(fx, base[1] - 8 - k * 7, fw / 2, fh / 2, 0, 0, CV.TAU); ctx.fill();
        }
        break;
      }
      case 'bench': CV.drawSpriteAt(ctx, S.bench, base[0], base[1], 52, 0); break;
      case 'well': CV.drawSpriteAt(ctx, S.well, base[0], base[1], 84, 0); break;
      case 'sign': CV.drawSpriteAt(ctx, S.sign, base[0], base[1], 62, wb * 0.04); break;
      case 'flowerpot': CV.drawSpriteAt(ctx, S.flowerpot, base[0], base[1], 44, wb * 0.06); break;
      case 'log': CV.drawSpriteAt(ctx, S.log, base[0], base[1], 48, (b.rot || 0) + wb * 0.02); break;
      case 'pillar': CV.drawSpriteAt(ctx, S.pillar, base[0], base[1], 96, 0); break;
      case 'rock': CV.drawSpriteAt(ctx, S.rockV[(seed % 3 + 3) % 3], base[0], base[1], 46, 0); break;
      case 'bridge': {
        const q = topQuad(w, b.x, b.y, 2);
        for (let k = 0; k < 5; k++) {
          const px = q[0][0] + (q[1][0] - q[0][0]) * (k + 0.5) / 5;
          ctx.fillStyle = k % 2 ? '#8a5f36' : '#9c6f3e';
          ctx.fillRect(px - 6, q[0][1] - 6, 12, CV.TH * 0.86);
        }
        ctx.strokeStyle = '#6b4423'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1] - 10); ctx.lineTo(q[3][0], q[3][1] - 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(q[1][0], q[1][1] - 10); ctx.lineTo(q[2][0], q[2][1] - 10); ctx.stroke();
        break;
      }
      case 'sapling': {
        const g = CV.clamp((t - b.born) / (def.growTime || 75), 0, 1);
        const s = 0.35 + g * 0.75;
        ctx.fillStyle = '#4d8f3a';
        ctx.save(); ctx.translate(base[0], base[1]); ctx.rotate(-0.5);
        ctx.beginPath(); ctx.ellipse(-4 * s, -8 * s, 4 * s, 9 * s, 0, 0, CV.TAU); ctx.fill(); ctx.restore();
        ctx.save(); ctx.translate(base[0], base[1]); ctx.rotate(0.5);
        ctx.beginPath(); ctx.ellipse(4 * s, -8 * s, 4 * s, 9 * s, 0, 0, CV.TAU); ctx.fill(); ctx.restore();
        break;
      }
      case 'bush': case 'flowers': case 'mushroom': {
        CV.drawProp(ctx, { kind: def.render, x: b.x, y: b.y, variant: (seed % 3 + 3) % 3, scale: 1, phase: b.x + b.y }, w, t);
        break;
      }
    }
    ctx.restore();
  };

  // footprint cells for a building (supports rot for 1x2 later)
  CV.buildingCells = function (b) {
    const def = CV.BUILD_DEFS[b.id];
    const [w, d] = def.size;
    const cells = [];
    for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < d; dy++) cells.push([b.x + dx, b.y + dy]);
    return cells;
  };
})();
