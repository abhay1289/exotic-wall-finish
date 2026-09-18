
import * as THREE from 'three';

/* embedded inside the MØBEL site?  (see the note at the top of the file) */
const EMBED = document.documentElement.classList.contains('embed');

/* ═══════════════════════════════════════════════════════════════
   1.  CONTENT SPEC — images, copy, and the page list
   ------------------------------------------------------------------
   Everything editorial lives in this section.  Replace the photography
   by dropping files into ./assets/mobel/ (names below), or by passing
   window.MOBEL_CONFIG = { assetBase, images:{ key: url } } before this
   script runs (the React wrapper does that for you).
   ═══════════════════════════════════════════════════════════════ */
const CONFIG = Object.assign({
  assetBase:new URL('../images/catalog/', import.meta.url).href,
  images:{},              // per-slot URL overrides — always win
  useLocalAssets:true,   // true → try assetBase + file before Unsplash
  unsplash:false           // false → skip Unsplash entirely (drawn placeholders)
}, window.MOBEL_CONFIG || {});

/* Every photograph slot.
     file      the local file name, used when CONFIG.useLocalAssets is on
     w, h      the size requested (Unsplash crops server-side to this box);
               also the aspect the final photograph should be cut to
     ph        which procedural placeholder to draw if every source fails
     unsplash  the Unsplash photo id used as stand-in photography
     by, at    photographer and handle, credited on the colophon page
   Replace `unsplash` with your own shot by dropping a file into
   ./assets/mobel/ and setting useLocalAssets, or by passing a URL through
   CONFIG.images — the layouts do not change.                             */
const IMAGES = {
  coverTile:  { file:'00-cover-tile.webp',       w:1200, h:1500, ph:'cover',  alt:'Modern Minimalist, cover still',
                unsplash:'photo-1519961655809-34fa156820ff', by:'Hutomo Abrianto',    at:'hutomoabrianto' },
  room:       { file:'01-collection-room.webp',  w:1200, h:1600, ph:'room',   alt:'The full plastered room',
                unsplash:'photo-1583847268964-b28dc8f51f92', by:'Minh Pham',          at:'minhphamdesign' },
  formaSofa:  { file:'02-forma-sofa.webp',       w:1200, h:1600, ph:'sofa',   alt:'Venetian Gold',
                unsplash:'photo-1684165610413-2401399e0e59', by:'Kevin Shek',         at:'kevinshek' },
  arcTable:   { file:'03-arc-table.webp',        w:1200, h:1600, ph:'table',  alt:'Textured Elegance',
                unsplash:'photo-1565791380713-1756b9a05343', by:'Hannah Busing',      at:'hannahbusing' },
  arcDetail:  { file:'03-arc-table-detail.webp', w:1200, h:1400, ph:'stone',  alt:'Textured Elegance — lime plaster detail',
                unsplash:'photo-1606208594041-3dfd470247ce', by:'Maxim Simonov',      at:'ficklesupreme' },
  coveChair:  { file:'04-cove-chair.webp',       w:1200, h:1600, ph:'chair',  alt:'Modern Minimalist, full-bleed page',
                unsplash:'photo-1554104683-c7063687d649', by:'Ellen Qin',          at:'ellenqin' },
  matBoucle:  { file:'05-material-boucle.webp',  w:1200, h:1200, ph:'boucle', alt:'Marmorino, macro',
                unsplash:'photo-1768946131690-247c5319f0d8', by:'Caroline Badran',    at:'___atmos' },
  matOak:     { file:'05-material-oak.webp',     w:1200, h:1200, ph:'oak',    alt:'Lime plaster, macro',
                unsplash:'photo-1644931551533-02906718127f', by:'engin akyurt',       at:'enginakyurt' },
  matStone:   { file:'05-material-stone.webp',   w:1200, h:1600, ph:'stone',  alt:'Venetian plaster, macro',
                unsplash:'photo-1603369425250-b276f2006ec0', by:'the blowup',         at:'theblowup' },
  matWool:    { file:'05-material-wool.webp',    w:1200, h:1200, ph:'wool',   alt:'Lime wash, macro',
                unsplash:'photo-1643313262763-4056bfa99dd7', by:'engin akyurt',       at:'enginakyurt' },
  matCraft:   { file:'05-material-craft.webp',   w:1200, h:1200, ph:'craft',  alt:'Trowel craft, detail',
                unsplash:'photo-1497219055242-93359eeed651', by:'Dominik Scythe',     at:'drscythe' },
  living:     { file:'06-living-space.webp',     w:2400, h:1700, ph:'living', alt:'The living space (spans the spread)',
                unsplash:'photo-1724582586529-62622e50c0b3', by:'Prydumano Design',   at:'prydumanodesign' },
};
const CREDITS = [...new Set(Object.values(IMAGES).map(s => s.by).filter(Boolean))];

const COPY = {
  brand:      'EXOTIC',
  season:     'Finishes 2026',
  tagline:    'Bringing walls to life.',
  coverNote:  'Venetian plaster, Marmorino, lime wash — and the materials they are made of. Designed in the studio, made in Miami.',
  intro1:     'The 2026 finishes are a small number of plasters made to live in the same room. Venetian plaster, Marmorino, lime wash — and the materials that hold them together: Italian lime, marble dust, time.',
  intro2:     'Every finish is designed in our Miami studio and applied by Gian Carlo Sagasti, Novacolor Global Ambassador, who has done one thing for a very long time. Nothing here is in a hurry.',
  index: [['01','Venetian Gold','04'],['02','Textured Elegance','06'],['03','Modern Minimalist','08'],['04','Materials','10'],['05','The Living Space','12']],

  forma: {
    label:'Venetian Gold', no:'01', type:'Finish',
    head:['Soft geometry.','Mineral glow.'],
    body:'Venetian Gold is aesthetic Marmorino, built from a few mineral layers. The trowel rolls into the wall; the surface gives a hand’s width of depth when the light sits. Underneath, slaked lime and marble dust carry the softness so it lasts. Burnished to a glow, it wears in rather than out.',
    specs:[['Design','Studio Exotic, 2025'],['Base','Italian slaked lime'],['Finish','Marmorino · gold veins'],['Application','Hand-troweled, Miami']],
    caption:'Venetian Gold — aesthetic Marmorino, gold veins'
  },
  arc: {
    label:'Textured Elegance', no:'02', type:'Finish',
    head:['A line,','held still.'],
    body:'Textured Elegance rests a hand-troweled lime wash on a prepared wall. The plaster is honed rather than polished, so the light stays in it. It is a finish to live with, work against, and leave marks on.',
    specs:[['Design','Studio Exotic, 2025'],['Top','Lime wash, honed'],['Base','Italian lime putty'],['Application','Hand-troweled, Miami']],
    detail:'Detail — lime plaster, honed, edge softened by hand.',
    caption:'Textured Elegance — lime wash and marble dust'
  },
  cove: {
    label:'Modern Minimalist', no:'03', type:'Finish',
    head:['Sit inside it.'],
    body:'A shell of smooth mineral plaster that curves up around the room and a surface that gives a little. Modern Minimalist is the finish you take to the window — light enough to live with, deep enough to stay.',
    specs:[['Design','Studio Exotic, 2026'],['Shell','Micro-filtered lime'],['Finish','Smooth mineral · Chalk'],['Application','Hand-troweled, Miami']]
  },
  materials: {
    label:'Materials', no:'04',
    head:['What it is','made of.'],
    body:'We work with a short list of materials and learn them well. Each is chosen to age: lime carbonizes, Marmorino softens, plaster keeps its marks.',
    note:'Plasters are mixed from Italian lime putty and marble dust. Walls are prepared, troweled and burnished in South Florida humidity. Carbonization hardens the finish beyond a season.',
    captions:{ boucle:'Marmorino — gold veins', oak:'Lime — natural oil', stone:'Venetian plaster — Classico', wool:'Lime wash — Slate', craft:'Trowel craft, hand-finished' }
  },
  living: { label:'The Living Space', no:'05', line:'Venetian Gold, Textured Elegance, Modern Minimalist. One room.' },
  close:  { head:['Made to','live together.'], colophon:['Bringing walls to life.','Designed in the studio. Made in Miami.','© 2026 Exotic Wall Finishes'],
            credit:'Stand-in photography from Unsplash — ' }
};

/* ═══════════════════════════════════════════════════════════════
   2.  PALETTE
   ═══════════════════════════════════════════════════════════════ */
const T = {
  board1:'#a89f91', board2:'#958b7c', board3:'#736a5d',
  paper:'#f3efe8',
  ink:'#1d1b18', inkSoft:'#8b867d', folio:'#9d978d', white:'#f7f3ec',
  rule:'rgba(29,27,24,.16)',
  shade:'20,16,10',
  lift:'255,252,246',
  edgeBase:'#cfc8bb', edgeLeaf:[236,231,221]
};

/* ═══════════════════════════════════════════════════════════════
   3.  DESIGN CONSTANTS   (units = px of a 3456×1924 reference frame)
   ═══════════════════════════════════════════════════════════════ */
const FR_H = 1924;
const PAGE_W = 1076, PAGE_H = 1537;
const BOARD  = 46;                              // board overhang at the fore-edge
const BOOK_W = PAGE_W*2 + BOARD*2;              // 2244
const BOOK_H = PAGE_H + 22 + 52;                // 1611
const COVER_R = 15;
const PAGE_TOP_Y  =  BOOK_H/2 - 22;
const PAGE_BOT_Y  = -BOOK_H/2 + 52;
const BOOK_OFF_Y  = 0;
const MIN_PX      = 11;                         // body type never renders smaller
const BODY_BASE   = 26;

/* the editorial grid (page-local, y down, origin = page top-left) */
const M = { out:96, in:84, top:150, foot:PAGE_H-88 };

const F_SANS  = '"Inter Tight",Inter,-apple-system,"Helvetica Neue",Arial,sans-serif';
const F_SERIF = '"Instrument Serif","Cormorant Garamond",Georgia,"Times New Roman",serif';

/* ═══════════════════════════════════════════════════════════════
   4.  TYPE PRIMITIVES
   ═══════════════════════════════════════════════════════════════ */
function font(ctx, o){
  o = o || {};
  ctx.font = `${o.i ? 'italic ' : ''}${o.w || 400} ${o.s || BODY_BASE}px ${o.f || F_SANS}`;
}
function wrap(ctx, text, maxW){
  const out = [];
  for(const parag of String(text).split('\n')){
    const words = parag.split(' ');
    let line = '';
    for(const wd of words){
      const t = line ? line + ' ' + wd : wd;
      if(ctx.measureText(t).width > maxW && line){ out.push(line); line = wd; }
      else line = t;
    }
    out.push(line);
  }
  return out;
}
/* small tracked caps — the catalogue's labelling voice */
function label(ctx, text, x, y, o){
  o = o || {};
  ctx.save();
  font(ctx, {w:o.w || 500, s:o.s || 19});
  ctx.letterSpacing = `${o.track != null ? o.track : 3.2}px`;
  ctx.fillStyle = o.color || T.inkSoft;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(String(text).toUpperCase(), x, y);
  ctx.restore();
}
/* serif headline, one array entry per line; returns the y after the block */
function display(ctx, lines, x, y, o){
  o = o || {};
  ctx.save();
  const s = o.s || 96;
  font(ctx, {w:400, s, f:F_SERIF, i:o.i});
  ctx.letterSpacing = `${o.track != null ? o.track : -1}px`;
  ctx.fillStyle = o.color || T.ink;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = 'alphabetic';
  const lh = o.lh || s*1.04;
  lines.forEach((l,i) => ctx.fillText(l, x, y + i*lh));
  ctx.restore();
  return y + lines.length*lh;
}
/* ragged-right body copy; returns the y after the block */
function para(ctx, text, x, y, w, o){
  o = o || {};
  ctx.save();
  const s = o.s || BODY_BASE, lh = o.lh || Math.round(s*1.5);
  font(ctx, {w:o.w || 400, s});
  ctx.letterSpacing = '0px';
  ctx.fillStyle = o.color || T.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const lines = wrap(ctx, text, w);
  if(o.align === 'center'){ ctx.textAlign = 'center'; x += w/2; }
  lines.forEach((l,i) => ctx.fillText(l, x, y + i*lh));
  ctx.restore();
  return y + lines.length*lh;
}
function rule(ctx, x, y, w, color){
  ctx.save();
  ctx.strokeStyle = color || T.rule;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y+0.5); ctx.lineTo(x+w, y+0.5); ctx.stroke();
  ctx.restore();
}
/* key / value rows with hairlines — product details */
function specs(ctx, rows, x, y, w, o){
  o = o || {};
  const rh = o.rh || 46, kw = o.kw || 210;
  rows.forEach(([k,v],i) => {
    const yy = y + i*rh;
    label(ctx, k, x, yy, {s:15, track:2.4});
    ctx.save();
    font(ctx, {s:o.s || 22});
    ctx.letterSpacing = '0px';
    ctx.fillStyle = T.ink; ctx.textAlign = 'left';
    ctx.fillText(v, x + kw, yy);
    ctx.restore();
    rule(ctx, x, yy + 14, w);
  });
  return y + rows.length*rh;
}
/* the contents list on the introduction page */
function indexList(ctx, rows, x, y, w){
  const rh = 46;
  rows.forEach(([n,name,pg],i) => {
    const yy = y + i*rh;
    label(ctx, n, x, yy, {s:15, track:2.4});
    ctx.save();
    font(ctx, {s:23}); ctx.letterSpacing = '0px';
    ctx.fillStyle = T.ink; ctx.textAlign = 'left';
    ctx.fillText(name, x + 64, yy);
    ctx.fillStyle = T.inkSoft; ctx.textAlign = 'right';
    font(ctx, {s:19, w:500});
    ctx.fillText(pg, x + w, yy);
    ctx.restore();
    rule(ctx, x, yy + 14, w);
  });
  return y + rows.length*rh;
}
/* the largest size at which `text` fits `maxW` */
function fitSize(ctx, text, maxW, size, o){
  font(ctx, Object.assign({}, o, {s:100}));
  ctx.letterSpacing = `${(o && o.trackEm || 0)*100}px`;
  const w100 = ctx.measureText(text).width;
  return Math.min(size, maxW / w100 * 100);
}
/* a caption set on its side in the gutter of a bleed page */
function gutterCaption(ctx, text, recto){
  ctx.save();
  ctx.translate(recto ? 44 : PAGE_W - 30, PAGE_H - 120);
  ctx.rotate(-Math.PI/2);
  label(ctx, text, 0, 0, {s:15, track:3});
  ctx.restore();
}
function pad2(n){ return (n < 10 ? '0' : '') + n; }

