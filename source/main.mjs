
// Fetch on approach. srcdoc preserves the parent's same-origin scroll and pause controls in Aura.
async function mountHostedPage(frame, file) {
  if (frame.dataset.mounted) return;
  frame.dataset.mounted = 'loading';
  try {
    const response = await fetch(new URL('../../pages/' + file + '?v=20260907b', import.meta.url));
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const source = await response.text();
    // Aura ignores base elements inside its nested preview. Resolve every URL explicitly.
    frame.srcdoc = source.replace(/\b(src|href)="([^"]+)"/g, (match, attribute, value) => {
      if (/^(#|data:|mailto:|tel:)/i.test(value)) return match;
      const absolute = new URL(value, response.url).href.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      return attribute + '="' + absolute + '"';
    });
    frame.dataset.mounted = '1';
  } catch (error) {
    delete frame.dataset.mounted;
    const hint = frame.parentElement.querySelector('.cat-hint');
    if (hint) {
      hint.replaceChildren();
      const button = document.createElement('button');
      button.textContent = 'Tap to retry loading';
      button.onclick = () => mountHostedPage(frame, file);
      hint.appendChild(button);
    }
    console.warn('MØBEL: section could not load', file, error);
  }
}

import * as THREE from 'three';
import { pbr, materialSize, loadMaterialImages, neutralTint, mapBoxUV, upholstered, textileDrape, vessel, paddedDisc, piping } from './hero-quality.mjs';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

