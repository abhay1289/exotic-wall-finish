
import * as THREE from 'three';

const EMBED = document.documentElement.classList.contains('embed');
const U = (id, w, h, q = 78) => new URL(`../images/gallery/${id}-${w}x${h}.webp`, import.meta.url).href;

/* =========================================================================
   0. THE SPACES
   ========================================================================= */
const SPACES = [
  { name:'Venetian Gold',      place:'Coral Gables, FL',  year:'2026', tag:'Residence',    img:'1600585154340-be6161a56a0c',
    desc:'Aesthetic Marmorino in a glass-walled house. Venetian plaster, lime wash and gold veins, arranged for evenings that last until midnight.',
    pieces:['Venetian Plaster','Marmorino','Lime Wash'] },
  { name:'Textured Elegance',  place:'Miami Beach, FL',   year:'2026', tag:'Apartment',    img:'1583847268964-b28dc8f51f92',
    desc:'A harbour-side apartment finished in hand-troweled lime, with the light doing most of the decorating.',
    pieces:['Venetian Plaster','Grassello di Calce','Lime Paint'] },
  { name:'Modern Minimalist',  place:'Brickell, FL',      year:'2025', tag:'Studio',       img:'1567016376408-0226e4d0c1ea',
    desc:'Smooth mineral finish, one dark wall, and nothing else that needs explaining.',
    pieces:['Marmorino','Lime Wash'] },
  { name:'Brutalist Charm',    place:'Wynwood, FL',       year:'2025', tag:'Residence',    img:'1618221195710-dd6b41faaea6',
    desc:'A long room opened to the garden. Raw concrete aesthetic, light for everyone.',
    pieces:['Venetian Plaster','Faux Finish','Microcement'] },
  { name:'Organic Movement',   place:'Coconut Grove, FL', year:'2024', tag:'Summer house', img:'1631679706909-1844bbd07221',
    desc:'Sweeping lime wash, for a house that is only ever lived in barefoot.',
    pieces:['Grassello di Calce','Marmorino','Lime Paint'] },
  { name:'Dark Obsidian',      place:'Miami, FL',         year:'2025', tag:'Workspace',    img:'1600494603989-9650cf6ddd3d',
    desc:'High-gloss black plaster and a desk by the window. A room for thinking slowly.',
    pieces:['Commercial Plastering','Residential Artisan'] },
  { name:'Earthy Warmth',      place:'Boca Raton, FL',    year:'2024', tag:'Bedroom',      img:'1595526114035-0d45ed16cfbf',
    desc:'Terracotta-infused Marmorino and morning light. The rest of the house can wait.',
    pieces:['Residential Artisan','Lime Paint'] },
  { name:'Pearl Shimmer',      place:'Palm Beach, FL',    year:'2024', tag:'Dining',       img:'1519710164239-da123dc03ef4',
    desc:'A pearl wash, four walls and a plant. The most-used room in the house.',
    pieces:['Faux Finish','Commercial Plastering'] },
  { name:'Industrial Chic',    place:'Aventura, FL',      year:'2023', tag:'Apartment',    img:'1554995207-c18c203602cb',
    desc:'Microcement against an olive wall, in a loft with more windows than walls.',
    pieces:['Marmorino','Lime Wash','Grassello di Calce'] },
  { name:'Timeless Stucco',    place:'Fort Lauderdale, FL', year:'2025', tag:'Kitchen',    img:'1600607686527-6fb886090705',
    desc:'Italian lime stucco on the walls, lit by a single pair of pendants.',
    pieces:['Microcement','Commercial Plastering'] },
  { name:'Black Marmorino',    place:'Key Biscayne, FL',  year:'2023', tag:'Guest room',   img:'1615874959474-d609969a20ed',
    desc:'A guest room that guests are reluctant to leave.',
    pieces:['Lime Paint','Grassello di Calce'] },
  { name:'Microcement Bath',   place:'Coral Gables, FL',  year:'2024', tag:'Dining',       img:'1617806118233-18e1de247200',
    desc:'Seamless, waterproof wetroom cladding, under a mirror that doubles the room.',
    pieces:['Faux Finish','Microcement'] },
  { name:'Grassello di Calce', place:'South Beach, FL',   year:'2023', tag:'Workspace',    img:'1524758631624-e2822e304c36',
    desc:'A creative studio with a living room’s manners.',
    pieces:['Marmorino','Residential Artisan'] },
  { name:'Lime Wash Living',   place:'Pinecrest, FL',     year:'2026', tag:'Residence',    img:'1586023492125-27b2c045efd7',
    desc:'One mineral wall, one lamp, one afternoon.',
    pieces:['Marmorino','Lime Paint'] },
];