/* page geometry: the outer margin is on the left of a verso, the right of a recto */
function geom(index){
  const recto = index % 2 === 1;
  const x0 = recto ? M.in : M.out;
  const x1 = recto ? PAGE_W - M.out : PAGE_W - M.in;
  return { recto, x0, x1, w: x1 - x0 };
}

/* ═══════════════════════════════════════════════════════════════
   5.  IMAGES — loading, cover-fitting, and procedural placeholders
   ═══════════════════════════════════════════════════════════════ */
const IMG = {};   // key → { src:CanvasImageSource, w, h, placeholder:bool }

/* Sources are tried in order; the first that decodes wins.  A slot with no
   working source keeps the drawn placeholder, so one dead URL costs one
   photograph rather than the whole book.                                  */
function sourcesFor(key, spec){
  const list = [];
  if(CONFIG.images[key]) list.push(CONFIG.images[key]);
  if(CONFIG.useLocalAssets) list.push(CONFIG.assetBase + spec.file);
  if(CONFIG.unsplash && spec.unsplash){
    list.push(CONFIG.assetBase + spec.file);
  }
  return list;
}

function taints(src){
  try{
    const c = document.createElement('canvas'); c.width = c.height = 2;
    const g = c.getContext('2d'); g.drawImage(src, 0, 0, 2, 2); g.getImageData(0,0,1,1);
    return false;
  }catch(e){ return true; }
}

/* Decode through a blob rather than assigning to img.src directly.
   images.unsplash.com sends `access-control-allow-origin: *` but no
   `Vary: Origin`, so a cached non-CORS copy of the same URL can be reused
   for a CORS request and taint the page canvas — which then throws inside
   gl.texImage2D and kills the book.  Blob-backed bitmaps are same-origin
   and can never taint.                                                    */
async function decode(url, signal){
  const res = await fetch(url, {mode:'cors', credentials:'omit', signal});
  if(!res.ok) throw new Error('HTTP ' + res.status);
  const blob = await res.blob();
  if(typeof createImageBitmap === 'function') return await createImageBitmap(blob);
  const obj = URL.createObjectURL(blob);
  return await new Promise((ok, no) => {
    const im = new Image();
    im.onload  = () => { URL.revokeObjectURL(obj); ok(im); };
    im.onerror = () => { URL.revokeObjectURL(obj); no(new Error('decode failed')); };
    im.src = obj;
  });
}

let loaded = 0;
const bootEl = document.getElementById('boot');
function bootProgress(){
  if(bootEl && !bootEl.classList.contains('gone')){
    bootEl.textContent = `Preparing the finishes… ${loaded}/${Object.keys(IMAGES).length}`;
  }
}

async function loadOne(key, spec){
  for(const url of sourcesFor(key, spec)){
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20000);
    try{
      const src = await decode(url, ctl.signal);
      if(taints(src)) throw new Error('canvas would taint');
      IMG[key] = { src, w:src.width, h:src.height, placeholder:false };
      loaded++; bootProgress();
      repaintPages();
      return true;
    }catch(err){
      console.info(`[MØBEL] ${key}: ${url.split('?')[0]} — ${err.message}`);
    }finally{ clearTimeout(timer); }
  }
  // nothing loaded: draw the procedural stand-in for this slot
  const c = placeholder(spec.ph, spec.w, spec.h, spec.file);
  IMG[key] = { src:c, w:c.width, h:c.height, placeholder:true };
  loaded++; bootProgress();
  repaintPages();
  console.info(`[MØBEL] ${key}: using drawn placeholder (${spec.file})`);
  return false;
}

/* A flat warm wash stands in until a photograph lands, so the book paints
   immediately instead of waiting on the network. */
function wash(){
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0,0,16,16);
  gr.addColorStop(0,'#e4dcd1'); gr.addColorStop(1,'#cdc4b6');
  g.fillStyle = gr; g.fillRect(0,0,16,16);
  return c;
}
function loadImages(){
  const w = wash();
  for(const k of Object.keys(IMAGES)) IMG[k] = { src:w, w:16, h:16, placeholder:true, pending:true };
  return Promise.all(Object.entries(IMAGES).map(([k,s]) => loadOne(k,s)));
}

/* Photographs arrive after the first paint, so the mounted pages are
   redrawn as they land — never while a leaf is mid-turn, which would swap
   the artwork out from under the curl. */
let repaintTimer = null;
function repaintPages(){
  clearTimeout(repaintTimer);
  repaintTimer = setTimeout(() => {
    if(!PAGES.length) return;
    if(turn || fade !== null){ repaintPages(); return; }
    for(const p of pool){ p.page = -1; p.used = 0; }
    applyBase();
  }, 160);
}

/* draw image `key` cover-fitted into `box` (page units).  o.span = 'left' |
   'right' makes the image run across the whole spread, this page showing
   its half.  o.fx / o.fy pick the focal point kept in frame.            */
function image(ctx, key, box, o){
  o = o || {};
  const im = IMG[key]; if(!im) return;
  const spanW = o.span ? PAGE_W*2 : box.w;
  const ox = o.span === 'right' ? PAGE_W : 0;
  const s = Math.max(spanW/im.w, box.h/im.h);
  const dw = im.w*s, dh = im.h*s;
  const fx = o.fx != null ? o.fx : .5, fy = o.fy != null ? o.fy : .5;
  const dx = box.x - ox + (spanW - dw)*fx;
  const dy = box.y + (box.h - dh)*fy;
  ctx.save();
  ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
  ctx.drawImage(im.src, dx, dy, dw, dh);
  // a whisper of print grain over the photograph, 1:1 with texels
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = .16;
  ctx.fillStyle = grainPattern;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillRect(box.x*TQ, box.y*TQ, box.w*TQ, box.h*TQ);
  ctx.restore();
}

