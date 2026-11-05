/* Cozy Vale — bootstrap & main loop. Fixed camera: the view always fits the
   whole valley; there are deliberately no pan/zoom controls. */
(function () {
  const CV = window.CV;
  let running = false, last = 0;
  CV.now = 0;

  CV.startWorld = function (seedStr) {
    CV.saveNow();
    const seedNum = CV.hashStr(seedStr);
    const w = CV.genWorld(seedNum, seedStr);
    CV.world = w;
    const save = CV.loadSave(seedStr);
    if (save) {
      w.buildings = Array.isArray(save.buildings) ? save.buildings : [];
      if (typeof save.wood === 'number') CV.resources.wood = save.wood;
      if (typeof save.stone === 'number') CV.resources.stone = save.stone;
      if (typeof save.timeOfDay === 'number') w.timeOfDay = save.timeOfDay;
    }
    CV.rebuildStruct(w);
    CV.char.reset(w);
    CV.render.setWorld(w);
    document.getElementById('title').classList.add('hidden');
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('toolbar').classList.remove('hidden');
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) document.getElementById('joystick').classList.remove('hidden');
    CV.ui.seedLabel(seedStr);
    CV.ui.updateHUD();
    CV.build.buildPalette();
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
  };

  function loop(now) {
    requestAnimationFrame(loop);
    const t = now / 1000;
    let dt = (now - last) / 1000;
    last = now;
    dt = Math.min(dt, 0.05);
    CV.now = t;
    CV.windGust = 0.55 + 0.45 * Math.sin(t * 0.11) * Math.sin(t * 0.043 + 2.1);
    const w = CV.world;
    if (!w) return;
    w.timeOfDay = (w.timeOfDay + dt / 300) % 1; // ~5 min full day cycle
    CV.input.update();
    CV.char.update(dt, w);
    CV.build.update(w, t);
    const s = CV.render.sky;
    CV.updateParts(dt, t, w, s.wn, s.wd);
    CV.audio.update(t, dt, w);
    CV.render.frame(t, dt);
    CV.ui.updateHUD();
  }

  function boot() {
    CV.render.init(document.getElementById('game'));
    CV.loadAssets((d, n) => {
      document.getElementById('load-progress').textContent = 'painting the valley… ' + d + '/' + n;
    }).then(() => {
      CV.buildSprites();
      document.getElementById('load-progress').textContent = 'ready ✨ tap play!';
      CV.ui.wire();
      const meta = CV.loadMeta();
      document.getElementById('btn-play').onclick = () => {
        CV.audio.unlock();
        CV.startWorld(meta && meta.seedStr ? meta.seedStr : String((Math.random() * 1e9) | 0));
      };
      document.getElementById('btn-new').onclick = () => {
        CV.audio.unlock();
        CV.startWorld(String((Math.random() * 1e9) | 0));
      };
    });
  }

  window.addEventListener('DOMContentLoaded', boot);
})();
