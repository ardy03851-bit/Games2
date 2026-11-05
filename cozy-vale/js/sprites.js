/* Cozy Vale — pre-rendered sprite library: tinted tiles, wind-phased grass tufts,
   foliage clusters (each part animated separately in render) */
(function () {
  const CV = window.CV;

  CV.buildSprites = function () {
    const I = CV.imgs, S = {};
    const tinted = (name, color, amt, n) => {
      const arr = [];
      for (let i = 0; i < (n || 1); i++) arr.push(CV.tint(I[name], color, amt));
      return arr;
    };

    // ---- ground tiles (several tinted variants so the terrain reads hand-painted) ----
    S.grass = [
      I.grass,
      CV.tint(I.grass, '#b8e06a', 0.16), CV.tint(I.grass, '#5da03f', 0.22),
      CV.tint(I.grass, '#8fd45c', 0.14), CV.tint(I.grass, '#4c8f3a', 0.26), CV.tint(I.grass, '#cfe89a', 0.12)
    ];
    S.dirt = [I.dirt, CV.tint(I.dirt, '#c98d4e', 0.14), CV.tint(I.dirt, '#7a5230', 0.18)];
    S.sand = [I.sand, CV.tint(I.sand, '#ffe0a0', 0.14), CV.tint(I.sand, '#c99a5a', 0.16)];
    S.stone = [I.stone, CV.tint(I.stone, '#9fb4c8', 0.12), CV.tint(I.stone, '#5c6c80', 0.18)];
    S.water = [I.water, CV.tint(I.water, '#bfe8d8', 0.12), CV.tint(I.water, '#7cc8b8', 0.16)];
    S.cliff = [I.cliff, CV.shade(I.cliff, '#3a2a18', 0.18), CV.shade(I.cliff, '#ffdf9e', 0.10)];
    S.housewall = I.housewall; S.roof = I.roof; S.panel = I.panel; S.title = I.title;
    S.sky = { day: I.sky_day, dusk: I.sky_dusk, night: I.sky_night };

    // ---- foliage sprites ----
    S.canopy = [I.canopy, CV.tint(I.canopy, '#b9e26a', 0.18), CV.tint(I.canopy, '#3f7d3a', 0.20)];
    S.leafC = [I.leaf, CV.tint(I.leaf, '#a5dd62', 0.20), CV.tint(I.leaf, '#4c8f3f', 0.22), CV.tint(I.leaf, '#d3ec9a', 0.14)];
    S.pine = [I.pine, CV.tint(I.pine, '#4a8f6a', 0.12)];
    S.roundtree = [I.roundtree, CV.tint(I.roundtree, '#9ed45e', 0.14)];

    // ---- single sprites ----
    ['rock','mushroom','flowers','sign','fence','gate','lamp','bench','well','pillar','campfire',
     'flowerpot','log','waterfall','glow','butterfly','door','window','chimney','cloud'].forEach((n) => {
      S[n] = I[n];
      S[n + '_dim'] = CV.shade(I[n], '#20242c', 0.25);
    });
    S.rockV = [I.rock, CV.tint(I.rock, '#b8c4d0', 0.14), CV.tint(I.rock, '#8a7a5c', 0.14)];
    S.flowersV = [I.flowers, CV.tint(I.flowers, '#ffb0d0', 0.18), CV.tint(I.flowers, '#fff0a0', 0.16)];

    // ---- wind-phased grass tufts: V variants x P phases, pre-rendered ----
    const V = 3, P = 12, TW_ = 40, TH_ = 30;
    S.tuft = [];
    for (let v = 0; v < V; v++) {
      const rnd = CV.mulberry32(1000 + v * 77);
      const blades = [];
      const nB = 5 + (v % 3);
      for (let b = 0; b < nB; b++) {
        blades.push({
          bx: 6 + rnd() * (TW_ - 12),
          h: 12 + rnd() * 13,
          lean: (rnd() - 0.5) * 6,
          w: 2.2 + rnd() * 1.6,
          c: rnd()
        });
      }
      const row = [];
      for (let p = 0; p < P; p++) {
        const c = document.createElement('canvas'); c.width = TW_; c.height = TH_;
        const x = c.getContext('2d');
        x.lineCap = 'round';
        const bend = ((p / (P - 1)) - 0.5) * 2; // -1..1 wind phase
        blades.forEach((bl) => {
          const tipX = bl.bx + bl.lean + bend * bl.h * 0.55;
          const tipY = TH_ - 2 - bl.h;
          const midX = bl.bx + (tipX - bl.bx) * 0.3 + bend * bl.h * 0.18;
          const midY = (TH_ - 2 + tipY) / 2;
          const g = x.createLinearGradient(bl.bx, TH_ - 2, tipX, tipY);
          g.addColorStop(0, bl.c < 0.5 ? '#3f7a2c' : '#356b28');
          g.addColorStop(1, bl.c < 0.5 ? '#8fce5a' : '#b7e37c');
          x.strokeStyle = g; x.lineWidth = bl.w;
          x.beginPath(); x.moveTo(bl.bx, TH_ - 2); x.quadraticCurveTo(midX, midY, tipX, tipY); x.stroke();
        });
        row.push(c);
      }
      S.tuft.push(row);
    }
    S.TUFT_P = P;

    // ---- pre-rendered bush = list of leaf-cluster offsets (each drawn & swayed separately) ----
    S.bushShape = (() => {
      const rnd = CV.mulberry32(4242);
      const shapes = [];
      for (let s = 0; s < 3; s++) {
        const clumps = [];
        const n = 6 + s;
        for (let i = 0; i < n; i++) {
          const a = rnd() * CV.TAU, r = Math.pow(rnd(), 0.6) * 0.85;
          clumps.push({
            dx: Math.cos(a) * r * 34,
            dy: Math.sin(a) * r * 20 - 6,
            s: 0.55 + rnd() * 0.6,
            ph: rnd() * CV.TAU, // own wind phase -> every part moves independently
            ci: (rnd() * 4) | 0
          });
        }
        shapes.push(clumps);
      }
      return shapes;
    })();

    // ---- tree canopy = several canopy blobs, each with own phase ----
    S.canopyShape = (() => {
      const rnd = CV.mulberry32(777);
      const shapes = [];
      for (let s = 0; s < 3; s++) {
        const blobs = [];
        const n = 4 + s;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * CV.TAU + rnd() * 0.8, r = i === 0 ? 0 : 0.35 + rnd() * 0.5;
          blobs.push({
            dx: Math.cos(a) * r * 44,
            dy: Math.sin(a) * r * 30 - 10,
            s: (i === 0 ? 1.15 : 0.7) + rnd() * 0.45,
            ph: rnd() * CV.TAU,
            ci: (rnd() * 3) | 0
          });
        }
        shapes.push(blobs);
      }
      return shapes;
    })();

    CV.S = S;
  };

  // global wind field: layered sines + slow gusts. Returns bend in [-1,1]-ish.
  CV.wind = function (t, x, y) {
    const g = CV.windGust || 0;
    return Math.sin(t * 1.25 + x * 0.55 + y * 0.9) * 0.55
         + Math.sin(t * 2.6 + y * 1.7 - x * 0.4) * 0.3
         + Math.sin(t * 0.43 + (x + y) * 0.23) * 0.45 * g
         + Math.sin(t * 3.7 + x * 2.1) * 0.12;
  };
})();