/* ---- placeholders: quiet studio still-lifes, drawn once at boot ---- */
let phSeed = 7;
const rnd = () => (phSeed = (phSeed*1103515245 + 12345) & 0x7fffffff)/0x7fffffff;
function hex2rgb(h){ const n = parseInt(h.slice(1),16); return [n>>16&255, n>>8&255, n&255]; }
function mixHex(a, b, t){
  const A = hex2rgb(a), B = hex2rgb(b);
  return `rgb(${A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')})`;
}
function rr(g,x,y,w,h,r){
  r = Math.min(r, w/2, h/2);
  g.beginPath();
  g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r);
  g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath();
}
/* a blurred shadow of `path`, drawn without the shape itself */
function softShadow(g, path, color, blur, oy){
  g.save();
  g.shadowColor = color; g.shadowBlur = blur;
  g.shadowOffsetX = 10000; g.shadowOffsetY = oy || 0;
  g.translate(-10000, 0);
  g.fillStyle = '#000';
  path(g); g.fill();
  g.restore();
}
function backdrop(g, w, h, wall, floor, horizon){
  const fy = h*(horizon == null ? .66 : horizon);
  g.fillStyle = wall; g.fillRect(0,0,w,h);
  const fg = g.createLinearGradient(0,fy,0,h);
  fg.addColorStop(0, floor); fg.addColorStop(1, mixHex(floor,'#000000',.14));
  g.fillStyle = fg; g.fillRect(0,fy,w,h-fy);
  const lg = g.createRadialGradient(w*.22,h*.05,0, w*.22,h*.05, w*1.05);
  lg.addColorStop(0,'rgba(255,248,236,.40)'); lg.addColorStop(1,'rgba(255,248,236,0)');
  g.fillStyle = lg; g.fillRect(0,0,w,h);
  const sg = g.createLinearGradient(0,fy-h*.03,0,fy+h*.07);
  sg.addColorStop(0,'rgba(0,0,0,0)'); sg.addColorStop(.45,'rgba(0,0,0,.09)'); sg.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle = sg; g.fillRect(0,fy-h*.03,w,h*.10);
  return fy;
}
function finishPlate(g, w, h, file){
  // vignette + grain, then the replace-me note
  const vg = g.createRadialGradient(w*.5,h*.5,Math.min(w,h)*.35, w*.5,h*.5, Math.max(w,h)*.8);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.22)');
  g.fillStyle = vg; g.fillRect(0,0,w,h);
  g.save();
  g.globalCompositeOperation = 'overlay'; g.globalAlpha = .28;
  g.fillStyle = grainPattern; g.fillRect(0,0,w,h);
  g.restore();
  g.save();
  g.font = `500 ${Math.round(Math.min(w,h)*0.013)}px ${F_SANS}`;
  g.letterSpacing = '2px';
  g.fillStyle = 'rgba(0,0,0,.34)';
  g.textAlign = 'right'; g.textBaseline = 'alphabetic';
  g.fillText('PLACEHOLDER · ' + file.toUpperCase(), w - Math.round(w*.03), h - Math.round(h*.028));
  g.restore();
}
function sofaShape(g, cx, cy, s, tone){
  const h = s*.44, x = cx - s/2, y = cy - h/2;
  softShadow(g, q => { rr(q, x+s*.02, y+h*.86, s*.96, h*.18, s*.04); }, 'rgba(0,0,0,.34)', s*.05, s*.02);
  const back = g.createLinearGradient(0,y,0,y+h*.6);
  back.addColorStop(0, mixHex(tone,'#ffffff',.18)); back.addColorStop(1, mixHex(tone,'#000000',.06));
  g.fillStyle = back; rr(g, x+s*.07, y, s*.86, h*.58, s*.06); g.fill();
  for(const [ax] of [[x],[x+s*.9]]){
    const arm = g.createLinearGradient(ax,0,ax+s*.1,0);
    arm.addColorStop(0, mixHex(tone,'#ffffff',.10)); arm.addColorStop(1, mixHex(tone,'#000000',.10));
    g.fillStyle = arm; rr(g, ax, y+h*.22, s*.10, h*.66, s*.05); g.fill();
  }
  for(const sx of [x+s*.09, x+s*.505]){
    const seat = g.createLinearGradient(0,y+h*.5,0,y+h*.85);
    seat.addColorStop(0, mixHex(tone,'#ffffff',.26)); seat.addColorStop(1, mixHex(tone,'#000000',.02));
    g.fillStyle = seat; rr(g, sx, y+h*.50, s*.405, h*.34, s*.035); g.fill();
  }
  g.fillStyle = mixHex(tone,'#000000',.22); rr(g, x+s*.04, y+h*.84, s*.92, h*.14, s*.02); g.fill();
}
function tableShape(g, cx, cy, s, stone, oak){
  const th = s*.05, R = s*.24;
  softShadow(g, q => { q.beginPath(); q.ellipse(cx, cy+th+R*1.02, s*.42, s*.03, 0, 0, 6.2832); }, 'rgba(0,0,0,.38)', s*.06, s*.01);
  // base — an arch of steam-bent oak
  const og = g.createLinearGradient(cx-R,0,cx+R,0);
  og.addColorStop(0, mixHex(oak,'#000000',.20)); og.addColorStop(.5, mixHex(oak,'#ffffff',.12)); og.addColorStop(1, mixHex(oak,'#000000',.24));
  g.fillStyle = og;
  g.beginPath();
  g.arc(cx, cy+th, R, 0, Math.PI, false);
  g.arc(cx, cy+th, R*.72, Math.PI, 0, true);
  g.closePath(); g.fill();
  // the slab
  const sg = g.createLinearGradient(0,cy-th,0,cy+th);
  sg.addColorStop(0, mixHex(stone,'#ffffff',.30)); sg.addColorStop(.5, stone); sg.addColorStop(1, mixHex(stone,'#000000',.18));
  g.fillStyle = sg; rr(g, cx-s/2, cy-th*.4, s, th*1.4, th*.5); g.fill();
  // a few travertine pits along the edge
  g.fillStyle = 'rgba(0,0,0,.14)';
  for(let i=0;i<60;i++){ g.beginPath(); g.ellipse(cx-s/2+rnd()*s, cy+th*.2+rnd()*th*.8, s*.004+rnd()*s*.006, s*.002+rnd()*s*.003, 0, 0, 6.2832); g.fill(); }
}
function chairShape(g, cx, cy, s, shell, cushion, oak){
  softShadow(g, q => { q.beginPath(); q.ellipse(cx, cy+s*.62, s*.42, s*.05, 0, 0, 6.2832); }, 'rgba(0,0,0,.36)', s*.07, s*.01);
  // legs
  g.strokeStyle = mixHex(oak,'#000000',.25); g.lineWidth = s*.016; g.lineCap = 'round';
  for(const [lx,lx2] of [[-.36,-.44],[-.14,-.18],[.14,.18],[.36,.44]]){
    g.beginPath(); g.moveTo(cx+s*lx, cy+s*.28); g.lineTo(cx+s*lx2, cy+s*.62); g.stroke();
  }
  // shell
  const sg = g.createLinearGradient(cx-s*.5,0,cx+s*.5,0);
  sg.addColorStop(0, mixHex(shell,'#ffffff',.22)); sg.addColorStop(.55, shell); sg.addColorStop(1, mixHex(shell,'#000000',.22));
  g.fillStyle = sg;
  g.beginPath();
  g.moveTo(cx-s*.5, cy+s*.12);
  g.bezierCurveTo(cx-s*.56, cy-s*.42, cx+s*.56, cy-s*.42, cx+s*.5, cy+s*.12);
  g.lineTo(cx+s*.5, cy+s*.24);
  g.quadraticCurveTo(cx, cy+s*.44, cx-s*.5, cy+s*.24);
  g.closePath(); g.fill();
  // the inside of the shell falls into shadow
  const ig = g.createLinearGradient(0,cy-s*.3,0,cy+s*.2);
  ig.addColorStop(0,'rgba(0,0,0,.30)'); ig.addColorStop(1,'rgba(0,0,0,.02)');
  g.fillStyle = ig;
  g.beginPath();
  g.moveTo(cx-s*.42, cy+s*.12);
  g.bezierCurveTo(cx-s*.46, cy-s*.30, cx+s*.46, cy-s*.30, cx+s*.42, cy+s*.12);
  g.closePath(); g.fill();
  // cushion
  const cg = g.createLinearGradient(0,cy+s*.06,0,cy+s*.3);
  cg.addColorStop(0, mixHex(cushion,'#ffffff',.18)); cg.addColorStop(1, mixHex(cushion,'#000000',.15));
  g.fillStyle = cg;
  g.beginPath(); g.ellipse(cx, cy+s*.19, s*.43, s*.13, 0, 0, 6.2832); g.fill();
}
function lampShape(g, x, yTop, yBase, s){
  g.strokeStyle = 'rgba(40,34,28,.55)'; g.lineWidth = s*.012; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x, yBase); g.lineTo(x, yTop+s*.12); g.stroke();
  g.fillStyle = 'rgba(40,34,28,.55)'; g.beginPath(); g.ellipse(x, yBase, s*.09, s*.02, 0, 0, 6.2832); g.fill();
  const hg = g.createLinearGradient(0,yTop,0,yTop+s*.14);
  hg.addColorStop(0,'#efe6d6'); hg.addColorStop(1,'#d9cdb8');
  g.fillStyle = hg;
  g.beginPath(); g.moveTo(x-s*.14, yTop+s*.14); g.lineTo(x+s*.14, yTop+s*.14); g.lineTo(x+s*.08, yTop); g.lineTo(x-s*.08, yTop); g.closePath(); g.fill();
}
function roomScene(g, w, h, wide){
  const fy = backdrop(g, w, h, '#d9d0c3', '#b6aa98', .64);
  const s = Math.min(w, h*1.4);
  // on a spread-wide plate the hero pieces sit clear of the gutter
  const kx = wide ? [.28, .62, .84, .08] : [.34, .50, .80, .10];
  // window light on the wall
  const win = g.createLinearGradient(w*.62,0,w*.92,0);
  win.addColorStop(0,'rgba(255,250,240,.0)'); win.addColorStop(.2,'rgba(255,250,240,.55)'); win.addColorStop(.8,'rgba(255,250,240,.55)'); win.addColorStop(1,'rgba(255,250,240,0)');
  g.fillStyle = win; g.fillRect(w*.62, h*.10, w*.30, fy - h*.18);
  // its spill across the floor
  const spill = g.createLinearGradient(0,fy,0,h*.92);
  spill.addColorStop(0,'rgba(255,250,240,.28)'); spill.addColorStop(1,'rgba(255,250,240,0)');
  g.fillStyle = spill; g.beginPath(); g.moveTo(w*.60,fy); g.lineTo(w*.96,fy); g.lineTo(w*1.12,h*.92); g.lineTo(w*.50,h*.92); g.closePath(); g.fill();
  // rug
  g.fillStyle = 'rgba(120,108,92,.35)';
  g.beginPath(); g.moveTo(w*.12, fy+h*.12); g.lineTo(w*.78, fy+h*.12); g.lineTo(w*.86, h*.93); g.lineTo(w*.02, h*.93); g.closePath(); g.fill();
  // furniture
  sofaShape(g, w*kx[0], fy+h*.02, s*.62, '#e8dfcf');
  tableShape(g, w*kx[1], fy+h*.15, s*.46, '#e6ddcd', '#8d6a4a');
  chairShape(g, w*kx[2], fy+h*.02, s*.24, '#a8845f', '#5a5751', '#8d6a4a');
  lampShape(g, w*kx[3], fy-h*.34, fy+h*.015, s*.7);
}
function macro(g, w, h, kind){
  const S = Math.min(w,h);
  if(kind === 'boucle'){
    g.fillStyle = '#e4dccc'; g.fillRect(0,0,w,h);
    for(let i=0;i<2600;i++){
      const x = rnd()*w, y = rnd()*h, r = S*(.010 + rnd()*.022);
      const t = rnd();
      g.fillStyle = t < .5 ? `rgba(246,240,228,${.5+rnd()*.5})` : `rgba(196,184,164,${.25+rnd()*.5})`;
      g.beginPath(); g.ellipse(x, y, r, r*(.6+rnd()*.5), rnd()*3.1416, 0, 6.2832); g.fill();
    }
    const lg = g.createLinearGradient(0,0,w,h); lg.addColorStop(0,'rgba(255,255,255,.18)'); lg.addColorStop(1,'rgba(0,0,0,.16)');
    g.fillStyle = lg; g.fillRect(0,0,w,h);
  } else if(kind === 'oak'){
    const base = g.createLinearGradient(0,0,w,0); base.addColorStop(0,'#c39a6d'); base.addColorStop(1,'#a97f56');
    g.fillStyle = base; g.fillRect(0,0,w,h);
    g.lineCap = 'round';
    for(let i=0;i<110;i++){
      const y0 = rnd()*h*1.2 - h*.1, amp = S*(.01+rnd()*.05), ph = rnd()*6.28, fr = 1+rnd()*2;
      g.strokeStyle = `rgba(${90+rnd()*30|0},${58+rnd()*20|0},${30+rnd()*14|0},${.10+rnd()*.32})`;
      g.lineWidth = S*(.0015+rnd()*.006);
      g.beginPath();
      for(let x=-10;x<=w+10;x+=S*.02){
        const y = y0 + Math.sin(x/w*fr*3.1416+ph)*amp + Math.sin(x/w*11+ph*2)*amp*.25;
        x <= -10 ? g.moveTo(x,y) : g.lineTo(x,y);
      }
      g.stroke();
    }
    const lg = g.createLinearGradient(0,0,0,h); lg.addColorStop(0,'rgba(255,240,220,.20)'); lg.addColorStop(1,'rgba(0,0,0,.18)');
    g.fillStyle = lg; g.fillRect(0,0,w,h);
  } else if(kind === 'stone'){
    const base = g.createLinearGradient(0,0,w,h); base.addColorStop(0,'#e9e1d2'); base.addColorStop(1,'#d3c8b5');
    g.fillStyle = base; g.fillRect(0,0,w,h);
    // travertine bedding: bands, then the pits that run along them
    for(let i=0;i<40;i++){
      g.fillStyle = `rgba(${150+rnd()*40|0},${132+rnd()*36|0},${104+rnd()*30|0},${.05+rnd()*.10})`;
      const y = rnd()*h, bh = S*(.01+rnd()*.05);
      g.fillRect(0, y, w, bh);
    }
    for(let i=0;i<700;i++){
      const x = rnd()*w, y = rnd()*h, rx = S*(.004+rnd()*.03), ry = rx*(.15+rnd()*.35);
      g.fillStyle = `rgba(${96+rnd()*40|0},${80+rnd()*30|0},${60+rnd()*24|0},${.18+rnd()*.5})`;
      g.beginPath(); g.ellipse(x, y, rx, ry, (rnd()-.5)*.3, 0, 6.2832); g.fill();
    }
    const lg = g.createLinearGradient(0,0,w,0); lg.addColorStop(0,'rgba(255,252,244,.22)'); lg.addColorStop(1,'rgba(0,0,0,.14)');
    g.fillStyle = lg; g.fillRect(0,0,w,h);
  } else if(kind === 'wool'){
    g.fillStyle = '#6d6b67'; g.fillRect(0,0,w,h);
    g.lineCap = 'round';
    const st = S*.022;
    for(let y=-st; y<h+st; y+=st) for(let x=-st; x<w+st; x+=st){
      const dark = ((x/st|0)+(y/st|0)) % 2 === 0;
      g.strokeStyle = dark ? `rgba(38,37,35,${.35+rnd()*.35})` : `rgba(160,156,150,${.30+rnd()*.35})`;
      g.lineWidth = st*(.28+rnd()*.2);
      g.beginPath();
      if(dark){ g.moveTo(x, y+st); g.lineTo(x+st, y); } else { g.moveTo(x, y); g.lineTo(x+st, y+st); }
      g.stroke();
    }
    for(let i=0;i<900;i++){
      g.strokeStyle = `rgba(190,186,178,${.08+rnd()*.18})`; g.lineWidth = S*.0012;
      const x = rnd()*w, y = rnd()*h, a = rnd()*6.28, l = S*(.01+rnd()*.03);
      g.beginPath(); g.moveTo(x,y); g.lineTo(x+Math.cos(a)*l, y+Math.sin(a)*l); g.stroke();
    }
    const lg = g.createLinearGradient(0,0,w,h); lg.addColorStop(0,'rgba(255,255,255,.14)'); lg.addColorStop(1,'rgba(0,0,0,.26)');
    g.fillStyle = lg; g.fillRect(0,0,w,h);
  } else if(kind === 'craft'){
    // a finger joint, corner of an oak frame, seen close
    g.fillStyle = '#d8cfc0'; g.fillRect(0,0,w,h);
    const lg = g.createRadialGradient(w*.3,h*.2,0,w*.3,h*.2,w); lg.addColorStop(0,'rgba(255,250,240,.5)'); lg.addColorStop(1,'rgba(0,0,0,.12)');
    g.fillStyle = lg; g.fillRect(0,0,w,h);
    const n = 7, fw = h*.7/n, x0 = w*.14, y0 = h*.15;
    softShadow(g, q => { q.rect(x0, y0, w*.8, h*.72); }, 'rgba(0,0,0,.30)', S*.05, S*.02);
    for(let i=0;i<n;i++){
      const y = y0 + i*fw, a = i%2===0;
      g.fillStyle = a ? '#b98e62' : '#a67b52';
      g.fillRect(x0, y, a ? w*.52 : w*.44, fw+1);
      g.fillStyle = a ? '#9a7048' : '#b08659';
      g.fillRect(x0 + (a ? w*.52 : w*.44), y, w*.80 - (a ? w*.52 : w*.44), fw+1);
    }
    g.lineCap = 'round';
    for(let i=0;i<70;i++){
      g.strokeStyle = `rgba(80,52,30,${.08+rnd()*.22})`; g.lineWidth = S*(.001+rnd()*.003);
      const y = y0 + rnd()*h*.72; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0+w*.8, y+(rnd()-.5)*h*.02); g.stroke();
    }
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = S*.003;
    g.beginPath(); g.rect(x0, y0, w*.8, h*.72); g.stroke();
  }
}
function placeholder(kind, w, h, file){
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const s = Math.min(w, h);
  if(kind === 'room' || kind === 'living') roomScene(g, w, h, kind === 'living');
  else if(kind === 'sofa'){ const fy = backdrop(g,w,h,'#d8cfc0','#b9ae9d',.68); sofaShape(g, w*.5, fy - s*.02, s*.84, '#ebe3d4'); }
  else if(kind === 'table'){ const fy = backdrop(g,w,h,'#d2cdc4','#aca69b',.66); tableShape(g, w*.5, fy - s*.10, s*.78, '#e9e1d3', '#8d6a4a'); }
  else if(kind === 'chair'){ const fy = backdrop(g,w,h,'#c9c4b8','#9c978b',.62); chairShape(g, w*.68, fy - s*.22, s*.62, '#a8845f', '#5a5751', '#8d6a4a'); lampShape(g, w*.14, fy-s*.55, fy+s*.03, s*.9); }
  else if(kind === 'cover'){ const fy = backdrop(g,w,h,'#e2d9cb','#c2b6a3',.70); chairShape(g, w*.5, fy - s*.16, s*.66, '#a8845f', '#5a5751', '#8d6a4a'); }
  else macro(g, w, h, kind);
  finishPlate(g, w, h, file);
  return c;
}

