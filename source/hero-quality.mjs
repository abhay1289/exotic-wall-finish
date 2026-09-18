import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const pbr = {};
const params = new URLSearchParams(location.search);
export const materialSize = params.get('quality') === '4k' ? 4096 : (innerWidth < 700 ? 1024 : Math.max(innerWidth, innerHeight) * Math.min(devicePixelRatio || 1, 2) >= 2800 ? 4096 : 2048);
export async function loadMaterialImages() {
  const loader = new THREE.ImageLoader();
  await Promise.all(['linen','leather','walnut','floor'].map(async name => {
    const images = await Promise.all(['color','normal','roughness'].map(async channel => {
      try {
        const deliverySize = channel === "roughness" ? Math.min(materialSize,1024) : ((name === "walnut" || name === "floor") ? Math.min(materialSize,2048) : materialSize);
        const url = new URL(`../materials/${name}-${channel}-${deliverySize}.webp`, import.meta.url);
        let timer;
        try{return await Promise.race([loader.loadAsync(url.href),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("Texture timeout")),12000);})]);}finally{clearTimeout(timer);}
      } catch (error) { console.warn(`MØBEL: using fallback for ${name} ${channel}`); return null; }
    }));
    pbr[name] = Object.fromEntries(['color','normal','roughness'].map((c,i)=>[c, images.every(Boolean) ? images[i] : null]));
  }));
}

// De-dye the scanned surface in the shader so the existing collection's colors stay intact.
export function neutralTint(material, gain) {
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      #ifdef USE_MAP
        vec4 surface = texture2D(map, vMapUv);
        float yarn = clamp(dot(surface.rgb, vec3(0.2126,0.7152,0.0722)) * ${gain.toFixed(4)}, 0.35, 1.15);
        diffuseColor *= vec4(vec3(yarn),surface.a);
      #endif
    `);
  };
  material.customProgramCacheKey = () => `mobel-surface-${gain}`;
  return material;
}

// Map in metres, keeping the weave/grain size independent of cushion and panel dimensions.
export function mapBoxUV(geometry, period = 1, grain = false) {
  const p = geometry.attributes.position, n = geometry.attributes.normal, uv = geometry.attributes.uv;
  geometry.computeBoundingBox();
  const size = new THREE.Vector3(); geometry.boundingBox.getSize(size);
  for (let i=0;i<p.count;i++) {
    const ax=Math.abs(n.getX(i)), ay=Math.abs(n.getY(i)), az=Math.abs(n.getZ(i));
    let u, v;
    if (ay>=ax && ay>=az) { u=p.getX(i); v=p.getZ(i); if(grain && size.x<size.z) [u,v]=[v,u]; }
    else if(ax>=az) {u=p.getZ(i);v=p.getY(i);}
    else {u=p.getX(i);v=p.getY(i);}
    uv.setXY(i,u/period+0.5,v/period+0.5);
  }
  uv.needsUpdate=true;
  return geometry;
}

const threadMaterials = new Map();
function threadFor(material) {
  const key=material.color.getHex();
  if (!threadMaterials.has(key)) threadMaterials.set(key,new THREE.MeshStandardMaterial({color:material.color.clone().multiplyScalar(0.72),roughness:0.92}));
  return threadMaterials.get(key);
}
export function piping(points, material, radius=0.0017, closed=true) {
  const curve=new THREE.CatmullRomCurve3(points,closed,'centripetal');
  const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(48,points.length*2),radius,5,closed),threadFor(material));
  mesh.castShadow=false; mesh.receiveShadow=true;
  return mesh;
}
function seamLoop(w,h,d,axis, inset=0.012) {
  const pts=[], a=axis==='y'?w/2-inset:w/2-inset, b=axis==='y'?d/2-inset:h/2-inset;
  const radius=Math.min(0.055,a*0.28,b*0.28);
  for(const [cx,cy,start] of [[a-radius,b-radius,0],[-a+radius,b-radius,Math.PI/2],[-a+radius,-b+radius,Math.PI],[a-radius,-b+radius,Math.PI*1.5]]) {
    for(let k=0;k<9;k++) {const t=start+k/8*Math.PI/2;const x=cx+radius*Math.cos(t),v=cy+radius*Math.sin(t);pts.push(axis==='y'?new THREE.Vector3(x,0,v):new THREE.Vector3(x,v,0));}
  }
  return pts;
}
export function upholstered(w,h,d,material,radius,amp=0.012,dip=0) {
  const geometry = new RoundedBoxGeometry(w,h,d,10,Math.min(radius,Math.min(w,h,d)*0.48));
  mapBoxUV(geometry,material.userData.period||0.32);
  const p=geometry.attributes.position,n=geometry.attributes.normal;
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),nx=n.getX(i),ny=n.getY(i),nz=n.getZ(i);
    const edge=Math.max(Math.abs(x)/(w/2),Math.abs(z)/(d/2));
    const hand= Math.sin(x*8.2+0.7)*Math.cos(z*7.8+1.2)*0.5+Math.sin(x*21+z*13)*0.15;
    let def=amp*hand;
    if(ny>0.6) def-=dip*Math.exp(-((x/w)**2+(z/d)**2)*10);
    // Folds collect near the perimeter, with a quiet central seat surface.
    def+=amp*0.28*Math.sin(x*53+z*35)*Math.max(0,edge-0.55)**2;
    p.setXYZ(i,x+nx*def,y+ny*def,z+nz*def);
  }
  geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;
  if(h>=0.075&&h<=0.26&&w>0.3&&d>0.3) {
    const seam=piping(seamLoop(w,h,d,'y'),material,0.0016);
    seam.position.y=h*0.18;mesh.add(seam);
  } else if(d<=0.24&&h>0.28&&w>0.3) {
    const seam=piping(seamLoop(w,h,d,'z'),material,0.0015);
    seam.position.z=d*0.14;mesh.add(seam);
  }
  return mesh;
}

// A continuous cloth surface crosses the top, bends around the edge, then hangs with gravity.
export function textileDrape(width, points, material, folds=6) {
  const curve=new THREE.CatmullRomCurve3(points.map(([z,y])=>new THREE.Vector3(0,y,z)));
  const g=new THREE.PlaneGeometry(width,1,44,72),p=g.attributes.position,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i),t=1-uv.getY(i),v=curve.getPoint(t);
    const f=Math.sin((x/width+0.5)*Math.PI*folds+0.35)*0.012 + Math.sin(x*41+t*3)*0.003;
    p.setXYZ(i,x,v.y+f*(1-t*0.45),v.z+f*t);
    uv.setXY(i,x/(material.userData.period||0.32),t*curve.getLength()/(material.userData.period||0.32));
  }
  g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,material);mesh.castShadow=mesh.receiveShadow=true;
  return mesh;
}

export function vessel(profile, material, segments=64) {
  const g=new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),segments);
  const m=new THREE.Mesh(g,material);m.castShadow=m.receiveShadow=true;return m;
}

export function paddedDisc(radius,height,material) {
  const points=[[0,-height/2],[radius*0.88,-height/2],[radius*0.98,-height*0.3],[radius,height*0.04],[radius*0.96,height*0.38],[radius*0.82,height/2],[radius*0.45,height*0.54],[0,height*0.46]];
  const mesh=vessel(points,material,72);mapBoxUV(mesh.geometry,material.userData.period||0.4);
  const ring=[];for(let i=0;i<80;i++){const a=i/80*Math.PI*2;ring.push(new THREE.Vector3(Math.sin(a)*radius*0.993,height*0.06,Math.cos(a)*radius*0.993));}
  mesh.add(piping(ring,material));return mesh;
}