/* =========================================================================
   1. TEXTURES — a paper placeholder first, the photograph when it arrives
   ========================================================================= */
const TW = 1200, TH = 774;                          // 1.55 : 1, same as the card
function placeholder(p){
  const c = document.createElement('canvas'); c.width = TW; c.height = TH;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, TH);
  gr.addColorStop(0, '#e2ddd3'); gr.addColorStop(1, '#d8d2c7');
  g.fillStyle = gr; g.fillRect(0, 0, TW, TH);
  g.fillStyle = 'rgba(20,19,18,.28)';
  g.font = 'italic 400 64px "Instrument Serif", Georgia, serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(p.name, TW / 2, TH / 2);
  g.font = '400 14px Inter, sans-serif'; g.letterSpacing = '4px';
  g.fillText((p.place + '  ·  ' + p.year).toUpperCase(), TW / 2, TH / 2 + 58);
  return c;
}
// fetch → blob → ImageBitmap: the bitmap is same-origin, so it never taints the canvas
async function loadPhoto(url){
  const r = await fetch(url, { mode: 'cors' });
  if(!r.ok) throw new Error('HTTP ' + r.status);
  return createImageBitmap(await r.blob());
}
function canvasTex(cv){
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.NoColorSpace;                // shaded in display space, no double gamma
  t.anisotropy = 8;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  return t;
}

/* =========================================================================
   2. SCENE
   ========================================================================= */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setClearColor(new THREE.Color('#efebe4'), 1);     // the site's paper, so the strip has no frame
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 120);
camera.position.set(0, -0.06, 1.6);        // a touch below centre so the captions clear the bottom bar

const CARD_W = 1.0, CARD_H = CARD_W / 1.55, GAP = 0.024;
const STEP = CARD_W + GAP;
const N = SPACES.length;
const TOTAL = N * STEP;

/* ---- shared wave constants (mirrored in JS below) --------------------- */
const K1 = 2.95, K2 = 1.48, S1 = 0.30, S2 = -0.21, A1 = 0.60, A2 = 0.40;
const CURVE = 0.052, ZWAVE = 0.55;

const VERT = /* glsl */`
uniform float uOffset, uAmp, uTime, uCurve, uZW;
uniform vec3  uShift;
varying vec2  vUv;
varying float vWX;
varying vec3  vNrm;
varying vec3  vPos;

vec3 deform(vec3 p){
  float wx = p.x + uOffset;
  float a  = wx*${K1.toFixed(4)} + uTime*${S1.toFixed(4)};
  float b  = wx*${K2.toFixed(4)} + uTime*(${S2.toFixed(4)});
  float wy = sin(a)*${A1.toFixed(3)} + sin(b)*${A2.toFixed(3)};
  float wz = cos(a)*${A1.toFixed(3)} + cos(b)*${A2.toFixed(3)};
  p.x  = wx;
  p.y += wy * uAmp;
  p.z += wz * uAmp * uZW;
  p.z -= wx*wx*uCurve;
  return p + uShift;
}
void main(){
  vUv = uv;
  vec3 p  = deform(position);
  float e = 0.012;
  vec3 px = deform(position + vec3(e,0.0,0.0));
  vec3 py = deform(position + vec3(0.0,e,0.0));
  vNrm = normalize(cross(px-p, py-p));
  vWX  = p.x;
  vPos = p;
  vec4 mv = viewMatrix * vec4(p,1.0);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */`