/* ═══════════════════════════════════════════════════════════════
   6.  THE PAGES — one painter per page, on the shared grid
   ------------------------------------------------------------------
   Even indices are versos (left), odd are rectos (right).  A page with
   `bleed:true` carries no folio.  Coordinates are page-local units.
   ═══════════════════════════════════════════════════════════════ */
function folio(ctx, G, index, page){
  ctx.save();
  font(ctx, {w:500, s:16}); ctx.letterSpacing = '2px';
  ctx.fillStyle = T.folio; ctx.textBaseline = 'alphabetic';
  ctx.textAlign = G.recto ? 'right' : 'left';
  ctx.fillText(pad2(index), G.recto ? G.x1 : G.x0, M.foot);
  if(page.foot !== false){
    ctx.textAlign = G.recto ? 'left' : 'right';
    font(ctx, {w:500, s:14}); ctx.letterSpacing = '2.6px';
    const s = page.section ? String(page.section).toUpperCase() : `${COPY.brand} — ${COPY.season.toUpperCase()}`;
    ctx.fillText(s, G.recto ? G.x0 : G.x1, M.foot);
  }
  ctx.restore();
}

function buildPages(){
  const P = [];

  /* 00 — inside front cover */
  P.push({ id:'inside-cover', folio:false, paint(ctx, G){
    label(ctx, COPY.brand, PAGE_W/2, PAGE_H/2, {s:17, track:8, align:'center', color:'rgba(29,27,24,.28)'});
  }});

  /* 01 — cover */
  P.push({ id:'cover', folio:false, paint(ctx, G){
    label(ctx, COPY.season, G.x0, M.top);
    label(ctx, 'Lookbook · Edition 01', G.x1, M.top, {align:'right'});
    const sz = fitSize(ctx, COPY.brand, G.w, 250, {w:500, trackEm:-.04});
    ctx.save();
    font(ctx, {w:500, s:sz}); ctx.letterSpacing = `${-sz*.04}px`;
    ctx.fillStyle = T.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(COPY.brand, G.x0 - sz*.02, 700);
    ctx.restore();
    display(ctx, [COPY.tagline], G.x0, 800, {s:66, i:true});
    rule(ctx, G.x0, 860, G.w);
    image(ctx, 'coverTile', {x:G.x1-420, y:900, w:420, h:480}, {fx:.5, fy:.55});
    para(ctx, COPY.coverNote, G.x0, 1300, 380, {s:21, lh:31, color:T.inkSoft});
  }});

  /* 02–03 — the collection */
  P.push({ id:'collection-image', bleed:true, paint(ctx, G){
    image(ctx, 'room', {x:0, y:0, w:PAGE_W, h:PAGE_H}, {fx:.45, fy:.55});
  }});
  P.push({ id:'collection', section:'The Finishes', paint(ctx, G){
    label(ctx, `01 — The Finishes`, G.x0, M.top);
    display(ctx, ['Bringing walls', 'to life.'], G.x0, 450, {s:118, lh:120});
    let y = para(ctx, COPY.intro1, G.x0, 700, 560, {s:26, lh:40});
    para(ctx, COPY.intro2, G.x0, y + 26, 560, {s:26, lh:40});
    label(ctx, 'Contents', G.x0, 1090, {s:15, track:2.6});
    indexList(ctx, COPY.index, G.x0, 1146, G.w);
  }});

  /* 04–05 — Forma sofa */
  P.push({ id:'forma-image', bleed:true, paint(ctx, G){
    image(ctx, 'formaSofa', {x:0, y:0, w:PAGE_W - M.in, h:PAGE_H}, {fx:.5, fy:.5});
    gutterCaption(ctx, COPY.forma.caption, false);
  }});
  P.push({ id:'forma', section:'Venetian Gold — 01', paint(ctx, G){
    const c = COPY.forma;
    label(ctx, `${c.label}  /  ${c.no}`, G.x0, M.top, {s:21, track:4});
    label(ctx, c.type, G.x1, M.top, {align:'right'});
    display(ctx, c.head, G.x0, 560, {s:92, lh:100});
    para(ctx, c.body, G.x0, 800, 600, {s:26, lh:40});
    specs(ctx, c.specs, G.x0, 1100, G.w - 120);
  }});

  /* 06–07 — Arc table */
  P.push({ id:'arc', section:'Textured Elegance — 02', paint(ctx, G){
    const c = COPY.arc;
    label(ctx, `${c.label}  /  ${c.no}`, G.x0, M.top, {s:21, track:4});
    label(ctx, c.type, G.x1, M.top, {align:'right'});
    display(ctx, c.head, G.x0, 500, {s:92, lh:100});
    para(ctx, c.body, G.x0, 730, 560, {s:26, lh:40});
    image(ctx, 'arcDetail', {x:G.x0, y:960, w:400, h:400}, {fx:.5, fy:.5});
    specs(ctx, c.specs, G.x0 + 440, 990, G.w - 440, {rh:44, kw:150, s:21});
    para(ctx, c.detail, G.x0 + 440, 1250, G.w - 440, {s:19, lh:28, color:T.inkSoft});
  }});
  P.push({ id:'arc-image', bleed:true, paint(ctx, G){
    image(ctx, 'arcTable', {x:M.in, y:0, w:PAGE_W - M.in, h:PAGE_H}, {fx:.5, fy:.5});
    gutterCaption(ctx, COPY.arc.caption, true);
  }});

  /* 08–09 — Cove chair: a page given entirely to the photograph, facing a
     page given entirely to type, with the composition inverted against
     Forma's (details high, headline low) so the two do not rhyme. */
  P.push({ id:'cove-image', bleed:true, paint(ctx, G){
    image(ctx, 'coveChair', {x:0, y:0, w:PAGE_W, h:PAGE_H}, {fx:.5, fy:.5});
  }});
  P.push({ id:'cove', section:'Modern Minimalist — 03', paint(ctx, G){
    const c = COPY.cove;
    label(ctx, `${c.label}  /  ${c.no}`, G.x0, M.top, {s:21, track:4});
    label(ctx, c.type, G.x1, M.top, {align:'right'});
    specs(ctx, c.specs, G.x0, 300, G.w - 100, {rh:46, kw:190, s:21});
    display(ctx, c.head, G.x0, 940, {s:92});
    para(ctx, c.body, G.x0, 1060, 560, {s:26, lh:40});
  }});

  /* 10–11 — materials */
  P.push({ id:'materials', section:'Materials — 04', paint(ctx, G){
    const c = COPY.materials;
    label(ctx, `${c.label}  /  ${c.no}`, G.x0, M.top, {s:21, track:4});
    display(ctx, c.head, G.x0, 440, {s:92, lh:100});
    para(ctx, c.body, G.x0, 660, 540, {s:26, lh:40});
    image(ctx, 'matBoucle', {x:G.x0, y:860, w:420, h:420});
    image(ctx, 'matOak',    {x:G.x0 + 460, y:860, w:G.w - 460, h:420});
    label(ctx, c.captions.boucle, G.x0, 1322, {s:15, track:2.4});
    label(ctx, c.captions.oak, G.x0 + 460, 1322, {s:15, track:2.4});
  }});
  P.push({ id:'materials-2', section:'Materials — 04', paint(ctx, G){
    const c = COPY.materials;
    image(ctx, 'matStone', {x:G.x0, y:112, w:540, h:720});
    image(ctx, 'matWool',  {x:G.x0 + 580, y:112, w:G.w - 580, h:340});
    image(ctx, 'matCraft', {x:G.x0 + 580, y:492, w:G.w - 580, h:340});
    label(ctx, c.captions.stone, G.x0, 878, {s:15, track:2.4});
    label(ctx, c.captions.wool, G.x0 + 580, 878, {s:15, track:2.4});
    label(ctx, c.captions.craft, G.x0 + 580, 908, {s:15, track:2.4});
    para(ctx, c.note, G.x0, 1010, 580, {s:23, lh:35});
  }});

  /* 12–13 — the living space, full bleed across the spread */
  const livingWash = (ctx) => {
    const g = ctx.createLinearGradient(0, PAGE_H - 460, 0, PAGE_H);
    g.addColorStop(0,'rgba(20,16,12,0)'); g.addColorStop(1,'rgba(20,16,12,.42)');
    ctx.fillStyle = g; ctx.fillRect(0, PAGE_H - 460, PAGE_W, 460);
  };
  P.push({ id:'living-left', bleed:true, paint(ctx, G){
    image(ctx, 'living', {x:0, y:0, w:PAGE_W, h:PAGE_H}, {span:'left', fx:.5, fy:.5});
    livingWash(ctx);
    label(ctx, `${COPY.living.no} — ${COPY.living.label}`, G.x0, PAGE_H - 170, {color:'rgba(247,243,236,.78)'});
    display(ctx, [COPY.living.line], G.x0, PAGE_H - 104, {s:48, color:T.white});
  }});
  P.push({ id:'living-right', bleed:true, paint(ctx, G){
    image(ctx, 'living', {x:0, y:0, w:PAGE_W, h:PAGE_H}, {span:'right', fx:.5, fy:.5});
    livingWash(ctx);
    label(ctx, `${COPY.brand} — ${COPY.season}`, G.x1, PAGE_H - 104, {align:'right', color:'rgba(247,243,236,.70)'});
  }});

  /* 14–15 — close */
  P.push({ id:'close', folio:false, paint(ctx, G){
    label(ctx, `${COPY.brand} — ${COPY.season}`, G.x0, M.top);
    display(ctx, COPY.close.head, G.x0, 700, {s:132, lh:138, track:-2});
  }});
  P.push({ id:'colophon', folio:false, paint(ctx, G){
    ctx.save();
    font(ctx, {w:500, s:96}); ctx.letterSpacing = '-3px';
    ctx.fillStyle = T.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(COPY.brand, PAGE_W/2, 700);
    ctx.restore();
    display(ctx, [COPY.season], PAGE_W/2, 770, {s:44, i:true, align:'center'});
    rule(ctx, PAGE_W/2 - 120, 830, 240);
    COPY.close.colophon.forEach((l,i) => label(ctx, l, PAGE_W/2, 1130 + i*40, {s:15, track:2.6, align:'center'}));
    if(CREDITS.length){
      para(ctx, COPY.close.credit + CREDITS.join(', ') + '.',
           G.x0, 1300, G.w, {s:15, lh:23, color:T.inkSoft, align:'center'});
    }
  }});

  if(P.length % 2) P.push({ id:'blank', folio:false, paint(){} });
  return P;
}

/* ═══════════════════════════════════════════════════════════════
   7.  PAGE PAINTING — paper, then the page's own painter
   ═══════════════════════════════════════════════════════════════ */
let grainPattern = null, mottlePattern = null, fibrePattern = null;
const mc = document.createElement('canvas').getContext('2d');
function noiseCanvas(n, amp, tri){
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d');
  const d = g.createImageData(n,n);
  for(let i=0;i<n*n;i++){
    let v = 0, m = tri ? 3 : 1;
    for(let k=0;k<m;k++) v += Math.random();
    v = (v/m - .5) * amp;
    d.data[i*4] = d.data[i*4+1] = d.data[i*4+2] = 128 + v;
    d.data[i*4+3] = 255;
  }
  g.putImageData(d,0,0);
  return c;
}
function fibreCanvas(n, count){
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d');
  g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0,0,n,n);
  g.lineCap = 'round';
  for(let i=0;i<count;i++){
    const x = Math.random()*n, y = Math.random()*n;
    const a = Math.random()*Math.PI, len = 3 + Math.random()*11;
    const pale = Math.random() < 0.55;
    const v = pale ? 128 + 26 + Math.random()*40 : 128 - 22 - Math.random()*34;
    g.strokeStyle = `rgba(${v|0},${v|0},${v|0},${0.30 + Math.random()*0.45})`;
    g.lineWidth = Math.random() < 0.75 ? 1 : 1.8;
    g.beginPath();
    for(const [ox,oy] of [[0,0],[n,0],[0,n],[-n,0],[0,-n]]){
      g.moveTo(x+ox, y+oy);
      g.lineTo(x+ox + Math.cos(a)*len, y+oy + Math.sin(a)*len);
    }
    g.stroke();
  }
  return c;
}
function makeGrain(){
  grainPattern = mc.createPattern(noiseCanvas(256, 40, true), 'repeat');
  fibrePattern = mc.createPattern(fibreCanvas(300, 900), 'repeat');
  const src = noiseCanvas(26, 74, true);
  const big = document.createElement('canvas');
  big.width = big.height = 448;
  const bg = big.getContext('2d');
  bg.imageSmoothingEnabled = true;
  bg.drawImage(src, 0, 0, 448, 448);
  mottlePattern = mc.createPattern(big, 'repeat');
}

