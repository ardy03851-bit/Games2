/* Cozy Vale — asset loading + magenta keying + procedural fallbacks */
(function () {
  const CV = window.CV;

  CV.ASSET_FILES = {
    // plain tiles / screens
    grass: 'assets/grass.png', dirt: 'assets/dirt.png', cliff: 'assets/cliff.png',
    stone: 'assets/stone.png', water: 'assets/water.png', sand: 'assets/sand.png',
    housewall: 'assets/housewall.png', roof: 'assets/roof.png',
    sky_day: 'assets/sky_day.png', sky_dusk: 'assets/sky_dusk.png', sky_night: 'assets/sky_night.png',
    title: 'assets/title.png', panel: 'assets/panel.png', cloud: 'assets/cloud.png',
    // keyed sprites (solid magenta background removed at load)
    canopy: 'assets/canopy.png', leaf: 'assets/leaf.png', pine: 'assets/pine.png', roundtree: 'assets/roundtree.png',
    rock: 'assets/rock.png', mushroom: 'assets/mushroom.png', flowers: 'assets/flowers.png',
    sign: 'assets/sign.png', fence: 'assets/fence.png', gate: 'assets/gate.png', lamp: 'assets/lamp.png',
    bench: 'assets/bench.png', well: 'assets/well.png', pillar: 'assets/pillar.png', campfire: 'assets/campfire.png',
    flowerpot: 'assets/flowerpot.png', log: 'assets/log.png', waterfall: 'assets/waterfall.png',
    glow: 'assets/glow.png', butterfly: 'assets/butterfly.png',
    door: 'assets/door.png', window: 'assets/window.png', chimney: 'assets/chimney.png'
  };
  CV.KEYED = new Set(['canopy','leaf','pine','roundtree','rock','mushroom','flowers','sign','fence','gate','lamp','bench','well','pillar','campfire','flowerpot','log','waterfall','glow','butterfly','door','window','chimney','cloud']);

  // remove solid magenta (#FF00FF) background -> alpha, with a soft edge
  CV.keySprite = function (img) {
    const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0);
    try {
      const d = x.getImageData(0, 0, w, h), p = d.data;
      for (let i = 0; i < p.length; i += 4) {
        const dd = Math.abs(p[i] - 255) + Math.abs(p[i + 1]) + Math.abs(p[i + 2] - 255);
        if (dd < 230) p[i + 3] = Math.round(255 * CV.clamp((dd - 110) / 120, 0, 1));
      }
      x.putImageData(d, 0, 0);
    } catch (e) { /* keep unkeyed if getImageData fails */ }
    return c;
  };

  // procedural fallback painters so the game never breaks on a missing file
  CV.placeholder = function (name) {
    const c = document.createElement('canvas');
    const x = c.getContext('2d');
    const blob = (col1, col2) => {
      c.width = c.height = 128;
      const g = x.createRadialGradient(64, 70, 6, 64, 70, 62);
      g.addColorStop(0, col1); g.addColorStop(1, col2);
      x.fillStyle = g; x.beginPath(); x.arc(64, 68, 56, 0, CV.TAU); x.fill();
      return c;
    };
    switch (name) {
      case 'glow': {
        c.width = c.height = 128;
        const g = x.createRadialGradient(64, 64, 2, 64, 64, 64);
        g.addColorStop(0, 'rgba(255,240,180,1)'); g.addColorStop(0.4, 'rgba(255,205,100,0.75)'); g.addColorStop(1, 'rgba(255,190,80,0)');
        x.fillStyle = g; x.fillRect(0, 0, 128, 128); return c;
      }
      case 'waterfall': {
        c.width = 96; c.height = 256;
        for (let i = 0; i < 40; i++) {
          const px = 8 + Math.random() * 80, w = 2 + Math.random() * 5, y0 = Math.random() * 256;
          x.strokeStyle = 'rgba(255,255,255,' + (0.25 + Math.random() * 0.5) + ')';
          x.lineWidth = w; x.lineCap = 'round';
          x.beginPath(); x.moveTo(px, y0); x.lineTo(px + (Math.random() - 0.5) * 6, Math.min(256, y0 + 60 + Math.random() * 120)); x.stroke();
        }
        x.fillStyle = 'rgba(235,250,250,0.9)';
        for (let i = 0; i < 14; i++) { x.beginPath(); x.arc(10 + Math.random() * 76, 230 + Math.random() * 22, 2 + Math.random() * 5, 0, CV.TAU); x.fill(); }
        return c;
      }
      case 'housewall': {
        c.width = c.height = 256;
        x.fillStyle = '#eadfc0'; x.fillRect(0, 0, 256, 256);
        x.fillStyle = '#5a3a20';
        x.fillRect(0, 0, 256, 22); x.fillRect(0, 234, 256, 22); x.fillRect(0, 0, 22, 256); x.fillRect(234, 0, 22, 256);
        x.fillRect(112, 0, 32, 256); x.fillRect(0, 112, 256, 32);
        return c;
      }
      case 'roof': {
        c.width = 256; c.height = 128;
        x.fillStyle = '#b0603a'; x.fillRect(0, 0, 256, 128);
        for (let r = 0; r < 8; r++) for (let s = 0; s < 8; s++) {
          x.fillStyle = 'rgba(' + (140 + Math.random() * 60 | 0) + ',' + (70 + Math.random() * 30 | 0) + ',40,0.55)';
          x.fillRect(s * 34 + (r % 2) * 17, r * 17, 32, 15);
        }
        return c;
      }
      case 'door': {
        c.width = 96; c.height = 160;
        x.fillStyle = '#7a5230'; x.fillRect(8, 8, 80, 152);
        x.strokeStyle = '#5a3a20'; x.lineWidth = 4; x.strokeRect(8, 8, 80, 152);
        for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(8 + i * 20, 8); x.lineTo(8 + i * 20, 160); x.stroke(); }
        x.fillStyle = '#ffd98a'; x.beginPath(); x.arc(48, 44, 14, 0, CV.TAU); x.fill();
        x.strokeStyle = '#3a2412'; x.lineWidth = 5; x.stroke();
        x.fillStyle = '#2c2c34'; x.beginPath(); x.arc(76, 92, 5, 0, CV.TAU); x.fill();
        return c;
      }
      case 'window': {
        c.width = c.height = 128;
        x.fillStyle = '#4a2f18'; x.fillRect(8, 8, 112, 112);
        x.fillStyle = '#ffdf8e'; x.fillRect(18, 18, 92, 92);
        x.strokeStyle = '#4a2f18'; x.lineWidth = 8;
        x.beginPath(); x.moveTo(64, 18); x.lineTo(64, 110); x.moveTo(18, 64); x.lineTo(110, 64); x.stroke();
        x.strokeRect(8, 8, 112, 112);
        return c;
      }
      case 'chimney': {
        c.width = 96; c.height = 160;
        x.fillStyle = '#9a4a34'; x.fillRect(12, 20, 72, 140);
        x.fillStyle = '#7d8894'; x.fillRect(4, 4, 88, 20);
        x.strokeStyle = 'rgba(60,20,10,0.5)'; x.lineWidth = 3;
        for (let r = 0; r < 9; r++) { x.beginPath(); x.moveTo(12, 32 + r * 14); x.lineTo(84, 32 + r * 14); x.stroke(); }
        return c;
      }
      case 'butterfly': {
        c.width = c.height = 96;
        x.fillStyle = '#e8862e';
        x.beginPath(); x.ellipse(30, 40, 24, 16, -0.5, 0, CV.TAU); x.fill();
        x.beginPath(); x.ellipse(66, 40, 24, 16, 0.5, 0, CV.TAU); x.fill();
        x.beginPath(); x.ellipse(34, 62, 16, 11, -0.3, 0, CV.TAU); x.fill();
        x.beginPath(); x.ellipse(62, 62, 16, 11, 0.3, 0, CV.TAU); x.fill();
        x.fillStyle = '#3a2a1a'; x.fillRect(44, 30, 8, 44);
        return c;
      }
      case 'flowerpot': {
        c.width = c.height = 128;
        x.fillStyle = '#b06a3a';
        x.beginPath(); x.moveTo(34, 70); x.lineTo(94, 70); x.lineTo(86, 122); x.lineTo(42, 122); x.closePath(); x.fill();
        x.fillStyle = '#8a4f28'; x.fillRect(30, 62, 68, 12);
        const cols = ['#ff7aa8', '#ffd94d', '#ffffff', '#ff9a5c'];
        for (let i = 0; i < 7; i++) { x.fillStyle = cols[i % 4]; x.beginPath(); x.arc(40 + i * 8, 44 + (i % 3) * 8, 7, 0, CV.TAU); x.fill(); }
        x.strokeStyle = '#4d8f3a'; x.lineWidth = 4;
        for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(64, 60); x.quadraticCurveTo(50 + i * 8, 40, 44 + i * 9, 30 + (i % 2) * 8); x.stroke(); }
        return c;
      }
      case 'log': {
        c.width = 160; c.height = 96;
        x.save(); x.translate(80, 52); x.rotate(-0.25);
        x.fillStyle = '#7a5230'; x.fillRect(-70, -18, 140, 36);
        x.fillStyle = '#a97e4e'; x.beginPath(); x.arc(70, 0, 18, 0, CV.TAU); x.fill();
        x.strokeStyle = '#5a3a20'; x.lineWidth = 4; x.beginPath(); x.arc(70, 0, 9, 0, CV.TAU); x.stroke();
        x.fillStyle = '#5d8f4a'; x.beginPath(); x.ellipse(-30, -18, 22, 8, 0, 0, CV.TAU); x.fill();
        x.restore();
        return c;
      }
      default:
        return blob({ pine: '#2f5d43', canopy: '#8fce5a', leaf: '#6fae4a', glow: '#ffe9a8' }[name] || '#9fce6a',
          { pine: '#1f4030', canopy: '#3c6b35', leaf: '#3c6b35', glow: '#ffb84d' }[name] || '#3c6b35');
    }
  };

  CV.loadAssets = function (onProgress) {
    const names = Object.keys(CV.ASSET_FILES);
    CV.imgs = {};
    let done = 0;
    return new Promise((resolve) => {
      if (!names.length) return resolve();
      names.forEach((n) => {
        const img = new Image();
        const fin = (ok) => {
          CV.imgs[n] = ok ? (CV.KEYED.has(n) ? CV.keySprite(img) : img) : CV.placeholder(n);
          done++; if (onProgress) onProgress(done, names.length);
          if (done === names.length) resolve();
        };
        img.onload = () => fin(true);
        img.onerror = () => fin(false);
        img.src = CV.ASSET_FILES[n];
      });
    });
  };

  // hue-shift a canvas/image (keeps alpha), returns new canvas
  CV.tint = function (src, cssColor, amt) {
    const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.globalAlpha = amt == null ? 0.35 : amt;
    x.fillStyle = cssColor;
    x.fillRect(0, 0, w, h);
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    return c;
  };
  CV.shade = function (src, rgba, amt) { return CV.tint(src, rgba, amt); };
})();
