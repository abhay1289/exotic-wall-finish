# MØBEL — The Living Collection

Local clone of the [MØBEL luxury interior template](https://model-luxury.aura.build/), including the cinematic 3D room, product catalog, lookbook, gallery, fonts, photographs, and PBR materials.

## Run locally

```sh
npm start
```

Then open [http://localhost:4173](http://localhost:4173). A static file server is required so the 3D modules and `srcdoc` lookbook/gallery pages can load.

## Rebuild the 3D bundles

Editable Three.js sources live in `source/`. After changing them:

```sh
npm install
npm run build
```

That rebuilds `assets/js/` and rewires the hashed module tags in `index.html` and `pages/`.

## What’s included

- Cinematic scroll hero that furnishes a procedural room (rug, sectional, dining, pendants, upstairs bed)
- Shop grid, featured Havn sectional, materials sequence, story, catalogue lookbook, and spaces gallery
- Local Inter / Inter Tight / Instrument Serif fonts
- Unsplash interior photography (WebP) and Poly Haven PBR materials
- Three.js 0.160 lookbook (`pages/catalog.html`) and wave-strip gallery (`pages/gallery.html`)