/* ───────────────────────── utilities ───────────────────────── */
const Q = new URLSearchParams(location.search);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const outQuint = (t) => 1 - Math.pow(1 - clamp(t), 5);
const outCubic = (t) => 1 - Math.pow(1 - clamp(t), 3);
function rng(seed) { let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// value-noise fBm on a grid, returns Float32Array(size*size) in 0..1
function fbm(size, freq, oct, seed) {
  const out = new Float32Array(size * size); const r = rng(seed);
  let amp = 1, tot = 0, f = freq;
  for (let o = 0; o < oct; o++) {
    const g = f + 1, lat = new Float32Array(g * g); for (let i = 0; i < lat.length; i++) lat[i] = r();
    const cell = size / f;
    for (let y = 0; y < size; y++) {
      const gy = y / cell, y0 = Math.floor(gy) % f, y1 = (y0 + 1) % f, ty = sstep(gy - Math.floor(gy));
      for (let x = 0; x < size; x++) {
        const gx = x / cell, x0 = Math.floor(gx) % f, x1 = (x0 + 1) % f, tx = sstep(gx - Math.floor(gx));
        const a = lat[y0 * g + x0], b = lat[y0 * g + x1], c = lat[y1 * g + x0], d = lat[y1 * g + x1];
        out[y * size + x] += amp * lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
      }
    }
    tot += amp; amp *= 0.5; f *= 2;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
/* generated textures are kept in IndexedDB after the first visit, so later loads draw them back instead of recomputing them */
const TEXDB = 'mobel-tex', TEXV = 6, texBitmaps = new Map(); let texPending = [];
const texDB = () => new Promise((res, rej) => { const r = indexedDB.open(TEXDB, TEXV); r.onupgradeneeded = () => { const db = r.result; if (db.objectStoreNames.contains('c')) db.deleteObjectStore('c'); db.createObjectStore('c'); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function loadTexCache() { if (Q.has('nocache') || !window.indexedDB) return; try { const db = await texDB(); const all = await new Promise((res, rej) => { const st = db.transaction('c').objectStore('c'), out = [], c = st.openCursor(); c.onsuccess = () => { const cur = c.result; if (cur) { out.push([cur.key, cur.value]); cur.continue(); } else res(out); }; c.onerror = () => rej(c.error); }); await Promise.all(all.map(async ([k, blob]) => { texBitmaps.set(k, await createImageBitmap(blob)); })); db.close(); } catch (e) { console.warn('texture cache unavailable', e); } }
function cached(key, fn) { const bmp = texBitmaps.get(key); if (bmp) { const [c, x] = canvas(bmp.width, bmp.height); x.drawImage(bmp, 0, 0); bmp.close(); texBitmaps.delete(key); return c; } const c = fn(); texPending.push([key, c]); return c; }
function cachedSet(key, names, fn) { const out = {}; if (names.every(n => texBitmaps.has(key + '.' + n))) { for (const n of names) out[n] = cached(key + '.' + n); return out; } const o = fn(); for (const n of names) { out[n] = o[n]; texPending.push([key + '.' + n, o[n]]); } return out; }
async function saveTexCache() { if (!texPending.length || Q.has('nocache') || !window.indexedDB) return; const list = texPending; texPending = []; try { const db = await texDB(); for (const [k, c] of list) { const lossy = /\.color$|^(conc1|conc2|lawn|paver|gravel|foliage|darkOak)$/.test(k); const blob = await new Promise(r => lossy ? c.toBlob(r, 'image/jpeg', 0.92) : c.toBlob(r, 'image/png')); await new Promise((res, rej) => { const tx = db.transaction('c', 'readwrite'); tx.objectStore('c').put(blob, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); await new Promise(r => setTimeout(r, 120)); } db.close(); } catch (e) {} }
const texBase = new WeakMap();   // one GPU upload per canvas: every texture made from the same canvas shares its source
function tex(c, { srgb = true, repeat = [1, 1], aniso = 8 } = {}) {
  let base = texBase.get(c); if (!base) { base = c instanceof HTMLCanvasElement ? new THREE.CanvasTexture(c) : new THREE.Texture(c); texBase.set(c, base); }
  const t = base.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); t.offset.set(0, 0);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = aniso; t.needsUpdate = true; return t;
}

/* ───────────────────────── procedural textures ───────────────────────── */
function concreteCanvas(seed = 1, smooth = false) {
  const S = 1024, [c, x] = canvas(S, S), r = rng(seed);
  x.fillStyle = '#7d7a75'; x.fillRect(0, 0, S, S);
  const nb = 9, bw = S / nb;
  if (!smooth) for (let i = 0; i < nb; i++) { // formwork boards
    const l = 0.9 + r() * 0.2; x.fillStyle = `rgba(${l > 1 ? 255 : 0},${l > 1 ? 255 : 0},${l > 1 ? 255 : 0},${Math.abs(l - 1) * 0.9})`; x.fillRect(i * bw, 0, bw, S);
    x.fillStyle = 'rgba(0,0,0,0.28)'; x.fillRect(i * bw, 0, 2, S); x.fillStyle = 'rgba(255,255,255,0.10)'; x.fillRect(i * bw + 2, 0, 1, S);
  }
  for (let i = 0; i < 1400; i++) { // vertical grain streaks
    const px = r() * S, py = r() * S, len = 40 + r() * 520, dark = r() < 0.6, a = (0.02 + r() * 0.08) * (smooth ? 0.35 : 1);
    x.strokeStyle = dark ? `rgba(30,28,26,${a})` : `rgba(240,238,232,${a})`; x.lineWidth = 0.6 + r() * 2.2;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 3, py + len); x.stroke();
  }
  // horizontal pour lines (panel seams)
  if (!smooth) for (const sy of [0, S / 2]) { x.fillStyle = 'rgba(20,18,16,0.45)'; x.fillRect(0, sy, S, 3); x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(0, sy + 3, S, 2); }
  // tie holes
  for (let i = 0; i < nb; i += 3) for (const fy of [0.25, 0.75]) {
    const cx = i * bw + bw / 2, cy = fy * S; const g = x.createRadialGradient(cx, cy, 2, cx, cy, 11);
    g.addColorStop(0, 'rgba(40,38,35,0.95)'); g.addColorStop(0.7, 'rgba(60,58,55,0.8)'); g.addColorStop(1, 'rgba(60,58,55,0)');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, 11, 0, Math.PI * 2); x.fill();
  }
  // stains
  for (let i = 0; i < 14; i++) { const cx = r() * S, cy = S * (0.4 + r() * 0.6), rad = 60 + r() * 220; const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, 'rgba(50,46,42,0.22)'); g.addColorStop(1, 'rgba(50,46,42,0)'); x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); }
  // pinholes: air pockets in the face, denser low on the wall, each with a lit lower lip
  for (let i = 0; i < (smooth ? 90 : 260); i++) { const cx = r() * S, cy = S * Math.pow(r(), 0.75), rad = 0.5 + r() * 1.1; x.fillStyle = `rgba(30,28,26,${0.22 + r() * 0.35})`; x.beginPath(); x.ellipse(cx, cy, rad, rad * (0.7 + r() * 0.5), r() * 3, 0, Math.PI * 2); x.fill(); x.fillStyle = 'rgba(255,255,255,0.10)'; x.fillRect(cx - rad * 0.6, cy + rad * 0.8, rad * 1.2, 1); }
  // low-frequency clouds + grain, with a slight warm/cool drift between patches
  const img = x.getImageData(0, 0, S, S), d = img.data, n = fbm(S, 5, 4, seed + 7), n2 = fbm(S, 24, 2, seed + 11), n3 = fbm(S, 2, 2, seed + 13);
  for (let i = 0, p = 0; i < S * S; i++, p += 4) { const m = 0.84 + 0.32 * n[i] + 0.10 * (n2[i] - 0.5) + (r() - 0.5) * 0.08, t = (n3[i] - 0.5) * 0.05; d[p] *= m * (1 + t); d[p + 1] *= m; d[p + 2] *= m * (1.01 - t); }
  x.putImageData(img, 0, 0); return c;
}
function floorCanvas() {
  const S = 1024, [c, x] = canvas(S, S), r = rng(99), n = fbm(S, 3, 5, 5), n2 = fbm(S, 9, 3, 6), img = x.createImageData(S, S), d = img.data;
  for (let i = 0, p = 0; i < S * S; i++, p += 4) {
    const a = n[i], b = n2[i]; const l = 0.7 + 0.9 * a * a + 0.25 * (b - 0.5) + (r() - 0.5) * 0.05;
    d[p] = 70 * l * (1 + 0.12 * b); d[p + 1] = 66 * l; d[p + 2] = 61 * l * (1 - 0.05 * b); d[p + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  // trowel arcs
  for (let i = 0; i < 40; i++) { x.strokeStyle = `rgba(255,255,255,${0.01 + r() * 0.02})`; x.lineWidth = 1 + r() * 3; x.beginPath(); x.arc(r() * S, r() * S, 120 + r() * 380, r() * 6, r() * 6 + 0.4 + r()); x.stroke(); }
  return c;
}
function roughCanvas(seed, lo, hi, freq = 4) {
  const S = 512, [c, x] = canvas(S, S), n = fbm(S, freq, 4, seed), img = x.createImageData(S, S), d = img.data;
  for (let i = 0, p = 0; i < S * S; i++, p += 4) { const v = 255 * clamp(lo + (hi - lo) * n[i]); d[p] = d[p + 1] = d[p + 2] = v; d[p + 3] = 255; }
  x.putImageData(img, 0, 0); return c;
}
function woodCanvas() {
  const S = 512, [c, x] = canvas(S, S), r = rng(31);
  x.fillStyle = '#4a3323'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 700; i++) { const y = r() * S, dark = r() < 0.55; x.strokeStyle = dark ? `rgba(20,12,6,${0.05 + r() * 0.2})` : `rgba(160,110,70,${0.04 + r() * 0.12})`; x.lineWidth = 0.5 + r() * 2.5; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(S * 0.3, y + (r() - 0.5) * 12, S * 0.7, y + (r() - 0.5) * 12, S, y + (r() - 0.5) * 4); x.stroke(); }
  return c;
}
function foliageCanvas() {
  const W = 2048, H = 1024, [c, x] = canvas(W, H), r = rng(77);
  const sky = x.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#f9faf7'); sky.addColorStop(0.5, '#f0f3ec'); sky.addColorStop(1, '#e2e6dc'); x.fillStyle = sky; x.fillRect(0, 0, W, H);
  const soft = (px, py, rad, col, a) => { const g = x.createRadialGradient(px, py, 0, px, py, rad); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(0.55, `rgba(${col},${a * 0.7})`); g.addColorStop(1, `rgba(${col},0)`); x.fillStyle = g; x.fillRect(px - rad, py - rad, rad * 2, rad * 2); };
  const far = ['178,190,170', '165,180,158', '190,200,182'];
  for (let i = 0; i < 420; i++) soft(r() * W, H * (0.3 + r() * 0.45), 60 + r() * 120, far[i % 3], 0.35 + r() * 0.3);
  const greens = ['91,119,70', '74,99,56', '109,138,82', '63,86,49', '84,110,62'], hi = ['169,194,131', '147,173,110', '186,205,150'], lo = ['47,65,40', '38,54,33'];
  for (let i = 0; i < 8; i++) {
    const cx = (i + 0.15 + r() * 0.7) * W / 8, top = H * (0.0 + r() * 0.16), base = H * 0.94, w = 220 + r() * 160;
    x.globalAlpha = 0.75; x.strokeStyle = '#3a322b'; x.lineWidth = 6 + r() * 5; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx, base); x.quadraticCurveTo(cx + (r() - 0.5) * 30, (base + top) / 2, cx + (r() - 0.5) * 50, top + 140); x.stroke();
    for (let b = 0; b < 4; b++) { x.lineWidth = 2 + r() * 3; const y0 = top + 160 + r() * (base - top - 360); x.beginPath(); x.moveTo(cx, y0); x.lineTo(cx + (r() - 0.5) * w * 1.3, y0 - 60 - r() * 140); x.stroke(); }
    x.globalAlpha = 1; const span = base - top - 240;
    for (let k = 0; k < 230; k++) { const py = top + Math.pow(r(), 0.85) * span, px = cx + (r() - 0.5) * w * (0.5 + 0.9 * Math.sin(Math.PI * (py - top) / span)); soft(px, py, 26 + r() * 46, greens[Math.floor(r() * greens.length)], 0.4 + r() * 0.4); }
    for (let k = 0; k < 70; k++) { const py = top + Math.pow(r(), 0.5) * span * 0.8, px = cx + (r() - 0.5) * w * 0.8; soft(px, py, 20 + r() * 34, lo[k % 2], 0.25 + r() * 0.25); }
    for (let k = 0; k < 90; k++) { const py = top + Math.pow(r(), 1.5) * span * 0.7, px = cx + (r() - 0.5) * w * 0.9; soft(px, py, 16 + r() * 30, hi[k % 3], 0.3 + r() * 0.35); }
  }
  x.globalAlpha = 1; x.fillStyle = '#c6c4bc'; x.fillRect(0, H * 0.94, W, H * 0.06);
  for (let i = 0; i < 220; i++) soft(r() * W, H * (0.905 + r() * 0.035), 18 + r() * 34, ['68,88,58', '85,105,63', '57,76,48'][i % 3], 0.55 + r() * 0.35);
  const haze = x.createLinearGradient(0, 0, 0, H); haze.addColorStop(0, 'rgba(250,252,250,0.6)'); haze.addColorStop(0.5, 'rgba(246,248,244,0.3)'); haze.addColorStop(1, 'rgba(240,243,238,0.14)'); x.fillStyle = haze; x.fillRect(0, 0, W, H);
  return c;
}
function artCanvas() {
  const [c, x] = canvas(512, 640), r = rng(5);
  x.fillStyle = '#e8e2d6'; x.fillRect(0, 0, 512, 640);
  for (let i = 0; i < 9; i++) { x.fillStyle = ['#1c1b19', '#b8592c', '#3b3a36', '#d9c9a8', '#6b6a63'][i % 5]; x.globalAlpha = 0.85; const w = 60 + r() * 260, h = 40 + r() * 320; x.fillRect(r() * (512 - w), r() * (640 - h), w, h); }
  x.globalAlpha = 1; return c;
}
function grainCanvas() { const S = 256, [c, x] = canvas(S, S), r = rng(3), img = x.createImageData(S, S), d = img.data; for (let i = 0; i < S * S; i++) { const v = 118 + r() * 20; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; } x.putImageData(img, 0, 0); return c; }

// tangent-space normal map from a height canvas (luminance), OpenGL/three.js convention
function normalFromHeight(hc, strength = 1) {
  const S = hc.width, T = hc.height, src = hc.getContext('2d').getImageData(0, 0, S, T).data, h = new Float32Array(S * T);
  for (let i = 0; i < S * T; i++) h[i] = (src[i * 4] * 0.299 + src[i * 4 + 1] * 0.587 + src[i * 4 + 2] * 0.114) / 255;
  const [c, x] = canvas(S, T), img = x.createImageData(S, T), d = img.data;
  for (let y = 0; y < T; y++) for (let xx = 0; xx < S; xx++) {
    const i = y * S + xx, xl = h[y * S + (xx + S - 1) % S], xr = h[y * S + (xx + 1) % S], yu = h[((y + T - 1) % T) * S + xx], yd = h[((y + 1) % T) * S + xx];
    let nx = -(xr - xl) * strength, ny = (yd - yu) * strength, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    d[i * 4] = 128 + 127 * nx; d[i * 4 + 1] = 128 + 127 * ny; d[i * 4 + 2] = 128 + 127 * nz; d[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0); return c;
}
// wide-plank dark oak floor: colour / height / roughness canvases sharing one plank layout (6 m x 6 m per tile)
function woodFloorCanvases() {
  const S = 2048, r = rng(123), cols = 40, pw = S / cols, planks = [];
  for (let c = 0; c < cols; c++) { let y = 0, first = true; while (y < S) { const len = first ? 120 + r() * 700 : 420 + r() * 480; planks.push({ x: c * pw, y, w: pw, h: len, tone: 0.8 + r() * 0.4, hue: r(), seed: (r() * 1e9) | 0 }); y += len; first = false; } }
  const [cc, cx] = canvas(S, S), [hc, hx] = canvas(S, S), [rc, rx] = canvas(S, S);
  hx.fillStyle = '#808080'; hx.fillRect(0, 0, S, S); rx.fillStyle = '#5c5c5c'; rx.fillRect(0, 0, S, S);
  const path = (ctx, gx, p, pr) => { ctx.beginPath(); ctx.moveTo(gx, p.y); ctx.bezierCurveTo(gx + (pr() - 0.5) * 10, p.y + p.h * 0.33, gx + (pr() - 0.5) * 10, p.y + p.h * 0.66, gx + (pr() - 0.5) * 5, p.y + p.h); ctx.stroke(); };
  for (const p of planks) {
    const pr = rng(p.seed); const base = [72 * p.tone * (1 + 0.14 * (p.hue - 0.5)), 54 * p.tone, 40 * p.tone * (1 - 0.12 * (p.hue - 0.5))];
    cx.fillStyle = `rgb(${base.map(v => v | 0).join(',')})`; cx.fillRect(p.x, p.y, p.w, p.h);
    rx.fillStyle = pr() < 0.5 ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.14)'; rx.fillRect(p.x, p.y, p.w, p.h);
    for (let i = 0; i < 40; i++) {
      const gx = p.x + pr() * p.w, dark = pr() < 0.6, a = 0.04 + pr() * 0.18, lw = 0.4 + pr() * 1.9, seed = (pr() * 1e9) | 0;
      cx.strokeStyle = dark ? `rgba(18,10,5,${a})` : `rgba(160,118,74,${a * 0.7})`; cx.lineWidth = lw; path(cx, gx, p, rng(seed));
      hx.strokeStyle = dark ? `rgba(0,0,0,${a * 0.45})` : `rgba(255,255,255,${a * 0.3})`; hx.lineWidth = lw; path(hx, gx, p, rng(seed));
      rx.strokeStyle = `rgba(255,255,255,${a * 0.3})`; rx.lineWidth = lw; path(rx, gx, p, rng(seed));
    }
    if (pr() < 0.62) { const ay = p.y + pr() * p.h, ax = p.x + p.w * (0.3 + pr() * 0.4), nk = 5 + Math.floor(pr() * 4); for (let k = 0; k < nk; k++) { cx.strokeStyle = `rgba(22,12,5,${0.05 + pr() * 0.1})`; cx.lineWidth = 0.7 + pr(); cx.beginPath(); cx.ellipse(ax, ay, 4 + k * 4.5, 40 + k * 36, 0, 0, Math.PI * 2); cx.stroke(); hx.strokeStyle = `rgba(0,0,0,${0.05 + pr() * 0.06})`; hx.lineWidth = 0.7 + pr(); hx.beginPath(); hx.ellipse(ax, ay, 4 + k * 4.5, 40 + k * 36, 0, 0, Math.PI * 2); hx.stroke(); } }
    if (pr() < 0.09) { const ky = p.y + p.h * (0.2 + pr() * 0.6), kx = p.x + p.w * (0.3 + pr() * 0.4), kr = 3 + pr() * 5; cx.fillStyle = 'rgba(28,16,8,0.85)'; cx.beginPath(); cx.ellipse(kx, ky, kr, kr * 1.6, 0, 0, Math.PI * 2); cx.fill(); for (let k = 1; k < 4; k++) { cx.strokeStyle = `rgba(30,18,8,${0.35 - k * 0.08})`; cx.lineWidth = 1; cx.beginPath(); cx.ellipse(kx, ky, kr + k * 3, (kr + k * 3) * 1.6, 0, 0, Math.PI * 2); cx.stroke(); } hx.fillStyle = 'rgba(0,0,0,0.5)'; hx.beginPath(); hx.ellipse(kx, ky, kr, kr * 1.6, 0, 0, Math.PI * 2); hx.fill(); }   // the occasional knot
    cx.fillStyle = 'rgba(0,0,0,0.55)'; cx.fillRect(p.x, p.y, 2, p.h); cx.fillRect(p.x, p.y, p.w, 2); cx.fillStyle = 'rgba(255,255,255,0.09)'; cx.fillRect(p.x + 2, p.y, 1, p.h); cx.fillRect(p.x, p.y + 2, p.w, 1);
    hx.fillStyle = 'rgba(0,0,0,0.9)'; hx.fillRect(p.x, p.y, 3, p.h); hx.fillRect(p.x, p.y, p.w, 3);
    rx.fillStyle = 'rgba(255,255,255,0.55)'; rx.fillRect(p.x, p.y, 3, p.h); rx.fillRect(p.x, p.y, p.w, 3);
  }
  const img = cx.getImageData(0, 0, S, S), d = img.data, n = fbm(S, 5, 3, 9);
  for (let i = 0, q = 0; i < S * S; i++, q += 4) { const m = 0.88 + 0.24 * n[i] + (r() - 0.5) * 0.06; d[q] *= m; d[q + 1] *= m; d[q + 2] *= m; }
  cx.putImageData(img, 0, 0);
  for (let i = 0; i < 70; i++) { const px = r() * S, py = r() * S, rad = 80 + r() * 420; const g = rx.createRadialGradient(px, py, 0, px, py, rad); const light = r() < 0.6; g.addColorStop(0, light ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.16)'); g.addColorStop(1, 'rgba(0,0,0,0)'); rx.fillStyle = g; rx.fillRect(px - rad, py - rad, rad * 2, rad * 2); }
  return { color: cc, height: hc, rough: rc };
}
// upholstery: woven linen — warp and weft with a finer second thread, slub yarns, a soft tonal drift and a discreet topstitched border
// colour is greyscale (tinted by the material); height feeds the normal map; roughness dips on the slubs
function fabricCanvases(seed, threads = 170) {
  const S = 1024, [c, x] = canvas(S, S), [hc, hx] = canvas(S, S), [rc, rx] = canvas(S, S), r = rng(seed), n = fbm(S, 3, 3, seed + 3), n2 = fbm(S, 40, 2, seed + 5), n3 = fbm(S, 9, 2, seed + 8);
  const img = x.createImageData(S, S), d = img.data, him = hx.createImageData(S, S), hd = him.data, rim = rx.createImageData(S, S), rd = rim.data, k = Math.PI * 2 * threads / S, k2 = k * 2;
  for (let y = 0; y < S; y++) for (let xx = 0; xx < S; xx++) {
    const i = y * S + xx, q = i * 4, wa = Math.sin(xx * k), wb = Math.sin(y * k + Math.PI / 2), wc = Math.sin(xx * k2 + 1.3) * Math.sin(y * k2);
    const weave = 0.5 + 0.28 * wa * wb + 0.06 * wc + 0.07 * (Math.abs(wa) - Math.abs(wb)), fiber = (r() - 0.5) * 0.10 + (n2[i] - 0.5) * 0.10, drift = 0.86 + 0.28 * n[i] + 0.06 * (n3[i] - 0.5);
    const bx = Math.min(xx, S - 1 - xx), by = Math.min(y, S - 1 - y), bd = Math.min(bx, by); let seam = 1, hs = 0;
    if (bd >= 30 && bd < 33) { seam = 0.8; hs = -40; } else if (bd >= 33 && bd < 35) { seam = 1.06; hs = 12; }
    if (bd >= 25 && bd < 28 && (((bx < by ? y : xx) % 12) < 6)) { seam *= 0.88; hs = -16; }
    const v = 226 * (0.74 + 0.32 * weave) * drift * (1 + fiber);
    d[q] = d[q + 1] = d[q + 2] = Math.max(0, Math.min(255, v * seam)); d[q + 3] = 255;
    hd[q] = hd[q + 1] = hd[q + 2] = Math.max(0, Math.min(255, 128 + 62 * (weave - 0.5) + 26 * fiber + hs)); hd[q + 3] = 255;
    rd[q] = rd[q + 1] = rd[q + 2] = Math.max(0, Math.min(255, 255 * (0.82 + 0.12 * (1 - weave) + 0.06 * (n3[i] - 0.5)))); rd[q + 3] = 255;
  }
  x.putImageData(img, 0, 0); hx.putImageData(him, 0, 0); rx.putImageData(rim, 0, 0);
  // slubs: the thicker yarns of a linen weave, a few in each direction, wavering slightly along their length
  const wavy = (ctx, s) => { ctx.beginPath(); for (let t = 0; t <= S; t += 16) { const off = Math.sin(t * 0.02 + s.ph) * 2.5; if (s.v) ctx[t ? 'lineTo' : 'moveTo'](s.p + off, t); else ctx[t ? 'lineTo' : 'moveTo'](t, s.p + off); } ctx.stroke(); };
  for (let i = 0; i < 22; i++) {
    const s = { v: r() < 0.5, p: r() * S, w: 1.2 + r() * 2.4, a: 0.04 + r() * 0.08, ph: r() * 40, l: r() < 0.6 };
    x.lineWidth = s.w; x.strokeStyle = s.l ? `rgba(255,255,255,${s.a})` : `rgba(0,0,0,${s.a * 0.6})`; wavy(x, s);
    hx.lineWidth = s.w; hx.strokeStyle = s.l ? `rgba(255,255,255,${s.a * 2.2})` : `rgba(0,0,0,${s.a})`; wavy(hx, s);
    rx.lineWidth = s.w; rx.strokeStyle = `rgba(0,0,0,${s.a * 1.2})`; wavy(rx, s);
  }
  return { color: c, height: hc, rough: rc };
}
// cognac leather: pebbled grain with pull-up (lighter, warmer on the peaks), a finer micro grain, creases; colour / height / roughness
function leatherCanvases() {
  const S = 1024, [c, x] = canvas(S, S), [hc, hx] = canvas(S, S), [rc, rx] = canvas(S, S), r = rng(71), n1 = fbm(S, 44, 3, 71), n2 = fbm(S, 7, 3, 72), n3 = fbm(S, 120, 2, 73);
  const img = x.createImageData(S, S), d = img.data, him = hx.createImageData(S, S), hd = him.data, rim = rx.createImageData(S, S), rd = rim.data;
  for (let i = 0, q = 0; i < S * S; i++, q += 4) {
    const g = n1[i], f = n3[i], m = 0.88 + 0.16 * n2[i] + 0.1 * (g - 0.5) + 0.05 * (f - 0.5) + (r() - 0.5) * 0.025;
    d[q] = 172 * m; d[q + 1] = 72 * m * (0.94 + 0.1 * n2[i]); d[q + 2] = 36 * m * (0.9 + 0.1 * (1 - g)); d[q + 3] = 255;
    const hv = 128 + 64 * (g - 0.5) + 26 * (f - 0.5) + 16 * (n2[i] - 0.5); hd[q] = hd[q + 1] = hd[q + 2] = hv; hd[q + 3] = 255;
    const rv = 255 * (0.44 + 0.16 * n2[i] + 0.14 * (g - 0.5) + 0.05 * (f - 0.5)); rd[q] = rd[q + 1] = rd[q + 2] = rv; rd[q + 3] = 255;
  }
  x.putImageData(img, 0, 0); hx.putImageData(him, 0, 0); rx.putImageData(rim, 0, 0);
  for (let i = 0; i < 180; i++) { const px = r() * S, py = r() * S, len = 20 + r() * 110, ang = r() * Math.PI, a = 0.03 + r() * 0.06; for (const [ctx, col] of [[x, `rgba(60,22,8,${a})`], [hx, `rgba(0,0,0,${a * 0.8})`], [rx, `rgba(255,255,255,${a * 0.6})`]]) { ctx.strokeStyle = col; ctx.lineWidth = 0.5 + r() * 0.8; ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + Math.cos(ang + 0.5) * len * 0.5, py + Math.sin(ang + 0.5) * len * 0.5, px + Math.cos(ang) * len, py + Math.sin(ang) * len); ctx.stroke(); } }
  return { color: c, height: hc, rough: rc };
}
// the same hide with stitched panel seams: one along the rim of the shell (v ≈ 0.6) and one on each tile edge (the shell wraps the tile five times)
function leatherSeams(l) {
  const S = l.color.width, copy = (src) => { const [c, x] = canvas(S, S); x.drawImage(src, 0, 0); return [c, x]; };
  const [c, x] = copy(l.color), [hc, hx] = copy(l.height), [rc, rx] = copy(l.rough);
  const seam = (h, pos) => {
    const line = (ctx, col, lw, off) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); if (h) { ctx.moveTo(0, pos + off); ctx.lineTo(S, pos + off); } else { ctx.moveTo(pos + off, 0); ctx.lineTo(pos + off, S); } ctx.stroke(); };
    line(x, 'rgba(40,14,4,0.55)', 4, 0); line(x, 'rgba(230,150,110,0.22)', 1.5, 3); line(hx, 'rgba(0,0,0,0.75)', 5, 0); line(hx, 'rgba(255,255,255,0.35)', 2, -3.5); line(hx, 'rgba(255,255,255,0.35)', 2, 3.5); line(rx, 'rgba(255,255,255,0.5)', 5, 0);
    for (const off of [-8, 8]) { for (const [ctx, col] of [[x, 'rgba(232,196,150,0.7)'], [hx, 'rgba(255,255,255,0.8)'], [rx, 'rgba(255,255,255,0.4)']]) { ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.setLineDash([7, 5]); ctx.beginPath(); if (h) { ctx.moveTo(0, pos + off); ctx.lineTo(S, pos + off); } else { ctx.moveTo(pos + off, 0); ctx.lineTo(pos + off, S); } ctx.stroke(); ctx.setLineDash([]); } }
  };
  seam(true, S * 0.6); seam(false, 0); seam(false, S);
  return { color: c, height: hc, rough: rc };
}
// rug: an undyed wool flat weave — weft yarns as short strokes, a slow wear pattern, a woven border and a faint lozenge lattice; colour + height
function rugCanvases() {
  const S = 1024, [c, x] = canvas(S, S), [hc, hx] = canvas(S, S), r = rng(17), n = fbm(S, 4, 4, 21), n2 = fbm(S, 90, 2, 22), img = x.createImageData(S, S), d = img.data, him = hx.createImageData(S, S), hd = him.data;
  for (let y = 0; y < S; y++) for (let xx = 0; xx < S; xx++) {
    const i = y * S + xx, p = i * 4, wear = 0.90 + 0.18 * n[i], fibre = 0.9 + 0.2 * n2[i];
    const bx = Math.min(xx, S - 1 - xx), by = Math.min(y, S - 1 - y), bd = Math.min(bx, by);
    let tone = bd < 40 ? 0.74 : (bd < 48 ? 1.14 : (bd < 92 ? 0.87 : 1)), h = 128 + 46 * (n2[i] - 0.5);
    const lat = Math.abs(((xx * 0.7 + y * 0.7) % 96) - 48) < 1.4 || Math.abs(((xx * 0.7 - y * 0.7 + 4096) % 96) - 48) < 1.4;
    if (bd >= 92 && lat) { tone *= 0.86; h -= 10; } if (bd < 40) h += 12;
    const l = wear * tone * fibre; d[p] = 116 * l; d[p + 1] = 105 * l; d[p + 2] = 89 * l; d[p + 3] = 255;
    hd[p] = hd[p + 1] = hd[p + 2] = Math.max(0, Math.min(255, h)); hd[p + 3] = 255;
  }
  x.putImageData(img, 0, 0); hx.putImageData(him, 0, 0);
  for (let i = 0; i < 26000; i++) {
    const px = r() * S, py = r() * S, len = 3 + r() * 7, ang = (r() - 0.5) * 0.5 + (r() < 0.18 ? Math.PI / 2 : 0), light = r() < 0.5, a = 0.05 + r() * 0.1;
    x.strokeStyle = light ? `rgba(196,176,146,${a * 0.8})` : `rgba(38,30,22,${a * 0.8})`; x.lineWidth = 0.8 + r() * 1.2; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(ang) * len, py + Math.sin(ang) * len); x.stroke();
    hx.strokeStyle = light ? `rgba(255,255,255,${a * 2.4})` : `rgba(0,0,0,${a * 2})`; hx.lineWidth = 0.8 + r() * 1.2; hx.beginPath(); hx.moveTo(px, py); hx.lineTo(px + Math.cos(ang) * len, py + Math.sin(ang) * len); hx.stroke();
  }
  return { color: c, height: hc };
}
// blackened oak: an ebonised open-grain surface — dark ground, fine grain lines, open pores, a slow mottle
function darkOakCanvas() {
  const S = 1024, [c, x] = canvas(S, S), r = rng(41);
  x.fillStyle = '#1d1815'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++) { const y = r() * S, dark = r() < 0.5; x.strokeStyle = dark ? `rgba(6,4,3,${0.08 + r() * 0.24})` : `rgba(98,80,64,${0.03 + r() * 0.1})`; x.lineWidth = 0.4 + r() * 1.8; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(S * 0.3, y + (r() - 0.5) * 10, S * 0.7, y + (r() - 0.5) * 10, S, y + (r() - 0.5) * 4); x.stroke(); }
  for (let i = 0; i < 3200; i++) { const px = r() * S, py = r() * S, len = 3 + r() * 9; x.strokeStyle = `rgba(0,0,0,${0.12 + r() * 0.18})`; x.lineWidth = 0.8 + r() * 0.8; x.beginPath(); x.moveTo(px, py); x.lineTo(px + len, py + (r() - 0.5) * 1.5); x.stroke(); }
  const img = x.getImageData(0, 0, S, S), d = img.data, n = fbm(S, 4, 3, 43);
  for (let i = 0, q = 0; i < S * S; i++, q += 4) { const m = 0.9 + 0.2 * n[i] + (r() - 0.5) * 0.05; d[q] *= m; d[q + 1] *= m; d[q + 2] *= m; }
  x.putImageData(img, 0, 0); return c;
}
function pileCanvas() { const S = 512, [c, x] = canvas(S, S), n = fbm(S, 64, 2, 33), img = x.createImageData(S, S), d = img.data; for (let i = 0, q = 0; i < S * S; i++, q += 4) { const v = 255 * n[i]; d[q] = d[q + 1] = d[q + 2] = v; d[q + 3] = 255; } x.putImageData(img, 0, 0); return c; }
// leaf card: shape + midrib + veins, alpha outside the blade
function leafCanvas(seed = 1) {
  const S = 256, [c, x] = canvas(S, S), r = rng(seed);
  x.clearRect(0, 0, S, S);
  const blade = () => { x.beginPath(); x.moveTo(S / 2, S * 0.98); x.bezierCurveTo(S * 0.02, S * 0.78, S * 0.06, S * 0.28, S / 2, S * 0.03); x.bezierCurveTo(S * 0.94, S * 0.28, S * 0.98, S * 0.78, S / 2, S * 0.98); x.closePath(); };
  const g = x.createLinearGradient(0, S, 0, 0); g.addColorStop(0, '#3a5a2c'); g.addColorStop(0.6, '#4a6e35'); g.addColorStop(1, '#557a3c'); blade(); x.fillStyle = g; x.fill();
  x.save(); blade(); x.clip();
  const img = x.getImageData(0, 0, S, S), d = img.data, n = fbm(S, 6, 3, seed + 9);
  for (let i = 0, q = 0; i < S * S; i++, q += 4) { if (!d[q + 3]) continue; const m = 0.86 + 0.28 * n[i] + (r() - 0.5) * 0.05; d[q] *= m; d[q + 1] *= m; d[q + 2] *= m * 0.96; }
  x.putImageData(img, 0, 0);
  x.strokeStyle = 'rgba(215,225,170,0.75)'; x.lineWidth = 2.2; x.beginPath(); x.moveTo(S / 2, S * 0.98); x.lineTo(S / 2, S * 0.06); x.stroke();
  for (let i = 0; i < 9; i++) { const y0 = S * (0.14 + i * 0.09), len = S * (0.42 - Math.abs(i - 4) * 0.045); for (const sgn of [-1, 1]) { x.strokeStyle = `rgba(200,215,160,${0.35 + r() * 0.2})`; x.lineWidth = 1; x.beginPath(); x.moveTo(S / 2, y0); x.quadraticCurveTo(S / 2 + sgn * len * 0.5, y0 + len * 0.25, S / 2 + sgn * len, y0 + len * 0.55); x.stroke(); } }
  x.restore();
  blade(); x.strokeStyle = 'rgba(30,45,22,0.7)'; x.lineWidth = 2.5; x.stroke();
  return c;
}
// exterior surfaces: large-format pavers, gravel, lawn, a grass blade
function paverCanvas() {
  const S = 1024, [c, x] = canvas(S, S), r = rng(61), n = fbm(S, 6, 3, 62), cell = S / 4;
  x.fillStyle = '#b6b2a9'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const t = (r() - 0.5) * 0.16; x.fillStyle = t > 0 ? `rgba(255,255,255,${t})` : `rgba(0,0,0,${-t})`; x.fillRect(i * cell, j * cell, cell, cell); }
  const img = x.getImageData(0, 0, S, S), d = img.data; for (let i = 0, q = 0; i < S * S; i++, q += 4) { const m = 0.9 + 0.2 * n[i] + (r() - 0.5) * 0.07; d[q] *= m; d[q + 1] *= m; d[q + 2] *= m * 0.99; } x.putImageData(img, 0, 0);
  for (let i = 0; i < 24; i++) { const px = r() * S, py = r() * S, rad = 40 + r() * 160; const g = x.createRadialGradient(px, py, 0, px, py, rad); g.addColorStop(0, 'rgba(60,56,50,0.16)'); g.addColorStop(1, 'rgba(60,56,50,0)'); x.fillStyle = g; x.fillRect(px - rad, py - rad, rad * 2, rad * 2); }
  x.fillStyle = 'rgba(70,66,60,0.9)'; for (let k = 0; k <= 4; k++) { x.fillRect(k * cell - 3, 0, 6, S); x.fillRect(0, k * cell - 3, S, 6); }
  x.fillStyle = 'rgba(255,255,255,0.14)'; for (let k = 0; k <= 4; k++) { x.fillRect(k * cell + 3, 0, 1, S); x.fillRect(0, k * cell + 3, S, 1); }
  return c;
}
function gravelCanvas() {
  const S = 512, [c, x] = canvas(S, S), r = rng(63);
  x.fillStyle = '#7f7b73'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 9000; i++) { const v = 95 + r() * 95; x.fillStyle = `rgb(${v | 0},${(v * 0.97) | 0},${(v * 0.92) | 0})`; x.beginPath(); x.ellipse(r() * S, r() * S, 1.2 + r() * 3.2, 1 + r() * 2.4, r() * 3, 0, Math.PI * 2); x.fill(); }
  return c;
}
function lawnCanvas() {
  const S = 1024, [c, x] = canvas(S, S), r = rng(65), n1 = fbm(S, 4, 4, 66), n2 = fbm(S, 28, 2, 67), img = x.createImageData(S, S), d = img.data;
  for (let i = 0, q = 0; i < S * S; i++, q += 4) { const m = 0.72 + 0.5 * n1[i] + 0.2 * (n2[i] - 0.5) + (r() - 0.5) * 0.06, h = n2[i] - 0.5; d[q] = 118 * m * (1 + 0.25 * h); d[q + 1] = 138 * m; d[q + 2] = 76 * m * (1 - 0.2 * h); d[q + 3] = 255; }
  x.putImageData(img, 0, 0);
  for (let i = 0; i < 4000; i++) { x.strokeStyle = r() < 0.5 ? `rgba(150,170,90,${0.08 + r() * 0.16})` : `rgba(40,52,26,${0.08 + r() * 0.16})`; x.lineWidth = 0.8 + r(); const px = r() * S, py = r() * S; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 6, py - 4 - r() * 10); x.stroke(); }
  return c;
}
function bladeCanvas() {
  const W = 32, H = 256, [c, x] = canvas(W, H), img = x.createImageData(W, H), d = img.data;
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) { const q = (y * W + xx) * 4, t = 1 - y / H, half = 15 * Math.pow(1 - t, 0.75) + 0.6; const inside = Math.abs(xx + 0.5 - W / 2) < half; d[q] = 70 + 90 * t; d[q + 1] = 88 + 90 * t; d[q + 2] = 40 + 40 * t; d[q + 3] = inside ? 255 : 0; }
  x.putImageData(img, 0, 0); return c;
}
// cheap 3D value noise for cushion displacement
function vnoise3(x, y, z) { const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), fx = x - xi, fy = y - yi, fz = z - zi; const h = (a, b, c) => { let t = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; t = (t ^ (t >>> 13)) * 1274126177; return ((t ^ (t >>> 16)) >>> 0) / 4294967296; }; const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz); const l = (a, b, t) => a + (b - a) * t; return l(l(l(h(xi, yi, zi), h(xi + 1, yi, zi), sx), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), sx), sy), l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), sx), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), sx), sy), sz); }

