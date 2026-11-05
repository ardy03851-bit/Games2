/* Cozy Vale — input: keyboard (WASD/arrows), mouse, iPad touch joystick,
   tap-to-walk, build ghost tracking, drag-to-place. Camera is NOT controllable. */
(function () {
  const CV = window.CV;
  const I = CV.input = { move: { x: 0, y: 0 }, hover: null, keys: {} };
  const joy = { active: false, id: null, dx: 0, dy: 0 };
  let canvas = null;
  let dragPlacing = false, lastDragTile = null;

  I.init = function (cv) {
    canvas = cv;
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      I.keys[k] = true;
      if (k === 'b') CV.ui.togglePalette();
      else if (k === 'e') CV.build.gather(CV.world);
      else if (k === 'r') CV.build.rotate();
      else if (k === 'x') CV.ui.setMode('remove');
      else if (k === 'escape') { CV.ui.setMode('move'); CV.ui.hidePalette(); }
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { I.keys[e.key.toLowerCase()] = false; });

    canvas.addEventListener('pointerdown', (e) => {
      CV.audio.unlock();
      const x = e.clientX, y = e.clientY;
      // joystick zone: left-bottom area on touch
      if (e.pointerType === 'touch' && x < innerWidth * 0.45 && y > innerHeight * 0.42) {
        joy.active = true; joy.id = e.pointerId; joy.dx = 0; joy.dy = 0;
        const base = document.getElementById('joy-base');
        base.style.display = 'block';
        base.style.left = x + 'px'; base.style.top = y + 'px';
        moveNub(x, y);
        return;
      }
      const tile = CV.render.pickTile(x, y);
      if (!tile) return;
      I.hover = tile;
      if (CV.build.mode === 'build' && CV.build.selected) {
        dragPlacing = true; lastDragTile = tile;
        CV.build.place(CV.world, tile.x, tile.y);
      } else if (CV.build.mode === 'remove') {
        CV.build.removeAt(CV.world, tile.x, tile.y);
      } else if (CV.walkableAt(CV.world, tile.x, tile.y)) {
        CV.char.setTarget(CV.world, tile.x, tile.y);
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      const x = e.clientX, y = e.clientY;
      if (joy.active && e.pointerId === joy.id) {
        const base = document.getElementById('joy-base');
        const bx = parseFloat(base.style.left), by = parseFloat(base.style.top);
        let dx = x - bx, dy = y - by;
        const len = Math.hypot(dx, dy), max = 52;
        if (len > max) { dx = dx / len * max; dy = dy / len * max; }
        joy.dx = dx / max; joy.dy = dy / max;
        moveNub(bx + dx, by + dy);
        return;
      }
      const tile = CV.render.pickTile(x, y);
      I.hover = tile;
      if (dragPlacing && tile && CV.build.mode === 'build' && CV.build.selected) {
        if (!lastDragTile || lastDragTile.x !== tile.x || lastDragTile.y !== tile.y) {
          lastDragTile = tile;
          CV.build.place(CV.world, tile.x, tile.y);
        }
      }
    });
    const end = (e) => {
      if (joy.active && e.pointerId === joy.id) {
        joy.active = false; joy.id = null; joy.dx = 0; joy.dy = 0;
        document.getElementById('joy-base').style.display = 'none';
        moveNub(0, 0);
      }
      dragPlacing = false; lastDragTile = null;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  };

  function moveNub(x, y) {
    const nub = document.getElementById('joy-nub');
    nub.style.left = '50%'; nub.style.top = '50%';
    nub.style.transform = `translate(calc(-50% + ${x ? 0 : 0}px), -50%)`;
    if (x || y) nub.style.transform = `translate(calc(-50% + ${(x - parseFloat(document.getElementById('joy-base').style.left))}px), calc(-50% + ${(y - parseFloat(document.getElementById('joy-base').style.top))}px))`;
  }

  I.update = function () {
    let x = 0, y = 0;
    const k = I.keys;
    if (k['w'] || k['arrowup']) y -= 1;
    if (k['s'] || k['arrowdown']) y += 1;
    if (k['a'] || k['arrowleft']) x -= 1;
    if (k['d'] || k['arrowright']) x += 1;
    x += joy.dx; y += joy.dy;
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    I.move.x = x; I.move.y = y;
  };
})();
