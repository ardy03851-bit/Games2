/* Cozy Vale — util: namespace, math, RNG, noise, pathfinding */
window.CV = window.CV || {};
(function () {
  const CV = window.CV;
  CV.TAU = Math.PI * 2;
  CV.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  CV.lerp = (a, b, t) => a + (b - a) * t;
  CV.smoothstep = (a, b, v) => { const t = CV.clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  CV.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

  CV.mulberry32 = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  CV.hashStr = function (s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  // deterministic 2D hash -> [0,1)
  CV.hash2 = function (x, y, seed) {
    let h = (seed >>> 0) ^ Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  // seeded value-noise with fBm + domain warp
  CV.makeNoise = function (seed) {
    const rand = CV.mulberry32(seed ^ 0x9e3779b9);
    const perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = (rand() * (i + 1)) | 0; const t = p[i]; p[i] = p[j]; p[j] = t; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    const vals = new Float32Array(256);
    for (let i = 0; i < 256; i++) vals[i] = rand();
    const val = (ix, iy) => vals[perm[(ix & 255) + perm[iy & 255]]];
    function noise(x, y) {
      const ix = Math.floor(x), iy = Math.floor(y);
      const fx = x - ix, fy = y - iy;
      const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
      const a = val(ix, iy), b = val(ix + 1, iy), c = val(ix, iy + 1), d = val(ix + 1, iy + 1);
      return CV.lerp(CV.lerp(a, b, ux), CV.lerp(c, d, ux), uy);
    }
    function fbm(x, y, oct) {
      let s = 0, amp = 0.5, f = 1, norm = 0;
      for (let i = 0; i < oct; i++) { s += amp * noise(x * f, y * f); norm += amp; amp *= 0.5; f *= 2.03; }
      return s / norm;
    }
    function warp(x, y, amt, oct) {
      return fbm(x + amt * fbm(x + 5.2, y + 1.3, 3), y + amt * fbm(x + 9.7, y + 8.1, 3), oct || 4);
    }
    return { noise, fbm, warp };
  };

  // A* on a grid. pass(x,y) -> bool walkable-ish, cost(x,y) -> number (Infinity = blocked)
  CV.astar = function (W, H, pass, cost, start, goal, maxExp) {
    const key = (x, y) => y * W + x;
    const g = new Float32Array(W * H).fill(Infinity);
    const came = new Int32Array(W * H).fill(-1);
    const open = [key(start.x, start.y)];
    g[key(start.x, start.y)] = 0;
    const h = (x, y) => Math.abs(x - goal.x) + Math.abs(y - goal.y);
    let exp = 0;
    while (open.length && exp++ < (maxExp || 4000)) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (g[open[i]] + h(open[i] % W, (open[i] / W) | 0) < g[open[bi]] + h(open[bi] % W, (open[bi] / W) | 0)) bi = i;
      const cur = open.splice(bi, 1)[0];
      const cx = cur % W, cy = (cur / W) | 0;
      if (cx === goal.x && cy === goal.y) {
        const path = [];
        let c = cur;
        while (c !== -1) { path.push({ x: c % W, y: (c / W) | 0 }); c = came[c]; }
        return path.reverse();
      }
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const d of dirs) {
        const nx = cx + d[0], ny = cy + d[1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (!pass(nx, ny)) continue;
        const nc = g[cur] + cost(nx, ny);
        if (nc < g[key(nx, ny)]) {
          g[key(nx, ny)] = nc; came[key(nx, ny)] = cur;
          if (!open.includes(key(nx, ny))) open.push(key(nx, ny));
        }
      }
    }
    return null;
  };

  CV.pointInQuad = function (px, py, q) {
    // q = [x0,y0,x1,y1,x2,y2,x3,y3] ; convex quad, sign test
    let sign = 0;
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      const cross = (q[j * 2] - q[i * 2]) * (py - q[i * 2 + 1]) - (q[j * 2 + 1] - q[i * 2 + 1]) * (px - q[i * 2]);
      if (cross !== 0) {
        const s = cross > 0 ? 1 : -1;
        if (sign === 0) sign = s; else if (s !== sign) return false;
      }
    }
    return true;
  };

  CV.fmtCost = function (cost) {
    const parts = [];
    if (cost.wood) parts.push('🪵' + cost.wood);
    if (cost.stone) parts.push('🪨' + cost.stone);
    return parts.length ? parts.join(' ') : 'free';
  };
})();