/* ───────────────────────── renderer / scene ───────────────────────── */
function init() {
const quality4k = Q.get('quality') === '4k';
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const liteGPU = REDUCE || innerWidth < 720;
const pixelBudget = quality4k ? 3840 * 2160 : 3200 * 1800;
let DPR = Math.min(Number(Q.get('dpr') || (window.devicePixelRatio || 1)), quality4k ? 2 : 1.75, Math.sqrt(pixelBudget / (innerWidth * innerHeight))); let costEma = 0, dropped = false;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: innerWidth >= 900, powerPreference: 'high-performance', stencil: false, depth: true });
renderer.setPixelRatio(DPR); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = Q.get('tm') === 'agx' ? THREE.AgXToneMapping : THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = Number(Q.get('exp') || 0.98);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
RectAreaLightUniformsLib.init();

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc3ccd0, 16, 64); scene.background = new THREE.Color(0xc3ccd0);
const pmrem = new THREE.PMREMGenerator(renderer); const roomEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environment = roomEnv;

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 120);
const camBase = new THREE.Vector3(-0.2, 1.3, 1.3), camLook = new THREE.Vector3(-0.05, 1.42, -8);

/* materials */
const grainTex = tex(grainCanvas(), { srgb: false, repeat: [6, 6] });
const _t0 = performance.now(), _T = window.__initT = {}, mark = (k) => { _T[k] = Math.round(performance.now() - _t0); };
const concCanvas = cached('conc1', () => concreteCanvas(1)), smoothCanvas = cached('conc2', () => concreteCanvas(2, true));
const concTex = tex(concCanvas, { repeat: [1, 1] }), smoothTex = tex(smoothCanvas, { repeat: [1, 1] });
const concNrm = tex(cached('concNrm1', () => normalFromHeight(concCanvas, 1.7)), { srgb: false }), smoothNrm = tex(cached('concNrm2', () => normalFromHeight(smoothCanvas, 0.8)), { srgb: false });
const concRoughCv = roughCanvas(5, 0.78, 0.98, 3), concOff = rng(77);   // troweled patches are a touch glossier; each wall gets its own offset so the boards never line up
const concMat = (rx, ry, tint = 0xffffff) => { const ox = concOff(), oy = concOff(); const t = concTex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); t.offset.set(ox, oy); const nm = concNrm.clone(); nm.needsUpdate = true; nm.repeat.set(rx, ry); nm.offset.set(ox, oy); const rm = tex(concRoughCv, { srgb: false, repeat: [rx, ry] }); rm.offset.set(ox, oy); return new THREE.MeshStandardMaterial({ map: t, normalMap: nm, normalScale: new THREE.Vector2(0.8, 0.8), roughnessMap: rm, roughness: 1, metalness: 0, color: tint, envMapIntensity: 0.35 }); };
const wood = pbr.floor.color && pbr.floor.normal && pbr.floor.roughness ? {color:pbr.floor.color, rough:pbr.floor.roughness} : cachedSet('wood', ['color', 'height', 'rough'], () => woodFloorCanvases());
const floorRepeat = [11.7 / 2.25, 16 / 2.25];
const floorRough = tex(wood.rough, {srgb:false, repeat:floorRepeat});
const woodNrmCv = pbr.floor.normal || cached('woodNrm',()=>normalFromHeight(wood.height,2.2));
const oakFloorMat = (wm,dm) => new THREE.MeshPhysicalMaterial({map:tex(wood.color,{repeat:[wm/2.25,dm/2.25],aniso:16}), normalMap:tex(woodNrmCv,{srgb:false,repeat:[wm/2.25,dm/2.25],aniso:16}),normalScale:new THREE.Vector2(0.16,0.16),roughnessMap:tex(wood.rough,{srgb:false,repeat:[wm/2.25,dm/2.25]}),color:0x79624d,roughness:0.92,clearcoat:0.08,clearcoatRoughness:0.6,envMapIntensity:0.7});
const floorMat = oakFloorMat(11.7,16);
for(const map of [floorMat.map,floorMat.normalMap,floorMat.roughnessMap]){map.center.set(0.5,0.5);map.rotation=Math.PI/2;}
const fab = pbr.linen.color && pbr.linen.normal && pbr.linen.roughness ? {color:pbr.linen.color,rough:pbr.linen.roughness} : cachedSet('fab',['color','height','rough'],()=>fabricCanvases(4));
const fabTex=tex(fab.color,{aniso:16}), fabNrm=tex(pbr.linen.normal||cached('fabNrm',()=>normalFromHeight(fab.height,2.2)),{srgb:false,aniso:16}),fabRough=tex(fab.rough,{srgb:false});
const fabricMat = (color,sheenColor,roughness=0.94) => {
  const m=new THREE.MeshPhysicalMaterial({map:fabTex,normalMap:fabNrm,normalScale:new THREE.Vector2(0.38,0.38),roughnessMap:fabRough,color,roughness,sheen:0.38,sheenRoughness:0.88,sheenColor,envMapIntensity:0.65});
  m.userData.period=0.32;return pbr.linen.color?neutralTint(m,1.75):m;
};
const creamMat=fabricMat(0xe4dccd,0xf0e9dc),ivoryMat=fabricMat(0xf0eadf,0xf6f1e8),rustMat=fabricMat(0xa56d4f,0xc2764c),charcoalMat=fabricMat(0x34363a,0x5a5b62);
const leath=pbr.leather.color&&pbr.leather.normal&&pbr.leather.roughness?{color:pbr.leather.color,rough:pbr.leather.roughness}:cachedSet('leath',['color','height','rough'],()=>leatherCanvases());
const leatherMat=new THREE.MeshPhysicalMaterial({map:tex(leath.color,{aniso:16}),normalMap:tex(pbr.leather.normal||normalFromHeight(leath.height,1.5),{srgb:false,aniso:16}),normalScale:new THREE.Vector2(0.34,0.34),roughnessMap:tex(leath.rough,{srgb:false}),roughness:0.83,color:0xb9754c,clearcoat:0.06,clearcoatRoughness:0.62,envMapIntensity:0.85,specularIntensity:0.7});
leatherMat.userData.period=0.42;if(pbr.leather.color)neutralTint(leatherMat,9.5);
const leatherSeamMat=leatherMat;

const blackMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.48, metalness: 0.12, envMapIntensity: 0.9, bumpMap: grainTex, bumpScale: 0.0006 });
const woodCv=pbr.walnut.color||woodCanvas(), woodTex=tex(woodCv,{aniso:16}),woodNrm=tex(pbr.walnut.normal||normalFromHeight(woodCv,0.9),{srgb:false,aniso:16});
const walnutMat=new THREE.MeshPhysicalMaterial({map:woodTex,normalMap:woodNrm,normalScale:new THREE.Vector2(0.24,0.24),roughnessMap:pbr.walnut.roughness?tex(pbr.walnut.roughness,{srgb:false}):null,color:0x78604a,roughness:0.83,clearcoat:0.06,clearcoatRoughness:0.55,envMapIntensity:0.8});
walnutMat.userData={period:1,grain:true};
const darkOakMat=new THREE.MeshPhysicalMaterial({map:woodTex,normalMap:woodNrm,normalScale:new THREE.Vector2(0.4,0.4),roughnessMap:walnutMat.roughnessMap,color:0x6b6864,roughness:0.95,clearcoat:0.06,clearcoatRoughness:0.65,envMapIntensity:0.85});darkOakMat.userData={period:0.9,grain:true};
const bronzeMat=new THREE.MeshStandardMaterial({color:0x746252,roughness:0.44,metalness:0.85,envMapIntensity:1.0,bumpMap:grainTex,bumpScale:0.0006});
const steelMat=new THREE.MeshStandardMaterial({color:0x252626,roughness:0.48,metalness:0.8,envMapIntensity:0.85});

const treadRng=rng(577);
const treadMat=()=>{const m=walnutMat.clone();m.color.set(0x88715b);m.map=woodTex.clone();m.normalMap=woodNrm.clone();const off=treadRng();m.map.offset.set(off,off*0.7);m.normalMap.offset.copy(m.map.offset);return m;};
const stoneMat = new THREE.MeshPhysicalMaterial({color:0xcac1b1,roughness:0.68,metalness:0,clearcoat:0.06,clearcoatRoughness:0.6,envMapIntensity:0.65,bumpMap:grainTex,bumpScale:0.0008});
const ceramicDark=new THREE.MeshPhysicalMaterial({color:0x363733,roughness:0.48,clearcoat:0.12,clearcoatRoughness:0.5,bumpMap:grainTex,bumpScale:0.0009});
const paperMat=new THREE.MeshStandardMaterial({color:0xd7d0bf,roughness:0.95});
const coverMat=new THREE.MeshStandardMaterial({color:0x343630,roughness:0.78});
const potMat = new THREE.MeshStandardMaterial({ color: 0x3c3a37, roughness: 0.82, bumpMap: grainTex, bumpScale: 0.01 });
const soilMat = new THREE.MeshStandardMaterial({ color: 0x1e1712, roughness: 1, bumpMap: grainTex, bumpScale: 0.02 });
const leafMats = [0x2f4126, 0x3a4f2c, 0x293a23, 0x46593a].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }));
const rugTx = cachedSet('rug', ['color', 'height'], () => rugCanvases()); rugTx.nrm = cached('rugNrm', () => normalFromHeight(rugTx.height, 1.9));
const leafTexA = tex(leafCanvas(1)), leafTexB = tex(leafCanvas(2)); leafTexA.wrapS = leafTexA.wrapT = leafTexB.wrapS = leafTexB.wrapT = THREE.ClampToEdgeWrapping;
const leafMat = (t) => new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.62, metalness: 0, color: 0xffffff, emissive: 0x16240c, emissiveIntensity: 0.25, envMapIntensity: 0.4 });
const leafDepth = (t) => new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: t, alphaTest: 0.5 });
const leafDist = (t) => new THREE.MeshDistanceMaterial({ map: t, alphaTest: 0.5 });
const leafCardGeo = (() => { const g = new THREE.PlaneGeometry(1, 1, 2, 6); g.translate(0, 0.5, 0); const P = g.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i); P.setZ(i, -0.28 * y * y + 0.09 * Math.abs(x) * y); } g.computeVertexNormals(); return g; })();
const treeLeafMat = new THREE.MeshStandardMaterial({ map: leafTexB, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7, metalness: 0, color: 0xffffff, emissive: 0x0f1a08, emissiveIntensity: 0.18, envMapIntensity: 0.35 });
const shrubLeafMat = new THREE.MeshStandardMaterial({ map: leafTexA, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.75, metalness: 0, color: 0xffffff, emissive: 0x0d1607, emissiveIntensity: 0.15, envMapIntensity: 0.3 });
const barkMat = new THREE.MeshStandardMaterial({ color: 0x5f574e, roughness: 1, bumpMap: grainTex, bumpScale: 0.02 });
const bladeTex = tex(bladeCanvas()); bladeTex.wrapS = bladeTex.wrapT = THREE.ClampToEdgeWrapping;
const bladeMat = new THREE.MeshStandardMaterial({ map: bladeTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8, color: 0xd9dcb0, emissive: 0x1a2008, emissiveIntensity: 0.2 });
const paverCv = cached('paver', () => paverCanvas()), paverMat = new THREE.MeshStandardMaterial({ map: tex(paverCv, { aniso: 16 }), normalMap: tex(cached('paverNrm', () => normalFromHeight(paverCv, 1.2)), { srgb: false, aniso: 16 }), normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.9, metalness: 0, envMapIntensity: 0.3 });
const gravelCv = cached('gravel', () => gravelCanvas()), gravelMat = new THREE.MeshStandardMaterial({ map: tex(gravelCv, { repeat: [3, 20] }), normalMap: tex(cached('gravelNrm', () => normalFromHeight(gravelCv, 2.5)), { srgb: false, repeat: [3, 20] }), roughness: 1, envMapIntensity: 0.2 });
const lawnCv = cached('lawn', () => lawnCanvas()), lawnMat = new THREE.MeshStandardMaterial({ map: tex(lawnCv, { repeat: [14, 14], aniso: 8 }), normalMap: tex(cached('lawnNrm', () => normalFromHeight(lawnCv, 1.8)), { srgb: false, repeat: [14, 14] }), normalScale: new THREE.Vector2(0.6, 0.6), roughness: 1, envMapIntensity: 0.15 });

const box=(w,h,d,m,x=0,y=0,z=0,r=0)=>{const bevel=r||((m===walnutMat||m===darkOakMat||m===bronzeMat)?Math.min(0.005,w/8,h/8,d/8):0);const geo=bevel>0?new RoundedBoxGeometry(w,h,d,3,bevel):new THREE.BoxGeometry(w,h,d);if(m.userData.period)mapBoxUV(geo,m.userData.period,m.userData.grain);const mesh=new THREE.Mesh(geo,m);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;return mesh;};
const soft=(w,h,d,m,x=0,y=0,z=0,r=0.05,amp=0.012,dip=0)=>{const mesh=upholstered(w,h,d,m,r,amp,dip);mesh.position.set(x,y,z);return mesh;};

const cyl = (rt, rb, h, m, x = 0, y = 0, z = 0, seg = 32) => { const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; return mesh; };
const plane = (w, h, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz); mesh.receiveShadow = true; return mesh; };

