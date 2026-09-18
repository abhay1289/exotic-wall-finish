const MOBEL_POSTER = new URL('../images/poster.jpg', document.currentScript.src).href;

    (function () {
  const L = document.getElementById('loader'), body = document.body, Q = new URLSearchParams(location.search);
  if (Q.has('noload')) { L.remove(); body.classList.remove('loading'); body.classList.add('noload'); return; }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; if (reduced) L.classList.add('reduced');
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  /* the wireframe: the empty shell of the hero room (world metres, y up), projected through the hero camera.
     Each line is [x,y,z, x,y,z, …] with a start time, a duration and a weight; drawing order is the order the room is constructed. */
  const XL = -7, XR = 4.5, ZB = -10, H = 4.6, S = 3.25, OX0 = -2.5, OX1 = 0.5, OZ1 = -8.55, SX = -0.5, SZ = 3.6, GT = 4.0;
  const LINES = [];
  const add = (pts, t, d, a, soft) => LINES.push({ p: pts, t, d, a, soft: !!soft });
  // 1 · the key perspective lines: floor meets the three walls
  add([XL, 0, ZB, XR, 0, ZB], 0, 620, 1);
  add([XL, 0, ZB, XL, 0, 5], 120, 640, 1);
  add([XR, 0, ZB, XR, 0, 5], 160, 640, 1);
  // 2 · the ceiling edge over the glazing, the slab underside along the left wall
  add([XR, GT, ZB, XR, GT, 5], 300, 620, .9);
  add([XL, S, ZB, XL, S, SZ], 340, 620, .9);
  // 3 · the back wall: corners and top edges
  add([XL, 0, ZB, XL, S, ZB], 420, 420, .9);
  add([XR, 0, ZB, XR, H, ZB], 440, 420, .9);
  add([XL, S, ZB, OX0, S, ZB], 480, 380, .85);
  add([OX1, H, ZB, XR, H, ZB], 500, 420, .85);
  add([XR, H, ZB, XR, H, 5], 560, 520, .55, 1);
  // 4 · the mezzanine slab and the stair void
  add([SX, S, OZ1, SX, S, SZ], 600, 620, .95);
  add([OX0, S, OZ1, SX, S, OZ1], 640, 320, .9);
  add([OX0, S, ZB, OX0, S, OZ1], 660, 260, .8);
  add([SX, H, OZ1, SX, H, SZ], 700, 560, .5, 1);
  add([OX0, H, ZB, OX1, H, ZB, OX1, H, OZ1, OX0, H, OZ1, OX0, H, ZB], 720, 620, .7);
  add([OX0, S, OZ1, OX0, H, OZ1], 760, 240, .55, 1);
  add([SX, S, OZ1, SX, H, OZ1], 780, 240, .55, 1);
  // 5 · the glazing: mullions and the head beam
  add([XR, 0, -6.8, XR, GT, -6.8], 800, 460, .8);
  add([XR, 0, -3.6, XR, GT, -3.6], 860, 460, .8);
  add([XR, 0, -0.4, XR, GT, -0.4], 920, 460, .8);
  add([XR, 0, 2.8, XR, GT, 2.8], 980, 460, .8);
  // 6 · the kitchen alcove cut into the back wall
  add([XL, 2.6, ZB, -2.6, 2.6, ZB, -2.6, 0, ZB], 880, 520, .85);
  add([-2.6, 0, ZB, -2.6, 0, ZB - 2.4, XL, 0, ZB - 2.4], 960, 520, .6, 1);
  add([-2.6, 2.6, ZB, -2.6, 2.6, ZB - 2.4, XL, 2.6, ZB - 2.4], 1000, 520, .6, 1);
  add([-2.6, 0, ZB - 2.4, -2.6, 2.6, ZB - 2.4], 1060, 300, .55, 1);
  // 7 · the floor: every fourth plank seam, laid last and lightest
  for (let k = 1; k <= 14; k++) add([XL - 0.1 + 0.75 * k, 0, ZB, XL - 0.1 + 0.75 * k, 0, 5.5], 900 + k * 28, 560, .36, 1);

  const CAM = { pos: [-0.2, 1.3, 1.3], look: [-0.05, 1.42, -8], dolly: [0, 0.04, 0.85], dollyT: 1250 };
  const TL = { drawn: 1300, revealMin: 1420 };

  // ---- the sketch renderer: runs in a worker on an OffscreenCanvas, so the strokes keep moving while the scene builds on the main thread
  function sketchCore(canvas, cfg, bus) {
    const ctx = canvas.getContext('2d', { alpha: true });
    let W = cfg.w, Hh = cfg.h, dpr = cfg.dpr, t0 = -1, tR = -1, done = false, reduced = cfg.reduced; const frames = [];
    const size = () => { canvas.width = Math.round(W * dpr); canvas.height = Math.round(Hh * dpr); };
    size();
    const ease = (x) => x < .35 ? (x / .35) * (x / .35) * .35 : 1 - Math.pow(1 - x, 2.2) * (1 - .35) / Math.pow(.65, 2.2), out3 = (x) => 1 - Math.pow(1 - x, 3), clamp = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
    const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const NEAR = 0.22;
    function frame(now) {
      if (done) return;
      if (t0 < 0) t0 = now;
      const t = now - t0;
      // camera: a slow dolly toward the hero camera, then a barely-there drift so the frame is never frozen
      const k = reduced ? 1 : out3(clamp(t / cfg.cam.dollyT)), drift = reduced ? 0 : Math.max(0, t - cfg.cam.dollyT) * 0.00002;
      const P = [cfg.cam.pos[0] + cfg.cam.dolly[0] * (1 - k), cfg.cam.pos[1] + cfg.cam.dolly[1] * (1 - k), cfg.cam.pos[2] + cfg.cam.dolly[2] * (1 - k) - drift];
      const f = norm([cfg.cam.look[0] - P[0], cfg.cam.look[1] - P[1], cfg.cam.look[2] - P[2]]), r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
      const fov = (W < Hh ? 76 : 58) * Math.PI / 180, focal = (Hh / 2) / Math.tan(fov / 2);
      const proj = (x, y, z) => { const d = [x - P[0], y - P[1], z - P[2]]; return [dot(d, r), dot(d, u), dot(d, f)]; };
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, Hh);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(0.75, 1 / dpr);
      for (const ln of cfg.lines) {
        const u1 = reduced ? 1 : ease(clamp((t - ln.t) / ln.d)); if (u1 <= 0) continue;
        // project, clipping at the near plane
        const cs = []; for (let i = 0; i < ln.p.length; i += 3) cs.push(proj(ln.p[i], ln.p[i + 1], ln.p[i + 2]));
        const seg = []; let zsum = 0, zn = 0;
        for (let i = 0; i < cs.length - 1; i++) {
          let a = cs[i], b = cs[i + 1]; if (a[2] < NEAR && b[2] < NEAR) continue;
          if (a[2] < NEAR) { const s = (NEAR - a[2]) / (b[2] - a[2]); a = [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, NEAR]; }
          if (b[2] < NEAR) { const s = (NEAR - b[2]) / (a[2] - b[2]); b = [b[0] + (a[0] - b[0]) * s, b[1] + (a[1] - b[1]) * s, NEAR]; }
          const A = [W / 2 + a[0] / a[2] * focal, Hh / 2 - a[1] / a[2] * focal], B = [W / 2 + b[0] / b[2] * focal, Hh / 2 - b[1] / b[2] * focal];
          seg.push([A, B, Math.hypot(B[0] - A[0], B[1] - A[1])]); zsum += (a[2] + b[2]) / 2; zn++;
        }
        if (!seg.length) continue;
        const depth = clamp((zsum / zn - 2.5) / 15);                               // 0 near … 1 far
        let alpha = ln.a * (ln.soft ? .32 : .7) * (1 - depth * .5);
        if (tR >= 0) { const dis = clamp((t - tR - 200 - (1 - depth) * 260) / 560); alpha *= 1 - ease(dis); }
        if (alpha <= 0.004) continue;
        ctx.strokeStyle = `rgba(20,19,18,${alpha.toFixed(3)})`; ctx.beginPath();
        // draw the polyline up to fraction u1 of its on-screen length, so the room is constructed rather than switched on
        const total = seg.reduce((s, g) => s + g[2], 0); let left = total * u1;
        for (const [A, B, len] of seg) {
          if (left <= 0) break;
          const q = Math.min(1, left / len); ctx.moveTo(A[0], A[1]); ctx.lineTo(A[0] + (B[0] - A[0]) * q, A[1] + (B[1] - A[1]) * q); left -= len;
        }
        ctx.stroke();
      }
      if (cfg.trace) { frames.push(Math.round(now)); if (frames.length % 30 === 0) bus.postMessage({ type: 'frames', frames }); }
      if (tR >= 0 && t - tR > 1400) { done = true; if (cfg.trace) bus.postMessage({ type: 'frames', frames }); return; }
      requestAnimationFrame(frame);
    }
    bus.addEventListener('message', (e) => { const m = e.data; if (m.type === 'reveal') tR = performance.now() - t0; else if (m.type === 'resize') { W = m.w; Hh = m.h; dpr = m.dpr; size(); } });
    requestAnimationFrame(frame);
  }

  // hand the canvas to a worker when the browser can, so the sketch is immune to the scene build; otherwise draw in place
  const cv = document.getElementById('ldCanvas'), dpr = Math.min(devicePixelRatio || 1, 2);
  const cfg = { w: innerWidth, h: innerHeight, dpr, lines: LINES, cam: CAM, reduced, trace: Q.has('ldtrace') };
  let post;
  if (!reduced && cv.transferControlToOffscreen && window.Worker && window.OffscreenCanvas) {
    const src = `${sketchCore.toString()}\nself.onmessage = (e) => { if (e.data.type === 'init') sketchCore(e.data.canvas, e.data.cfg, self); };`;
    const wk = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    const off = cv.transferControlToOffscreen(); wk.postMessage({ type: 'init', canvas: off, cfg }, [off]); post = (m) => wk.postMessage(m); wk.onmessage = (e) => { if (e.data.type === 'frames') window.__ldFrames = e.data.frames; };
  } else { const bus = new EventTarget(); post = (m) => bus.dispatchEvent(new MessageEvent('message', { data: m })); sketchCore(cv, cfg, bus); }
  addEventListener('resize', () => post({ type: 'resize', w: innerWidth, h: innerHeight, dpr }));

  // the wordmark waits for its face so it never swaps mid-reveal; the scene build starts right after, behind the drawing
  const face = (document.fonts && document.fonts.load ? Promise.all([document.fonts.load('400 20px "Instrument Serif"'), document.fonts.load('italic 400 20px "Instrument Serif"')]) : Promise.resolve()).catch(() => {});
  const t0 = performance.now(); const T = window.__ldT = {};
  const faced = Promise.race([face, sleep(350)]).then(() => {
    const el = performance.now() - t0; T.face = Math.round(el);
    const word = L.querySelector('.ld-word'), tag = L.querySelector('.ld-tag');
    word.style.transitionDelay = `${Math.max(0, (reduced ? 200 : 780) - el)}ms`; tag.style.transitionDelay = `${Math.max(0, (reduced ? 300 : 1060) - el)}ms`;
    L.classList.add('mark-in');
  });
  window.__ldStart = faced.then(() => sleep(Number(Q.get('lddelay') || 0)));
  // critical hero assets: the poster frame, the faces, and the scene's first rendered frame
  window.__holdStages = true;
  const poster = new Image(); poster.src = MOBEL_POSTER; const posterReady = (poster.decode ? poster.decode() : new Promise(r => { poster.onload = poster.onerror = r; })).catch(() => {});
  const sceneReady = new Promise(r => { const tick = () => { if (window.__loadMs) r(); else setTimeout(tick, 30); }; tick(); });
  posterReady.then(() => { T.poster = Math.round(performance.now() - t0); }); sceneReady.then(() => { T.scene = Math.round(performance.now() - t0); });
  const ready = Promise.all([posterReady, face, sceneReady, sleep(reduced ? 700 : TL.revealMin)]);
  Promise.race([ready, sleep(7000)]).then(() => {
    // drawing → structure → material → real space: the ivory thins away over the aligned wireframe, the lines dissolve as the textures come through, the push-in continues into the hero
    body.classList.add('opening'); L.classList.add('open'); post({ type: 'reveal' });
    requestAnimationFrame(() => { body.classList.remove('loading'); body.classList.add('revealed'); body.classList.remove('opening'); });
    window.__revealMs = performance.now() - t0;
    window.__holdStages = false; document.body.style.overflow = '';
    setTimeout(() => { L.remove(); if (window.__scrollSync) window.__scrollSync(); }, reduced ? 600 : 1500);
  });
})();
  