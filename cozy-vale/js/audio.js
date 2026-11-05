/* Cozy Vale — tiny procedural WebAudio ambience: wind, birds, crickets,
   waterfall rush, campfire crackle. No audio files needed. Mute-able. */
(function () {
  const CV = window.CV;
  const A = CV.audio = { ctx: null, master: null, muted: false, windGain: null, waterGain: null, birdT: 0, crickT: 0, crackT: 0 };

  function noiseBuffer(ctx, sec) {
    const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  A.unlock = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    try {
      const ctx = A.ctx = new (window.AudioContext || window.webkitAudioContext)();
      A.master = ctx.createGain();
      A.master.gain.value = A.muted ? 0 : 0.5;
      A.master.connect(ctx.destination);
      // wind
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx, 3); src.loop = true;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
      A.windGain = ctx.createGain(); A.windGain.gain.value = 0.05;
      src.connect(lp); lp.connect(A.windGain); A.windGain.connect(A.master);
      src.start();
      // waterfall rush
      const src2 = ctx.createBufferSource();
      src2.buffer = noiseBuffer(ctx, 2); src2.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 0.6;
      A.waterGain = ctx.createGain(); A.waterGain.gain.value = 0;
      src2.connect(bp); bp.connect(A.waterGain); A.waterGain.connect(A.master);
      src2.start();
    } catch (e) { /* audio unavailable — fine */ }
  };

  A.setMuted = function (m) {
    A.muted = m;
    if (A.master) A.master.gain.value = m ? 0 : 0.5;
    try { localStorage.setItem('cozyvale:muted', m ? '1' : '0'); } catch (e) {}
  };
  try { A.muted = localStorage.getItem('cozyvale:muted') === '1'; } catch (e) {}

  function chirp(ctx, dest, f0, f1, dur, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    const t0 = ctx.currentTime;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + dur * 0.3);
    g.gain.linearRampToValueAtTime(0, t0 + dur);
    o.connect(g); g.connect(dest);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  A.update = function (t, dt, w) {
    if (!A.ctx || A.ctx.state !== 'running' || !w) return;
    const s = CV.render.sky;
    const gust = CV.windGust || 0.5;
    if (A.windGain) A.windGain.gain.value = 0.04 + 0.10 * gust + 0.02 * Math.sin(t * 0.7);
    // waterfall loudness by distance
    if (A.waterGain && w.waterfalls.length) {
      const c = CV.char;
      let bd = 1e9;
      for (const wf of w.waterfalls) bd = Math.min(bd, Math.hypot(wf.x + 0.5 - c.x, wf.y + 0.5 - c.y));
      A.waterGain.gain.value = CV.clamp(0.16 / (1 + bd * 0.55), 0, 0.16);
    }
    // birds by day
    A.birdT -= dt;
    if (s.wd > 0.45 && A.birdT <= 0) {
      A.birdT = 1.2 + Math.random() * 4;
      const n = 2 + (Math.random() * 3 | 0);
      for (let i = 0; i < n; i++) {
        setTimeout(() => {
          if (A.ctx && A.ctx.state === 'running')
            chirp(A.ctx, A.master, 2300 + Math.random() * 900, 3100 + Math.random() * 800, 0.12, 0.05);
        }, i * 130);
      }
    }
    // crickets by night
    A.crickT -= dt;
    if (s.wn > 0.5 && A.crickT <= 0) {
      A.crickT = 0.18 + Math.random() * 0.3;
      chirp(A.ctx, A.master, 4200 + Math.random() * 300, 4100, 0.06, 0.025);
    }
    // campfire crackle
    A.crackT -= dt;
    let nearFire = false;
    for (const b of w.buildings) {
      if (CV.BUILD_DEFS[b.id].fire && Math.hypot(b.x + 0.5 - CV.char.x, b.y + 0.5 - CV.char.y) < 3.5) nearFire = true;
    }
    if (nearFire && A.crackT <= 0) {
      A.crackT = 0.05 + Math.random() * 0.25;
      chirp(A.ctx, A.master, 900 + Math.random() * 1400, 300, 0.05, 0.03);
    }
  };
})();
