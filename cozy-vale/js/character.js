/* Cozy Vale — the character: a simple cube with NO eyes.
   Squash & stretch, soft blob shadow, footstep dust, tap-to-walk pathfinding. */
(function () {
  const CV = window.CV;

  CV.walkableAt = function (w, x, y) {
    if (x < 0 || y < 0 || x >= w.W || y >= w.H) return false;
    const i = y * w.W + x;
    const t = w.type[i];
    if (t === CV.T.WATER) {
      const ok = w.propsByTile[i].some((p) => p.kind === 'stepping') ||
        (w.structGrid && w.structGrid[i] >= 0 && (() => { const b = w.buildings[w.structGrid[i]]; const d = CV.BUILD_DEFS[b.id]; return d.water && d.walk; })());
      if (!ok) return false;
    }
    if (w.propAt[i] >= 0 && CV.propBlocks(w.props[w.propAt[i]])) return false;
    if (w.structGrid && w.structGrid[i] >= 0) {
      const b = w.buildings[w.structGrid[i]];
      const d = CV.BUILD_DEFS[b.id];
      if (d.blocks && !d.walk) return false;
    }
    return true;
  };

  const C = CV.char = { x: 11, y: 11, z: 0, path: null, pi: 0, bob: 0, moving: false, fx: 0, fy: 1 };
  C.reset = function (w) { C.x = w.spawn.x + 0.5; C.y = w.spawn.y + 0.5; C.path = null; C.z = w.h[w.spawn.y * w.W + w.spawn.x]; };

  C.setTarget = function (w, tx, ty) {
    const sx = Math.floor(C.x), sy = Math.floor(C.y);
    const path = CV.astar(w.W, w.H,
      (x, y) => CV.walkableAt(w, x, y),
      (x, y) => 1 + Math.abs(w.h[y * w.W + x] - w.h[sy * w.W + sx]) * 0.5,
      { x: sx, y: sy }, { x: tx, y: ty }, 3000);
    if (path && path.length > 1) { C.path = path.slice(1); C.pi = 0; }
    else C.path = null;
  };

  C.update = function (dt, w) {
    const inp = CV.input ? CV.input.move : { x: 0, y: 0 };
    let mx = inp.x, my = inp.y;
    const hasInput = Math.abs(mx) > 0.01 || Math.abs(my) > 0.01;
    if (hasInput) C.path = null;
    else if (C.path) {
      const nx = C.path[C.pi];
      if (nx) {
        const dx = nx.x + 0.5 - C.x, dy = nx.y + 0.5 - C.y;
        const d = Math.hypot(dx, dy);
        if (d < 0.09) C.pi++; else { mx = dx / d; my = dy / d; }
      } else C.path = null;
    }
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    const sp = 3.9;
    const ci = Math.floor(C.y) * w.W + Math.floor(C.x);
    const nx = C.x + mx * sp * dt, ny = C.y + my * sp * dt;
    if (Math.abs(mx) > 0.01) { C.fx = mx; C.fy = my; }
    if (CV.walkableAt(w, Math.floor(nx), Math.floor(C.y)) && Math.abs(w.h[Math.floor(C.y) * w.W + Math.floor(nx)] - w.h[ci]) <= 1) C.x = nx;
    if (CV.walkableAt(w, Math.floor(C.x), Math.floor(ny)) && Math.abs(w.h[Math.floor(ny) * w.W + Math.floor(C.x)] - w.h[ci]) <= 1) C.y = ny;
    C.x = CV.clamp(C.x, 0.5, w.W - 0.5);
    C.y = CV.clamp(C.y, 0.5, w.H - 0.5);
    const i = Math.floor(C.y) * w.W + Math.floor(C.x);
    C.z += (w.h[i] - C.z) * Math.min(1, dt * 10);
    C.moving = !!(mx || my);
    if (C.moving) {
      C.bob += dt * 11;
      if (Math.random() < dt * 7) CV.spawn({ type: 'puff', x: C.x - C.fx * 0.3, y: C.y - C.fy * 0.3, z: C.z + 0.1, vx: -C.fx * 0.4, vy: -C.fy * 0.4, vz: 0.25, life: 0.5, size: 5, color: '#cdbd97' });
    }
  };

  CV.drawChar = function (ctx, t) {
    const C = CV.char;
    const p = CV.proj(C.x, C.y, C.z);
    ctx.fillStyle = 'rgba(8,16,6,0.30)';
    ctx.beginPath(); ctx.ellipse(p[0], p[1] + 2.5, 15, 5.5, 0, 0, CV.TAU); ctx.fill();
    const w = 25, h = 29;
    const sy = C.moving ? 1 + Math.sin(C.bob) * 0.06 : 1 + Math.sin(t * 2.2) * 0.022;
    const sx = C.moving ? 1 - Math.sin(C.bob) * 0.045 : 1 - Math.sin(t * 2.2) * 0.015;
    const lean = CV.clamp(C.fx * 0.10, -0.14, 0.14) * (C.moving ? 1 : 0.3);
    ctx.save();
    ctx.translate(p[0], p[1]);
    ctx.rotate(lean);
    ctx.scale(sx, sy);
    // body — plain wooden cube, no face, no eyes
    const g = ctx.createLinearGradient(0, -h, 0, 0);
    g.addColorStop(0, '#dca763'); g.addColorStop(0.55, '#c08a4c'); g.addColorStop(1, '#96622f');
    ctx.fillStyle = g;
    roundRect(ctx, -w / 2, -h, w, h, 6); ctx.fill();
    // top face (pseudo-3D)
    ctx.fillStyle = '#eec684';
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 4, -h + 1);
    ctx.lineTo(w / 2 - 4, -h + 1);
    ctx.lineTo(w / 2 + 1, -h - 6);
    ctx.lineTo(-w / 2 + 7, -h - 6);
    ctx.closePath(); ctx.fill();
    // right side shade
    ctx.fillStyle = 'rgba(60,32,10,0.18)';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 6, -h + 3); ctx.lineTo(w / 2, -h + 5); ctx.lineTo(w / 2, -2); ctx.lineTo(w / 2 - 6, -1);
    ctx.closePath(); ctx.fill();
    // soft outline
    ctx.strokeStyle = 'rgba(50,28,10,0.55)'; ctx.lineWidth = 2;
    roundRect(ctx, -w / 2, -h, w, h, 6); ctx.stroke();
    ctx.restore();
  };

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
})();