// glazing materials, shared by both floors
const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.45, metalness: 0.7, envMapIntensity: 0.8 });
const glassTintMat = new THREE.MeshBasicMaterial({ color: 0x8aa094, transparent: true, opacity: 0.075, depthWrite: false });
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.04, metalness: 0, envMapIntensity: 1.7, side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, specularIntensity: 1.0 });
/* ───────────────────────── the shell ───────────────────────── */
// interior bounds: x -7 (left wall) .. 4.5 (glass), z -10 (back wall) .. 6, ceiling 4.6
const H = 4.6, XL = -7, XR = 4.5, ZB = -10, ZF = 6;
const shell = new THREE.Group(); scene.add(shell);
shell.add(plane(ZF - ZB, H, concMat(3.4, 1), XL, H / 2, (ZB + ZF) / 2, 0, Math.PI / 2));                 // left wall
shell.add(plane(XR - XL, H, concMat(2.5, 1, 0xf4f2ee), (XL + XR) / 2, H / 2, ZF + 0.01, 0, Math.PI));    // wall behind camera
// back wall with kitchen alcove at x -7..-2.6, z -10..-12.4, y 0..2.6
const backMain = plane(XR + 2.6, H, concMat(1.6, 1), (XR - 2.6) / 2, H / 2, ZB); shell.add(backMain);
shell.add(plane(4.4, H - 2.6, concMat(1, 0.45), -4.8, 2.6 + (H - 2.6) / 2, ZB));
const alcove = new THREE.Group(); shell.add(alcove);
alcove.add(plane(4.4, 2.6, concMat(1, 0.57, 0x8a8886), -4.8, 1.3, ZB - 2.4));
alcove.add(plane(2.4, 2.6, concMat(0.55, 0.57, 0x8a8886), -2.6, 1.3, ZB - 1.2, 0, -Math.PI / 2));
alcove.add(plane(2.4, 2.6, concMat(0.55, 0.57, 0x8a8886), XL, 1.3, ZB - 1.2, 0, Math.PI / 2));
alcove.add(plane(4.4, 2.4, new THREE.MeshStandardMaterial({ color: 0x5c5a57, roughness: 0.95, map: smoothTex }), -4.8, 2.6, ZB - 1.2, Math.PI / 2));
// ceiling + dropped slab (mezzanine mass over the left half) + column
const ceilMat = new THREE.MeshStandardMaterial({ map: (() => { const t = smoothTex.clone(); t.needsUpdate = true; t.repeat.set(2.5, 3.5); return t; })(), roughness: 1, color: 0x9a9893 });
// stair void through the ceiling and the mezzanine block: x -2.5..0.5, z -10..-8.55
const OX0 = -2.5, OX1 = 0.5, OZ1 = ZB + 1.45;
shell.add(plane(OX0 - XL, ZF - ZB, ceilMat, (XL + OX0) / 2, H, (ZB + ZF) / 2, Math.PI / 2));
shell.add(plane(XR - OX1, ZF - ZB, ceilMat, (OX1 + XR) / 2, H, (ZB + ZF) / 2, Math.PI / 2));
shell.add(plane(OX1 - OX0, ZF - OZ1, ceilMat, (OX0 + OX1) / 2, H, (OZ1 + ZF) / 2, Math.PI / 2));
// the upper floor: a bedroom over the left half of the plan. The flight climbs through the void into its back corner; its glazing sits back from the facade behind a roof terrace over the living room
const UY = H + 0.35, UH = 2.9, UX1 = OX1, UZ1 = -2.5, UT = UY + UH, UMID = (ZB + UZ1) / 2;
{
  const up = new THREE.Group(); shell.add(up);
  // floor: oak, in two planes around the stair void; concrete slab edges around the opening; the last riser lands on a flush nosing
  up.add(plane(OX0 - XL + 0.1, UZ1 - ZB + 0.2, oakFloorMat(OX0 - XL, UZ1 - ZB), (XL + OX0) / 2 - 0.05, UY, UMID, -Math.PI / 2));
  up.add(plane(UX1 - OX0, UZ1 - OZ1, oakFloorMat(UX1 - OX0, UZ1 - OZ1), (OX0 + UX1) / 2, UY, (OZ1 + UZ1) / 2, -Math.PI / 2));
  const BH = 0.395, BY = H + 0.1475;   // 4.55 .. 4.945: five centimetres into the ceiling, five millimetres under the floor planes, so the oak runs to the edge
  up.add(box(OX1 - OX0 + 0.24, BH, 0.12, concMat(0.6, 0.06), (OX0 + OX1) / 2, BY, OZ1 + 0.06));                // front edge of the opening, running to the outer faces of both side bands
  up.add(box(OX1 - OX0 + 0.24, BH, 0.1, concMat(0.6, 0.06), (OX0 + OX1) / 2, BY, ZB + 0.05));                   // the wall continues through the slab on the back side
  up.add(box(0.12, BH, OZ1 - ZB + 0.1, concMat(0.3, 0.06), OX0 - 0.06, BY, (ZB + OZ1) / 2 - 0.05));
  up.add(box(0.12, BH, OZ1 - ZB + 0.1, concMat(0.3, 0.06), OX1 + 0.06, BY, (ZB + OZ1) / 2 - 0.05));
  up.add(box(0.3, 0.16, 1.1, treadMat(), OX0 + 0.16, UY - 0.074, ZB + 0.55, 0.012));
  // walls and ceiling
  up.add(plane(UZ1 - ZB + 0.2, UH + 0.2, concMat(2.3, 0.65), XL, UY + UH / 2, UMID, 0, Math.PI / 2));           // left, run past both corners
  up.add(plane(UX1 - XL + 0.2, UH + 0.2, concMat(1.6, 0.65), (XL + UX1) / 2, UY + UH / 2, ZB));                 // back
  up.add(plane(UX1 - XL + 0.2, UH + 0.2, concMat(1.6, 0.65, 0xf4f2ee), (XL + UX1) / 2, UY + UH / 2, UZ1, 0, Math.PI));   // front, facing the room
  up.add(plane(UX1 - XL + 0.2, UZ1 - ZB + 0.2, ceilMat, (XL + UX1) / 2, UT, UMID, Math.PI / 2));
  // glazing toward the terrace: mullions, sill and head, the pane and its tint, a concrete fascia above
  for (const z of [ZB, -7.5, -5, UZ1]) { const m = box(0.12, UH, 0.06, frameMat, UX1, UY + UH / 2, z); m.castShadow = false; up.add(m); }
  up.add(box(0.12, 0.1, UZ1 - ZB, frameMat, UX1, UY + 0.05, UMID)); up.add(box(0.12, 0.12, UZ1 - ZB, frameMat, UX1, UT - 0.06, UMID));
  { const g = plane(UZ1 - ZB, UH, glassMat, UX1, UY + UH / 2, UMID, 0, -Math.PI / 2); g.receiveShadow = false; g.renderOrder = 3; up.add(g); const t = plane(UZ1 - ZB, UH, glassTintMat, UX1 + 0.006, UY + UH / 2, UMID, 0, -Math.PI / 2); t.receiveShadow = false; t.renderOrder = 2; up.add(t); }
  up.add(box(XR - UX1 + 0.4, 0.4, ZF - ZB + 1.0, concMat(0.4, 0.13), (UX1 + XR) / 2 + 0.2, UT + 0.22, (ZB + ZF) / 2));   // the roof runs on over the terrace as a deep canopy, so the ceiling line resolves outside the glass
  // the roof terrace over the living room: pavers on the slab, a slim steel rail at the edge
  const roofPaver = new THREE.MeshStandardMaterial({ map: tex(paverCv, { aniso: 16, repeat: [(XR - UX1) / 4.8, (ZF - ZB) / 4.8] }), normalMap: tex(paverMat.normalMap.image, { srgb: false, aniso: 16, repeat: [(XR - UX1) / 4.8, (ZF - ZB) / 4.8] }), normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.9, metalness: 0, envMapIntensity: 0.3 });
  up.add(plane(XR - UX1, ZF - ZB, roofPaver, (UX1 + XR) / 2, UY, (ZB + ZF) / 2, -Math.PI / 2));
  for (let z = ZB + 0.4; z < ZF; z += 1.6) { const post = cyl(0.012, 0.012, 1.05, steelMat, XR - 0.1, UY + 0.52, z, 8); post.castShadow = false; up.add(post); }
  { const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, ZF - ZB, 8), steelMat); rail.rotation.x = Math.PI / 2; rail.position.set(XR - 0.1, UY + 1.05, (ZB + ZF) / 2); up.add(rail); }
  // guardrail along the open edge of the void
  for (const x of [-2.37, -1.5, -0.85, -0.2, OX1 - 0.1]) { const post = cyl(0.012, 0.012, 1.0, steelMat, x, UY + 0.495, OZ1 + 0.03, 8); post.castShadow = false; up.add(post); }
  { const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, OX1 + 0.05 + 2.37, 8), steelMat); rail.rotation.z = Math.PI / 2; rail.position.set((OX1 + 0.05 - 2.37) / 2, UY + 1.0, OZ1 + 0.03); up.add(rail);
    const turn = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, (OZ1 + 0.03) - (ZB + 1.07) + 0.032, 8), steelMat); turn.rotation.x = Math.PI / 2; turn.position.set(-2.37, UY + 1.0, ((OZ1 + 0.03) + (ZB + 1.07)) / 2); up.add(turn); /* the corner: the stair rail meets the landing rail */ }
  // light: daylight through the upper glazing, a floor bounce, and a soft ceiling wash above the void that also reaches the living room below
  const bedWindow = new THREE.RectAreaLight(0xdfe9f0, 1.3, UZ1 - ZB, UH); bedWindow.position.set(UX1 - 0.05, UY + UH / 2, UMID); bedWindow.lookAt(XL, UY + UH / 2, UMID); up.add(bedWindow);
  const voidWash = new THREE.RectAreaLight(0xfff1df, 2.0, OX1 - OX0 - 0.2, OZ1 - ZB - 0.2); voidWash.position.set((OX0 + OX1) / 2, UT - 0.05, (ZB + OZ1) / 2); voidWash.lookAt((OX0 + OX1) / 2, 0, (ZB + OZ1) / 2); up.add(voidWash);
}
// mezzanine block, cut back where the stair passes through
const slabA = box(6.5, 1.35, 3.6 - OZ1, concMat(1.9, 0.3), XL + 3.25, H - 0.675, (OZ1 + 3.6) / 2); shell.add(slabA);
const slabB = box(OX0 - XL, 1.35, OZ1 - ZB, concMat(0.7, 0.3), (XL + OX0) / 2, H - 0.675, (ZB + OZ1) / 2); shell.add(slabB);
const slabUnderMat = new THREE.MeshStandardMaterial({ color: 0x8a8782, roughness: 1, map: (() => { const t = smoothTex.clone(); t.needsUpdate = true; t.repeat.set(1.6, 2.6); return t; })() });
shell.add(plane(6.5, 3.6 - OZ1, slabUnderMat, XL + 3.25, H - 1.35 - 0.005, (OZ1 + 3.6) / 2, Math.PI / 2));
shell.add(plane(OX0 - XL, OZ1 - ZB, slabUnderMat, (XL + OX0) / 2, H - 1.35 - 0.005, (ZB + OZ1) / 2, Math.PI / 2));
// glass wall on the right
// glazing system: deep mullion profiles inside, slender fins outside, head beam, threshold, corner fin
for (let z = ZB; z <= ZF + 0.01; z += 3.2) { const m = box(0.18, H, 0.06, frameMat, XR, H / 2, z); m.castShadow = false; shell.add(m); shell.add(box(0.22, H, 0.04, frameMat, XR + 0.29, H / 2, z)); }
shell.add(box(0.18, 0.12, ZF - ZB, frameMat, XR, 0.06, (ZB + ZF) / 2)); shell.add(box(0.18, 0.14, ZF - ZB, frameMat, XR, H - 0.07, (ZB + ZF) / 2));
const glass = plane(ZF - ZB, H, glassMat, XR, H / 2, (ZB + ZF) / 2, 0, -Math.PI / 2); glass.receiveShadow = false; glass.renderOrder = 3; shell.add(glass);
const glassTint = plane(ZF - ZB, H, glassTintMat, XR + 0.006, H / 2, (ZB + ZF) / 2, 0, -Math.PI / 2); glassTint.receiveShadow = false; glassTint.renderOrder = 2; shell.add(glassTint);   // low-e absorption: the garden sits a touch cooler and dimmer than the room
shell.add(box(1.3, 0.6, ZF - ZB, concMat(0.4, 0.13), XR + 0.6, H - 0.3, (ZB + ZF) / 2));                 // concrete head beam, inside to out
shell.add(box(1.9, 0.45, ZF - ZB + 4, new THREE.MeshStandardMaterial({ color: 0x77736d, roughness: 1 }), XR + 0.9, H + 0.225, (ZB + ZF) / 2)); // roof eave
shell.add(box(0.7, 0.16, ZF - ZB + 1, concMat(0.2, 0.05, 0xd7d3cc), XR + 0.35, -0.08, (ZB + ZF) / 2));  // threshold plinth
shell.add(box(0.9, H + 0.45, 0.4, concMat(0.25, 1), XR + 0.45, (H + 0.45) / 2, ZB - 0.2));               // corner fin at the back
// floor + reflection layer
const floor = plane(XR - XL + 0.2, ZF - ZB, floorMat, (XL + XR) / 2, 0, (ZB + ZF) / 2, -Math.PI / 2); scene.add(floor);
const alcoveFloor = plane(4.4, 2.4, floorMat, -4.8, 0, ZB - 1.2, -Math.PI / 2); scene.add(alcoveFloor);
const reflShader = {
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uRough: { value: floorRough }, uRepeat: { value: new THREE.Vector2(floorRepeat[0], floorRepeat[1]) }, uStrength: { value: 0.46 }, uBlur: { value: 3.3 } },
  vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv4; varying vec2 vUv; varying vec3 vW;
    void main(){ vUv = uv; vUv4 = textureMatrix * vec4(position,1.0); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform sampler2D uRough; uniform vec2 uRepeat; uniform float uStrength; uniform float uBlur; varying vec4 vUv4; varying vec2 vUv; varying vec3 vW;
    void main(){ vec2 uv = vUv4.xy / vUv4.w; float rough = texture2D(uRough, vUv * uRepeat).g;
      vec3 c = texture2D(tDiffuse, uv, uBlur + rough * 2.5).rgb;
      vec3 v = normalize(cameraPosition - vW); float ndv = clamp(v.y, 0.0, 1.0); float f = 0.04 + 0.96 * pow(1.0 - ndv, 4.0);
      float k = uStrength * (1.3 - rough * 1.1) * (0.35 + 0.65 * f);
      gl_FragColor = vec4(c * k, 1.0); }`
};
const refl = new Reflector(new THREE.PlaneGeometry(XR - XL + 0.2, ZF - ZB), { textureWidth: Math.round(innerWidth * DPR * 0.42), textureHeight: Math.round(innerHeight * DPR * 0.42), shader: reflShader, multisample: 0, clipBias: 0.002 });
refl.rotation.x = -Math.PI / 2; refl.position.set((XL + XR) / 2, 0.004, (ZB + ZF) / 2);
refl.material.transparent = true; refl.material.blending = THREE.AdditiveBlending; refl.material.depthWrite = false; refl.material.fog = false; refl.renderOrder = 1;
{ const rt = refl.getRenderTarget(); rt.texture.generateMipmaps = true; rt.texture.minFilter = THREE.LinearMipmapLinearFilter; rt.texture.magFilter = THREE.LinearFilter; }
{ const orig = refl.onBeforeRender; refl.onBeforeRender = function (renderer, scene, camera) { if (scene.overrideMaterial) return; orig.call(this, renderer, scene, camera); }; }
if (!Q.has('norefl')) scene.add(refl);
const refl2 = (() => {
  const s = new THREE.Shape(); s.moveTo(XL, -UZ1); s.lineTo(UX1, -UZ1); s.lineTo(UX1, -ZB); s.lineTo(XL, -ZB); s.lineTo(XL, -UZ1);
  const hole = new THREE.Path(); hole.moveTo(OX0, -OZ1); hole.lineTo(OX1, -OZ1); hole.lineTo(OX1, -ZB); hole.lineTo(OX0, -ZB); hole.lineTo(OX0, -OZ1); s.holes.push(hole);
  const r = new Reflector(new THREE.ShapeGeometry(s), { textureWidth: Math.round(innerWidth * DPR * 0.42), textureHeight: Math.round(innerHeight * DPR * 0.42), shader: reflShader, multisample: 0, clipBias: 0.002 });
  r.rotation.x = -Math.PI / 2; r.position.set(0, UY + 0.004, 0); r.material.uniforms.uRepeat.value.set(1 / 8, 1 / 8);
  r.material.transparent = true; r.material.blending = THREE.AdditiveBlending; r.material.depthWrite = false; r.material.fog = false; r.renderOrder = 1;
  const rt = r.getRenderTarget(); rt.texture.generateMipmaps = true; rt.texture.minFilter = THREE.LinearMipmapLinearFilter; rt.texture.magFilter = THREE.LinearFilter;
  const orig = r.onBeforeRender; r.onBeforeRender = function (renderer, scene, camera) { if (scene.overrideMaterial) return; orig.call(this, renderer, scene, camera); };
  r.visible = false; if (!Q.has('norefl')) scene.add(r); return r;
})();

/* outside */
/* ── exterior: paved terrace, curb, gravel bed, rising lawn, trees, clipped shrubs, grasses, distant tree line ── */
const MID = (ZB + ZF) / 2;
{ const t = paverMat.map; t.repeat.set(3.7 / 4.8, 30 / 4.8); paverMat.normalMap.repeat.copy(t.repeat); }
const terrace = plane(3.7, 30, paverMat, XR + 1.85, 0, MID - 5, -Math.PI / 2); scene.add(terrace);
scene.add(box(0.3, 0.45, 30, concMat(0.08, 0.1), XR + 3.85, -0.175, MID - 5));                                   // retaining curb
const gravel = plane(1.3, 30, gravelMat, XR + 4.65, -0.32, MID - 5, -Math.PI / 2); scene.add(gravel);
const lawn = (() => { const g = new THREE.PlaneGeometry(90, 90, 90, 90); g.rotateX(-Math.PI / 2); const P = g.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i) + XR + 5.3 + 45, z = P.getZ(i) + MID; const ramp = clamp((x - 11) / 7), deep = clamp((-z - 13) / 14); P.setY(i, ramp * (0.2 + 0.8 * vnoise3(x * 0.11, 3.7, z * 0.11)) + 0.3 * ramp * vnoise3(x * 0.3, 8.1, z * 0.3) + deep * (0.4 + 0.9 * vnoise3(x * 0.07, 5.2, z * 0.07))); } g.computeVertexNormals(); const m = new THREE.Mesh(g, lawnMat); m.position.set(XR + 5.3 + 45, -0.35, MID); m.receiveShadow = true; return m; })(); scene.add(lawn);
function makeTree(h, seed, count) {
  const g = new THREE.Group(), r = rng(seed); const top = new THREE.Vector3((r() - 0.5) * 0.3 * h, h * 0.62, (r() - 0.5) * 0.3 * h);
  const tc = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.3, 0), new THREE.Vector3(top.x * 0.3, h * 0.25, top.z * 0.3), new THREE.Vector3(top.x * 0.7, h * 0.45, top.z * 0.7), top]);
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(tc, 12, 0.07 + h * 0.014, 8, false), barkMat); trunk.castShadow = trunk.receiveShadow = true; g.add(trunk);
  const ends = []; const nb = 5 + Math.floor(r() * 3);
  for (let i = 0; i < nb; i++) { const t = 0.4 + r() * 0.55, base = tc.getPoint(t), a = r() * Math.PI * 2, len = h * (0.28 + r() * 0.3); const end = new THREE.Vector3(base.x + Math.cos(a) * len * 0.85, base.y + len * (0.35 + r() * 0.5), base.z + Math.sin(a) * len * 0.85); const bc = new THREE.CatmullRomCurve3([base, base.clone().lerp(end, 0.5).add(new THREE.Vector3(0, len * 0.08, 0)), end]); const br = new THREE.Mesh(new THREE.TubeGeometry(bc, 8, 0.02 + h * 0.004, 6, false), barkMat); br.castShadow = true; g.add(br); ends.push({ end, len }); }
  const inst = new THREE.InstancedMesh(leafCardGeo, treeLeafMat, count); inst.customDepthMaterial = leafDepth(leafTexB); inst.customDistanceMaterial = leafDist(leafTexB);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pt = new THREE.Vector3(), e = new THREE.Euler(), col = new THREE.Color();
  for (let i = 0; i < count; i++) { const E = ends[Math.floor(r() * ends.length)], R = E.len * 0.55 + h * 0.06; const u = r() * Math.PI * 2, v = Math.acos(2 * r() - 1), rr = R * Math.pow(r(), 0.4); pt.set(E.end.x + Math.sin(v) * Math.cos(u) * rr, E.end.y + Math.cos(v) * rr * 0.75, E.end.z + Math.sin(v) * Math.sin(u) * rr); e.set(r() * 1.4 - 0.2, r() * Math.PI * 2, (r() - 0.5) * 1.2); q.setFromEuler(e); const L = 0.15 + r() * 0.2; sc.set(L * 0.62, L, 1); m.compose(pt, q, sc); inst.setMatrixAt(i, m); col.setHSL(0.23 + r() * 0.07, 0.3 + r() * 0.22, 0.18 + r() * 0.2); inst.setColorAt(i, col); }
  inst.castShadow = inst.receiveShadow = true; g.add(inst); return g;
}
function makeShrub(rx, ry, rz, seed, count) {
  const g = new THREE.Group(), r = rng(seed); const inst = new THREE.InstancedMesh(leafCardGeo, shrubLeafMat, count); inst.customDepthMaterial = leafDepth(leafTexA); inst.customDistanceMaterial = leafDist(leafTexA);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pt = new THREE.Vector3(), e = new THREE.Euler(), col = new THREE.Color();
  for (let i = 0; i < count; i++) { const u = r() * Math.PI * 2, v = Math.acos(2 * r() - 1), rr = Math.pow(r(), 0.3); pt.set(Math.sin(v) * Math.cos(u) * rr * rx, Math.max(0.02, Math.cos(v) * rr * ry + ry * 0.55), Math.sin(v) * Math.sin(u) * rr * rz); e.set(r() * 1.2 - 0.3, r() * Math.PI * 2, (r() - 0.5)); q.setFromEuler(e); const L = 0.08 + r() * 0.1; sc.set(L * 0.7, L, 1); m.compose(pt, q, sc); inst.setMatrixAt(i, m); col.setHSL(0.25 + r() * 0.05, 0.3 + r() * 0.2, 0.18 + r() * 0.16); inst.setColorAt(i, col); }
  inst.castShadow = inst.receiveShadow = true; g.add(inst); return g;
}
function makeGrass(count, radius, seed) {
  const r = rng(seed); const geo = new THREE.PlaneGeometry(0.035, 0.8); geo.translate(0, 0.4, 0); const inst = new THREE.InstancedMesh(geo, bladeMat, count); inst.customDepthMaterial = leafDepth(bladeTex);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pt = new THREE.Vector3(), e = new THREE.Euler();
  for (let i = 0; i < count; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * radius; pt.set(Math.cos(a) * d, 0, Math.sin(a) * d); e.set((r() - 0.5) * 0.5, r() * Math.PI * 2, (r() - 0.5) * 0.5); q.setFromEuler(e); const L = 0.6 + r() * 0.7; sc.set(L, L, 1); m.compose(pt, q, sc); inst.setMatrixAt(i, m); }
  inst.castShadow = true; return inst;
}
const placeOut = (o, x, z, ry = 0) => { o.position.set(x, x > XR + 5.3 ? -0.35 + 0.02 : -0.32, z); o.rotation.y = ry; o.traverse(m => { m.layers.set(1); }); scene.add(o); return o; };
camera.layers.enable(1);   // the reflector's camera keeps layer 0 only, so the leaves are not drawn twice
placeOut(makeTree(6.6, 11, 1700), 8.8, -12.6); placeOut(makeTree(8.4, 12, 2200), 12.6, -17.2, 1.1); placeOut(makeTree(4.9, 13, 1200), 7.1, -10.1, 2.2);
placeOut(makeTree(7.6, 14, 1800), 17.2, -23.5); placeOut(makeTree(5.8, 15, 1400), 10.6, -14.8, 0.6); placeOut(makeTree(9.2, 16, 2000), 22.5, -31, 1.7); placeOut(makeTree(7.0, 17, 1400), 13.8, -2.0); placeOut(makeTree(6.2, 18, 1300), 11.4, 4.6, 2.4);
placeOut(makeShrub(0.9, 0.5, 0.8, 21, 420), 9.0, -9.9); placeOut(makeShrub(0.7, 0.42, 0.65, 22, 360), 9.5, -11.8); placeOut(makeShrub(1.3, 0.45, 0.9, 23, 520), 8.9, -7.4);
placeOut(makeShrub(0.8, 0.7, 0.8, 24, 480), 11.6, -13.6); placeOut(makeShrub(0.7, 0.6, 0.7, 25, 400), 14.0, -19.4); placeOut(makeShrub(0.55, 0.32, 0.5, 26, 300), 8.8, -5.2); placeOut(makeShrub(1.0, 0.4, 0.8, 27, 420), 10.3, -16.6);
placeOut(makeGrass(160, 0.45, 31), XR + 4.6, -11.2); placeOut(makeGrass(150, 0.42, 32), XR + 4.7, -8.6); placeOut(makeGrass(160, 0.45, 33), XR + 4.55, -5.6); placeOut(makeGrass(130, 0.4, 34), XR + 4.7, -2.4); placeOut(makeGrass(120, 0.38, 35), XR + 4.6, 1.8);
const gardenSky = new THREE.RectAreaLight(0xe4edf4, 2.2, 30, 40); gardenSky.position.set(XR + 16, 12, -12); gardenSky.lookAt(XR + 16, 0, -12); scene.add(gardenSky);
mark('textures');
const backdropMat = new THREE.MeshBasicMaterial({ map: tex(cached('foliage', () => foliageCanvas()), { repeat: [1, 1] }), color: new THREE.Color(1.08, 1.08, 1.08) });
const backdrop2 = plane(120, 18, backdropMat, XR + 30, 8.2, 30, 0, Math.PI); backdrop2.receiveShadow = false; backdrop2.layers.set(1); scene.add(backdrop2);
for (const t of [[makeTree(7.2, 41, 1700), 8.6, 7.5, 0], [makeTree(6.2, 42, 1400), 7.9, 1.8, 1.3], [makeTree(8.2, 43, 1900), 11.5, 13.5, 0.7], [makeShrub(1.1, 0.5, 0.9, 44, 450), 8.8, 4.2, 0], [makeShrub(0.8, 0.45, 0.7, 45, 380), 9.6, 10.5, 0]]) { const o = placeOut(t[0], t[1], t[2], t[3]); o.traverse(m => { m.castShadow = false; }); }
const backdrop = plane(120, 18, backdropMat, XR + 30, 8.2, -40, 0, 0); backdrop.material.map.repeat.set(4, 1); backdrop.material.map.offset.set(0.13, 0); backdrop.receiveShadow = false; scene.add(backdrop);
/* ───────────────────────── lights ───────────────────────── */
const sun = new THREE.DirectionalLight(0xfff3e2, 1.9); sun.position.set(14, 11, 4); sun.target.position.set(0, 0, -4); scene.add(sun, sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(quality4k ? 4096 : 3072, quality4k ? 4096 : 3072); const sc = sun.shadow.camera; sc.left = -13; sc.right = 19; sc.top = 11; sc.bottom = -11; sc.near = 2; sc.far = 45; sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.012; sun.shadow.radius = 3; sun.shadow.blurSamples = 20; sun.shadow.camera.layers.enable(1);
const hemi=new THREE.HemisphereLight(0xd4dfe5,0x88735c,0.65);scene.add(hemi);
const windowLight = new THREE.RectAreaLight(0xdfe9f0, 1.5, ZF - ZB, H); windowLight.position.set(XR - 0.05, H / 2, (ZB + ZF) / 2); windowLight.lookAt(XR - 5, H / 2, (ZB + ZF) / 2); scene.add(windowLight);
const frontLight = new THREE.RectAreaLight(0xe6eef2, 6.0, 6, H); frontLight.position.set(XR - 0.05, H / 2, 3); frontLight.lookAt(XR - 5, H / 2, 3); scene.add(frontLight);
const leftFill = new THREE.RectAreaLight(0xe9eff2, 3.2, 5, 4); leftFill.position.set(-1.5, 2.4, 2.5); leftFill.lookAt(-7, 2.4, 1.5); scene.add(leftFill);
const ambient = new THREE.AmbientLight(0x8c9298, 0.08); scene.add(ambient);

/* ───────────────────────── choreography registry ───────────────────────── */
const items = [];
function reg(obj, at, dur, kind = 'drop', from = 2.4, tourSpace = false) { obj.updateMatrixWorld(); obj.userData.rest = obj.position.clone(); obj.userData.restScale = obj.scale.clone(); obj.visible = false; items.push({ obj, at, dur, kind, from, tour: tourSpace }); return obj; }
function place(obj, x, y, z, ry = 0) { obj.position.set(x, y, z); obj.rotation.y = ry; scene.add(obj); return obj; }

/* ───────────────────────── furniture builders ───────────────────────── */
function makeRug(wm = 6.2, dm = 4.3) { const g = new THREE.Group(); const m = new THREE.MeshPhysicalMaterial({ transparent: true, opacity: 1, map: tex(rugTx.color, { repeat: [1, 1], aniso: 16 }), normalMap: tex(pbr.linen.normal||rugTx.nrm,{srgb:false,aniso:16,repeat:[wm/0.45,dm/0.45]}), normalScale: new THREE.Vector2(0.9, 0.9), roughness: 1, metalness: 0, sheen: 0.7, sheenRoughness: 0.7, sheenColor: 0xb3a48c, envMapIntensity: 0.3 }); const r = box(wm,0.018,dm,m,0,0.012,0,0.008); r.castShadow = false; g.add(r); g.userData.fadeMat = m; return g; }
function makeSofa() {
  const g = new THREE.Group();
  g.add(soft(3.3, 0.3, 1.05, creamMat, 0, 0.17, 0, 0.05, 0.006));                                     // base
  for (let i = 0; i < 3; i++) g.add(soft(1.04, 0.15, 0.95, creamMat, -1.1 + i * 1.1, 0.39, 0.03, 0.05, 0.009, 0.016)); // seat cushions
  g.add(soft(3.3, 0.42, 0.24, creamMat, 0, 0.5, -0.42, 0.05, 0.006));                                  // back
  for(let i=0;i<3;i++){const c=soft(1.02,0.35,0.22,creamMat,-1.1+i*1.1,0.6,-0.27,0.07,0.021);c.rotation.set(-0.075,0,(i-1)*0.012);g.add(c);} // back cushions
  g.add(soft(0.26, 0.5, 1.05, creamMat, 1.78, 0.27, 0, 0.05, 0.006));                                  // right arm
  g.add(soft(1.05, 0.3, 1.75, creamMat, -1.4, 0.17, 0.6, 0.05, 0.006)); g.add(soft(0.98, 0.15, 1.65, creamMat, -1.4, 0.39, 0.62, 0.05, 0.014, 0.018)); // chaise
  g.add(soft(0.26, 0.5, 1.75, creamMat, -1.79, 0.27, 0.6, 0.05, 0.006));                               // chaise arm
  const p1 = soft(0.48, 0.44, 0.15, ivoryMat, 1.25, 0.66, -0.14, 0.05, 0.02); p1.rotation.set(-0.15, 0, 0.12); g.add(p1);
  const p2 = soft(0.44, 0.42, 0.15, rustMat, 0.75, 0.64, -0.12, 0.05, 0.02); p2.rotation.set(-0.15, 0, -0.06); g.add(p2);
  const p3 = soft(0.48, 0.44, 0.15, charcoalMat, -0.9, 0.66, -0.12, 0.05, 0.02); p3.rotation.set(-0.15, 0, 0.1); g.add(p3);
  const throwB=textileDrape(0.72,[[0.46,0.505],[0.85,0.508],[1.40,0.505],[1.50,0.47],[1.54,0.25],[1.56,0.16]],rustMat,7);throwB.position.x=-1.38;g.add(throwB);
  g.add(box(3.2, 0.06, 0.9, blackMat, 0, 0.03, 0, 0)); for (const [x, z] of [[-1.5, -0.4], [1.5, -0.4], [1.5, 0.4], [-1.75, 1.3], [-1.0, 1.3]]) g.add(cyl(0.02, 0.02, 0.06, steelMat, x, 0.03, z, 8));
  return g;
}
function barrelShell(ro, ri, span, hSide, hBack, flare = 0.05, na = 72, np = 10) {
  const pos = [], uv = [], idx = []; const R = (ro - ri) / 2, cx = (ri + ro) / 2; const m = np + 4;
  const profile = (t) => { const pts = [[ri, 0], [ri, t - R]]; for (let k = 0; k <= np; k++) { const ang = Math.PI - Math.PI * k / np; pts.push([cx + R * Math.cos(ang), t - R + R * Math.sin(ang)]); } pts.push([ro, 0]); return pts; };
  for (let i = 0; i <= na; i++) { const a = -span / 2 + span * i / na, c = Math.cos(a / span * Math.PI), t = hSide + (hBack - hSide) * c * c; const pts = profile(t); pts.forEach(([r, y], j) => { const rr = r + flare * (y / hBack); pos.push(rr * Math.sin(a), y, -rr * Math.cos(a)); uv.push(i/na*span*cx/0.42, y/0.42); }); }
  for (let i = 0; i < na; i++) for (let j = 0; j < m - 1; j++) { const A = i * m + j, B = (i + 1) * m + j; idx.push(A, B, A + 1, B, B + 1, A + 1); }
  for(const i of [0,na]){const base=pos.length/3;const profile2=[];for(let j=0;j<m;j++){const k=(i*m+j)*3;const x=pos[k],y=pos[k+1],z=pos[k+2];pos.push(x,y,z);uv.push(Math.hypot(x,z)/0.42,y/0.42);profile2.push(new THREE.Vector2(Math.hypot(x,z),y));}const faces=THREE.ShapeUtils.triangulateShape(profile2,[]);for(const f of faces){if(i===0)idx.push(base+f[2],base+f[1],base+f[0]);else idx.push(base+f[0],base+f[1],base+f[2]);}}
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function makeLoungeChair(seatMat, frameMat, shellMat = seatMat) {
  const g=new THREE.Group();const mat=shellMat;mat.side=THREE.DoubleSide;
  const shellM = new THREE.Mesh(barrelShell(0.48, 0.36, Math.PI * 1.35, 0.28, 0.62, 0.04), mat); shellM.position.y = 0.26; shellM.rotation.x = -0.1; shellM.castShadow = shellM.receiveShadow = true;g.add(shellM);
  for(const side of [-1,1]){const a=side*Math.PI*1.35/2;const end=new THREE.Mesh(mapBoxUV(new THREE.CapsuleGeometry(0.058,0.16,6,20),seatMat.userData.period||0.42),seatMat);end.position.set(Math.sin(a)*0.429,0.14,-Math.cos(a)*0.429);end.castShadow=end.receiveShadow=true;shellM.add(end);}
  const back = new THREE.Mesh(barrelShell(0.365, 0.27, Math.PI * 1.0, 0.12, 0.34, 0.03), mat); back.position.y = 0.46; back.rotation.x = -0.1; back.castShadow = true; g.add(back);
  const foundation=paddedDisc(0.455,0.12,seatMat);foundation.position.y=0.235;g.add(foundation);
  const pad=paddedDisc(0.375,0.17,seatMat);pad.position.y=0.397;g.add(pad);
  g.add(cyl(0.05, 0.06, 0.18, frameMat, 0, 0.09, 0, 16)); g.add(cyl(0.3, 0.33, 0.025, frameMat, 0, 0.012, 0, 48));
  return g;
}
function makeOttoman(seatMat, frameMat) { const g = new THREE.Group(); g.add(soft(0.62, 0.18, 0.5, seatMat, 0, 0.35, 0, 0.06, 0.008, 0.012)); g.add(cyl(0.05, 0.05, 0.26, frameMat, 0, 0.13, 0, 12)); g.add(cyl(0.3, 0.32, 0.03, frameMat, 0, 0.015, 0, 40)); return g; }
function makeCoffeeTable() {
  const g = new THREE.Group(); g.add(box(1.4, 0.05, 0.75, darkOakMat, 0, 0.36, 0, 0.015)); g.add(box(1.0, 0.33, 0.45, darkOakMat, 0, 0.165, 0, 0.01));
  g.add(box(0.32, 0.024, 0.24, paperMat, -0.35, 0.4, 0.05)); g.add(box(0.3, 0.03, 0.22, coverMat, -0.33, 0.43, 0.08));
  const vase = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.001, 0), new THREE.Vector2(0.09, 0), new THREE.Vector2(0.12, 0.08), new THREE.Vector2(0.08, 0.2), new THREE.Vector2(0.05, 0.3), new THREE.Vector2(0.055,0.32),new THREE.Vector2(0.051,0.325),new THREE.Vector2(0.041,0.322),new THREE.Vector2(0.038,0.29),new THREE.Vector2(0.073,0.16),new THREE.Vector2(0.095,0.07),new THREE.Vector2(0.001,0.045)],64), stoneMat); vase.position.set(0.28, 0.385, -0.08); vase.castShadow = vase.receiveShadow = true; g.add(vase);
  const bowl = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.001, 0), new THREE.Vector2(0.06, 0), new THREE.Vector2(0.16, 0.06), new THREE.Vector2(0.15,0.065),new THREE.Vector2(0.14,0.055),new THREE.Vector2(0.05,0.014),new THREE.Vector2(0.001,0.012)],64), bronzeMat); bowl.position.set(0.15, 0.385, 0.2); bowl.castShadow = true; g.add(bowl);
  return g;
}
function makeSideTable() { const g = new THREE.Group(); g.add(cyl(0.26, 0.24, 0.05, bronzeMat, 0, 0.45, 0, 40)); g.add(cyl(0.05, 0.08, 0.42, bronzeMat, 0, 0.21, 0, 16)); g.add(cyl(0.18, 0.2, 0.02, bronzeMat, 0, 0.01, 0, 40)); const v = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.001, 0), new THREE.Vector2(0.07, 0), new THREE.Vector2(0.09, 0.12), new THREE.Vector2(0.04, 0.24), new THREE.Vector2(0.045,0.26),new THREE.Vector2(0.033,0.26),new THREE.Vector2(0.031,0.235),new THREE.Vector2(0.001,0.02)],48),ceramicDark); v.position.y = 0.475; v.castShadow = true; g.add(v); return g; }
function makeStairs() {
  const g = new THREE.Group(); const treads = [], posts = []; const n = 20, run = 0.27, rise = 0.235, x0 = 3.1;
  for (let i = 0; i < n; i++) { const t = box(run + 0.02, 0.16, 1.1, treadMat(), x0 - i * run, rise * (i + 1) - 0.08, ZB + 0.55, 0.012); g.add(t); treads.push(t); const post = cyl(0.007, 0.007, 0.95, steelMat, x0 - i * run, rise * (i + 1) + 0.475, ZB + 1.07, 6); post.castShadow = false; g.add(post); posts.push(post); }
  const L1 = Math.hypot(run, rise), ext = 0.32; const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, Math.hypot((n - 1) * run, (n - 1) * rise) + 0.3 + ext, 8), steelMat); rail.position.set(x0 - (n - 1) * run / 2 - ext / 2 * run / L1, rise * (n + 1) / 2 + 0.95 + ext / 2 * rise / L1, ZB + 1.07); rail.rotation.z = Math.atan2(run, rise); /* runs on past the last post to the landing rail's corner */ g.add(rail); g.userData.posts = posts; g.userData.rail = rail;
  g.userData.treads = treads; return g;
}
function makeKitchen() {
  const g = new THREE.Group();
  g.add(box(3.9, 0.86, 0.62, walnutMat, 0, 0.43, 0));                                          // lower run
  g.add(box(4.0, 0.05, 0.68, stoneMat, 0, 0.885, 0.02));                                         // counter top
  g.add(box(3.9, 0.66, 0.36, walnutMat, 0, 2.2, -0.13));                                         // upper cabinets
  g.add(box(3.9, 0.02, 0.36, blackMat, 0, 1.86, -0.13));
  for (let i = 0; i < 5; i++) { g.add(box(0.005, 0.66, 0.36, blackMat, -1.95 + i * 0.975, 2.2, -0.13)); g.add(box(0.005, 0.86, 0.62, blackMat, -1.95 + i * 0.975, 0.43, 0)); }
  const strip = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.015, 0.03), new THREE.MeshStandardMaterial({ color: 0xffd9a8, emissive: 0xffc27a, emissiveIntensity: 0 })); strip.position.set(0, 1.845, 0.02); g.add(strip); g.userData.strip = strip;
  const kl = new THREE.RectAreaLight(0xffc98a, 0, 3.6, 0.5); kl.position.set(0, 1.83, 0.05); kl.lookAt(0, 0, 0.05); g.add(kl); g.userData.light = kl;
  g.add(cyl(0.04, 0.04, 0.26, steelMat, -0.6, 1.03, -0.15, 12)); g.add(cyl(0.012, 0.012, 0.22, steelMat, -0.52, 1.24, -0.1, 8));  // tap
  for (let i = 0; i < 4; i++) g.add(cyl(0.035, 0.035, 0.18 + (i % 2) * 0.1, i % 2 ? blackMat : stoneMat, 0.9 + i * 0.16, 0.99 + (i % 2) * 0.05, -0.15, 12));
  return g;
}
function makeDining() {
  const g = new THREE.Group(); g.add(box(2.7,0.065,1.05,walnutMat,0,0.74,0,0.016));g.add(box(2.38,0.08,0.74,walnutMat,0,0.677,0,0.008));
  for (const [x, z] of [[-1.2, -0.42], [1.2, -0.42], [-1.2, 0.42], [1.2, 0.42]]) g.add(box(0.07, 0.72, 0.07, blackMat, x, 0.36, z));
  const chairs = [];
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const c = new THREE.Group(); c.add(soft(0.47,0.078,0.47,charcoalMat,0,0.46,0,0.025,0.003,0.008));const b=soft(0.46,0.45,0.075,charcoalMat,0,0.715,-0.21,0.026,0.005); b.rotation.x = -0.1; c.add(b); for (const [lx, lz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) c.add(box(0.03, 0.44, 0.03, blackMat, lx, 0.22, lz)); c.position.set(-0.9+i*0.9,0,s*(0.85+(i%2)*0.025));c.rotation.y=(s>0?Math.PI:0)+(i-1)*0.018; g.add(c); chairs.push(c); }
  g.add(cyl(0.12, 0.09, 0.1, stoneMat, 0, 0.82, 0, 24)); g.userData.chairs = chairs; return g;
}
function makeConsole() {
  const g = new THREE.Group(); g.add(box(1.6,0.55,0.42,walnutMat,0,0.33,0,0.006));g.add(box(1.45,0.05,0.34,blackMat,0,0.03,0));for(const x of [-0.27,0.27])g.add(box(0.003,0.51,0.002,blackMat,x,0.33,0.212)); g.add(box(1.62, 0.03, 0.44, blackMat, 0, 0.615, 0));
  const lamp=makeTableLamp();lamp.position.set(0.55,0.63,0);g.add(lamp);g.userData.lamp=lamp;

  g.add(box(0.28, 0.36, 0.05, ivoryMat, -0.45, 0.82, 0.05)); g.add(box(0.28, 0.36, 0.003, charcoalMat, -0.45, 0.82, 0.08));
  return g;
}
function makeArt() { const g = new THREE.Group(); g.add(box(0.86, 1.08, 0.05, blackMat, 0, 0, 0)); const p = plane(0.76, 0.98, new THREE.MeshStandardMaterial({ map: tex(artCanvas()), roughness: 0.9 }), 0, 0, 0.03); g.add(p); return g; }
function makePlant(h, spread, count, seed, potR = 0.36, potH = 0.6, leaf = [0.11, 0.2]) {
  const g = new THREE.Group(); const r = rng(seed);
  g.add(cyl(potR, potR * 0.85, potH, potMat, 0, potH / 2, 0, 48)); g.add(cyl(potR * 0.9, potR * 0.9, 0.02, soilMat, 0, potH, 0, 32));
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x5a4a38, roughness: 0.95, bumpMap: grainTex, bumpScale: 0.004 });
  const curves = []; const nb = 5 + Math.floor(r() * 3);
  for (let i = 0; i < nb; i++) {
    const a = i / nb * Math.PI * 2 + r() * 0.8, rad = spread * (0.55 + r() * 0.5), top = potH + h * (0.75 + r() * 0.3);
    const pts = [new THREE.Vector3((r() - 0.5) * 0.06, potH - 0.05, (r() - 0.5) * 0.06), new THREE.Vector3(Math.cos(a) * rad * 0.25, potH + h * 0.3, Math.sin(a) * rad * 0.25), new THREE.Vector3(Math.cos(a + 0.3) * rad * 0.65, potH + h * 0.6, Math.sin(a + 0.3) * rad * 0.65), new THREE.Vector3(Math.cos(a + 0.5) * rad, top, Math.sin(a + 0.5) * rad)];
    const curve = new THREE.CatmullRomCurve3(pts); curves.push(curve);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.008 + 0.012 * r(), 6, false), stemMat); tube.castShadow = true; g.add(tube);
  }
  const geo = new THREE.PlaneGeometry(1, 1, 2, 6); geo.translate(0, 0.5, 0);
  { const P = geo.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i); P.setZ(i, -0.28 * y * y + 0.09 * Math.abs(x) * y); } geo.computeVertexNormals(); }
  const t = seed % 2 ? leafTexA : leafTexB; const inst = new THREE.InstancedMesh(geo, leafMat(t), count); inst.customDepthMaterial = leafDepth(t); inst.customDistanceMaterial = leafDist(t);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler(), col = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const c = curves[Math.floor(r() * curves.length)], u = 0.25 + r() * 0.75; c.getPoint(u, p); const tan = c.getTangent(u);
    const az = r() * Math.PI * 2, droop = 0.35 + r() * 0.9;
    e.set(0, az, 0); q.setFromEuler(e); const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(Math.cos(az), 0, -Math.sin(az)), droop); q.premultiply(tilt);
    const roll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (r() - 0.5) * 0.6); q.multiply(roll);
    p.addScaledVector(tan, (r() - 0.5) * 0.04); const L = leaf[0] + r() * (leaf[1] - leaf[0]); s.set(L * (0.55 + r() * 0.2), L, 1);
    m.compose(p, q, s); inst.setMatrixAt(i, m);
    col.setHSL(0.26 + (r() - 0.5) * 0.04, 0.32 + r() * 0.18, 0.28 + r() * 0.16); inst.setColorAt(i, col);
  }
  inst.castShadow = true; inst.receiveShadow = true; g.add(inst); return g;
}
function makeTableLamp(){
  const lamp=new THREE.Group();lamp.add(vessel([[0,0],[0.07,0],[0.085,0.035],[0.09,0.12],[0.067,0.25],[0.04,0.33],[0.035,0.42]],stoneMat));
  const shadeMat=fabricMat(0xeee4d2,0xf7ecda);shadeMat.side=THREE.DoubleSide;shadeMat.emissive.set(0xffc98a);shadeMat.emissiveIntensity=0;
  const shade=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.2,0.26,64,1,true),shadeMat);shade.position.y=0.55;lamp.add(shade);lamp.userData.shade=shade;
  for(const [r,y] of [[0.14,0.68],[0.2,0.42]]){const rim=new THREE.Mesh(new THREE.TorusGeometry(r,0.002,5,64),paperMat);rim.rotation.x=Math.PI/2;rim.position.y=y;lamp.add(rim);}
  const pl=new THREE.PointLight(0xffd1a1,0,7,2);pl.position.set(0,0.49,0);lamp.add(pl);lamp.userData.light=pl;return lamp;
}

// the bedroom: a low oak platform bed in washed linen with the duvet folded back, its headboard against the wall
function makeBed() {
  const g = new THREE.Group();
  g.add(box(2.14, 0.22, 1.86, walnutMat, 0, 0.11, 0));                                        // platform
  g.add(soft(2.0, 0.24, 1.7, creamMat, 0, 0.34, 0, 0.05, 0.006));                              // mattress, fitted linen
  const duvet=textileDrape(1.77,[[-0.41,0.515],[0.05,0.515],[0.64,0.50],[0.97,0.46],[1.055,0.35],[1.10,0.25]],ivoryMat,9);duvet.rotation.y=Math.PI/2;g.add(duvet);                             // duvet
  g.add(soft(0.22,0.08,1.77,ivoryMat,-0.30,0.55,0,0.035,0.009));                        // the folded edge
  for (const z of [-0.42, 0.42]) { const p = soft(0.44, 0.18, 0.7, creamMat, -0.72, 0.56, z, 0.06, 0.02); p.rotation.z = 0.35; g.add(p); }
  const p3 = soft(0.36, 0.14, 0.5, rustMat, -0.62, 0.61, 0, 0.05, 0.02); p3.rotation.z = 0.3; g.add(p3);   // one accent cushion
  g.add(box(0.06, 0.95, 2.2, charcoalMat, -1.1, 0.5, 0, 0.02));                                 // headboard panel
  return g;
}
function makeNightstand(withLamp = false) {
  const g = new THREE.Group(); g.add(cyl(0.26, 0.26, 0.035, walnutMat, 0, 0.5, 0, 40)); g.add(cyl(0.035, 0.035, 0.47, bronzeMat, 0, 0.245, 0, 16)); g.add(cyl(0.16, 0.18, 0.02, bronzeMat, 0, 0.01, 0, 40));
  if (withLamp) { const lamp = makeTableLamp(); lamp.position.set(0, 0.52, 0); g.add(lamp); g.userData.lamp = lamp; }
  else { const b = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.001, 0), new THREE.Vector2(0.05, 0), new THREE.Vector2(0.09, 0.05), new THREE.Vector2(0.085, 0.055)], 24), stoneMat); b.position.y = 0.52; b.castShadow = true; g.add(b); }
  return g;
}
function makeBench() { const g = new THREE.Group(); g.add(box(1.4, 0.05, 0.42, walnutMat, 0, 0.4, 0)); for (const [x, z] of [[-0.62, -0.16], [0.62, -0.16], [-0.62, 0.16], [0.62, 0.16]]) g.add(box(0.035, 0.38, 0.035, blackMat, x, 0.19, z)); g.add(soft(1.36, 0.08, 0.4, leatherMat, 0, 0.465, 0, 0.03, 0.006)); return g; }
function makeChandelier() {
  const g = new THREE.Group(); const r = rng(9); g.add(cyl(0.16, 0.16, 0.03, blackMat, 0, -0.015, 0, 32));
  const globes = [], lights = [];
  const glow = (() => { const [c, x] = canvas(32, 128); const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#8c8078'); g.addColorStop(0.45, '#d8cbbd'); g.addColorStop(1, '#ffffff'); x.fillStyle = g; x.fillRect(0, 0, 32, 128); return tex(c); })();
  const globeMat = new THREE.MeshPhysicalMaterial({ color: 0xf6eadb, roughness:0.24,metalness:0,transparent:true,opacity:0.82, emissive: 0xffcda4, emissiveMap: glow, emissiveIntensity: 0, envMapIntensity:1.2,clearcoat:0.18,clearcoatRoughness:0.28 });
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff0d0, emissive: 0xffb860, emissiveIntensity: 0 });
  for (let i = 0; i < 11; i++) {
    const a = i * 0.75 + r(), rad = i === 0 ? 0 : 0.2 + r() * 0.38, x = Math.cos(a) * rad, z = Math.sin(a) * rad, drop = 1.0 + r() * 1.15, R = 0.075 + r() * 0.075;
    const cable = cyl(0.004, 0.004, drop, blackMat, x, -drop / 2, z, 6); cable.castShadow = false; g.add(cable);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 24), globeMat); globe.position.set(x, -drop - R, z); globe.castShadow = false; g.add(globe); globes.push(globe);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(R * 0.26, 16, 12), bulbMat); bulb.position.copy(globe.position); g.add(bulb);
    if (i === 0 || i === 5) { const pl = new THREE.PointLight(0xffc27a, 0, 12, 2); pl.position.copy(globe.position); g.add(pl); lights.push(pl); }
  }
  g.userData = { globeMat, bulbMat, lights }; return g;
}

/* ───────────────────────── placement + choreography ───────────────────────── */
const T = { shell: 0.04, land: 0.19, heart: 0.38, warm: 0.56, end: 0.80 };
const F = 470 / 740;   // the furniture reveal keeps its original scroll length; what follows is the tour
const TOUR = { hold: 0.10, arrive: 0.78, done: 0.90 };   // hold on the finished room, walk and climb until 'arrive', bedroom pieces land as the camera settles, outro after 'done'
let bedU, rugU, nightA, nightB, benchU, chairU, plantU, artU, consoleU;
// the furniture is built in stages after the first frame, one stage per frame, so the empty room paints at once
let rug, stairs, sofa, chairA, ottoman, chairB, chairC, table, side, kitchen, art, consoleT, dining, plantB, chand, plantA, plantC;
const stageB = [
  () => {
    rug = reg(place(makeRug(), 1.1, 0, -4.7), T.shell + 0.01, 0.06, 'settle', 0.9);
    stairs = place(makeStairs(), 0, 0, 0); scene.add(stairs); stairs.visible = true;
    stairs.userData.treads.forEach((t, i) => reg(t, T.shell + 0.04 + i * 0.0032, 0.045, 'slide', -1.3));
    stairs.userData.posts.forEach((b, i) => reg(b, T.shell + 0.045 + i * 0.0032, 0.045, 'slide', -1.3)); reg(stairs.userData.rail, T.shell + 0.115, 0.05, 'slide', -1.3);
  },
  () => {
    sofa = reg(place(makeSofa(), 1.7, 0, -6.4), T.land, 0.06, 'drop', 1.9);
    chairA = reg(place(makeLoungeChair(leatherMat, blackMat, leatherSeamMat), -0.9, 0, -3.1, -0.2), T.land + 0.035, 0.055, 'drop', 1.9);
    ottoman = reg(place(makeOttoman(leatherMat, blackMat), -1.05, 0, -2.4, -0.2), T.land + 0.075, 0.05, 'drop', 1.6);
    chairB = reg(place(makeLoungeChair(charcoalMat, blackMat), 3.3, 0, -3.4, -1.0), T.land + 0.055, 0.055, 'drop', 1.9);
    chairC = reg(place(makeLoungeChair(charcoalMat, blackMat), 3.7, 0, -8.0, -1.4), T.land + 0.115, 0.05, 'drop', 1.8);
    table = reg(place(makeCoffeeTable(), 2.1, 0, -4.7, 0.05), T.land + 0.095, 0.05, 'drop', 1.6);
    side = reg(place(makeSideTable(), 3.6, 0, -5.9), T.land + 0.135, 0.045, 'drop', 1.5);
  },
  () => {
    kitchen = reg(place(makeKitchen(), -4.8, 0, ZB - 2.05), T.heart, 0.06, 'slide', -1.6);
    art = reg(place(makeArt(), -0.3, 1.85, ZB + 0.03), T.heart + 0.035, 0.045, 'settle', 0.5);
    consoleT = reg(place(makeConsole(), -0.3, 0, ZB + 0.25), T.heart + 0.055, 0.05, 'drop', 1.5);
    dining = place(makeDining(), -3.9, 0, -8.55, 0); reg(dining, T.heart + 0.07, 0.06, 'drop', 1.7);
    plantB = reg(place(makePlant(1.5, 0.75, 220, 2, 0.3, 0.5, [0.12, 0.22]), 1.0, 0, -9.25), T.heart + 0.11, 0.05, 'grow');
  },
  () => {
    chand = place(makeChandelier(), 1.4, H - 0.01, -5.4); reg(chand, T.warm, 0.06, 'drop', 1.1);
    plantA = reg(place(makePlant(2.4, 0.95, 520, 1, 0.4, 0.7, [0.1, 0.2]), -4.5, 0, -6.2), T.warm + 0.04, 0.055, 'grow');
    plantC = reg(place(makePlant(0.9, 0.5, 140, 3, 0.2, 0.32, [0.08, 0.14]), -3.8, 0.9, ZB - 2.1), T.warm + 0.075, 0.04, 'grow');
  },
  () => {
    rugU = reg(place(makeRug(3.6, 2.8), -5.1, UY, -4.9), 0.66, 0.05, 'settle', 0.7, true);
    bedU = reg(place(makeBed(), -5.85, UY, -4.9), 0.69, 0.06, 'drop', 1.4, true);
    nightA = reg(place(makeNightstand(false), -6.55, UY, -6.3), 0.735, 0.045, 'drop', 1.2, true);
    nightB = reg(place(makeNightstand(true), -6.55, UY, -3.5), 0.75, 0.045, 'drop', 1.2, true);
    benchU = reg(place(makeBench(), -4.3, UY, -4.9, Math.PI / 2), 0.765, 0.045, 'drop', 1.2, true);
    chairU = reg(place(makeLoungeChair(charcoalMat, blackMat), -0.9, UY, -3.6, Math.PI / 2 + 0.6), 0.78, 0.05, 'drop', 1.5, true);
    plantU = reg(place(makePlant(1.6, 0.8, 240, 4, 0.3, 0.5, [0.12, 0.22]), -0.3, UY, -5.0), 0.80, 0.05, 'grow', 2.4, true);
    artU = place(makeArt(), XL + 0.04, UY + 1.72, -4.9, Math.PI / 2); reg(artU, 0.82, 0.04, 'settle', 0.4, true);
    consoleU = reg(place(makeConsole(), -3.3, UY, UZ1 - 0.25, Math.PI), 0.79, 0.05, 'drop', 1.3, true);
  },
  () => bakeEnvironment(),
];
const runStage = () => { const fn = stageB.shift(); if (fn) { const t = performance.now(); fn(); renderer.shadowMap.needsUpdate = true; (window.__stageMs = window.__stageMs || []).push(Math.round(performance.now() - t)); } };
async function warmUp() {   // nothing may compile, upload or change the light count while the user scrolls: lights leave their furniture groups, every object is shown once for the compiler, every texture is uploaded
  const moved = []; for (const it of items) it.obj.traverse(o => { if (o.isLight) moved.push(o); }); moved.forEach(l => scene.attach(l));
  const hidden = []; scene.traverse(o => { if (o.visible === false) { o.visible = true; hidden.push(o); } });
  await renderer.compileAsync(scene, camera);
  scene.traverse(o => { const m = o.material; if (!m) return; for (const k of ['map', 'normalMap', 'roughnessMap', 'emissiveMap', 'bumpMap', 'alphaMap']) if (m[k]) renderer.initTexture(m[k]); });
  hidden.forEach(o => { o.visible = false; });
}
const pumpStages = () => { if (!stageB.length) return; if (window.__holdStages) { setTimeout(pumpStages, 60); return; } runStage(); setTimeout(pumpStages, 16); };

/* ───────────────────────── post ───────────────────────── */
const MSAA = Number(Q.get('msaa') || 0);   // the composer's own target; edges are handled by FXAA after the output pass (multisampling here costs a resolve per pass)
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(Math.round(innerWidth * DPR), Math.round(innerHeight * DPR), { type: THREE.HalfFloatType, samples: MSAA }));
composer.setSize(innerWidth,innerHeight);
composer.addPass(new RenderPass(scene, camera));
const gtao = new GTAOPass(scene, camera, innerWidth, innerHeight); gtao.updateGtaoMaterial({ radius: 0.4, distanceExponent: 1, thickness: 1, scale: 1.15, samples: 10, distanceFallOff: 1, screenSpaceRadius: false }); gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, radiusExponent: 1, rings: 2, samples: 16 }); gtao.blendIntensity = 0.82; { const AO_SCALE = 0.5; const base = GTAOPass.prototype.setSize; gtao.setSize = function (w, h) { base.call(this, Math.round(w * AO_SCALE), Math.round(h * AO_SCALE)); }; gtao.setSize(innerWidth, innerHeight); } if (!Q.has('noao') && !liteGPU) composer.addPass(gtao);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), liteGPU ? 0.06 : 0.11, 0.9, 0.93); if (!Q.has('nobloom')) composer.addPass(bloom);   // wider and fainter: a soft halo, not a glow
composer.addPass(new OutputPass());
const fxaa = new ShaderPass(FXAAShader); fxaa.material.uniforms.resolution.value.set(1 / (innerWidth * DPR), 1 / (innerHeight * DPR)); if (!Q.has('nofxaa')) composer.addPass(fxaa);
const grainPass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAmt: { value: REDUCE ? 0 : 0.007 }, uVig: { value: 0.17 }, uTexel: { value: new THREE.Vector2(1 / (innerWidth * DPR), 1 / (innerHeight * DPR)) }, uSharp: { value: Number(Q.get('sharp') || 0.12) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uAmt, uVig, uSharp; uniform vec2 uTexel; varying vec2 vUv;
    float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
    void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec3 nb = texture2D(tDiffuse, vUv + vec2(uTexel.x, 0.0)).rgb + texture2D(tDiffuse, vUv - vec2(uTexel.x, 0.0)).rgb + texture2D(tDiffuse, vUv + vec2(0.0, uTexel.y)).rgb + texture2D(tDiffuse, vUv - vec2(0.0, uTexel.y)).rgb;
      c = clamp(c + (c - nb * 0.25) * uSharp, 0.0, 1.0);
      float g = hash(vUv * 1000.0 + fract(uTime)*13.7) - 0.5;
      c += g * uAmt * (0.6 + 0.4 * (1.0 - dot(c, vec3(0.333))));
      vec2 q = vUv - 0.5; float v = 1.0 - smoothstep(0.35, 1.15, dot(q, q) * 2.4); c *= mix(1.0, v, uVig);
      c = mix(c, c * vec3(1.02, 1.0, 0.97), 0.5);
      gl_FragColor = vec4(c, 1.0); }`
}); composer.addPass(grainPass);