precision highp float;
uniform sampler2D uTex, uTex0;
uniform float uHover, uRadius, uAspect, uTexAspect, uOpacity, uFade, uShadow;
varying vec2  vUv;
varying float vWX;
varying vec3  vNrm;
varying vec3  vPos;
const vec3 PAPER = vec3(0.9373, 0.9216, 0.8941);   // #efebe4
const vec3 INK   = vec3(0.078, 0.074, 0.070);

float sdRound(vec2 p, vec2 b, float r){
  vec2 q = abs(p) - b + r;
  return min(max(q.x,q.y),0.0) + length(max(q,0.0)) - r;
}
void main(){
  vec2 hb = vec2(0.5*uAspect, 0.5);
  vec2 pp = (vUv - 0.5) * vec2(uAspect, 1.0);
  float dd = sdRound(pp, hb, uRadius);

  // ---- contact shadow pass: a soft ink shape a little below and behind the card
  if(uShadow > 0.5){
    float m = 1.0 - smoothstep(-0.075, 0.03, dd);
    float dist = 1.0 - smoothstep(0.85, 2.30, abs(vWX))*0.7;
    gl_FragColor = vec4(INK, m * 0.13 * uOpacity * dist);
    return;
  }

  // ---- cover-fit uv
  vec2 uv = vUv;
  float s = uAspect / uTexAspect;
  if(s > 1.0) uv.y = (uv.y - 0.5)/s + 0.5;
  else        uv.x = (uv.x - 0.5)*s + 0.5;
  vec3 col = mix(texture2D(uTex0, uv).rgb, texture2D(uTex, uv).rgb, uFade);

  // ---- curvature shading: the bend reads as a gentle change of light, not a dark fold
  vec3 L = normalize(vec3(0.18, 0.55, 0.92));
  float nd = clamp(dot(normalize(vNrm), L), 0.0, 1.0);
  float shade = mix(0.74, 1.05, pow(nd, 0.85));
  col *= shade;

  // ---- faint sheen across the bend
  vec3 V = normalize(cameraPosition - vPos);
  float spec = pow(clamp(dot(reflect(-L, normalize(vNrm)), V),0.0,1.0), 22.0);
  col += spec * 0.07;

  // ---- distance: the strip fades into the paper instead of into black
  float d   = abs(vWX);
  col = mix(col, PAPER, smoothstep(0.85, 2.30, d)*0.62);
  float depth = length(cameraPosition - vPos);
  col = mix(col, PAPER, smoothstep(2.6, 6.2, depth));

  // ---- hover lift + arrival fade from the paper placeholder
  col *= mix(1.0, 1.05, uHover);
  col = mix(col, col*col*(3.0 - 2.0*col), 0.10);

  // ---- rounded corner mask
  float aa = fwidth(dd)*1.1 + 1e-5;
  float mask = 1.0 - smoothstep(-aa, aa, dd);
  if(mask < 0.004) discard;
  gl_FragColor = vec4(col, mask * uOpacity);
}`;

const geo = new THREE.PlaneGeometry(CARD_W, CARD_H, 110, 64);
const cards = [];
const labelWrap = document.getElementById('labels');
let loaded = 0;

SPACES.forEach((p, i) => {
  const tex0 = canvasTex(placeholder(p));                 // paper card, shown until the photo lands
  const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH;
  const tex = canvasTex(cv);                              // the photograph
  p._thumb = U(p.img, 400, 258, 70);
  const shared = {
    uOffset: { value: 0 }, uAmp: { value: 0.03 }, uTime: { value: 0 },
    uCurve: { value: CURVE }, uZW: { value: ZWAVE }, uOpacity: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true,
    uniforms: { ...shared,
      uTex: { value: tex }, uTex0: { value: tex0 }, uHover: { value: 0 }, uFade: { value: 0 }, uShadow: { value: 0 },
      uShift: { value: new THREE.Vector3(0, 0, 0) },
      uRadius: { value: 0.043 }, uAspect: { value: CARD_W / CARD_H }, uTexAspect: { value: TW / TH } }
  });
  const shadowMat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
    uniforms: { ...shared,
      uTex: { value: tex }, uTex0: { value: tex0 }, uHover: { value: 0 }, uFade: { value: 0 }, uShadow: { value: 1 },
      uShift: { value: new THREE.Vector3(0, -0.055, -0.03) },
      uRadius: { value: 0.09 }, uAspect: { value: CARD_W / CARD_H }, uTexAspect: { value: TW / TH } }
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false; mesh.renderOrder = 2; scene.add(mesh);
  const shadow = new THREE.Mesh(geo, shadowMat);
  shadow.frustumCulled = false; shadow.renderOrder = 1; scene.add(shadow);

  const lab = document.createElement('div'); lab.className = 'lab';
  lab.innerHTML = `<span class="nm"></span><span class="yr"></span>`;
  lab.querySelector('.nm').textContent = p.name;
  lab.querySelector('.yr').textContent = p.place;
  labelWrap.appendChild(lab);
  const dot = document.createElement('div');   // kept for layout parity, never shown

  const c = { p, mesh, shadow, mat, shadowMat, lab, dot, offset: 0, index: i, hover: 0, fade: 0, ready: false };
  cards.push(c);

  // photograph: swap the placeholder canvas for the image, then fade it in
  loadPhoto(U(p.img, TW, TH)).then(bmp => {
    const g = cv.getContext('2d'); g.drawImage(bmp, 0, 0, TW, TH); bmp.close && bmp.close();
    tex.needsUpdate = true; c.ready = true; loaded++;
  }).catch(err => { console.warn('photo failed', p.name, err.message); c.ready = true; c.failed = true; loaded++; });
});

/* =========================================================================
   3. LAYOUT / CAMERA FIT
   ========================================================================= */
let vw = 0, vh = 0, aspect = 1;
function fit(){
  vw = window.innerWidth; vh = window.innerHeight; aspect = vw / vh;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(vw, vh, false);
  camera.aspect = aspect;
  // centre card fills ~53% of the width on desktop, more as the frame narrows
  const fovR = THREE.MathUtils.degToRad(camera.fov);
  const wf = THREE.MathUtils.clamp(0.53 + (1.35 - aspect) * 0.42, 0.53, 0.88);
  let d = CARD_W / (2 * Math.tan(fovR / 2) * aspect * wf);
  const maxH = CARD_H / (2 * Math.tan(fovR / 2) * 0.66);   // never taller than 66% of the frame
  d = Math.max(d, maxH);
  camera.position.z = d;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', fit);
fit();

/* =========================================================================
   4. INPUT / SCROLL
   ========================================================================= */
let target = 0, current = 0, vel = 0, lastCur = 0;
let dragging = false, dragStart = 0, dragBase = 0, dragMoved = 0, downTime = 0;
let px = -1e4, py = -1e4;
let mode = 'featured';
let sheetOpen = false;
let scrubX = null;                      // host-driven strip position (world units); null = free

const PPU = () => vw * 0.53 / CARD_W;     // pixels per world-unit at z≈0

addEventListener('wheel', e => {
  if(sheetOpen){ if(!e.target.closest('#sheetScroll')) e.preventDefault(); return; }
  if(mode !== 'featured') return;
  const horiz = Math.abs(e.deltaX) > Math.abs(e.deltaY);
  if(EMBED && !horiz && !e.shiftKey) return;        // vertical wheel keeps scrolling the host page
  e.preventDefault();
  const d = horiz ? e.deltaX : e.deltaY;
  target += d * 0.0016;
}, { passive: false });

function down(x, y){
  if(sheetOpen || mode !== 'featured') return;
  dragging = true; dragStart = x; dragBase = target; dragMoved = 0; downTime = performance.now();
  scrubX = null;                        // a drag takes over until the host scrolls again
  document.body.style.cursor = 'grabbing';
}
function move(x, y){
  px = x; py = y;
  if(!dragging) return;
  const dx = x - dragStart;
  dragMoved = Math.max(dragMoved, Math.abs(dx));
  target = dragBase - dx / PPU() * 1.05;
}
function up(){ if(!dragging) return; dragging = false; document.body.style.cursor = ''; }
canvas.addEventListener('pointerdown', e => { if(e.button === 0){ e.preventDefault(); down(e.clientX, e.clientY); } });
addEventListener('pointermove', e => move(e.clientX, e.clientY));
addEventListener('pointerup', up);
addEventListener('pointercancel', up);
addEventListener('pointerleave', () => { px = py = -1e4; });
addEventListener('keydown', e => {
  if(e.key === 'Escape') closeSheet();
  if(sheetOpen || mode !== 'featured') return;
  if(e.key === 'ArrowRight') target += STEP;
  if(e.key === 'ArrowLeft')  target -= STEP;
});

let hovered = null;
canvas.addEventListener('click', e => {
  if(mode !== 'featured' || sheetOpen) return;
  if(dragMoved > 6) return;
  if(performance.now() - downTime > 420) return;
  const hit = hitTest(e.clientX, e.clientY) || hovered;
  if(hit) openSheet(hit.p);
});

// which card is under this screen point? (analytic — uses the same wave maths)
function hitTest(sx, sy){
  let best = null, bestD = 1e9;
  for(const c of cards){
    if(!c.mesh.visible || Math.abs(c.offset) > 1.6) continue;
    const pc = project(deformJS(0, 0, c.offset, amp, time));
    const hw = Math.abs(project(deformJS(CARD_W / 2, 0, c.offset, amp, time)).x - pc.x);
    const hh = Math.abs(project(deformJS(0, CARD_H / 2, c.offset, amp, time)).y - pc.y);
    const dx = Math.abs(sx - pc.x), dy = Math.abs(sy - pc.y);
    if(dx < hw * 1.02 && dy < hh * 1.35 && dx < bestD){ bestD = dx; best = c; }
  }
  return best;
}

/* =========================================================================
   5. WAVE MIRROR (JS) — for label anchors
   ========================================================================= */
function deformJS(pxv, pyv, off, amp, time){
  const wx = pxv + off;
  const a = wx * K1 + time * S1, b = wx * K2 + time * S2;
  const wy = Math.sin(a) * A1 + Math.sin(b) * A2;
  const wz = Math.cos(a) * A1 + Math.cos(b) * A2;
  return new THREE.Vector3(wx, pyv + wy * amp, wz * amp * ZWAVE - wx * wx * CURVE);
}
const _v = new THREE.Vector3();
function project(v){
  _v.copy(v).project(camera);
  return { x: (_v.x * 0.5 + 0.5) * vw, y: (-_v.y * 0.5 + 0.5) * vh, z: _v.z };
}

/* =========================================================================
   6. INDEX VIEW
   ========================================================================= */
const fullEl = document.getElementById('full');
const listEl = document.getElementById('fullList');
const thumbEl = document.getElementById('thumb');
const thumbImg = thumbEl.querySelector('img');
SPACES.forEach((p, i) => {
  const s = document.createElement('span');
  s.className = 'it'; s.textContent = p.name; s.dataset.i = i;
  listEl.appendChild(s);
  if(i < SPACES.length - 1){ const d = document.createElement('span'); d.className = 'sep'; d.textContent = '·'; listEl.appendChild(d); }
});
let thx = 0, thy = 0;
listEl.addEventListener('pointerover', e => {
  const it = e.target.closest('.it'); if(!it) return;
  listEl.classList.add('hasHover');
  listEl.querySelectorAll('.it.hot').forEach(n => n.classList.remove('hot'));
  it.classList.add('hot');
  thumbImg.src = SPACES[+it.dataset.i]._thumb;
  thumbEl.classList.add('on');
});
listEl.addEventListener('pointerout', e => {
  if(e.relatedTarget && listEl.contains(e.relatedTarget)) return;
  listEl.classList.remove('hasHover');
  listEl.querySelectorAll('.it.hot').forEach(n => n.classList.remove('hot'));
  thumbEl.classList.remove('on');
});
listEl.addEventListener('click', e => { const it = e.target.closest('.it'); if(it) openSheet(SPACES[+it.dataset.i]); });

const tabF = document.getElementById('tabFeatured'), tabU = document.getElementById('tabFull');
function setMode(m){
  mode = m;
  document.body.classList.toggle('fullmode', m === 'full');
  tabF.classList.toggle('on', m === 'featured');
  tabU.classList.toggle('on', m === 'full');
  fullEl.classList.toggle('on', m === 'full');
  if(m === 'full') thumbEl.classList.remove('on');
}
tabF.onclick = () => setMode('featured');
tabU.onclick = () => setMode('full');

/* =========================================================================
   7. SPACE SHEET
   ========================================================================= */
const sheet = document.getElementById('sheet'), scrim = document.getElementById('scrim');
const sMedia = sheet.querySelector('.sMedia');
function openSheet(p){
  const idx = SPACES.indexOf(p);
  sheet.querySelector('.sIdx').textContent = String(idx + 1).padStart(2, '0');
  sheet.querySelector('h1').textContent = p.name;
  sheet.querySelector('p').textContent = p.desc;
  sheet.querySelector('.t1').textContent = p.place;
  sheet.querySelector('.t2').textContent = p.tag + ' · ' + p.year;
  sheet.querySelector('.pieces').innerHTML = p.pieces.map(s => `<li>${s}</li>`).join('');
  sMedia.innerHTML = '';
  const order = [[p, p.name], [SPACES[(idx + 5) % N], 'Also finished'], [SPACES[(idx + 9) % N], 'Also finished']];
  order.forEach(([q, cap], k) => {
    const f = document.createElement('figure');
    const im = document.createElement('img'); im.src = U(q.img, 1400, 903); im.alt = q.name; im.loading = k ? 'lazy' : 'eager';
    const fc = document.createElement('figcaption'); fc.textContent = cap === q.name ? `${q.name} — ${q.place}` : `${cap} — ${q.name}, ${q.place}`;
    f.appendChild(im); f.appendChild(fc); sMedia.appendChild(f);
  });
  sheet.querySelector('#sheetScroll').scrollTop = 0;
  sheetOpen = true; sheet.classList.add('on'); scrim.classList.add('on');
  document.body.classList.add('hidechrome');
  try { if(EMBED && window.parent !== window) window.parent.postMessage({ type: 'mobel-gallery:open', index: idx }, '*'); } catch(e) {}
}
function closeSheet(){
  if(!sheetOpen) return;
  sheetOpen = false; sheet.classList.remove('on'); scrim.classList.remove('on');
  document.body.classList.remove('hidechrome');
}
document.getElementById('sheetClose').onclick = closeSheet;
scrim.onclick = closeSheet;

/* =========================================================================
   8. LOOP
   ========================================================================= */
const clock = new THREE.Clock();
let time = 0, amp = 0.030, paused = false, running = false;
const mod = (a, b) => ((a % b) + b) % b;
const counterEl = document.getElementById('counter');
let counterIdx = -1;

function tick(){
  if(paused){ running = false; return; }
  requestAnimationFrame(tick);
  update(Math.min(clock.getDelta(), 0.05));
}
function start(){ if(running) return; running = true; clock.getDelta(); requestAnimationFrame(tick); }

function update(dt){
  time += dt;

  // ---- scroll-driven position from the host, else a gentle snap when idle
  if(scrubX !== null && !dragging) target = scrubX;
  else if(!dragging && Math.abs(vel) < 0.0022 && mode === 'featured' && !sheetOpen){
    const snap = Math.round(target / STEP) * STEP;
    target += (snap - target) * 0.055;
  }
  lastCur = current;
  current += (target - current) * 0.082;
  vel = current - lastCur;

  const targetAmp = 0.019 + Math.min(Math.abs(vel) * 1.15, 0.155);
  amp += (targetAmp - amp) * 0.16;

  // ---- place cards on the infinite strip
  const half = TOTAL / 2;
  for(const c of cards){
    const x = mod(c.index * STEP - current + half, TOTAL) - half;
    c.offset = x;
    c.mat.uniforms.uOffset.value = x;
    c.mat.uniforms.uAmp.value = amp;
    c.mat.uniforms.uTime.value = time;
    c.mesh.visible = c.shadow.visible = Math.abs(x) < 2.9;
    if(c.ready && c.fade < 1){ c.fade = Math.min(1, c.fade + dt * 1.6); c.mat.uniforms.uFade.value = c.fade; }
  }
  hovered = (mode === 'featured' && !sheetOpen && !dragging) ? hitTest(px, py) : null;
  document.body.style.cursor = dragging ? 'grabbing' : (hovered ? 'pointer' : (mode === 'featured' ? 'grab' : 'default'));

  // ---- labels
  for(const c of cards){
    const show = c.mesh.visible && mode === 'featured' && !sheetOpen;
    c.hover += (((hovered === c) ? 1 : 0) - c.hover) * 0.16;
    c.mat.uniforms.uHover.value = c.hover;
    if(!show){ c.lab.style.opacity = 0; continue; }
    // captions sit on the paper just under the card's bottom edge, like the collection tiles
    const x = c.offset;
    const aL = deformJS(-CARD_W / 2 + 0.004, -CARD_H / 2 - 0.085, x, amp, time);
    const aD = deformJS( CARD_W / 2 - 0.004, -CARD_H / 2 - 0.085, x, amp, time);
    const pL = project(aL), pD = project(aD);
    const fade = 1 - Math.min(1, Math.max(0, (Math.abs(x) - 0.62) / 0.6));
    c.lab.style.transform = `translate3d(${pL.x.toFixed(1)}px,${pL.y.toFixed(1)}px,0)`;
    c.lab.style.opacity = (fade * 0.98).toFixed(3);
  }

  // ---- counter: the card nearest the centre
  const ci = mod(Math.round(current / STEP), N);
  if(ci !== counterIdx){ counterIdx = ci; counterEl.innerHTML = `<em>${String(ci + 1).padStart(2, '0')}</em> / ${String(N).padStart(2, '0')}`; }

  // ---- thumb follow
  thx += (px - thx) * 0.14; thy += (py - thy) * 0.14;
  thumbEl.style.left = thx + 'px'; thumbEl.style.top = thy + 'px';

  renderer.render(scene, camera);
}

/* ---- grain texture ---- */
(function(){
  const s = 180, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d'), id = g.createImageData(s, s), d = id.data;
  for(let i = 0; i < d.length; i += 4){ const v = 200 + Math.random() * 55; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  g.putImageData(id, 0, 0);
  document.getElementById('grain').style.backgroundImage = `url(${c.toDataURL()})`;
})();

start();
window.__dbg = {
  cards, camera, renderer, scene, project, deformJS, update, N,
  pause(v){ paused = !!v; if(!paused) start(); },
  state(){ return { current, target, mode, sheetOpen, paused, loaded, failed: cards.filter(c => c.failed).length, counter: counterIdx, amp }; },
  jump(i){ target = current = i * STEP; update(1 / 60); },
  scroll(v){ scrubX = v * STEP; },      // host scroll progress → fractional room index
  free(){ scrubX = null; },
  open(i){ openSheet(SPACES[mod(i, N)]); },
  close: closeSheet,
  mode: setMode,
  pump(n = 60, dt = 1 / 60){ for(let i = 0; i < n; i++) update(dt); },
};
