/* Cozy Vale — particles & ambient life: fireflies, pollen, waterfall mist,
   chimney smoke, campfire embers, chop puffs, falling leaves, butterflies. */
(function () {
  const CV = window.CV;
  const P = [];
  CV.parts = P;
  CV.bugs = [];

  CV.spawn = function (o) {
    if (P.length > 700) P.splice(0, P.length - 700);
    P.push(Object.assign({
      type: 'dot', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
      t: 0, life: 1, size: 6, color: '#fff', grav: 0, seed: Math.random() * 10
    }, o));
  };

  let ffT = 0, pollenT = 0, mistT = 0, smokeT = 0, emberT = 0, leafT = 0;

  CV.updateParts = function (dt, t, w, nightW, dayW) {
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.t += dt;
      if (p.t >= p.life) { P.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.vz -= (p.grav || 0) * dt;
    }
    if (!w) return;
    const rnd = Math.random;

    // fireflies at dusk/night, near trees
    ffT -= dt;
    if (nightW > 0.2 && ffT <= 0) {
      ffT = 0.22;
      const flies = P.reduce((n, p) => n + (p.type === 'firefly' ? 1 : 0), 0);
      if (flies < 42) {
        const trees = w.props.filter((p) => p.kind === 'pine' || p.kind === 'roundtree');
        if (trees.length) {
          const tr = trees[(rnd() * trees.length) | 0];
          const i = tr.y * w.W + tr.x;
          CV.spawn({
            type: 'firefly', x: tr.x + 0.5 + (rnd() - 0.5) * 2.4, y: tr.y + 0.5 + (rnd() - 0.5) * 2.4,
            z: w.h[i] + 1.2 + rnd() * 2.2, vx: (rnd() - 0.5) * 0.5, vy: (rnd() - 0.5) * 0.5, vz: (rnd() - 0.5) * 0.2,
            life: 5 + rnd() * 5, size: 14 + rnd() * 10, seed: rnd() * 10
          });
        }
      }
    }
    // pollen motes in daylight near flowers
    pollenT -= dt;
    if (dayW > 0.4 && pollenT <= 0) {
      pollenT = 0.3;
      const fl = w.props.filter((p) => p.kind === 'flowers');
      if (fl.length && P.length < 500) {
        const f = fl[(rnd() * fl.length) | 0];
        CV.spawn({
          type: 'pollen', x: f.x + 0.5 + (rnd() - 0.5), y: f.y + 0.5 + (rnd() - 0.5), z: w.h[f.y * w.W + f.x] + 0.6 + rnd() * 1.2,
          vx: (rnd() - 0.5) * 0.35, vy: (rnd() - 0.5) * 0.35, vz: 0.12 + rnd() * 0.15,
          life: 3 + rnd() * 3, size: 3 + rnd() * 3, color: '#fff3c0'
        });
      }
    }
    // waterfall mist
    mistT -= dt;
    if (mistT <= 0) {
      mistT = 0.09;
      for (const wf of w.waterfalls) {
        if (rnd() < 0.75) {
          const bx = wf.dir === 'S' ? wf.x + 0.5 : wf.x + 1.6;
          const by = wf.dir === 'S' ? wf.y + 1.5 : wf.y + 0.5;
          CV.spawn({ type: 'mist', x: bx + (rnd() - 0.5) * 0.8, y: by, z: 0.15, vx: (rnd() - 0.5) * 0.5, vy: 0.25 + rnd() * 0.4, vz: 0.5 + rnd() * 0.6, life: 1.1 + rnd() * 0.7, size: 10 + rnd() * 12 });
        }
      }
    }
    // chimney smoke + campfire embers/smoke
    smokeT -= dt; emberT -= dt;
    if (smokeT <= 0) {
      smokeT = 0.16;
      for (const b of w.buildings) {
        const def = CV.BUILD_DEFS[b.id];
        if (!def || !def.smoke) continue;
        const i = b.y * w.W + b.x;
        const up = b.id === 'chimney' ? CV.WALL_H + CV.ROOF_H : 10;
        const c = CV.proj(b.x + 0.6, b.y + 0.45, w.h[i]);
        CV.spawn({ type: 'smoke', x: b.x + 0.62, y: b.y + 0.42, z: w.h[i] + up / CV.Z + 0.3, vx: 0.12 + rnd() * 0.1, vy: 0.1, vz: 0.55 + rnd() * 0.3, life: 2.2 + rnd(), size: 5 + rnd() * 4 });
      }
    }
    if (emberT <= 0) {
      emberT = 0.12;
      for (const b of w.buildings) {
        const def = CV.BUILD_DEFS[b.id];
        if (!def || !def.fire) continue;
        const i = b.y * w.W + b.x;
        CV.spawn({
          type: 'ember', x: b.x + 0.5 + (rnd() - 0.5) * 0.3, y: b.y + 0.5 + (rnd() - 0.5) * 0.3,
          z: w.h[i] + 0.35, vx: (rnd() - 0.5) * 0.3, vy: (rnd() - 0.5) * 0.3, vz: 0.9 + rnd() * 0.8,
          life: 0.9 + rnd() * 0.8, size: 3 + rnd() * 3, color: '#ffb84d'
        });
      }
    }
    // falling leaves in the forest
    leafT -= dt;
    if (leafT <= 0) {
      leafT = 0.5;
      const trees = w.props.filter((p) => p.kind === 'pine' || p.kind === 'roundtree');
      if (trees.length && rnd() < 0.8) {
        const tr = trees[(rnd() * trees.length) | 0];
        CV.spawn({
          type: 'leaf', x: tr.x + 0.5 + (rnd() - 0.5) * 0.8, y: tr.y + 0.5 + (rnd() - 0.5) * 0.8,
          z: w.h[tr.y * w.W + tr.x] + 2.5 + rnd() * 1.5, vx: 0.3 + rnd() * 0.4, vy: (rnd() - 0.5) * 0.3, vz: -0.12,
          grav: -0.05, life: 4, size: 5 + rnd() * 3, color: rnd() < 0.5 ? '#8fce5a' : '#d8b84d', seed: rnd() * 10
        });
      }
    }
    // butterflies around the meadow
    if (!CV.bugs.length && w.pois && w.pois.meadow) {
      for (let k = 0; k < 3; k++) CV.bugs.push({ x: w.pois.meadow.x + 1, y: w.pois.meadow.y + 1, ph: rnd() * CV.TAU, sp: 0.5 + rnd() * 0.5 });
    }
    for (const b of CV.bugs) {
      b.ph += dt * b.sp * 2;
      b.x += Math.sin(b.ph * 1.7) * dt * 0.9;
      b.y += Math.cos(b.ph * 1.3) * dt * 0.7;
      if (w.pois && w.pois.meadow) {
        b.x = CV.clamp(b.x, w.pois.meadow.x - 2.5, w.pois.meadow.x + 4.5);
        b.y = CV.clamp(b.y, w.pois.meadow.y - 2.5, w.pois.meadow.y + 4.5);
      }
    }
  };

  CV.drawParts = function (ctx, t, w) {
    const S = CV.S;
    for (const p of P) {
      const a = 1 - p.t / p.life;
      const pr = CV.proj(p.x, p.y, p.z);
      switch (p.type) {
        case 'firefly': {
          const fl = 0.55 + 0.45 * Math.sin(t * 2.2 + p.seed * 7);
          ctx.globalAlpha = a * fl;
          const s = p.size * (0.8 + 0.3 * fl);
          ctx.drawImage(S.glow, pr[0] - s / 2, pr[1] - s / 2, s, s);
          ctx.globalAlpha = 1;
          break;
        }
        case 'pollen': case 'ember': {
          ctx.globalAlpha = a * 0.9;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(pr[0], pr[1], p.size * 0.5, 0, CV.TAU); ctx.fill();
          ctx.globalAlpha = 1;
          break;
        }
        case 'smoke': {
          ctx.globalAlpha = a * 0.30;
          ctx.fillStyle = '#cfc8bd';
          ctx.beginPath(); ctx.arc(pr[0], pr[1], p.size * (1 + p.t * 1.6), 0, CV.TAU); ctx.fill();
          ctx.globalAlpha = 1;
          break;
        }
        case 'mist': {
          ctx.globalAlpha = a * 0.4;
          ctx.fillStyle = '#eef7ee';
          ctx.beginPath(); ctx.ellipse(pr[0], pr[1], p.size * (1 + p.t), p.size * 0.55 * (1 + p.t), 0, 0, CV.TAU); ctx.fill();
          ctx.globalAlpha = 1;
          break;
        }
        case 'puff': {
          ctx.globalAlpha = a * 0.7;
          ctx.fillStyle = p.color || '#d9c9a0';
          ctx.beginPath(); ctx.arc(pr[0], pr[1], p.size * (1.6 - a), 0, CV.TAU); ctx.fill();
          ctx.globalAlpha = 1;
          break;
        }
        case 'leaf': {
          ctx.save();
          ctx.translate(pr[0], pr[1]);
          ctx.rotate(p.seed + t * 3);
          ctx.globalAlpha = a;
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
          break;
        }
        case 'spark': {
          ctx.globalAlpha = a * (0.5 + 0.5 * Math.sin(t * 6 + p.seed * 9));
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(pr[0] - 1.5, pr[1] - 1.5, 3, 3);
          ctx.globalAlpha = 1;
          break;
        }
        default: {
          ctx.globalAlpha = a;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(pr[0], pr[1], p.size * 0.5, 0, CV.TAU); ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }
    // butterflies
    for (const b of CV.bugs) {
      const i = Math.floor(b.y) * w.W + Math.floor(b.x);
      const z = (w.h[i] || 0) + 1.1;
      const pr = CV.proj(b.x, b.y, z);
      const flap = Math.abs(Math.sin(t * 14 + b.ph));
      ctx.save();
      ctx.translate(pr[0], pr[1]);
      ctx.scale(0.4 + flap * 0.6, 1);
      ctx.drawImage(S.butterfly, -14, -12, 28, 24);
      ctx.restore();
    }
  };
})();