/* ───────────────────────── scroll + ui ───────────────────────── */
const spacer = document.getElementById('spacer'), hero = document.getElementById('hero');
let target = 0, cur = 0, mouse = { x: 0, y: 0 }, mcur = { x: 0, y: 0 };
const maxScroll = () => Math.max(1, spacer.offsetHeight - innerHeight);
const syncShop = () => document.body.classList.toggle('shop', scrollY > spacer.offsetHeight - 120);
const inHeroView = () => scrollY < spacer.offsetHeight + 4;
addEventListener('scroll', () => {
  target = clamp(scrollY / maxScroll());
  syncShop();
  if (typeof FX === 'function') FX(false);
  if (inHeroView()) kickLoop();
  else if (glShown) { glShown = false; renderer.domElement.style.visibility = 'hidden'; applyUI(); }
}, { passive: true });
window.__scrollSync = () => { target = clamp(scrollY / maxScroll()); syncShop(); FX(true); };
addEventListener('mousemove', (e) => { if (REDUCE || !inHeroView()) return; mouse.x = (e.clientX / innerWidth - 0.5) * 2; mouse.y = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
addEventListener('resize', () => { FX(true); renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); grainPass.uniforms.uTexel.value.set(1 / (innerWidth * DPR), 1 / (innerHeight * DPR)); fxaa.material.uniforms.resolution.value.set(1 / (innerWidth * DPR), 1 / (innerHeight * DPR)); forceFull = true; camera.aspect = innerWidth / innerHeight; camera.fov = innerWidth < innerHeight ? 76 : 58; camera.updateProjectionMatrix(); refl.getRenderTarget().setSize(Math.round(innerWidth * DPR * 0.5), Math.round(innerHeight * DPR * 0.5)); target = clamp(scrollY / maxScroll()); kickLoop(); });
camera.fov = innerWidth < innerHeight ? 76 : 58; camera.updateProjectionMatrix();

function flickerOn(t) { return sstep(t); }   // lamps warm up smoothly; the strobing switch-on is gone
const _v = new THREE.Vector3();
function applyItems(p, tour = 0) {
  for (const it of items) {
    const t = clamp(((it.tour ? tour : p) - it.at) / it.dur); const o = it.obj, rest = o.userData.rest, rs = o.userData.restScale;
    o.visible = t > 0.0005; if (!o.visible) continue;
    const e = outQuint(t), settle = t > 0.72 ? Math.sin((t - 0.72) / 0.28 * Math.PI) : 0, fm = o.userData.fadeMat, sIn = fm ? 1 : (t < 0.3 ? sstep(t / 0.3) : 1);
    if (fm) fm.opacity = sstep(t / 0.45);   // flat pieces fade in on the floor (the material stays transparent, so no shader variant is built mid-scroll)   // a piece materialises over the first third of its move rather than appearing at full size
    switch (it.kind) {
      case 'drop': o.position.set(rest.x, rest.y + it.from * (1 - e), rest.z); o.scale.set(rs.x * (1 + 0.025 * settle) * sIn, rs.y * (1 - 0.045 * settle) * sIn, rs.z * (1 + 0.025 * settle) * sIn); break;
      case 'slide': o.position.set(rest.x, rest.y, rest.z + it.from * (1 - e)); break;
      case 'settle': o.position.set(rest.x, rest.y + it.from * (1 - e), rest.z); o.scale.copy(rs).multiplyScalar((0.9 + 0.1 * e) * sIn); break;
      case 'grow': { const k = 0.001 + 0.999 * (1 - Math.pow(1 - t, 3)); const over = t > 0.6 ? 1 + 0.06 * Math.sin((t - 0.6) / 0.4 * Math.PI) : 1; o.scale.set(rs.x * k * over, rs.y * k, rs.z * k * over); o.position.copy(rest); break; }
    }
  }
}
function applyLights(p, tour = 0) {
  const k = flickerOn(clamp((p - T.warm - 0.035) / 0.055)); const kk = flickerOn(clamp((p - T.heart - 0.03) / 0.05)); const lampK = flickerOn(clamp((p - T.heart - 0.085) / 0.045));
  if (chand) { chand.userData.globeMat.emissiveIntensity = 0.32 * k; chand.userData.bulbMat.emissiveIntensity = 1.6 * k; chand.userData.lights.forEach(l => l.intensity = 6.5 * k); }
  if (kitchen) { kitchen.userData.strip.material.emissiveIntensity = 5 * kk; kitchen.userData.light.intensity = 9 * kk; }
  if (consoleT) { consoleT.userData.lamp.userData.shade.material.emissiveIntensity = 1.4 * lampK; consoleT.userData.lamp.userData.light.intensity = 5 * lampK; }
  const nb = k * sstep((tour - 0.755) / 0.05), cu = k * sstep((tour - 0.795) / 0.05);   // each lamp warms up as its piece lands
  if (nightB) { const l = nightB.userData.lamp; l.userData.shade.material.emissiveIntensity = 1.3 * nb; l.userData.light.intensity = 4.5 * nb; }
  if (consoleU) { const l = consoleU.userData.lamp; l.userData.shade.material.emissiveIntensity = 1.4 * cu; l.userData.light.intensity = 5 * cu; }
  const dusk = sstep((p - T.warm - 0.02) / 0.10);
  sun.intensity = lerp(1.9, 1.2, dusk); hemi.intensity = lerp(0.38, 0.28, dusk); leftFill.intensity = lerp(3.6, 2.5, dusk); windowLight.intensity = lerp(1.5, 1.0, dusk); frontLight.intensity = lerp(6.0, 3.8, dusk); ambient.intensity = lerp(0.08, 0.05, dusk);
  backdropMat.color.setScalar(lerp(1.08, 0.86, dusk)); scene.fog.color.setRGB(lerp(0.765, 0.62, dusk), lerp(0.8, 0.58, dusk), lerp(0.815, 0.52, dusk));
  bloom.strength = lerp(0.11, 0.19, dusk) * (1 - 0.45 * sstep(camK * 3)); scene.background.copy(scene.fog.color); gardenSky.intensity = lerp(2.2, 0.9, dusk);
}
const camPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-0.209, 1.36, 0.4),   // where the living-room drift ends
  new THREE.Vector3(2.3, 1.9, -1.9),      // a slow crane up and across, keeping to the glazing side, clear of the pendants
  new THREE.Vector3(3.7, 2.25, -4.6),     // past the sofa's end, the flight ahead
  new THREE.Vector3(3.4, 2.7, -7.9),      // at the foot, looking up the flight
  new THREE.Vector3(1.2, 3.4, -9.0),      // mid-flight, over the treads
  new THREE.Vector3(0.0, 4.75, -9.1),     // through the opening
  new THREE.Vector3(-1.5, 6.2, -9.2),     // clear of the landing rail, turning into the room
  new THREE.Vector3(-2.95, 6.45, -9.35),
  new THREE.Vector3(-3.2, 6.4, -9.45),    // the settled bedroom framing
], false, 'centripetal');
const lookPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-0.05, 1.42, -8),
  new THREE.Vector3(1.6, 1.9, -8.6),
  new THREE.Vector3(2.0, 2.6, -9.6),
  new THREE.Vector3(-0.4, 4.3, -9.5),
  new THREE.Vector3(-2.0, 6.4, -9.2),
  new THREE.Vector3(-3.0, 6.6, -8.2),
  new THREE.Vector3(-3.4, 6.0, -5.8),
  new THREE.Vector3(-3.8, 5.55, -4.2),
  new THREE.Vector3(-4.1, 5.3, -3.1),
], false, 'centripetal');
const _cp = new THREE.Vector3(), _cl = new THREE.Vector3(); let camK = 0;
function applyCamera(p, tour = 0) {
  const lookOff = _v.set(mcur.x * 0.9, -mcur.y * 0.45, 0);
  const k = tour <= TOUR.hold ? 0 : sstep((tour - TOUR.hold) / (TOUR.arrive - TOUR.hold));
  const s1 = 1 - sstep((k - 0.6) / 0.12), s2 = sstep((k - 0.55) / 0.12);   // each floor's reflection fades with the climb, never switches
  refl.material.uniforms.uStrength.value = 0.16 * s1; refl.visible = s1 > 0.002; refl2.material.uniforms.uStrength.value = 0.16 * s2; refl2.visible = s2 > 0.002;
  camK = k;
  if (k <= 0) { camera.position.set(camBase.x + mcur.x * 0.28 + Math.sin(p * 3.2) * 0.15, camBase.y - mcur.y * 0.1 + p * 0.06, camBase.z - p * 0.9); camera.lookAt(camLook.x + lookOff.x, camLook.y + lookOff.y, camLook.z); return; }
  camK = k; const m = 1 - 0.6 * k;   // the hand-held drift eases off as the camera is guided
  camPath.getPointAt(k, _cp); lookPath.getPointAt(k, _cl);
  camera.position.set(_cp.x + mcur.x * 0.28 * m, _cp.y - mcur.y * 0.1 * m, _cp.z);
  camera.lookAt(_cl.x + lookOff.x * m, _cl.y + lookOff.y * m, _cl.z);
}function applyUI() {
  if (!hero) return;
  const hf = 1 - sstep(scrollY / Math.max(64, spacer.offsetHeight * 0.4));
  if (Math.abs(hf - (hero._hf || 2)) < 0.005) return;
  hero._hf = hf;
  hero.style.opacity = hf;
  hero.style.transform = hf > 0.98 ? 'none' : `translate3d(0,${(-48 * (1 - hf)).toFixed(1)}px,0)`;
}
/* ───────────────────────── baked interior environment ───────────────────────── */
function bakeEnvironment() {
  const cubeRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
  const cubeCam = new THREE.CubeCamera(0.2, 80, cubeRT); cubeCam.position.set(0.6, 1.5, -3.5); scene.add(cubeCam);   // layer 1 (the garden's leaf cards) is left out of the bake
  applyItems(0, 0); applyLights(0.0); refl.visible = false; refl2.visible = false;
  renderer.shadowMap.needsUpdate = true; cubeCam.update(renderer, scene);
  const env = pmrem.fromCubemap(cubeRT.texture).texture; scene.environment = env; refl.visible = true; scene.remove(cubeCam);cubeRT.dispose();
}
/* ───────────────────────── catalogue: product shots rendered from the same models ───────────────────────── */
const PRODUCTS = [
  { name: 'Venetian Plaster', img: new URL('../images/1684165610413-2401399e0e59-1600x1000.webp', import.meta.url).href, cat: 'Venetian', price: 'Quote', build: () => makeSofa(), view: [0.85, 0.34, 1.12], rot: 0.15, feature: true },
  { name: 'Marmorino', img: new URL('../images/1519947486511-46149fa0a254-1200x1500.webp', import.meta.url).href, cat: 'Marmorino', price: 'Quote', build: () => makeLoungeChair(leatherMat, blackMat, leatherSeamMat), view: [0.55, 0.28, 1.18], rot: 0.35 },
  { name: 'Lime Wash', img: new URL('../images/1616486338812-3dadae4b4ace-1200x1500.webp', import.meta.url).href, cat: 'Lime', price: 'Quote', build: () => makeCoffeeTable(), view: [0.7, 0.42, 1.2], rot: 0.25 },
  { name: 'Grassello di Calce', img: new URL('../images/1600607686527-6fb886090705-1200x1500.webp', import.meta.url).href, cat: 'Venetian', price: 'Quote', build: () => makeRug(), view: [0.5, 0.95, 1.05] },
  { name: 'Microcement', img: new URL('../images/1565814329452-e1efa11c5b89-1200x1500.webp', import.meta.url).href, cat: 'Microcement', price: 'Quote', build: () => { const c = makeChandelier(); c.userData.globeMat.emissiveIntensity = 0.45; c.userData.bulbMat.emissiveIntensity = 2.4; c.userData.lights.forEach(l => l.intensity = 2.5); return c; }, view: [0.6, 0.08, 1.15] },
  { name: 'Lime Paint', img: new URL('../images/1583847268964-b28dc8f51f92-1200x1500.webp', import.meta.url).href, cat: 'Lime', price: 'Quote', build: () => makeOttoman(leatherMat, blackMat), view: [0.6, 0.36, 1.2], rot: 0.4 },
  { name: 'Faux Finish', img: new URL('../images/1604578762246-41134e37f9cc-1200x1500.webp', import.meta.url).href, cat: 'Decorative', price: 'Quote', build: () => makeDining(), view: [0.8, 0.3, 1.14], rot: 0.3 },
  { name: 'Commercial Plastering', img: new URL('../images/1592078615290-033ee584e267-1200x1500.webp', import.meta.url).href, cat: 'Contracting', price: 'Quote', build: () => { const d = makeDining(); const c = d.userData.chairs[0]; d.remove(c); c.position.set(0, 0, 0); c.rotation.y = 0; return c; }, view: [0.7, 0.24, 1.2], rot: 0.5 },
  { name: 'Residential Artisan', img: new URL('../images/1532372320572-cda25653a26d-1200x1500.webp', import.meta.url).href, cat: 'Contracting', price: 'Quote', build: () => makeSideTable(), view: [0.7, 0.3, 1.2] },
  { name: 'Microcement Flooring', img: new URL('../images/1616046229478-9901c5536a45-1200x1500.webp', import.meta.url).href, cat: 'Microcement', price: 'Quote', build: () => { const c = makeConsole(); c.userData.lamp.userData.shade.material.emissiveIntensity = 1.1; c.userData.lamp.userData.light.intensity = 2; return c; }, view: [0.55, 0.26, 1.18], rot: 0.2 },
];
let studio, sKey, sCam;
const _b = new THREE.Box3(), _c = new THREE.Vector3(), _s = new THREE.Vector3();
function getStudio() {
  if (studio) return studio;
  studio = new THREE.Scene(); studio.background = new THREE.Color(0xefebe4); studio.fog = new THREE.Fog(0xefebe4, 7, 18); studio.environment = roomEnv;
  const g = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0xefebe4, roughness: 1 })); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; studio.add(g);
  sKey = new THREE.DirectionalLight(0xfff6ea, 2.3); sKey.position.set(-3.5, 6.5, 4.5); sKey.castShadow = true; sKey.shadow.mapSize.set(1024, 1024); Object.assign(sKey.shadow.camera, { left: -4.5, right: 4.5, top: 4.5, bottom: -4.5, near: 0.5, far: 24 }); sKey.shadow.radius = 7; sKey.shadow.blurSamples = 8; sKey.shadow.normalBias = 0.02; sKey.shadow.bias = -0.0003; studio.add(sKey, sKey.target);
  studio.add(new THREE.HemisphereLight(0xffffff, 0xb9b1a5, 0.75));
  const fill = new THREE.RectAreaLight(0xe6eef6, 2.2, 7, 7); fill.position.set(6, 3.5, 2); fill.lookAt(0, 0.8, 0); studio.add(fill);
  const rim = new THREE.RectAreaLight(0xfff0e0, 1.2, 6, 4); rim.position.set(0, 3, -6); rim.lookAt(0, 0.8, 0); studio.add(rim);
  sCam = new THREE.PerspectiveCamera(30, 0.8, 0.1, 60);
  return studio;
}
function shootProduct(P) {
  const room = getStudio();
  const obj = P.build(); obj.rotation.y = P.rot || 0; room.add(obj); obj.updateMatrixWorld(true);
  _b.setFromObject(obj); if (_b.min.y < 0) { obj.position.y -= _b.min.y; obj.updateMatrixWorld(true); _b.setFromObject(obj); }
  _b.getCenter(_c); _b.getSize(_s); const rad = _s.length() / 2;
  const W = P.feature ? 1440 : 720, Hh = 900; sCam.aspect = W / Hh; sCam.updateProjectionMatrix();
  const [az, el, f] = P.view, vf = THREE.MathUtils.degToRad(sCam.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * sCam.aspect), dist = rad / Math.sin(Math.min(vf, hf) / 2) * f;
  room.fog.near = dist + rad * 1.3; room.fog.far = room.fog.near + 10; sCam.far = room.fog.far + 5;
  sCam.position.set(_c.x + Math.sin(az) * Math.cos(el) * dist, _c.y + Math.sin(el) * dist, _c.z + Math.cos(az) * Math.cos(el) * dist); sCam.lookAt(_c.x, _c.y - _s.y * 0.04, _c.z);
  sKey.target.position.copy(_c); sKey.target.updateMatrixWorld();
  renderer.setSize(W, Hh, false); renderer.shadowMap.needsUpdate = true; renderer.render(room, sCam);
  const url = renderer.domElement.toDataURL('image/jpeg', 0.9);
  renderer.setSize(innerWidth, innerHeight, false); room.remove(obj); return url;
}
function buildCatalogue() {
  const grid = document.getElementById('grid');
  const cards = PRODUCTS.map(P => { const a = document.createElement('a'); a.className = 'prod' + (P.feature ? ' feature' : ''); a.href = '#'; a.setAttribute('aria-label', P.name); a.innerHTML = `<figure><div class="img"><img alt="${P.name}" loading="lazy" decoding="async"></div></figure><div class="meta"><div class="cap"><div><span class="cat">${P.cat}</span><h3>${P.name}</h3></div><span class="price">${P.price}</span></div><span class="view">View finish</span></div>`; a.addEventListener('click', e => e.preventDefault()); grid.appendChild(a); return a; });
  cards.forEach((card, i) => { const P = PRODUCTS[i], img = card.querySelector('img'); img.onload = () => img.classList.add('ready'); img.onerror = () => { img.onerror = null; try { img.src = shootProduct(P); } catch (e) { console.warn('product shot failed', P.name, e); } }; img.src = P.img; });
  if (typeof FX === 'function' && FX.refresh) FX.refresh();
}
/* lookbook + gallery mount when they approach the viewport; their loops pause off-screen */
{
  const frame = document.getElementById('catFrame'), book = document.getElementById('catBook');
  const setPaused = (v) => { try { book.contentWindow && book.contentWindow.__dbg && book.contentWindow.__dbg.pause(v); } catch (e) {} };
  book.addEventListener('load', () => { if (book.dataset.mounted !== '1') return; book.classList.add('ready'); frame.classList.add('loaded'); setPaused(!frame.dataset.visible); setTimeout(() => FX(true), 400); });
  new IntersectionObserver((entries) => { for (const en of entries) { if (en.isIntersecting && !book.dataset.mounted) { mountHostedPage(book, 'catalog.html'); } } }, { rootMargin: '100% 0px' }).observe(frame);
  new IntersectionObserver((entries) => { for (const en of entries) { frame.dataset.visible = en.isIntersecting ? '1' : ''; setPaused(!en.isIntersecting); } }, { threshold: 0.05 }).observe(frame);
  addEventListener('message', (e) => { if (e.data && e.data.type === 'mobel-book:back') document.getElementById('shop').scrollIntoView({ behavior: 'smooth' }); });
  const gFrame = document.getElementById('galFrame'), gal = document.getElementById('galBook');
  const setGalPaused = (v) => { try { gal.contentWindow && gal.contentWindow.__dbg && gal.contentWindow.__dbg.pause(v); } catch (e) {} };
  gal.addEventListener('load', () => { if (gal.dataset.mounted !== '1') return; gal.classList.add('ready'); gFrame.classList.add('loaded'); setGalPaused(!gFrame.dataset.visible); setTimeout(() => FX(true), 400); });
  new IntersectionObserver((entries) => { for (const en of entries) { if (en.isIntersecting && !gal.dataset.mounted) { mountHostedPage(gal, 'gallery.html'); } } }, { rootMargin: '100% 0px' }).observe(gFrame);
  new IntersectionObserver((entries) => { for (const en of entries) { gFrame.dataset.visible = en.isIntersecting ? '1' : ''; setGalPaused(!en.isIntersecting); } }, { threshold: 0.05 }).observe(gFrame);
  document.querySelectorAll('[data-scroll]').forEach(a => a.addEventListener('click', (e) => {
    e.preventDefault();
    const id = a.dataset.scroll;
    if (id === 'top') { scrollTo({ top: 0, behavior: REDUCE ? 'auto' : 'smooth' }); return; }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth' });
  }));
  new IntersectionObserver((entries) => { for (const en of entries) document.body.classList.toggle('onstory', en.isIntersecting); }, { rootMargin: '-60px 0px -85% 0px' }).observe(document.getElementById('story'));
}
/* ───────────────────────── loop ───────────────────────── */
const clock = new THREE.Clock(); let frames = 0, glShown = true, raf = 0;
function kickLoop() { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }
function frame() {
  raf = 0;
  if (document.hidden) return;
  const heroOn = inHeroView();
  if (heroOn !== glShown) { glShown = heroOn; renderer.domElement.style.visibility = heroOn ? '' : 'hidden'; }
  if (!heroOn && frames >= 2) { applyUI(); return; }
  const dt = Math.min(clock.getDelta(), 0.05);
  cur += (target - cur) * (1 - Math.exp(-dt * 8));
  if (Math.abs(target - cur) < 0.0001) cur = target;
  if (REDUCE) { mcur.x = mcur.y = 0; }
  else { mcur.x += (mouse.x - mcur.x) * (1 - Math.exp(-dt * 3)); mcur.y += (mouse.y - mcur.y) * (1 - Math.exp(-dt * 3)); }
  render(cur, REDUCE ? 0 : clock.elapsedTime);
  if (heroOn || Math.abs(target - cur) > 0.0001) raf = requestAnimationFrame(frame);
}
addEventListener('visibilitychange', () => { if (!document.hidden) kickLoop(); });
/* ── scroll-linked motion for everything below the hero (transforms + clip only) ── */
const FX = (() => {
  const $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
  const vp = (r, a, b) => clamp((innerHeight * a - r.top) / (innerHeight * (a - b)));
  const ease = (t) => 1 - Math.pow(1 - clamp(t), 3);
  const CAT_TURNS = 4, GAL_ROOMS = 6;
  const maskIn = (line, p) => { if (line) line.style.transform = `translate3d(0,${(1 - ease(p)) * 108}%,0)`; };
  const E = {};
  const grab = () => { E.shop = $('#shop'); E.shopHead = $('#shop .shop-head'); E.shopLine = $('#shop .shop-head .line'); E.shopP = $('#shop .shop-head p'); E.prods = $$('#shop .prod'); E.feat = $('#featured'); E.featImgs = $$('#featured .feat-img'); E.chaps = $$('#featured .chap'); E.featBar = $('#featured .feat-progress i'); E.catHead = $('#catalog .cat-head'); E.catLine = $('#catalog .cat-head .line'); E.catFrame = $('#catFrame'); E.catScroll = $('#catScroll'); E.catBook = $('#catBook'); E.galScroll = $('#galScroll'); E.galBook = $('#galBook'); E.matHead = $('#materials .mat-head'); E.matLine = $('#materials .mat-head .line'); E.matScroll = $('#matScroll'); E.matTrack = $('#matTrack'); E.matIdx = $('#matIdx'); E.story = $('#story'); E.storyImg = $('#story img'); E.galHead = $('#gallery .cat-head'); E.galLine = $('#gallery .cat-head .line'); E.galP = $('#gallery .cat-head p'); E.galFrame = $('#galFrame'); E.mark = $('.foot-mark'); E.footLines = $$('.foot-state .line'); };
  grab();
  let last = -1, lastW = -1;
  function update(force) {
    if (REDUCE) return;
    if (!force && scrollY === last && innerWidth === lastW) return; last = scrollY; lastW = innerWidth; const vh = innerHeight;
    if (scrollY < spacer.offsetHeight - vh * 1.5) return;
    { const r = E.shopHead.getBoundingClientRect(); maskIn(E.shopLine, vp(r, 0.98, 0.6)); const q = ease(vp(r, 0.92, 0.55)); E.shopP.style.opacity = q; E.shopP.style.transform = `translate3d(0,${(1 - q) * 18}px,0)`; }
    (E.prods || []).forEach((card, i) => { const r = card.getBoundingClientRect(); if (r.top > vh + 120 || r.bottom < -120) return; const st = (i % 3) * 0.05; const p = ease(vp(r, 1.0 + st, 0.66 + st)); card.querySelector('.img').style.transform = `translate3d(0,${(1 - p) * 64}px,0)`; const q = ease(vp(r, 0.94 + st, 0.58 + st)); const m = card.querySelector('.meta'); m.style.opacity = q; m.style.transform = `translate3d(0,${(1 - q) * 18}px,0)`; });
    // featured: chapters and imagery keyed to progress through the sticky section
    if (E.feat) { const r = E.feat.getBoundingClientRect(); if (r.bottom > -vh && r.top < vh * 2) { const p = clamp(-r.top / (r.height - vh)); const k = p * 3, n = E.chaps.length; const w = (i) => { const d = k - (i + 0.5); const dd = i === 0 ? Math.max(0, d) : (i === n - 1 ? Math.max(0, -d) : Math.abs(d)); return [clamp(1 - dd * 1.8), d]; }; E.chaps.forEach((c, i) => { const [a, d] = w(i); c.style.opacity = a; c.style.transform = `translate3d(0,${-d * 22}px,0)`; }); E.featImgs.forEach((im, i) => { const [a] = w(i); const f = clamp(k - i); im.style.opacity = a; im.style.transform = `scale(${1 + 0.07 * f}) translate3d(${-2.2 * f}%,${1.4 * f}%,0)`; }); E.featBar.style.transform = `scaleX(${p})`; } }
    // catalogue: title reveals on its own; the book is presented, scaling 0.94 → 1 as it arrives
    if (E.catFrame) { const rh = E.catHead.getBoundingClientRect(); maskIn(E.catLine, vp(rh, 0.98, 0.62)); const r = E.catFrame.getBoundingClientRect(); const p = ease(vp(r, 1.0, 0.42)); E.catFrame.style.transform = p >= 1 ? 'none' : `translate3d(0,${(1 - p) * 48}px,0) scale(${0.94 + 0.06 * p})`; }
    // catalogue (pinned): scroll progress turns a curated run of spreads through the book's own curl; its controls take over after
    if (E.catScroll) { const r = E.catScroll.getBoundingClientRect(); if (r.bottom > -vh && r.top < vh * 2) { const p = clamp(-r.top / (r.height - vh)); const w = E.catBook.contentWindow; if (w && w.__dbg && w.__dbg.scrub) w.__dbg.scrub(p * CAT_TURNS);  } }
    // spaces (pinned): scroll progress slides the strip through the first rooms; a drag is still free to browse further
    if (E.galScroll) { const r = E.galScroll.getBoundingClientRect(); if (r.bottom > -vh && r.top < vh * 2) { const p = clamp(-r.top / (r.height - vh)); const w = E.galBook.contentWindow; if (w && w.__dbg && w.__dbg.scroll) w.__dbg.scroll(p * GAL_ROOMS);  } }
    // materials: heading mask, then the horizontal sequence follows vertical scroll
    if (E.matScroll) { const rh = E.matHead.getBoundingClientRect(); maskIn(E.matLine, vp(rh, 0.98, 0.62)); const r = E.matScroll.getBoundingClientRect(); if (r.bottom > -vh && r.top < vh * 2) { const n = E.matTrack.children.length; const p = clamp(-r.top / (r.height - vh)); E.matTrack.style.transform = `translate3d(${(-p * (n - 1) * innerWidth).toFixed(1)}px,0,0)`; const idx = Math.min(n - 1, Math.floor(p * n + 0.001)); if (E.matIdx.dataset.i != idx) { E.matIdx.dataset.i = idx; E.matIdx.textContent = `0${idx + 1} / 0${n}`; } } }
    // lifestyle: the image drifts slower than the page and settles from 1.04 to 1
    if (E.story) { const r = E.story.getBoundingClientRect(); if (r.bottom > 0 && r.top < vh) { const p = clamp((vh - r.top) / (vh + r.height)); E.storyImg.style.transform = `translate3d(0,${((p - 0.5) * -12).toFixed(2)}%,0) scale(${(1.03 - 0.03 * clamp(p * 1.5)).toFixed(4)})`; } }
    // spaces: heading mask, the intro line follows, then the gallery frame arrives like the catalogue (0.94 → 1)
    if (E.galFrame) { const rh = E.galHead.getBoundingClientRect(); maskIn(E.galLine, vp(rh, 0.98, 0.62)); const q = ease(vp(rh, 0.92, 0.56)); E.galP.style.opacity = q; E.galP.style.transform = `translate3d(0,${(1 - q) * 18}px,0)`; const r = E.galFrame.getBoundingClientRect(); const p = ease(vp(r, 1.0, 0.42)); E.galFrame.style.transform = p >= 1 ? 'none' : `translate3d(0,${(1 - p) * 48}px,0) scale(${0.94 + 0.06 * p})`; }
    // footer: statement mask, then the wordmark is unclipped from the bottom as it enters
    if (E.mark) { const rs = $('.foot-state').getBoundingClientRect(); E.footLines.forEach((l, i) => maskIn(l, vp(rs, 0.98 - i * 0.03, 0.66 - i * 0.03))); const r = E.mark.getBoundingClientRect(); const p = ease(vp(r, 1.0, 0.62)); E.mark.style.clipPath = `inset(${((1 - p) * 100).toFixed(2)}% 0 0 0)`; E.mark.style.transform = `translate3d(0,${((1 - p) * 10).toFixed(2)}%,0)`; }
  };
  update.refresh = grab;
  return update;
})();
let lastShadowP = -1;
let lastSig = '', forceFull = true, lastGrainInput = null;
{ const gr = grainPass.render.bind(grainPass); grainPass.render = function (rd, wb, rb, dt, mask) { lastGrainInput = rb; gr(rd, wb, rb, dt, mask); }; }
function render(prog, time) {
  const p = clamp(prog / F), tour = clamp((prog - F) / (1 - F));
  applyItems(p, tour);
  applyLights(p, tour);
  applyCamera(p, tour);
  applyUI();
  grainPass.uniforms.uTime.value = time;
  grainPass.uniforms.uAmt.value = REDUCE ? 0 : 0.007;
  if (Math.abs(prog - lastShadowP) > 0.00002) { renderer.shadowMap.needsUpdate = true; lastShadowP = prog; }
  const pm = camera.projectionMatrix.elements, sig = `${prog.toFixed(5)}|${mcur.x.toFixed(4)}|${mcur.y.toFixed(4)}|${stageB.length}|${pm[0].toFixed(4)}|${pm[8].toFixed(4)}|${pm[9].toFixed(4)}`;
  if (forceFull || window.__fullAlways || sig !== lastSig || !lastGrainInput || frames < 3) { const tc = performance.now(); composer.render(); lastSig = sig; forceFull = false; const cost = performance.now() - tc; costEma = costEma ? costEma * 0.92 + cost * 0.08 : cost;
    if (!quality4k && !dropped && frames > 90 && costEma > 26 && DPR > 1) { dropped = true; DPR = 1; renderer.setPixelRatio(1); composer.setPixelRatio(1); composer.setSize(innerWidth, innerHeight); grainPass.uniforms.uTexel.value.set(1 / innerWidth, 1 / innerHeight); fxaa.material.uniforms.resolution.value.set(1 / innerWidth, 1 / innerHeight); forceFull = true; console.info('MØBEL: pixel ratio lowered to 1 for smoothness'); }
    if (window.__probe) { const gl = renderer.getContext(), Wd = gl.drawingBufferWidth, Hd = gl.drawingBufferHeight, px = new Uint8Array(8 * 8 * 4); let s = 0, n = 0; for (let gy = 0; gy < 8; gy++) for (let gx = 0; gx < 12; gx++) { gl.readPixels(Math.floor(Wd * (gx + 0.5) / 12), Math.floor(Hd * (gy + 0.5) / 8), 8, 8, gl.RGBA, gl.UNSIGNED_BYTE, px); for (let i = 0; i < px.length; i += 4) { s += px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114; n++; } } window.__probe.push([performance.now(), prog, s / n]); } }
  else grainPass.render(renderer, null, lastGrainInput, 0, false);   // idle: the frame is unchanged, only the grain moves
  if (++frames === 2) { renderer.domElement.classList.add('on'); window.__loadMs = performance.now(); setTimeout(buildCatalogue, 500); setTimeout(() => { document.getElementById('poster').style.display = 'none'; }, 1600); }
}
// deterministic hooks for verification: ?p=0.5 or window.__go(0.5)
window.__go = (p) => { while (stageB.length) runStage(); forceFull = true; target = cur = clamp(p); scrollTo(0, cur * maxScroll()); target = cur; render(cur, 1); render(cur, 1); return new Promise(r => requestAnimationFrame(() => r(cur))); };
window.__dbg = { scene, sun, hemi, windowLight, refl, backdrop, camera, items, THREE, leatherMat, gtao, floorMat, FX, get chairA() { return chairA; }, get sofa() { return sofa; }, get pending() { return stageB.length; }, full(v) { window.__fullAlways = !!v; forceFull = true; } };
window.__state = () => ({ p: cur, items: items.map(i => ({ vis: i.obj.visible, y: i.obj.position.y })), lights: chand && kitchen ? [sun.intensity, chand.userData.lights[0].intensity, kitchen.userData.light.intensity] : [sun.intensity] });
if (Q.has('p')) { const p = clamp(Number(Q.get('p'))); requestAnimationFrame(() => { scrollTo(0, p * maxScroll()); target = cur = p; }); }
if (Q.has('nomouse')) { addEventListener('mousemove', (e) => { mouse.x = mouse.y = 0; }, true); }
renderer.domElement.dataset.materialSize=String(materialSize);renderer.domElement.dataset.quality=quality4k?'4k':'adaptive';
mark('scene');
while (stageB.length > 1) runStage(); mark('stages');
warmUp().then(() => { mark('compile'); const slow = (_T.compile - _T.stages) > 1400 || _T.compile > 7000; if (slow) { stageB.length = 0; if (!quality4k && DPR > 1) { dropped = true; DPR = 1; renderer.setPixelRatio(1); composer.setPixelRatio(1); composer.setSize(innerWidth, innerHeight); grainPass.uniforms.uTexel.value.set(1 / innerWidth, 1 / innerHeight); fxaa.material.uniforms.resolution.value.set(1 / innerWidth, 1 / innerHeight); } console.info('MØBEL: slow device, lighter path'); } else runStage(); mark('bake'); kickLoop(); setTimeout(saveTexCache, 4000); });
}
const startInit = () => Promise.all([loadTexCache(),loadMaterialImages()]).then(() => requestAnimationFrame(() => requestAnimationFrame(init)));
if (window.__ldStart) window.__ldStart.then(startInit); else startInit();
  