function paintPage(ctx, page, index, TQ){
  ctx.save();
  ctx.scale(TQ, TQ);
  ctx.clearRect(0,0,PAGE_W,PAGE_H);

  ctx.fillStyle = T.paper;
  ctx.fillRect(0,0,PAGE_W,PAGE_H);

  // paper: soft mottle at page scale, then fibres and grain at texel scale
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = .20;
  ctx.fillStyle = mottlePattern;
  ctx.translate((index*137)%448, (index*263)%448);
  ctx.fillRect(-448,-448,PAGE_W+896,PAGE_H+896);
  ctx.restore();

  const DW = Math.round(PAGE_W*TQ), DH = Math.round(PAGE_H*TQ);
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);            // one pattern texel = one texture texel
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = .26;
  ctx.fillStyle = fibrePattern;
  ctx.translate((index*211)%300, (index*97)%300);
  ctx.fillRect(-300,-300,DW+600,DH+600);
  ctx.globalAlpha = .22;
  ctx.fillStyle = grainPattern;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.translate((index*37)%256, (index*91)%256);
  ctx.fillRect(-256,-256,DW+512,DH+512);
  ctx.restore();
  ctx.save(); ctx.scale(TQ,TQ);             // back to page units

  const G = geom(index);
  ctx.textBaseline = 'alphabetic';
  if(page.paint) page.paint(ctx, G, index);
  if(!page.bleed && page.folio !== false) folio(ctx, G, index, page);

  ctx.restore(); ctx.restore();
}

/* ═══════════════════════════════════════════════════════════════
   8.  SCENE
   ═══════════════════════════════════════════════════════════════ */
makeGrain();
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const maxAniso = renderer.capabilities.getMaxAnisotropy();

const scene  = new THREE.Scene();
const FOV = 20;
const camera = new THREE.PerspectiveCamera(FOV, 1, 10, 40000);
camera.position.set(0,0,1000);

const book = new THREE.Group();
book.position.y = BOOK_OFF_Y;
scene.add(book);

const LIGHT = new THREE.Vector3(-0.30, 0.40, 0.865).normalize();

/* ---------- texture pool ---------- */
let TQ = 1;
const pool = [];
let useTick = 0;
const POOL_N = 6;

function initPool(){
  for(const p of pool) p.tex.dispose();
  pool.length = 0;
  for(let i=0;i<POOL_N;i++){
    const c = document.createElement('canvas');
    c.width  = Math.round(PAGE_W*TQ);
    c.height = Math.round(PAGE_H*TQ);
    const ctx = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    pool.push({canvas:c, ctx, tex, page:-1, used:0});
  }
}
function pageTex(i){
  i = Math.max(0, Math.min(PAGES.length-1, i));
  let slot = pool.find(p => p.page === i);
  if(!slot){
    slot = pool.reduce((a,b)=> a.used <= b.used ? a : b);
    slot.page = i;
    paintPage(slot.ctx, PAGES[i], i, TQ);
    slot.tex.needsUpdate = true;
  }
  slot.used = ++useTick;
  return slot.tex;
}

function rrect(g,x,y,wd,ht,r){
  g.beginPath();
  g.moveTo(x+r,y);
  g.arcTo(x+wd,y,x+wd,y+ht,r);
  g.arcTo(x+wd,y+ht,x,y+ht,r);
  g.arcTo(x,y+ht,x,y,r);
  g.arcTo(x,y,x+wd,y,r);
  g.closePath();
}

function coverTexture(){
  // bookbinding board wrapped in linen: a fine weave, slubbed, worn brighter at the cut edge
  const S = 0.85, W = Math.round(BOOK_W/S), H = Math.round(BOOK_H/S);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const u = W / BOOK_W;                       // texels per design unit

  g.save();
  rrect(g, 0,0,W,H, COVER_R*u);
  g.clip();

  const grad = g.createLinearGradient(0,0,W*0.5,H);
  grad.addColorStop(0, T.board1);
  grad.addColorStop(.55, T.board2);
  grad.addColorStop(1, T.board3);
  g.fillStyle = grad; g.fillRect(0,0,W,H);

  g.globalCompositeOperation = 'overlay';
  g.globalAlpha = .36; g.fillStyle = mottlePattern; g.fillRect(0,0,W,H);
  g.globalAlpha = .55; g.fillStyle = fibrePattern;  g.fillRect(0,0,W,H);
  g.globalAlpha = .45; g.fillStyle = grainPattern;  g.fillRect(0,0,W,H);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;

  let sd = 5;
  const r = () => (sd = (sd*1103515245 + 12345) & 0x7fffffff)/0x7fffffff;

  // the weave: warp and weft at 1:1 with texels
  const pitch = 3.2*u;
  for(let y=0; y<H; y+=pitch){
    g.fillStyle = `rgba(255,246,232,${0.05 + r()*0.07})`;
    g.fillRect(0, y, W, pitch*0.42);
    g.fillStyle = `rgba(30,22,14,${0.05 + r()*0.08})`;
    g.fillRect(0, y+pitch*0.5, W, pitch*0.30);
  }
  for(let x=0; x<W; x+=pitch){
    g.fillStyle = `rgba(255,246,232,${0.03 + r()*0.06})`;
    g.fillRect(x, 0, pitch*0.40, H);
    g.fillStyle = `rgba(30,22,14,${0.04 + r()*0.07})`;
    g.fillRect(x+pitch*0.5, 0, pitch*0.28, H);
  }
  // slubs — the thick threads that make linen read as linen
  g.lineCap = 'round';
  for(let i=0;i<420;i++){
    const x = r()*W, y = r()*H, len = (14 + r()*90)*u, horiz = r() < .6;
    const pale = r() < .55;
    g.strokeStyle = pale ? `rgba(240,228,208,${0.08 + r()*0.14})`
                         : `rgba(40,30,20,${0.08 + r()*0.16})`;
    g.lineWidth = (1.2 + r()*2.2)*u;
    g.beginPath();
    g.moveTo(x, y);
    if(horiz) g.lineTo(x+len, y + (r()-.5)*2*u); else g.lineTo(x + (r()-.5)*2*u, y+len);
    g.stroke();
  }

  // the cut edge catches a little light; the board falls away on the far sides
  const be = 10*u;
  const eg = g.createLinearGradient(0,0,0,be*2.6);
  eg.addColorStop(0,'rgba(255,246,232,.16)');
  eg.addColorStop(1,'rgba(255,246,232,0)');
  g.fillStyle = eg; g.fillRect(0,0,W,H);
  const eg2 = g.createLinearGradient(0,0,be*2.6,0);
  eg2.addColorStop(0,'rgba(255,246,232,.12)');
  eg2.addColorStop(1,'rgba(255,246,232,0)');
  g.fillStyle = eg2; g.fillRect(0,0,W,H);
  const dg1 = g.createLinearGradient(0,H-be*7,0,H);
  dg1.addColorStop(0,'rgba(0,0,0,0)'); dg1.addColorStop(1,'rgba(0,0,0,.34)');
  g.fillStyle = dg1; g.fillRect(0,0,W,H);
  const dg2 = g.createLinearGradient(W-be*7,0,W,0);
  dg2.addColorStop(0,'rgba(0,0,0,0)'); dg2.addColorStop(1,'rgba(0,0,0,.20)');
  g.fillStyle = dg2; g.fillRect(0,0,W,H);

  g.strokeStyle = 'rgba(255,246,232,.14)';
  g.lineWidth = 1.6*u;
  rrect(g, 0.9*u,0.9*u,W-1.8*u,H-1.8*u, COVER_R*u);
  g.stroke();

  // the page block stands proud of the boards and casts into the well all round
  const bx = BOARD*u, by = 22*u, bw = PAGE_W*2*u, bh = PAGE_H*u;
  g.save();
  g.beginPath();
  rrect(g, 0,0,W,H, COVER_R*u);
  g.rect(bx, by, bw, bh);
  g.clip('evenodd');
  g.shadowColor = 'rgba(0,0,0,.88)';
  g.shadowBlur = 26*u;
  g.shadowOffsetY = 7*u;
  g.fillStyle = '#000';
  g.fillRect(bx, by, bw, bh);
  g.shadowBlur = 9*u; g.shadowOffsetY = 2.5*u;
  g.shadowColor = 'rgba(0,0,0,.80)';
  g.fillRect(bx, by, bw, bh);
  g.restore();
  g.restore();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}

const coverMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(BOOK_W, BOOK_H),
  new THREE.MeshBasicMaterial({map: coverTexture(), transparent:true})
);
coverMesh.renderOrder = 0;
book.add(coverMesh);

const pageGeo = new THREE.PlaneGeometry(PAGE_W, PAGE_H, 1, 1);
function makePage(sideSign){
  const m = new THREE.Mesh(pageGeo, new THREE.MeshBasicMaterial({map:null}));
  m.position.set(sideSign * PAGE_W/2, (PAGE_TOP_Y + PAGE_BOT_Y)/2, 1.5);
  m.renderOrder = 1;
  book.add(m);
  return m;
}
const leftPage  = makePage(-1);
const rightPage = makePage(+1);

/* ---- shading overlay (gutter, vignette, edge lift) ---- */
const shadeCanvas = document.createElement('canvas');
shadeCanvas.width = BOOK_W/2; shadeCanvas.height = BOOK_H/2;
const shadeCtx = shadeCanvas.getContext('2d');
const shadeTex = new THREE.CanvasTexture(shadeCanvas);
shadeTex.colorSpace = THREE.SRGBColorSpace;
shadeTex.anisotropy = maxAniso;
const shadeMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(BOOK_W, BOOK_H),
  new THREE.MeshBasicMaterial({map:shadeTex, transparent:true, depthWrite:false})
);
shadeMesh.position.z = 2.4;
shadeMesh.renderOrder = 2;
book.add(shadeMesh);

function stop(g, list){ for(const [p,a] of list) g.addColorStop(p, `rgba(${T.shade},${a})`); }
function lift(g, list){ for(const [p,a] of list) g.addColorStop(p, `rgba(${T.lift},${a})`); }

/* ---- the fold: sampled shading of the leaf bending into the gutter ---- */
const GUT = 134;
function foldStops(sign){
  const A = 0.385, D = 0.712, Lx = -0.30, Lz = 0.865;
  const dark = [], glint = [];
  const N = 24;
  for(let i=0;i<=N;i++){
    const t  = i/N;
    const th = (88*Math.PI/180) * Math.pow(1-t, 1.7);
    const nx = -sign*Math.sin(th), nz = Math.cos(th);
    const ao = 1 - 0.50*Math.pow(1-t, 3.2);
    const v  = (A + D*(nx*Lx + nz*Lz)) * ao;
    dark.push([t, Math.max(0, 1 - v)]);
    glint.push([t, Math.max(0, (v - 1) * 3.2)]);
  }
  return {dark, glint};
}

function drawShade(frac){
  const g = shadeCtx, S = 2;
  g.setTransform(1/S,0,0,1/S,0,0);
  g.clearRect(0,0,BOOK_W,BOOK_H);

  const px0 = BOOK_W/2 - PAGE_W, px1 = BOOK_W/2, px2 = BOOK_W/2 + PAGE_W;
  const py0 = 22, py1 = BOOK_H - 52, ph = py1 - py0;

  let lg = g.createLinearGradient(px0,0,px1,0);
  stop(lg, [[0,.13],[.018,.065],[.05,.012],[.55,0],[.8,.006],[1,.014]]);
  g.fillStyle = lg; g.fillRect(px0,py0,PAGE_W,ph);

  let rg = g.createLinearGradient(px1,0,px2,0);
  stop(rg, [[0,.022],[.12,.018],[.3,.016],[.55,.020],[.78,.036],[.9,.062],[.965,.095],[1,.15]]);
  g.fillStyle = rg; g.fillRect(px1,py0,PAGE_W,ph);

  let vg = g.createLinearGradient(0,py0,0,py1);
  stop(vg, [[0,.004],[.35,.012],[.7,.029],[1,.056]]);
  g.fillStyle = vg; g.fillRect(px0,py0,PAGE_W*2,ph);

  let dgd = g.createLinearGradient(px1, py0, px2, py1);
  stop(dgd, [[0,0],[.45,.005],[.75,.027],[1,.058]]);
  g.fillStyle = dgd; g.fillRect(px1,py0,PAGE_W,ph);

  const fv = foldStops(-1), fr = foldStops(+1);
  let gv = g.createLinearGradient(px1,0,px1-GUT,0);
  stop(gv, fv.dark);  g.fillStyle = gv; g.fillRect(px1-GUT,py0,GUT,ph);
  let gr = g.createLinearGradient(px1,0,px1+GUT,0);
  stop(gr, fr.dark);  g.fillStyle = gr; g.fillRect(px1,py0,GUT,ph);
  let sr = g.createLinearGradient(px1,0,px1+GUT,0);
  lift(sr, fr.glint); g.fillStyle = sr; g.fillRect(px1,py0,GUT,ph);
  let cr = g.createLinearGradient(px1-7,0,px1+7,0);
  stop(cr, [[0,0],[.4,.55],[.5,.72],[.6,.55],[1,0]]);
  g.fillStyle = cr; g.fillRect(px1-7,py0,14,ph);
  for(let i=1;i<=5;i++){
    const d = 9 + i*i*4.2, a = 0.20/(i*0.9);
    g.fillStyle = `rgba(${T.shade},${a})`;
    g.fillRect(px1-d-1.4, py0, 1.4, ph);
    g.fillRect(px1+d, py0, 1.4, ph);
  }
  g.fillStyle = `rgba(${T.shade},.30)`;
  g.fillRect(px0, py0, 2.2, ph);
  g.fillRect(px2-2.2, py0, 2.2, ph);

  let hl = g.createLinearGradient(0,py0,0,py0+160);
  lift(hl, [[0,.045],[1,0]]);
  g.fillStyle = hl; g.fillRect(px0,py0,PAGE_W*2,160);
  let el = g.createLinearGradient(px0,0,px0+80,0);
  lift(el, [[0,.045],[1,0]]);
  g.fillStyle = el; g.fillRect(px0,py0,80,ph);
  let er = g.createLinearGradient(px2,0,px2-80,0);
  lift(er, [[0,.03],[1,0]]);
  g.fillStyle = er; g.fillRect(px2-80,py0,80,ph);

  let tg = g.createLinearGradient(0,py1-30,0,py1);
  tg.addColorStop(0,'rgba(0,0,0,0)'); tg.addColorStop(1,'rgba(0,0,0,.30)');
  g.fillStyle = tg; g.fillRect(px0,py1-30,PAGE_W*2,30);

  shadeTex.needsUpdate = true;
  layoutEdges(frac);
}

