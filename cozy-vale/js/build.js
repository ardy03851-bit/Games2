/* Cozy Vale — building system: palette, placement rules, resources,
   gather (chop trees / mine rocks), regrow, sapling growth, save/load. */
(function () {
  const CV = window.CV;
  const B = CV.build = { mode: 'move', selected: null, rot: 0, hoverValid: false };
  CV.resources = { wood: 12, stone: 8 };

  CV.buildingAt = function (w, x, y) {
    if (w.structGrid && y >= 0 && y < w.H && x >= 0 && x < w.W && w.structGrid[y * w.W + x] >= 0) return w.buildings[w.structGrid[y * w.W + x]];
    return null;
  };

  CV.rebuildStruct = function (w) {
    w.structGrid = new Int32Array(w.W * w.H).fill(-1);
    w.groundGrid = new Int32Array(w.W * w.H).fill(-1);
    w.buildings.forEach((b, i) => {
      const d = CV.BUILD_DEFS[b.id];
      if (!d) return;
      for (const [cx, cy] of CV.buildingCells(b)) {
        if (cx < 0 || cy < 0 || cx >= w.W || cy >= w.H) continue;
        if (d.ground) w.groundGrid[cy * w.W + cx] = i; else w.structGrid[cy * w.W + cx] = i;
      }
    });
  };

  B.canPlace = function (w, x, y, id) {
    const def = CV.BUILD_DEFS[id];
    if (!def) return false;
    const cells = CV.buildingCells({ x, y, id });
    for (const [cx, cy] of cells) {
      if (cx < 0 || cy < 0 || cx >= w.W || cy >= w.H) return false;
      const i = cy * w.W + cx, t = w.type[i];
      if (def.water) { if (t !== CV.T.WATER) return false; }
      else if (t === CV.T.WATER) return false;
      if (def.ground) { if (w.groundGrid && w.groundGrid[i] >= 0) return false; }
      else {
        const s = w.structGrid && w.structGrid[i] >= 0 ? w.buildings[w.structGrid[i]] : null;
        if (def.need === 'wallfloor') {
          // roof may stack on a wall OR on a stone floor
          const g = w.groundGrid && w.groundGrid[i] >= 0 ? w.buildings[w.groundGrid[i]] : null;
          const okS = s && s.id.indexOf('wall') === 0;
          const okG = g && g.id === 'floor';
          if (!okS && !okG) return false;
        } else if (def.need === 'roof') {
          // chimney stacks on a roof
          if (!s || s.id !== 'roof') return false;
        } else {
          if (s) return false;
          if (w.propAt[i] >= 0 && CV.propBlocks(w.props[w.propAt[i]])) return false;
        }
      }
    }
    const r = CV.resources;
    if ((def.cost.wood || 0) > r.wood || (def.cost.stone || 0) > r.stone) return false;
    return true;
  };

  B.place = function (w, x, y) {
    const id = B.selected;
    if (!id) return false;
    if (!B.canPlace(w, x, y, id)) { CV.ui.toast('Can’t place that here'); return false; }
    const def = CV.BUILD_DEFS[id];
    CV.resources.wood -= def.cost.wood || 0;
    CV.resources.stone -= def.cost.stone || 0;
    w.buildings.push({ id, x, y, rot: B.rot, born: CV.now });
    CV.rebuildStruct(w);
    CV.ui.updateHUD();
    for (let k = 0; k < 6; k++) CV.spawn({
      type: 'puff', x: x + 0.5 + (Math.random() - 0.5) * 0.6, y: y + 0.5 + (Math.random() - 0.5) * 0.6,
      z: w.h[y * w.W + x] + 0.5, vx: (Math.random() - 0.5), vy: (Math.random() - 0.5), vz: 0.6 + Math.random(), life: 0.6, size: 6
    });
    CV.ui.toast('Placed ' + def.name);
    CV.saveSoon();
    return true;
  };

  B.removeAt = function (w, x, y) {
    if (x < 0 || y < 0 || x >= w.W || y >= w.H) return false;
    const i = y * w.W + x;
    let b = null;
    if (w.structGrid && w.structGrid[i] >= 0) b = w.buildings[w.structGrid[i]];
    else if (w.groundGrid && w.groundGrid[i] >= 0) b = w.buildings[w.groundGrid[i]];
    if (!b) { CV.ui.toast('Nothing of yours here'); return false; }
    const def = CV.BUILD_DEFS[b.id];
    CV.resources.wood += Math.floor((def.cost.wood || 0) * 0.5);
    CV.resources.stone += Math.floor((def.cost.stone || 0) * 0.5);
    const extra = new Set();
    if (b.id.indexOf('wall') === 0 || b.id === 'floor' || b.id === 'roof') {
      w.buildings.forEach((o) => {
        if (o !== b && o.x === b.x && o.y === b.y && (o.id === 'roof' || o.id === 'chimney')) extra.add(o);
      });
    }
    w.buildings = w.buildings.filter((o) => o !== b && !extra.has(o));
    CV.rebuildStruct(w);
    CV.ui.updateHUD();
    CV.ui.toast('Removed — 50% refund 🪵🪨');
    CV.saveSoon();
    return true;
  };

  B.gather = function (w) {
    if (!w) return;
    const cx = CV.char.x, cy = CV.char.y;
    let best = null, bd = 1e9;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const x = Math.floor(cx) + dx, y = Math.floor(cy) + dy;
      if (x < 0 || y < 0 || x >= w.W || y >= w.H) continue;
      const pi = w.propAt[y * w.W + x];
      if (pi >= 0) {
        const p = w.props[pi];
        const d = CV.PROP_DEFS[p.kind];
        if (d && d.chop) {
          const dd = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
          if (dd < bd) { bd = dd; best = p; }
        }
      }
    }
    if (!best || bd > 2.1) { CV.ui.toast('Nothing to gather here — find a tree or boulder 🪓'); return; }
    const d = CV.PROP_DEFS[best.kind];
    CV.resources.wood += d.chop.wood || 0;
    CV.resources.stone += d.chop.stone || 0;
    best.origKind = best.kind; best.kind = 'stump'; best.regrowAt = CV.now + d.regrow;
    w.propAt[best.y * w.W + best.x] = -1;
    for (let k = 0; k < 9; k++) CV.spawn({
      type: 'puff', x: best.x + 0.5, y: best.y + 0.5, z: w.h[best.y * w.W + best.x] + 1,
      vx: (Math.random() - 0.5) * 2.2, vy: (Math.random() - 0.5) * 2.2, vz: 1 + Math.random() * 2, life: 0.7, size: 7
    });
    CV.ui.toast(`Gathered ${d.chop.wood ? '+' + d.chop.wood + ' 🪵' : ''}${d.chop.stone ? ' +' + d.chop.stone + ' 🪨' : ''}`);
    CV.ui.updateHUD();
    CV.saveSoon();
  };

  B.rotate = function () {
    B.rot = (B.rot + 1) % 4;
    CV.ui.toast('Rotated ⟳');
  };

  // per-frame: regrow chopped props, grow saplings, refresh ghost validity
  B.update = function (w, t) {
    if (!w) return;
    for (const p of w.props) {
      if (p.regrowAt && t >= p.regrowAt) {
        p.kind = p.origKind || 'pine';
        delete p.regrowAt;
        w.propAt[p.y * w.W + p.x] = w.props.indexOf(p);
      }
    }
    for (const b of w.buildings) {
      const def = CV.BUILD_DEFS[b.id];
      if (def && def.grow && !b.grown && t - b.born >= def.growTime) {
        b.grown = true;
        const i = b.y * w.W + b.x;
        w.props.push({ kind: def.grow, x: b.x, y: b.y, variant: (Math.random() * 3) | 0, scale: 0.8, phase: Math.random() * CV.TAU });
        w.propAt[i] = w.props.length - 1;
        w.propsByTile[i].push(w.props[w.props.length - 1]);
        w.buildings = w.buildings.filter((o) => o !== b);
        CV.rebuildStruct(w);
        CV.ui.toast('Your sapling grew into a tree 🌲');
        CV.saveSoon();
      }
    }
    const hov = CV.input.hover;
    B.hoverValid = !!(hov && B.selected && B.canPlace(w, hov.x, hov.y, B.selected));
  };

  // ---------------- palette ----------------
  let activeCat = 'build';
  B.buildPalette = function () {
    const tabs = document.getElementById('palette-tabs');
    const grid = document.getElementById('palette-grid');
    tabs.innerHTML = ''; grid.innerHTML = '';
    CV.BUILD_CATS.forEach((c) => {
      const el = document.createElement('button');
      el.className = 'ptab' + (c.id === activeCat ? ' active' : '');
      el.textContent = c.label;
      el.onclick = () => { activeCat = c.id; B.buildPalette(); };
      tabs.appendChild(el);
    });
    Object.keys(CV.BUILD_DEFS).forEach((id) => {
      const def = CV.BUILD_DEFS[id];
      if (def.cat !== activeCat) return;
      const card = document.createElement('div');
      card.className = 'pcard' + (B.selected === id ? ' sel' : '') + (!B.canPlace(CV.world, CV.char ? Math.floor(CV.char.x) : 0, CV.char ? Math.floor(CV.char.y) : 0, id) && (def.cost.wood || def.cost.stone) ? ' poor' : '');
      const cv = document.createElement('canvas'); cv.width = cv.height = 64;
      drawIcon(cv.getContext('2d'), def);
      card.appendChild(cv);
      const nm = document.createElement('div'); nm.className = 'pname'; nm.textContent = def.name; card.appendChild(nm);
      const co = document.createElement('div'); co.className = 'pcost'; co.textContent = CV.fmtCost(def.cost); card.appendChild(co);
      card.onclick = () => { B.selected = id; CV.ui.setMode('build'); B.buildPalette(); CV.ui.toast(def.name + ' — tap a tile to place'); };
      grid.appendChild(card);
    });
  };

  function drawIcon(x, def) {
    const S = CV.S;
    x.clearRect(0, 0, 64, 64);
    x.save();
    x.translate(32, 56);
    const spr = {
      fence: S.fence, gate: S.gate, lamp: S.lamp, bench: S.bench, well: S.well, sign: S.sign,
      flowerpot: S.flowerpot, log: S.log, pillar: S.pillar, rock: S.rock, campfire: S.campfire,
      bush: S.leaf, flowers: S.flowers, mushroom: S.mushroom, bridge: null
    }[def.render];
    if (def.render === 'wall') {
      x.fillStyle = '#e8d9b0'; x.fillRect(-22, -40, 44, 40);
      x.strokeStyle = '#5a3a20'; x.lineWidth = 4;
      x.strokeRect(-22, -40, 44, 40); x.beginPath(); x.moveTo(0, -40); x.lineTo(0, 0); x.moveTo(-22, -20); x.lineTo(22, -20); x.stroke();
      if (def.door) { x.drawImage(S.door, -10, -34, 20, 34); }
      if (def.win) { x.drawImage(S.window, -11, -32, 22, 22); }
    } else if (def.render === 'roof') {
      x.fillStyle = '#b0603a';
      x.beginPath(); x.moveTo(-26, -18); x.lineTo(0, -46); x.lineTo(26, -18); x.lineTo(26, -8); x.lineTo(-26, -8); x.closePath(); x.fill();
      x.strokeStyle = '#7a3a20'; x.lineWidth = 2; x.stroke();
      x.strokeStyle = 'rgba(255,255,255,0.25)';
      for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(-20 + k * 2, -14 - k * 8); x.lineTo(20 - k * 2, -14 - k * 8); x.stroke(); }
    } else if (def.render === 'chimney') {
      x.drawImage(S.chimney, -14, -44, 28, 44);
    } else if (def.render === 'path') {
      x.save(); x.rotate(-0.4); x.drawImage(S.dirt[0], -26, -20, 52, 40); x.restore();
    } else if (def.render === 'floor') {
      x.drawImage(S.stone[0], -24, -18, 48, 36);
    } else if (def.render === 'bridge') {
      x.fillStyle = '#9c6f3e'; for (let k = 0; k < 4; k++) x.fillRect(-24 + k * 13, -12, 9, 24);
    } else if (def.render === 'sapling') {
      x.fillStyle = '#4d8f3a';
      x.beginPath(); x.ellipse(-6, -14, 6, 13, -0.5, 0, CV.TAU); x.fill();
      x.beginPath(); x.ellipse(6, -14, 6, 13, 0.5, 0, CV.TAU); x.fill();
    } else if (def.render === 'campfire') {
      x.drawImage(S.campfire, -22, -22, 44, 44);
      x.fillStyle = '#ffb84d'; x.beginPath(); x.ellipse(0, -16, 8, 12, 0, 0, CV.TAU); x.fill();
      x.fillStyle = '#fff3b0'; x.beginPath(); x.ellipse(0, -12, 4, 6, 0, 0, CV.TAU); x.fill();
    } else if (spr) {
      const h = 46;
      x.drawImage(spr, -h / 2 * (spr.width / spr.height), -h, h * (spr.width / spr.height), h);
    }
    x.restore();
  }
})();
