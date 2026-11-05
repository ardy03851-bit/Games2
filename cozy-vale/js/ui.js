/* Cozy Vale — HUD, toasts, title screen, menu, palette visibility, save/load. */
(function () {
  const CV = window.CV;
  const UI = CV.ui = {};
  let lastWood = -1, lastStone = -1, lastClock = '', saveTimer = 0;

  UI.toast = function (msg) {
    const wrap = document.getElementById('toast-wrap');
    const el = document.createElement('div');
    el.className = 'toast'; el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 2700);
    while (wrap.children.length > 3) wrap.firstChild.remove();
  };

  UI.updateHUD = function () {
    const r = CV.resources;
    if (r.wood !== lastWood) { document.getElementById('wood').textContent = r.wood; lastWood = r.wood; }
    if (r.stone !== lastStone) { document.getElementById('stone').textContent = r.stone; lastStone = r.stone; }
    if (CV.world) {
      const tod = CV.world.timeOfDay;
      const icon = tod < 0.44 ? '☀️' : tod < 0.56 ? '🌇' : tod < 0.9 ? '🌙' : '🌅';
      if (icon !== lastClock) { document.getElementById('clock').textContent = icon; lastClock = icon; }
    }
  };

  UI.seedLabel = function (s) {
    document.getElementById('seed-label').textContent = 'valley #' + s;
  };

  UI.setMode = function (m) {
    CV.build.mode = m;
    document.getElementById('btn-build').classList.toggle('active', m === 'build');
    document.getElementById('btn-remove').classList.toggle('active', m === 'remove');
    if (m === 'build') UI.showPalette(); else if (m !== 'build') UI.hidePalette();
    if (m !== 'build') CV.build.selected = null;
  };
  UI.togglePalette = function () {
    const p = document.getElementById('palette');
    if (CV.build.mode === 'build' && !p.classList.contains('hidden')) { UI.setMode('move'); }
    else { CV.build.mode = 'build'; UI.setMode('build'); CV.build.buildPalette(); }
  };
  UI.showPalette = function () {
    CV.build.buildPalette();
    document.getElementById('palette').classList.remove('hidden');
  };
  UI.hidePalette = function () { document.getElementById('palette').classList.add('hidden'); };

  // ---------------- save / load ----------------
  const META_KEY = 'cozyvale:meta';
  CV.saveSoon = function () {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(CV.saveNow, 800);
  };
  CV.saveNow = function () {
    if (!CV.world) return;
    try {
      localStorage.setItem(META_KEY, JSON.stringify({ seedStr: CV.world.seedStr }));
      localStorage.setItem('cozyvale:' + CV.world.seedStr, JSON.stringify({
        wood: CV.resources.wood, stone: CV.resources.stone,
        buildings: CV.world.buildings, timeOfDay: CV.world.timeOfDay
      }));
    } catch (e) {}
  };
  CV.loadMeta = function () {
    try { return JSON.parse(localStorage.getItem(META_KEY) || 'null'); } catch (e) { return null; }
  };
  CV.loadSave = function (seedStr) {
    try { return JSON.parse(localStorage.getItem('cozyvale:' + seedStr) || 'null'); } catch (e) { return null; }
  };
  window.addEventListener('beforeunload', CV.saveNow);

  // ---------------- wiring ----------------
  UI.wire = function () {
    CV.input.init(document.getElementById('game'));

    document.getElementById('btn-build').onclick = () => { CV.audio.unlock(); UI.togglePalette(); };
    document.getElementById('btn-interact').onclick = () => { CV.audio.unlock(); CV.build.gather(CV.world); };
    document.getElementById('btn-rotate').onclick = () => { CV.build.rotate(); };
    document.getElementById('btn-remove').onclick = () => { CV.audio.unlock(); UI.setMode('remove'); };

    const menu = document.getElementById('menu');
    document.getElementById('btn-menu').onclick = () => { menu.classList.remove('hidden'); document.getElementById('help').classList.add('hidden'); document.getElementById('menu').querySelector('.sheet').classList.remove('hidden'); };
    document.getElementById('btn-close-menu').onclick = () => menu.classList.add('hidden');
    document.getElementById('btn-help').onclick = () => {
      document.getElementById('help').classList.remove('hidden');
    };
    document.getElementById('btn-close-help').onclick = () => document.getElementById('help').classList.add('hidden');
    document.getElementById('btn-newvalley').onclick = () => {
      const v = document.getElementById('seed-input').value.trim() || String((Math.random() * 1e9) | 0);
      location.hash = '';
      CV.saveNow();
      CV.startWorld(v);
    };
    document.getElementById('seed-input').value = (CV.loadMeta() && CV.loadMeta().seedStr) || '';

    const sBtn = document.getElementById('btn-sound'), sBtn2 = document.getElementById('btn-sound2');
    const setS = () => {
      CV.audio.setMuted(!CV.audio.muted);
      const t = CV.audio.muted ? '🔇 Sound: off' : '🔊 Sound: on';
      sBtn.textContent = CV.audio.muted ? '🔇' : '🔊';
      sBtn2.textContent = t;
    };
    sBtn.onclick = setS; sBtn2.onclick = setS;
  };
})();