/* ---- fore-edges: the visible stack of leaves inside the cover margin ---- */
const MARG = (BOOK_W - PAGE_W*2)/2;
const EDGE_PX = 2.4;
function edgeTexture(dir){
  const c = document.createElement('canvas');
  c.width = Math.round(MARG*EDGE_PX); c.height = 64;
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  g.fillStyle = T.edgeBase; g.fillRect(0,0,W,H);
  const step = 2.1*EDGE_PX;
  let seed = 21;
  const r = () => (seed = (seed*1103515245 + 12345) & 0x7fffffff)/0x7fffffff;
  const L = T.edgeLeaf;
  for(let x=0; x<W+step; x+=step){
    const j = (r()-0.5)*step*0.30;
    const lx = dir>0 ? W - x - j : x + j;
    const v = 0.80 + r()*0.24;
    g.fillStyle = `rgb(${Math.round(L[0]*v)},${Math.round(L[1]*v)},${Math.round(L[2]*v)})`;
    g.fillRect(lx - step*0.5, 0, step*0.50, H);
  }
  const dg = g.createLinearGradient(dir>0?0:W, 0, dir>0?W:0, 0);
  dg.addColorStop(0,'rgba(0,0,0,.30)');
  dg.addColorStop(.35,'rgba(0,0,0,.05)');
  dg.addColorStop(1,'rgba(0,0,0,.20)');
  g.fillStyle = dg; g.fillRect(0,0,W,H);
  const vg = g.createLinearGradient(0,0,0,H);
  vg.addColorStop(0,'rgba(255,255,255,.14)');
  vg.addColorStop(.5,'rgba(0,0,0,0)');
  vg.addColorStop(1,'rgba(0,0,0,.30)');
  g.fillStyle = vg; g.fillRect(0,0,W,H);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}
const edgeGeo = new THREE.PlaneGeometry(1, PAGE_H);
function makeEdge(dir){
  const m = new THREE.Mesh(edgeGeo, new THREE.MeshBasicMaterial({map: edgeTexture(dir), transparent:true, depthWrite:false}));
  m.renderOrder = 2;
  m.position.y = (PAGE_TOP_Y + PAGE_BOT_Y)/2;
  m.position.z = 1.6;
  book.add(m);
  return m;
}
const edgeR = makeEdge(+1), edgeL = makeEdge(-1);
const EDGE_MAX = MARG - 8;
function layoutEdges(frac){
  const wR = EDGE_MAX * Math.min(1, Math.max(0, (1-frac))*1.2);
  const wL = EDGE_MAX * Math.min(1, Math.max(0, frac)*1.2);
  edgeR.scale.x = Math.max(0.001, wR);
  edgeR.position.x = PAGE_W + wR/2;
  edgeR.visible = wR > 0.6;
  edgeL.scale.x = Math.max(0.001, wL);
  edgeL.position.x = -PAGE_W - wL/2;
  edgeL.visible = wL > 0.6;
}

