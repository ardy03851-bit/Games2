/* Cozy Vale — 2.5D renderer: fixed oblique camera (POV is locked on purpose),
   baked painterly terrain (terraced cliffs, textured tops, wobbly hand-made edges),
   dynamic wind-swept grass/foliage, water, waterfalls, props, buildings, particles,
   day/dusk/night sky cycle and additive night glows. Custom Canvas2D engine. */
(function () {
  const CV = window.CV;
  const R = CV.render = {};
  let canvas, ctx;
  let world = null, terrainCv = null;
  const view = { k: 1, ox: 0, oy: 0, dpr: 1 };
  R.view = view;
  R.sky = { wd: 1, wdu: 0, wn: 0 };
  let stars = [];

  R.init = function (cv) {
    canvas = cv; ctx = canvas.getContext('2d');
    const rnd = CV.mulberry32(7);
    for (let i = 0; i < 80; i++) stars.push({ x: rnd(), y: rnd() * 0.75, s: rnd() < 0.2 ? 2.5 : 1.5, ph: rnd() * CV.TAU });
    R.resize();
  };
  window.addEventListener('resize', () => R.resize());

  R.resize = function () {
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(innerWidth * view.dpr));
    canvas.height = Math.max(1, Math.round(innerHeight * view.dpr));
    fit();
  };

  function bounds(w) {
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    [[0, 0], [w.W, 0], [0, w.H], [w.W, w.H]].forEach(([x, y]) => {
      const p = CV.proj(x, y, 0);
      minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
      minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
    });
    minY = Math.min(minY, CV.proj(0, 0, 5)[1]) - 215; // headroom for trees & roofs
    return { minX, maxX, minY, maxY };
  }
  function fit() {
    if (!world) return;
    const b = bounds(world);
    const cw = canvas.width / view.dpr, ch = canvas.height / view.dpr;
    const pad = 24;
    view.k = Math.min((cw - pad * 2) / (b.maxX - b.minX), (ch - pad * 2) / (b.maxY - b.minY));
    view.ox = (cw - (b.maxX - b.minX) * view.k) / 2 - b.minX * view.k;
    view.oy = (ch - (b.maxY - b.minY) * view.k) / 2 - b.minY * view.k;
  }

  R.setWorld = function (w) { world = w; bake(); fit(); };

  // ---------------- terrain baking ----------------
  function bake() {
    const w = world, b = bounds(w);
    R.b = b;
    terrainCv = document.createElement('canvas');
    terrainCv.width = Math.ceil(b.maxX - b.minX) + 8;
    terrainCv.height = Math.ceil(b.maxY - b.minY) + 8;
    const x = terrainCv.getContext('2d');
    x.translate(-b.minX + 4, -b.minY + 4);
    x.lineJoin = 'round';
    for (let y = 0; y < w.H; y++) for (let xx = 0; xx < w.W; xx++) { drawTop(x, w, xx, y); drawFaces(x, w, xx, y); }
    for (const wf of w.waterfalls) drawWaterfallBase(x, w, wf);
  }

  function quad(x, q) {
    x.beginPath(); x.moveTo(q[0][0], q[0][1]);
    for (let i = 1; i < 4; i++) x.lineTo(q[i][0], q[i][1]);
    x.closePath();
  }

  function drawTop(x, w, tx, ty) {
    const S = CV.S, i = ty * w.W + tx, hgt = w.h[i], t = w.type[i];
    const jit = (a, b2) => (CV.hash2(tx + a * 7, ty + b2 * 13, w.seedNum) - 0.5) * 3.4;
    const p0 = CV.proj(tx, ty, hgt), p1 = CV.proj(tx + 1, ty, hgt), p2 = CV.proj(tx + 1, ty + 1, hgt), p3 = CV.proj(tx, ty + 1, hgt);
    const q = [
      [p0[0] + jit(1, 1), p0[1] + jit(2, 1)], [p1[0] + jit(1, 2), p1[1] + jit(2, 2)],
      [p2[0] + jit(1, 3), p2[1] + jit(2, 3)], [p3[0] + jit(1, 4), p3[1] + jit(2, 4)]
    ];
    let arr = S.grass;
    if (t === CV.T.DIRT) arr = S.dirt; else if (t === CV.T.STONE) arr = S.stone;
    else if (t === CV.T.SAND) arr = S.sand; else if (t === CV.T.WATER) arr = S.water;
    const img = arr[(CV.hash2(tx, ty, w.seedNum) * arr.length) | 0];
    x.save(); quad(x, q); x.clip();
    const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys), x1 = Math.max(...xs), y1 = Math.max(...ys);
    const s = 1.35;
    x.drawImage(img,
      x0 - (x1 - x0) * (s - 1) / 2 + (CV.hash2(tx, ty, 71) - 0.5) * 30,
      y0 - (y1 - y0) * (s - 1) / 2 + (CV.hash2(tx, ty, 72) - 0.5) * 22,
      (x1 - x0) * s, (y1 - y0) * s);
    if (t === CV.T.WATER) { x.fillStyle = 'rgba(20,60,70,0.18)'; x.fillRect(x0, y0, x1 - x0, y1 - y0); }
    x.restore();
    // painterly shade patch
    const sh = (CV.hash2(tx, ty, w.seedNum + 5) - 0.5) * 0.18;
    quad(x, q);
    x.fillStyle = sh > 0 ? `rgba(255,246,205,${sh})` : `rgba(8,22,10,${-sh})`;
    x.fill();
    // crisp front edge
    x.strokeStyle = 'rgba(10,20,8,0.20)'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(q[3][0], q[3][1]); x.lineTo(q[2][0], q[2][1]); x.stroke();
  }

  function drawFaces(x, w, tx, ty) {
    const S = CV.S, i = ty * w.W + tx, hgt = w.h[i], t = w.type[i];
    // front face (toward +y, i.e. toward viewer)
    if (ty + 1 < w.H) {
      const h2 = w.h[(ty + 1) * w.W + tx];
      if (hgt > h2) {
        const drop = hgt - h2;
        const a = CV.proj(tx, ty + 1, hgt), b = CV.proj(tx + 1, ty + 1, hgt);
        const c = CV.proj(tx + 1, ty + 1, h2), d = CV.proj(tx, ty + 1, h2);
        const q = [d, c, b, a];
        x.save(); quad(x, q); x.clip();
        const img = S.cliff[(CV.hash2(tx, ty, w.seedNum + 21) * 3) | 0];
        x.drawImage(img, Math.min(a[0], d[0]) - 4, Math.min(a[1], d[1]) - 4, CV.TW + 8, drop * CV.Z + 8);
        x.fillStyle = `rgba(12,8,4,${0.10 + drop * 0.06})`;
        x.fillRect(Math.min(a[0], d[0]) - 4, Math.min(a[1], d[1]) - 4, CV.TW + 8, drop * CV.Z + 8);
        x.restore();
        // strata lines
        x.strokeStyle = 'rgba(30,18,8,0.16)'; x.lineWidth = 1.5;
        for (let k = 1; k < drop; k++) {
          const yy = a[1] + k * CV.Z;
          x.beginPath(); x.moveTo(d[0], yy); x.lineTo(c[0], yy + (CV.hash2(tx, ty + k, 3) - 0.5) * 4); x.stroke();
        }
        // grass lip overhanging the cliff
        if (t !== CV.T.WATER && t !== CV.T.STONE) grassLip(x, d, c, w, tx, ty);
      }
    }
    // right face (toward +x)
    if (tx + 1 < w.W) {
      const h2 = w.h[ty * w.W + tx + 1];
      if (hgt > h2) {
        const drop = hgt - h2;
        const a = CV.proj(tx + 1, ty, hgt), b = CV.proj(tx + 1, ty + 1, hgt);
        const c = CV.proj(tx + 1, ty + 1, h2), d = CV.proj(tx + 1, ty, h2);
        const q = [d, c, b, a];
        x.save(); quad(x, q); x.clip();
        const img = S.cliff[(CV.hash2(tx, ty, w.seedNum + 33) * 3) | 0];
        const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
        x.drawImage(img, Math.min(...xs) - 4, Math.min(...ys) - 4, (Math.max(...xs) - Math.min(...xs)) + 8, drop * CV.Z + 8);
        x.fillStyle = `rgba(10,6,3,${0.22 + drop * 0.06})`;
        x.fillRect(Math.min(...xs) - 4, Math.min(...ys) - 4, (Math.max(...xs) - Math.min(...xs)) + 8, drop * CV.Z + 8);
        x.restore();
        if (t !== CV.T.WATER && t !== CV.T.STONE) grassLip(x, d, a, w, tx, ty);
      }
    }
  }

  function grassLip(x, pA, pB, w, tx, ty) {
    const n = 7;
    x.fillStyle = 'rgba(74,138,52,0.95)';
    x.beginPath();
    x.moveTo(pA[0], pA[1]);
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const px = CV.lerp(pA[0], pB[0], t), py = CV.lerp(pA[1], pB[1], t);
      const h = 4 + CV.hash2(tx * 10 + k, ty * 10, w.seedNum) * 6;
      x.lineTo(px, py - h);
    }
    x.lineTo(pB[0], pB[1]);
    x.closePath(); x.fill();
    x.fillStyle = 'rgba(140,200,90,0.7)';
    x.beginPath();
    x.moveTo(pA[0], pA[1] - 1);
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const px = CV.lerp(pA[0], pB[0], t), py = CV.lerp(pA[1], pB[1], t);
      const h = 2 + CV.hash2(tx * 10 + k, ty * 10, w.seedNum + 9) * 3;
      x.lineTo(px, py - h);
    }
    x.lineTo(pB[0], pB[1] - 1);
    x.closePath(); x.fill();
  }

  function wfRect(w, wf) {
    const hgt = w.h[wf.y * w.W + wf.x];
    if (wf.dir === 'S') {
      const a = CV.proj(wf.x, wf.y + 1, hgt), b = CV.proj(wf.x + 1, wf.y + 1, hgt);
      return { q: [a, b, [b[0], b[1] + wf.drop * CV.Z], [a[0], a[1] + wf.drop * CV.Z]], drop: wf.drop, hgt };
    }
    const a = CV.proj(wf.x + 1, wf.y, hgt), b = CV.proj(wf.x + 1, wf.y + 1, hgt);
    const c = CV.proj(wf.x + 1, wf.y + 1, hgt - wf.drop), d = CV.proj(wf.x + 1, wf.y, hgt - wf.drop);
    return { q: [a, b, c, d], drop: wf.drop, hgt };
  }
  function drawWaterfallBase(x, w, wf) {
    const r = wfRect(w, wf);
    x.save(); quad(x, r.q); x.clip();
    const xs = r.q.map((p) => p[0]), ys = r.q.map((p) => p[1]);
    x.drawImage(CV.S.waterfall, Math.min(...xs) - 3, Math.min(...ys) - 3, (Math.max(...xs) - Math.min(...xs)) + 6, (Math.max(...ys) - Math.min(...ys)) + 6);
    x.fillStyle = 'rgba(230,250,255,0.25)';
    x.fillRect(Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    x.restore();
  }

  // ---------------- sky ----------------
  function drawSky(t, w) {
    const S = CV.S;
    const W = canvas.width / view.dpr, H = canvas.height / view.dpr;
    const tod = w.timeOfDay;
    const g = (c, s) => Math.exp(-Math.pow((tod - c) / s, 2));
    let wd = g(0.20, 0.15), wdu = g(0.46, 0.10), wn = g(0.74, 0.12);
    const tot = wd + wdu + wn + 1e-6;
    wd /= tot; wdu /= tot; wn /= tot;
    R.sky = { wd, wdu, wn };
    ctx.drawImage(S.sky.day, 0, 0, W, H);
    if (wdu > 0.02) { ctx.globalAlpha = wdu; ctx.drawImage(S.sky.dusk, 0, 0, W, H); ctx.globalAlpha = 1; }
    if (wn > 0.02) { ctx.globalAlpha = wn; ctx.drawImage(S.sky.night, 0, 0, W, H); ctx.globalAlpha = 1; }
    if (wdu > 0.04) { ctx.fillStyle = `rgba(255,140,60,${wdu * 0.10})`; ctx.fillRect(0, 0, W, H); }
    if (wn > 0.04) { ctx.fillStyle = `rgba(8,12,36,${wn * 0.30})`; ctx.fillRect(0, 0, W, H); }
    // sun & moon
    if (tod < 0.52) {
      const f = CV.clamp(tod / 0.52, 0, 1);
      const sx = (0.10 + 0.80 * f) * W, sy = (0.66 - 0.46 * Math.sin(f * Math.PI)) * H;
      if (sy > -0.1 * H) {
        ctx.globalAlpha = wd * 0.9;
        const s = Math.min(W, H) * 0.30;
        ctx.drawImage(S.glow, sx - s / 2, sy - s / 2, s, s);
        ctx.globalAlpha = 1;
      }
    } else {
      const f = CV.clamp((tod - 0.52) / 0.48, 0, 1);
      const mx = (0.15 + 0.70 * f) * W, my = (0.60 - 0.40 * Math.sin(f * Math.PI)) * H;
      if (my > -0.1 * H) {
        ctx.globalAlpha = wn * 0.95;
        const s = Math.min(W, H) * 0.22;
        ctx.drawImage(S.glow, mx - s / 2, my - s / 2, s, s);
        ctx.globalAlpha = 1;
      }
    }
    // stars
    if (wn > 0.05) {
      ctx.fillStyle = '#fff';
      for (const st of stars) {
        ctx.globalAlpha = wn * (0.35 + 0.65 * Math.abs(Math.sin(t * 1.8 + st.ph)));
        ctx.fillRect(st.x * W, st.y * H, st.s, st.s);
      }
      ctx.globalAlpha = 1;
    }
    // drifting clouds
    for (let i = 0; i < 4; i++) {
      const cw = W * (0.16 + (i % 3) * 0.07);
      const cx = (((i * 0.31 + t * 0.006 * (1 + (i % 3))) % 1.35) - 0.18) * W;
      const cy = H * (0.05 + (i % 3) * 0.085);
      ctx.globalAlpha = 0.5 + wd * 0.45 + wdu * 0.3;
      ctx.drawImage(S.cloud, cx, cy, cw, cw * 0.55);
      ctx.globalAlpha = 1;
    }
  }

  // ---------------- dynamic world ----------------
  function drawWater(ctx, w, x, y, t) {
    const i = y * w.W + x;
    const p = CV.proj(x + 0.5, y + 0.55, 0);
    const fx = w.riverFlow[i * 2], fy = w.riverFlow[i * 2 + 1];
    ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let k = 0; k < 2; k++) {
      const off = (t * 0.85 + CV.hash2(x, y, w.seedNum + k * 31) + k * 0.5) % 1;
      const cx = p[0] + fx * (off - 0.5) * CV.TW * 1.7, cy = p[1] + fy * (off - 0.5) * CV.TH * 1.7 - 2;
      ctx.beginPath(); ctx.moveTo(cx - fx * 11, cy - fy * 6); ctx.lineTo(cx + fx * 11, cy + fy * 6); ctx.stroke();
    }
    const s1 = CV.hash2(x, y, Math.floor(t * 3));
    if (s1 > 0.55) {
      ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.4 * Math.abs(Math.sin(t * 3 + x))})`;
      ctx.fillRect(p[0] + (CV.hash2(x, y, 77) - 0.5) * CV.TW * 0.7, p[1] + (CV.hash2(x, y, 78) - 0.5) * CV.TH * 0.7, 2.6, 2.6);
    }
  }

  function drawWaterfallAnim(ctx, w, wf, t) {
    const r = wfRect(w, wf);
    const xs = r.q.map((p) => p[0]), ys = r.q.map((p) => p[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys), x1 = Math.max(...xs), y1 = Math.max(...ys);
    const hh = y1 - y0, ww = x1 - x0;
    ctx.save(); quad(ctx, r.q); ctx.clip();
    const o = (t * 170) % hh;
    ctx.globalAlpha = 0.92;
    ctx.drawImage(CV.S.waterfall, x0 - 2, y0 - o, ww + 4, hh);
    ctx.drawImage(CV.S.waterfall, x0 - 2, y0 - o + hh, ww + 4, hh);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      const lx = x0 + ww * (0.25 + 0.25 * k) + Math.sin(t * 3 + k) * 2;
      const lo = (t * 220 + k * 40) % (hh + 20);
      ctx.beginPath(); ctx.moveTo(lx, y0 - 10 + lo); ctx.lineTo(lx, y0 - 10 + lo + 12); ctx.stroke();
    }
    // foam at base
    ctx.fillStyle = 'rgba(240,250,245,0.75)';
    for (let k = 0; k < 4; k++) {
      const fx = x0 + ww * (0.15 + 0.23 * k);
      const fr = 4 + 3 * Math.abs(Math.sin(t * 5 + k * 2));
      ctx.beginPath(); ctx.ellipse(fx, y1 - 2, fr + 3, fr, 0, 0, CV.TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawGhost(ctx, w, t) {
    const hov = CV.input.hover;
    if (!hov || CV.build.mode !== 'build' || !CV.build.selected) return;
    const def = CV.BUILD_DEFS[CV.build.selected];
    const cells = CV.buildingCells({ x: hov.x, y: hov.y, id: CV.build.selected, rot: CV.build.rot });
    for (const [cx, cy] of cells) {
      if (cx < 0 || cy < 0 || cx >= w.W || cy >= w.H) continue;
      const hgt = w.h[cy * w.W + cx];
      const q = [CV.proj(cx, cy, hgt), CV.proj(cx + 1, cy, hgt), CV.proj(cx + 1, cy + 1, hgt), CV.proj(cx, cy + 1, hgt)];
      quad(ctx, q);
      ctx.fillStyle = CV.build.hoverValid ? 'rgba(140,255,140,0.30)' : 'rgba(255,90,90,0.35)';
      ctx.fill();
      ctx.strokeStyle = CV.build.hoverValid ? 'rgba(160,255,160,0.8)' : 'rgba(255,110,110,0.9)';
      ctx.lineWidth = 2; ctx.stroke();
    }
    CV.drawBuilding(ctx, { x: hov.x, y: hov.y, id: CV.build.selected, rot: CV.build.rot, born: t }, w, t, true);
  }

  function drawGlows(ctx, t, w) {
    const wn = R.sky.wn;
    const any = wn > 0.04;
    const fires = w.buildings.filter((b) => CV.BUILD_DEFS[b.id].glow || CV.BUILD_DEFS[b.id].fire);
    if (!any && !fires.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of fires) {
      const def = CV.BUILD_DEFS[b.id];
      const i = b.y * w.W + b.x;
      const hgt = w.h[i];
      const base = CV.proj(b.x + 0.5, b.y + 0.7, hgt);
      let gy = base[1], gs = 120, ga = 0;
      if (def.fire) { gy = base[1] - 14; gs = 150; ga = 0.30 + wn * 0.55 + 0.08 * Math.sin(t * 9 + b.x * 3); }
      else if (def.render === 'wall' && def.win) { gy = base[1] - CV.WALL_H * 0.55; gs = 70; ga = wn * 0.8; }
      else { gy = base[1] - 52; gs = 130; ga = wn * (0.75 + 0.12 * Math.sin(t * 6.3 + b.y)); }
      if (ga > 0.03) {
        ctx.globalAlpha = CV.clamp(ga, 0, 1);
        ctx.drawImage(CV.S.glow, base[0] - gs / 2, gy - gs / 2, gs, gs);
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // ---------------- frame ----------------
  R.frame = function (t, dt) {
    if (!world || !terrainCv) return;
    const w = world, S = CV.S;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    drawSky(t, w);
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.k, view.k);
    ctx.imageSmoothingEnabled = true;
    const b = R.b;
    ctx.drawImage(terrainCv, b.minX - 4, b.minY - 4);

    for (let y = 0; y < w.H; y++) {
      for (let x = 0; x < w.W; x++) {
        const i = y * w.W + x, hgt = w.h[i], ty = w.type[i];
        if (ty === CV.T.WATER) drawWater(ctx, w, x, y, t);
        const tf = w.tufts[i];
        if (tf.length) {
          const windHere = CV.wind(t, x * 1.7 + tf[0].dx * 0.01, y * 1.9);
          const ph = CV.clamp(Math.round((windHere + 1.35) / 2.7 * (S.TUFT_P - 1)), 0, S.TUFT_P - 1);
          for (const tu of tf) {
            const p = CV.proj(x + tu.dx / CV.TW, y + tu.dy / CV.TH, hgt);
            const img = S.tuft[tu.v][ph], s = tu.s;
            ctx.drawImage(img, p[0] - 20 * s, p[1] - 29 * s, 40 * s, 30 * s);
          }
        }
        for (const wf of w.waterfalls) if (wf.x === x && wf.y === y) drawWaterfallAnim(ctx, w, wf, t);
        for (const p of w.propsByTile[i]) CV.drawProp(ctx, p, w, t);
        for (const bd of w.buildings) if (bd.x === x && bd.y === y) CV.drawBuilding(ctx, bd, w, t, false);
        if (CV.char && Math.floor(CV.char.x) === x && Math.floor(CV.char.y) === y) CV.drawChar(ctx, t);
      }
    }
    drawGhost(ctx, w, t);
    CV.drawParts(ctx, t, w);
    drawGlows(ctx, t, w);
  };

  // screen (css px) -> world px
  R.screenToWorld = function (sx, sy) {
    return [(sx - view.ox) / view.k, (sy - view.oy) / view.k];
  };
  // pick tile under screen point — front rows win (they occlude back rows)
  R.pickTile = function (sx, sy) {
    if (!world) return null;
    const [wx, wy] = R.screenToWorld(sx, sy);
    for (let y = world.H - 1; y >= 0; y--) {
      for (let x = 0; x < world.W; x++) {
        const hgt = world.h[y * world.W + x];
        const q = [CV.proj(x, y, hgt), CV.proj(x + 1, y, hgt), CV.proj(x + 1, y + 1, hgt), CV.proj(x, y + 1, hgt)];
        if (CV.pointInQuad(wx, wy, [q[0][0], q[0][1], q[1][0], q[1][1], q[2][0], q[2][1], q[3][0], q[3][1]])) return { x, y };
      }
    }
    return null;
  };
})();