/* ---- focus veil: in the narrow layout the facing page falls away ---- */
function veilTexture(){
  const c = document.createElement('canvas');
  c.width = 128; c.height = 4;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0,0,128,0);
  gr.addColorStop(0,   'rgba(15,13,11,0)');
  gr.addColorStop(0.03,'rgba(15,13,11,0.36)');
  gr.addColorStop(0.10,'rgba(15,13,11,0.72)');
  gr.addColorStop(0.30,'rgba(15,13,11,0.89)');
  gr.addColorStop(1,   'rgba(15,13,11,0.95)');
  g.fillStyle = gr; g.fillRect(0,0,128,4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const veil = new THREE.Mesh(
  new THREE.PlaneGeometry(PAGE_W + MARG*2, PAGE_H + 90),
  new THREE.MeshBasicMaterial({map: veilTexture(), transparent:true, depthWrite:false,
                               depthTest:false, side:THREE.DoubleSide, opacity:0})
);
veil.position.y = (PAGE_TOP_Y + PAGE_BOT_Y)/2;
veil.position.z = 3.0;
veil.renderOrder = 4;
veil.visible = false;
book.add(veil);

function updateVeil(){
  if(!single){ veil.visible = false; return; }
  const sgn = camX >= 0 ? -1 : 1;
  veil.position.x = sgn * (PAGE_W/2 + MARG);
  veil.scale.x = sgn;
  const a = Math.min(1, Math.abs(camX)/(PAGE_W*0.42));
  veil.material.opacity = a;
  veil.visible = a > 0.02;
}

/* ═══════════════════════════════════════════════════════════════
   9.  TURNING LEAF
   ═══════════════════════════════════════════════════════════════ */
const NX = 66, NY = 26;
const N = NX*NY;
const pos  = new Float32Array(N*3);
const rest = new Float32Array(N*3);

const sheetGeo = new THREE.BufferGeometry();
const posAttr = new THREE.BufferAttribute(new Float32Array(N*3), 3);
const nrmAttr = new THREE.BufferAttribute(new Float32Array(N*3), 3);
const uvAttr  = new THREE.BufferAttribute(new Float32Array(N*2), 2);
sheetGeo.setAttribute('position', posAttr);
sheetGeo.setAttribute('normal', nrmAttr);
sheetGeo.setAttribute('uv', uvAttr);
{
  const uvs = uvAttr.array;
  for(let j=0;j<NY;j++) for(let i=0;i<NX;i++){
    const k = j*NX+i;
    uvs[k*2] = i/(NX-1); uvs[k*2+1] = j/(NY-1);
  }
}
const idxA = new Uint16Array((NX-1)*(NY-1)*6);
const idxB = new Uint16Array((NX-1)*(NY-1)*6);
{
  let a=0,b=0;
  for(let j=0;j<NY-1;j++) for(let i=0;i<NX-1;i++){
    const p = j*NX+i, q = p+1, r = p+NX, s = r+1;
    idxA[a++]=p; idxA[a++]=r; idxA[a++]=q;
    idxA[a++]=q; idxA[a++]=r; idxA[a++]=s;
    idxB[b++]=p; idxB[b++]=q; idxB[b++]=r;
    idxB[b++]=q; idxB[b++]=s; idxB[b++]=r;
  }
}
const idxAttrA = new THREE.BufferAttribute(idxA, 1);
const idxAttrB = new THREE.BufferAttribute(idxB, 1);
sheetGeo.setIndex(idxAttrA);

const sheetUni = {
  texA:{value:null}, texB:{value:null},
  flipA:{value:0}, flipB:{value:1},
  shade:{value:shadeTex},
  light:{value:LIGHT.clone()},
  ambient:{value:0.385}, diffuse:{value:0.712},
  showThrough:{value:0.08},
  bookSize:{value:new THREE.Vector2(BOOK_W, BOOK_H)},
  opacity:{value:1}
};

const sheetMat = new THREE.ShaderMaterial({
  uniforms: sheetUni,
  side: THREE.DoubleSide,
  transparent: true,
  vertexShader:`
    varying vec2 vUvP;
    varying vec3 vN;
    varying vec3 vW;
    void main(){
      vUvP = uv;
      vN = normalize(normalMatrix * normal);
      vec4 wp = modelMatrix * vec4(position,1.0);
      vW = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader:`
    precision highp float;
    uniform sampler2D texA, texB, shade;
    uniform float flipA, flipB, ambient, diffuse, showThrough, opacity;
    uniform vec3 light;
    uniform vec2 bookSize;
    varying vec2 vUvP;
    varying vec3 vN;
    varying vec3 vW;
    vec3 toS(vec3 c){ return mix(c*12.92, 1.055*pow(max(c,0.0), vec3(0.41666))-0.055, step(vec3(0.0031308), c)); }
    vec3 toL(vec3 c){ return mix(c/12.92, pow((c+0.055)/1.055, vec3(2.4)), step(vec3(0.04045), c)); }
    void main(){
      vec2 ua = vec2(mix(vUvP.x, 1.0-vUvP.x, flipA), vUvP.y);
      vec2 ub = vec2(mix(vUvP.x, 1.0-vUvP.x, flipB), vUvP.y);
      vec4 ca = texture2D(texA, ua);
      vec4 cb = texture2D(texB, ub);
      bool front = gl_FrontFacing;
      vec3 face  = front ? ca.rgb : cb.rgb;
      vec3 other = front ? cb.rgb : ca.rgb;

      // on cream stock the far side reads through as a faint darkening
      float dark = 1.0 - dot(other, vec3(0.333));

      vec3 n = normalize(vN);
      if(!front) n = -n;
      float nl = max(dot(n, light), 0.0);
      float lum = ambient + diffuse * nl;
      vec3 V = vec3(0.0,0.0,1.0);
      vec3 H = normalize(light + V);
      lum += pow(max(dot(n,H),0.0), 40.0) * 0.05;
      lum += (1.0 - abs(dot(n, vec3(0.0,0.0,1.0)))) * 0.02;

      float h = vW.z;
      float contact = 1.0 - smoothstep(2.0, 150.0, h);
      face *= 1.0 - showThrough * (1.0 - contact) * clamp(dark*1.4, 0.0, 1.0);

      vec2 suv = vec2(vW.x/bookSize.x + 0.5, vW.y/bookSize.y + 0.5);
      vec4 sh = texture2D(shade, suv);
      float inBook = step(0.0, suv.x)*step(suv.x,1.0)*step(0.0,suv.y)*step(suv.y,1.0);

      vec3 col = face * lum * (1.0 + 0.05*(1.0 - contact));
      vec3 sc = toS(col);
      sc = mix(sc, toS(sh.rgb), sh.a * contact * inBook);
      col = toL(sc);

      gl_FragColor = vec4(col, opacity);
      #include <colorspace_fragment>
    }`
});
const sheet = new THREE.Mesh(sheetGeo, sheetMat);
sheet.renderOrder = 5;
sheet.frustumCulled = false;
sheet.visible = false;
book.add(sheet);

/* ---- projected soft contact shadow ---- */
const SH_TAPS = 28;
const shadowGeo = new THREE.InstancedBufferGeometry();
shadowGeo.index = sheetGeo.index;
shadowGeo.setAttribute('position', posAttr);
shadowGeo.instanceCount = SH_TAPS;
{
  const j = new Float32Array(SH_TAPS*2);
  const ga = 2.399963;
  for(let i=0;i<SH_TAPS;i++){
    const r = Math.sqrt((i+0.5)/SH_TAPS), a = i*ga;
    j[i*2] = Math.cos(a)*r; j[i*2+1] = Math.sin(a)*r;
  }
  shadowGeo.setAttribute('jit', new THREE.InstancedBufferAttribute(j, 2));
}
const shadowUni = {
  light:{value:LIGHT.clone()},
  strength:{value:0.011},
  bookSize:{value:new THREE.Vector2(BOOK_W, BOOK_H)}
};
const shadowMat = new THREE.ShaderMaterial({
  uniforms: shadowUni,
  transparent:true, depthWrite:false, depthTest:false,
  side: THREE.DoubleSide,
  vertexShader:`
    attribute vec2 jit;
    uniform vec3 light;
    varying float vFade;
    varying vec2 vXY;
    void main(){
      vec3 p = position;
      float h = max(p.z, 0.0);
      vec3 pr = p - light * (p.z / max(light.z, 0.15));
      pr.xy += jit * (h * 0.75 + 10.0);
      pr.z = 2.6;
      vFade = 1.0 - smoothstep(0.0, 250.0, h);
      vXY = pr.xy;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pr,1.0);
    }`,
  fragmentShader:`
    precision highp float;
    uniform float strength;
    uniform vec2 bookSize;
    varying float vFade;
    varying vec2 vXY;
    void main(){
      vec2 q = abs(vXY) / (bookSize*0.5);
      float clip = (1.0 - smoothstep(0.965, 1.0, max(q.x,q.y)));
      gl_FragColor = vec4(0.0,0.0,0.0, strength * vFade * vFade * clip);
    }`
});
const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
shadowMesh.renderOrder = 3;
shadowMesh.frustumCulled = false;
shadowMesh.visible = false;
book.add(shadowMesh);

/* ═══════════════════════════════════════════════════════════════
   10. PAGE-CURL DEFORMATION
   ------------------------------------------------------------------
   The leaf wraps onto a cylinder of radius R whose axis — the fold
   line, tilted by phi and a distance f from the spine — sweeps across
   the paper.  Material before the line stays flat on the open spread;
   material after it rolls up, over, and travels back across the book
   at height 2R, mirrored about the line.
   ═══════════════════════════════════════════════════════════════ */
const RMIN = 0.15, RMAX = 538, PHI = 0.215, DROOP = 0.70, DROOP_T = 0.30;

let side = 1;
let grabU = 0.84, grabV = 0.085;
let tiltSign = 1;
const yMid = (PAGE_TOP_Y + PAGE_BOT_Y)/2;

function resetSheet(s){
  side = s;
  for(let j=0;j<NY;j++){
    const v = j/(NY-1);
    const y = PAGE_BOT_Y + v*(PAGE_TOP_Y - PAGE_BOT_Y);
    for(let i=0;i<NX;i++){
      const k = (j*NX+i)*3;
      rest[k]   = (i/(NX-1))*PAGE_W;
      rest[k+1] = y;
      rest[k+2] = 0;
    }
  }
  const ia = side>0 ? idxAttrB : idxAttrA;
  sheetGeo.setIndex(ia);
  shadowGeo.index = ia;
}

const CP = {f:0, R:RMIN, cs:1, sn:0};
function curlParams(k, wob){
  k = Math.min(1, Math.max(0, k));
  const bell = Math.sin(Math.PI*k);
  let R = RMIN + RMAX * Math.pow(k, 1.3) * Math.pow(1 - k, 0.55);
  if(R < RMIN) R = RMIN;
  let phi = tiltSign * PHI * Math.sqrt(bell);
  if(wob){ R *= (1 + wob*0.16); phi += wob*0.05*tiltSign; }
  CP.f  = PAGE_W*(1-k);
  CP.R  = R;
  CP.cs = Math.cos(phi);
  CP.sn = Math.sin(phi);
}

const _p = [0,0,0];
let ripA = 0, ripPh = 0;
function deform(a, b){
  const {f, R, cs, sn} = CP;
  const dx = a - f, dy = b - yMid;
  const s  = dx*cs - dy*sn;
  const t  = dx*sn + dy*cs;
  let sp, z;
  if(s <= 0){ sp = s; z = 0; }
  else {
    const th = s/R;
    if(th <= Math.PI){ sp = R*Math.sin(th); z = R*(1 - Math.cos(th)); }
    else {
      const e = s - Math.PI*R, en = e/PAGE_W, tn = t/(PAGE_H*0.5);
      sp = -e;
      z  = 2*R - DROOP*R*en*en - DROOP_T*R*en*tn*tn;
    }
  }
  if(ripA > 0){
    const u = a/PAGE_W;
    z += ripA * u * Math.max(0, Math.sin(ripPh - u*4.2));
  }
  if(z < 0) z = 0;
  _p[0] = side*(f + sp*cs + t*sn);
  _p[1] = yMid - sp*sn + t*cs;
  _p[2] = z + 2.2;
  return _p;
}

function applyCurl(k, wob, rip){
  curlParams(k, wob);
  ripA = rip ? rip.a : 0;
  ripPh = rip ? rip.ph : 0;
  for(let j=0;j<NY;j++){
    for(let i=0;i<NX;i++){
      const o = (j*NX+i)*3;
      const q = deform(rest[o], rest[o+1]);
      pos[o] = q[0]; pos[o+1] = q[1]; pos[o+2] = q[2];
    }
  }
}

function updateGeometry(){
  const P = posAttr.array, Nm = nrmAttr.array;
  P.set(pos);
  for(let j=0;j<NY;j++) for(let i=0;i<NX;i++){
    const k = j*NX+i, o = k*3;
    const il = i>0 ? k-1 : k, ir = i<NX-1 ? k+1 : k;
    const jd = j>0 ? k-NX : k, ju = j<NY-1 ? k+NX : k;
    const ax = pos[ir*3]-pos[il*3], ay = pos[ir*3+1]-pos[il*3+1], az = pos[ir*3+2]-pos[il*3+2];
    const bx = pos[ju*3]-pos[jd*3], by = pos[ju*3+1]-pos[jd*3+1], bz = pos[ju*3+2]-pos[jd*3+2];
    let nx = ay*bz-az*by, ny = az*bx-ax*bz, nz = ax*by-ay*bx;
    const L = Math.hypot(nx,ny,nz) || 1;
    const sg = side > 0 ? 1 : -1;
    Nm[o] = sg*nx/L; Nm[o+1] = sg*ny/L; Nm[o+2] = sg*nz/L;
  }
  posAttr.needsUpdate = true;
  nrmAttr.needsUpdate = true;
  sheetGeo.computeBoundingSphere();
}

/* ═══════════════════════════════════════════════════════════════
   11. BOOK STATE
   ═══════════════════════════════════════════════════════════════ */
let PAGES = [];
let spread = 0;                 // which pair of leaves is mounted
let viewPage = 1;               // which single page is framed (narrow layout)
let turn = null;
let fade = null;
let single = false;

function spreadCount(){ return PAGES.length/2; }
function isRecto(p){ return (p % 2) === 1; }

function applyBase(){
  leftPage.material.map  = pageTex(spread*2);
  rightPage.material.map = pageTex(spread*2+1);
  leftPage.material.needsUpdate = true;
  rightPage.material.needsUpdate = true;
  drawShade((spread*2)/PAGES.length);
  updateChrome();
  prefetch();
}

let prefetchTimer = null;
function prefetch(){
  clearTimeout(prefetchTimer);
  const want = [spread*2+2, spread*2+3, spread*2-1]
                 .filter(i => i >= 0 && i < PAGES.length);
  let i = 0;
  const run = () => {
    if(i >= want.length || turn) return;
    pageTex(want[i++]);
    prefetchTimer = setTimeout(run, 24);
  };
  prefetchTimer = setTimeout(run, 90);
}

function beginTurn(dir, mode){
  if(turn) return false;
  if(dir > 0 && spread >= spreadCount()-1) return false;
  if(dir < 0 && spread <= 0) return false;

  const front = dir > 0 ? spread*2+1 : spread*2-1;   // recto of the leaf
  const back  = front + 1;                            // verso of the leaf

  if(dir > 0){
    leftPage.material.map  = pageTex(spread*2);
    rightPage.material.map = pageTex(spread*2+3);
  } else {
    leftPage.material.map  = pageTex(spread*2-2);
    rightPage.material.map = pageTex(spread*2+1);
  }
  leftPage.material.needsUpdate = true;
  rightPage.material.needsUpdate = true;

  const tf = pageTex(front), tb = pageTex(back);
  if(dir > 0){
    sheetUni.texA.value = tf; sheetUni.flipA.value = 0;
    sheetUni.texB.value = tb; sheetUni.flipB.value = 1;
  } else {
    sheetUni.texA.value = tb; sheetUni.flipA.value = 1;
    sheetUni.texB.value = tf; sheetUni.flipB.value = 0;
  }

  tiltSign = (grabV < 0.5 ? 1 : -1);
  resetSheet(dir > 0 ? 1 : -1);
  applyCurl(0, 0, null); updateGeometry();
  sheet.visible = true;
  shadowMesh.visible = true;
  turn = {dir, mode, k:0, target:0, t:0, T:0.9, from:0, commit:true, settling:false, st:0, vk:0,
          camFrom: camX, camTo: camX};

  if(single){
    setView(dir > 0 ? (spread+1)*2 : (spread-1)*2+1, true);
    turn.camTo = camTarget;
  }
  return true;
}

function finishTurn(){
  spread += turn.dir;
  turn = null;
  if(!single) viewPage = spread*2;
  applyBase();
  fade = 0;
}
function cancelTurn(){
  const d = turn.dir;
  turn = null;
  if(!single) viewPage = spread*2;
  applyBase();
  if(single) setView(d > 0 ? spread*2+1 : spread*2, true);
  fade = 0;
}

/* ═══════════════════════════════════════════════════════════════
   12. NAVIGATION
   ═══════════════════════════════════════════════════════════════ */
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
let pendingDir = 0;
let camX = 0, camTarget = 0;

function setView(p, keepSpread){
  viewPage = Math.max(0, Math.min(PAGES.length-1, p));
  if(!keepSpread){
    const sp = Math.floor(viewPage/2);
    if(sp !== spread){ spread = sp; applyBase(); }
  }
  camTarget = single ? (isRecto(viewPage) ? PAGE_W/2 : -PAGE_W/2) : 0;
  updateChrome();
}

function autoTurn(dir){
  if(!PAGES.length) return;
  if(turn){ pendingDir = dir; return; }
  grabU = 0.86; grabV = 0.09;
  if(!beginTurn(dir, 'auto')) return;
  turn.mode = 'auto'; turn.commit = true; turn.from = 0;
  turn.T = REDUCED ? 0.34 : 0.9; turn.t = 0;
}

function go(dir){
  if(!PAGES.length) return;
  if(!single){ autoTurn(dir); return; }
  if(turn){ pendingDir = dir; return; }
  if(dir > 0){
    if(!isRecto(viewPage) && viewPage + 1 < PAGES.length) setView(viewPage + 1);
    else autoTurn(1);
  } else {
    if(isRecto(viewPage) && viewPage > 0) setView(viewPage - 1);
    else autoTurn(-1);
  }
}

function jumpTo(pageIndex){
  const p = Math.max(0, Math.min(PAGES.length-1, pageIndex));
  spread = Math.floor(p/2);
  viewPage = p;
  applyBase();
  camTarget = single ? (isRecto(viewPage) ? PAGE_W/2 : -PAGE_W/2) : 0;
}

/* ═══════════════════════════════════════════════════════════════
   13. CHROME
   ═══════════════════════════════════════════════════════════════ */
const elDot = document.getElementById('dot');
const elLabel = document.getElementById('label');
const elTrack = document.getElementById('track');
const elPrev = document.getElementById('prev');
const elNext = document.getElementById('next');
const elRing = document.getElementById('ring');
const stageEl = document.getElementById('stage');

function updateChrome(){
  if(!PAGES.length) return;
  if(single){
    elLabel.textContent = pad2(viewPage);
    elDot.style.left = (viewPage/(PAGES.length-1)*100) + '%';
    elPrev.disabled = viewPage <= 0;
    elNext.disabled = viewPage >= PAGES.length-1;
  } else {
    const a = spread*2;
    elLabel.textContent = `${pad2(a)}–${pad2(a+1)}`;
    const f = spreadCount() > 1 ? spread/(spreadCount()-1) : 0;
    elDot.style.left = (f*100) + '%';
    elPrev.disabled = spread <= 0;
    elNext.disabled = spread >= spreadCount()-1;
  }
}

elPrev.onclick = () => go(-1);
elNext.onclick = () => go(+1);
document.getElementById('back').onclick = () => {
  // the host page decides what "back" means — the React wrapper forwards this
  try{ if(window.parent && window.parent !== window) window.parent.postMessage({type:'mobel-book:back'}, '*'); }catch(e){}
  if(EMBED) return;                      // the host scrolls; the book stays put
  stageEl.classList.add('leaving');
  setTimeout(() => stageEl.classList.remove('leaving'), 1100);
};

let trackDrag = false;
elTrack.addEventListener('pointerdown', e => {
  trackDrag = true; elTrack.setPointerCapture(e.pointerId); scrubTo(e);
});
elTrack.addEventListener('pointermove', e => { if(trackDrag) scrubTo(e); });
elTrack.addEventListener('pointerup', () => { trackDrag = false; });
function scrubTo(e){
  if(turn) return;
  const r = elTrack.getBoundingClientRect();
  const f = Math.max(0, Math.min(1, (e.clientX - r.left)/r.width));
  if(single){
    const p = Math.round(f*(PAGES.length-1));
    if(p === viewPage) return;
    if(Math.abs(p - viewPage) === 1) go(p > viewPage ? 1 : -1);
    else jumpTo(p);
  } else {
    const s = Math.round(f*(spreadCount()-1));
    if(s === spread) return;
    if(Math.abs(s - spread) === 1) go(s > spread ? 1 : -1);
    else jumpTo(s*2);
  }
}

addEventListener('keydown', e => {
  if(e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown'){ go(+1); e.preventDefault(); }
  if(e.key === 'ArrowLeft'  || e.key === 'PageUp'){ go(-1); e.preventDefault(); }
  if(e.key === 'Home'){ jumpTo(0); e.preventDefault(); }
  if(e.key === 'End'){ jumpTo(PAGES.length-1); e.preventDefault(); }
});

/* ═══════════════════════════════════════════════════════════════
   14. POINTER
   ═══════════════════════════════════════════════════════════════ */
let scale = 1, uiScale = 1;
function screenToBook(cx, cy){
  const x = (cx - innerWidth/2)/scale + camX;
  const y = -(cy - innerHeight/2)/scale - BOOK_OFF_Y;
  return {x, y};
}

let dragging = false, gesture = 'none';
let clickMove = 0, downX = 0, downY = 0, panFrom = 0;

canvas.addEventListener('pointerdown', e => {
  downX = e.clientX; downY = e.clientY; clickMove = 0;
  if(turn || fade !== null) return;
  const p = screenToBook(e.clientX, e.clientY);
  if(p.y > BOOK_H/2 || p.y < -BOOK_H/2) return;
  if(Math.abs(p.x) > PAGE_W + BOARD) return;
  dragging = true;
  gesture = single ? 'undecided' : 'curl';
  canvas.setPointerCapture(e.pointerId);
  ring(e.clientX, e.clientY, true);
  if(!single){
    const dir = p.x >= 0 ? 1 : -1;
    grabU = Math.min(0.99, Math.max(0.16, Math.abs(p.x)/PAGE_W));
    grabV = Math.min(0.97, Math.max(0.03, (p.y - PAGE_BOT_Y)/PAGE_H));
    if(!beginTurn(dir, 'drag')){ dragging = false; gesture = 'none'; return; }
    document.body.classList.add('grabbing');
  }
});

canvas.addEventListener('pointermove', e => {
  ringMove(e.clientX, e.clientY);
  clickMove = Math.max(clickMove, Math.hypot(e.clientX - downX, e.clientY - downY));
  if(!dragging) return;

  if(gesture === 'undecided'){
    const dx = e.clientX - downX;
    if(Math.abs(dx) < 8) return;
    const wantDir = dx < 0 ? 1 : -1;
    const needsTurn = wantDir > 0 ? isRecto(viewPage) : !isRecto(viewPage);
    if(needsTurn){
      const p = screenToBook(downX, downY);
      grabU = Math.min(0.99, Math.max(0.16, Math.abs(p.x)/PAGE_W));
      grabV = Math.min(0.97, Math.max(0.03, (p.y - PAGE_BOT_Y)/PAGE_H));
      if(beginTurn(wantDir, 'drag')){
        gesture = 'curl';
        document.body.classList.add('grabbing');
      } else { dragging = false; gesture = 'none'; return; }
    } else {
      gesture = 'pan';
      panFrom = camX;
      document.body.classList.add('panning');
    }
  }

  if(gesture === 'curl'){
    if(!turn) return;
    const p = screenToBook(e.clientX, e.clientY);
    const span = grabU*PAGE_W + PAGE_W*0.80;
    const start = turn.dir * grabU * PAGE_W;
    turn.target = Math.max(0, Math.min(1, turn.dir*(start - p.x) / span));
  } else if(gesture === 'pan'){
    const dx = (e.clientX - downX)/scale;
    camTarget = Math.max(-PAGE_W/2, Math.min(PAGE_W/2, panFrom - dx));
    camX = camTarget;
  }
});

function endDrag(){
  if(!dragging) return;
  dragging = false;
  document.body.classList.remove('grabbing','panning');
  ring(0,0,false);
  const g = gesture; gesture = 'none';

  if(g === 'pan'){
    const home = isRecto(viewPage) ? PAGE_W/2 : -PAGE_W/2;
    const dx = camX - home;
    if(Math.abs(dx) > PAGE_W*0.14) go(dx > 0 ? 1 : -1);
    else camTarget = home;
    return;
  }
  if(g === 'undecided'){
    if(clickMove < 7){
      const p = screenToBook(downX, downY);
      go(p.x >= camX ? 1 : -1);
    }
    return;
  }
  if(!turn) return;
  turn.mode = 'auto';
  turn.t = 0;
  turn.from = turn.k;
  const tap = clickMove < 7;
  const flick = turn.vk > 1.1;
  if(tap || flick || turn.k > 0.45){
    turn.commit = true;
    turn.T = tap ? (REDUCED ? 0.34 : 0.9) : (0.20 + 0.55*(1 - turn.k));
  } else {
    turn.commit = false; turn.T = 0.15 + 0.40*turn.k;
  }
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

/* the wheel turns pages when the book is the whole page; embedded in the
   MØBEL site it is left alone so the host keeps scrolling through */
let wheelAcc = 0, wheelLock = 0;
if(!EMBED) canvas.addEventListener('wheel', e => {
  const now = performance.now();
  if(now < wheelLock) return;
  wheelAcc += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY);
  if(Math.abs(wheelAcc) > 90){
    go(wheelAcc > 0 ? 1 : -1);
    wheelAcc = 0; wheelLock = now + 380;
  }
  e.preventDefault();
}, {passive:false});

function ring(x,y,on){
  if(on){ elRing.style.left = x+'px'; elRing.style.top = y+'px'; elRing.classList.add('on'); }
  else elRing.classList.remove('on');
}
function ringMove(x,y){
  if(elRing.classList.contains('on')){ elRing.style.left = x+'px'; elRing.style.top = y+'px'; }
}

/* ═══════════════════════════════════════════════════════════════
   15. LAYOUT / LOOP
   ═══════════════════════════════════════════════════════════════ */
const SPREAD_FRAME_W = BOOK_W * 1.08;              // 2387
const SINGLE_FRAME_W = (PAGE_W + MARG*2) * 1.10;   // 1247
let lastGlowCam = -999;

function chooseLayout(){
  const vw = Math.max(320, innerWidth), vh = Math.max(320, innerHeight);
  const spreadScale = Math.min(vw/SPREAD_FRAME_W, vh/FR_H);
  const singleScale = Math.min(vw/SINGLE_FRAME_W, vh/FR_H);
  const wantSingle = (vw/vh < 1.0) ||
                     (spreadScale * BODY_BASE < MIN_PX && singleScale > spreadScale * 1.12);
  return { single: wantSingle, scale: wantSingle ? singleScale : spreadScale };
}

function resize(){
  const vw = Math.max(1, innerWidth), vh = Math.max(1, innerHeight);
  const L = chooseLayout();
  const modeChanged = L.single !== single;
  single = L.single;
  scale  = Math.max(0.05, L.scale);
  uiScale = Math.max(scale, Math.min(0.46, vh/1400, vw/1500));

  document.documentElement.style.setProperty('--s', scale);
  document.documentElement.style.setProperty('--u', uiScale);
  document.documentElement.style.setProperty('--bw', BOOK_W);
  document.documentElement.style.setProperty('--bh', BOOK_H);
  document.documentElement.style.setProperty('--br', COVER_R);

  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(vw, vh, false);
  camera.aspect = vw/vh;
  camera.position.z = (vh/scale) / (2*Math.tan(FOV*Math.PI/360));
  camera.updateProjectionMatrix();

  // texture resolution follows the on-screen size of a page
  const nq = Math.max(0.85, Math.min(1.8, scale*Math.min(devicePixelRatio,2)));
  const qChanged = Math.abs(nq - TQ) > 0.12;

  if(!PAGES.length){ TQ = nq; return; }

  if(qChanged){ TQ = nq; initPool(); applyBase(); }

  if(modeChanged || qChanged){
    camTarget = single ? (isRecto(viewPage) ? PAGE_W/2 : -PAGE_W/2) : 0;
    camX = camTarget;
    applyBase();
  }
  updateChrome();
}
let resizeTimer = null;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(resize, 120);
});

let last = performance.now();
let paused = false;
function frame(now){
  requestAnimationFrame(frame);
  let dt = Math.min(0.033, (now - last)/1000);
  last = now;
  if(paused) return;
  step(dt);
}

function step(dt){
  hostStep(dt);
  if(turn){
    if(turn.mode === 'auto'){
      turn.t += dt;
      const p = Math.min(1, turn.t/turn.T);
      const e = 1 - Math.pow(1 - Math.pow(p, 1.08), 3.0);
      const to = turn.commit ? 1 : 0;
      turn.target = turn.from + (to - turn.from)*e;
      if(p >= 1) turn.settling = true;
    }
    const k0 = turn.k;
    turn.k += (turn.target - turn.k) * Math.min(1, dt*22);
    const inst = dt > 0 ? (turn.k - k0)/dt : 0;
    turn.vk = turn.vk*0.7 + inst*0.3;

    let wob = 0, rip = null;
    if(turn.settling){
      turn.st += dt;
      rip = REDUCED ? null : { a: 30 * Math.exp(-turn.st*9.0), ph: turn.st*20.0 };
      if(turn.st > 0.26){
        if(turn.commit) finishTurn(); else cancelTurn();
      }
    } else if(turn.mode === 'auto' && turn.commit){
      wob = Math.sin(turn.t*13.0) * 0.045 * Math.sin(Math.PI*Math.min(1,turn.k));
    }
    if(turn){ applyCurl(turn.k, wob, rip); updateGeometry(); }
  }

  if(fade !== null){
    fade += dt;
    const a = 1 - fade/0.10;
    if(a <= 0){
      fade = null; sheet.visible = false; sheetUni.opacity.value = 1;
      if(pendingDir){ const d = pendingDir; pendingDir = 0; go(d); }
    } else sheetUni.opacity.value = a;
  }

  if(single && turn && turn.camFrom !== turn.camTo){
    const e = turn.k*turn.k*(3 - 2*turn.k);
    camX = turn.camFrom + (turn.camTo - turn.camFrom)*e;
  } else if(Math.abs(camTarget - camX) > 0.05){
    camX += (camTarget - camX) * Math.min(1, dt*8.5);
  } else camX = camTarget;
  camera.position.x = camX;
  const gc = Math.round(camX*scale*10)/10;
  if(gc !== lastGlowCam){
    lastGlowCam = gc;
    document.documentElement.style.setProperty('--camx', gc + 'px');
  }

  updateVeil();
  shadowMesh.visible = sheet.visible && fade === null;
  renderer.render(scene, camera);
}

/* ── scroll-scrub: the host drives a curated run of page turns from its own scroll progress.
   v is a fractional spread index (0 … spreads-1); every whole step is one physical page turn.
   The value is eased here, so a fast scroll still passes through each curl instead of jumping. ── */
let hostTo = null, hostCur = 0;
function scrub(v){
  if(hostTo === null) hostCur = spread;
  hostTo = Math.max(0, Math.min(Math.max(0, spreadCount() - 1), v));
}
function hostStep(dt){
  if(hostTo === null || !PAGES.length) return;
  hostCur += (hostTo - hostCur) * Math.min(1, dt * 9);
  if(Math.abs(hostTo - hostCur) < 0.002) hostCur = hostTo;
  if(fade !== null) return;                                  // a turn is still settling
  if(turn){
    if(turn.mode !== 'scrub') return;                        // a manual turn owns the sheet
    const want = turn.dir > 0 ? hostCur - spread : spread - hostCur;
    if(want >= 0.985){ turn.mode = 'auto'; turn.commit = true;  turn.from = turn.k; turn.t = 0; turn.T = 0.22; }
    else if(want <= 0.015){ turn.mode = 'auto'; turn.commit = false; turn.from = turn.k; turn.t = 0; turn.T = 0.18; }
    else turn.target = want;
    return;
  }
  const d = hostCur - spread;
  if(d > 0.012 && spread < spreadCount() - 1){ grabU = 0.86; grabV = 0.09; if(beginTurn(1, 'scrub')) turn.target = Math.min(1, d); }
  else if(d < -0.012 && spread > 0){ grabU = 0.86; grabV = 0.09; if(beginTurn(-1, 'scrub')) turn.target = Math.min(1, -d); }
}

window.__dbg = {
  step, autoTurn, go, jumpTo, scrub, scrubState: ()=>({hostTo, hostCur, spread, turning: !!turn}),
  pause(v){ paused = v; },
  turn: ()=>turn,
  setGrab(u,v){ grabU=u; grabV=v; },
  state: ()=>({spread, viewPage, single, scale:+scale.toFixed(4), TQ:+TQ.toFixed(3),
               pages:PAGES.length, placeholders:Object.keys(IMG).filter(k => IMG[k].placeholder)}),
  images: ()=>IMG,
  params: ()=>({...CP})
};

/* ═══════════════════════════════════════════════════════════════
   16. BOOT
   ═══════════════════════════════════════════════════════════════ */
function warmShaders(){
  resetSheet(1);
  applyCurl(0.35, 0, null);
  updateGeometry();
  sheetUni.texA.value = pageTex(2);
  sheetUni.texB.value = pageTex(3);
  sheetUni.opacity.value = 0.001;
  sheet.visible = true; shadowMesh.visible = true;
  renderer.render(scene, camera);
  sheet.visible = false; shadowMesh.visible = false;
  sheetUni.opacity.value = 1;
}

async function boot(){
  try{
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load(`400 ${BODY_BASE}px "Inter Tight"`),
      document.fonts.load(`500 ${BODY_BASE}px "Inter Tight"`),
      document.fonts.load(`300 ${BODY_BASE}px "Inter Tight"`),
      document.fonts.load(`400 96px "Instrument Serif"`),
      document.fonts.load(`italic 400 96px "Instrument Serif"`)
    ]);
  }catch(err){ /* offline: system fallbacks */ }

  resize();
  const photographs = loadImages();   // starts the fetches; slots hold a wash meanwhile
  PAGES = buildPages();
  window.__PAGES = PAGES;
  TQ = Math.max(0.85, Math.min(1.8, scale*Math.min(devicePixelRatio,2)));
  initPool();
  jumpTo(1);                      // open on the cover spread
  camX = camTarget;
  warmShaders();
  requestAnimationFrame(frame);

  // hold the curtain briefly so a fast connection opens on real photography,
  // but never wait on a slow one — late arrivals repaint the mounted pages
  bootProgress();
  await Promise.race([photographs, new Promise(r => setTimeout(r, 4500))]);
  document.getElementById('boot').classList.add('gone');
}
boot();
