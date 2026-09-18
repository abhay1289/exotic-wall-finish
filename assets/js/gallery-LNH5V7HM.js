import{$ as ye,D as pe,E as ve,G as J,N as B,Oa as Le,R as ge,X as Q,_ as ee,da as xe,k as fe,la as we,na as Ee,ra as be,v as he}from"./shared-CWFSUZXS.js";var Pe=document.documentElement.classList.contains("embed"),oe=(e,t,n,o=78)=>new URL(`../images/gallery/${e}-${t}x${n}.webp`,import.meta.url).href,v=[{name:"Venetian Gold",place:"Coral Gables, FL",year:"2026",tag:"Residence",img:"1600585154340-be6161a56a0c",desc:"Aesthetic Marmorino in a glass-walled house. Venetian plaster, lime wash and gold veins, arranged for evenings that last until midnight.",pieces:["Venetian Plaster","Marmorino","Lime Wash"]},{name:"Textured Elegance",place:"Miami Beach, FL",year:"2026",tag:"Apartment",img:"1583847268964-b28dc8f51f92",desc:"A harbour-side apartment finished in hand-troweled lime, with the light doing most of the decorating.",pieces:["Venetian Plaster","Grassello di Calce","Lime Paint"]},{name:"Modern Minimalist",place:"Brickell, FL",year:"2025",tag:"Studio",img:"1567016376408-0226e4d0c1ea",desc:"Smooth mineral finish, one dark wall, and nothing else that needs explaining.",pieces:["Marmorino","Lime Wash"]},{name:"Brutalist Charm",place:"Wynwood, FL",year:"2025",tag:"Residence",img:"1618221195710-dd6b41faaea6",desc:"A long room opened to the garden. Raw concrete aesthetic, light for everyone.",pieces:["Venetian Plaster","Faux Finish","Microcement"]},{name:"Organic Movement",place:"Coconut Grove, FL",year:"2024",tag:"Summer house",img:"1631679706909-1844bbd07221",desc:"Sweeping lime wash, for a house that is only ever lived in barefoot.",pieces:["Grassello di Calce","Marmorino","Lime Paint"]},{name:"Dark Obsidian",place:"Miami, FL",year:"2025",tag:"Workspace",img:"1600494603989-9650cf6ddd3d",desc:"High-gloss black plaster and a desk by the window. A room for thinking slowly.",pieces:["Commercial Plastering","Residential Artisan"]},{name:"Earthy Warmth",place:"Boca Raton, FL",year:"2024",tag:"Bedroom",img:"1595526114035-0d45ed16cfbf",desc:"Terracotta-infused Marmorino and morning light. The rest of the house can wait.",pieces:["Residential Artisan","Lime Paint"]},{name:"Pearl Shimmer",place:"Palm Beach, FL",year:"2024",tag:"Dining",img:"1519710164239-da123dc03ef4",desc:"A pearl wash, four walls and a plant. The most-used room in the house.",pieces:["Faux Finish","Commercial Plastering"]},{name:"Industrial Chic",place:"Aventura, FL",year:"2023",tag:"Apartment",img:"1554995207-c18c203602cb",desc:"Microcement against an olive wall, in a loft with more windows than walls.",pieces:["Marmorino","Lime Wash","Grassello di Calce"]},{name:"Timeless Stucco",place:"Fort Lauderdale, FL",year:"2025",tag:"Kitchen",img:"1600607686527-6fb886090705",desc:"Italian lime stucco on the walls, lit by a single pair of pendants.",pieces:["Microcement","Commercial Plastering"]},{name:"Black Marmorino",place:"Key Biscayne, FL",year:"2023",tag:"Guest room",img:"1615874959474-d609969a20ed",desc:"A guest room that guests are reluctant to leave.",pieces:["Lime Paint","Grassello di Calce"]},{name:"Microcement Bath",place:"Coral Gables, FL",year:"2024",tag:"Dining",img:"1617806118233-18e1de247200",desc:"Seamless, waterproof wetroom cladding, under a mirror that doubles the room.",pieces:["Faux Finish","Microcement"]},{name:"Grassello di Calce",place:"South Beach, FL",year:"2023",tag:"Workspace",img:"1524758631624-e2822e304c36",desc:"A creative studio with a living room\u2019s manners.",pieces:["Marmorino","Residential Artisan"]},{name:"Lime Wash Living",place:"Pinecrest, FL",year:"2026",tag:"Residence",img:"1586023492125-27b2c045efd7",desc:"One mineral wall, one lamp, one afternoon.",pieces:["Marmorino","Lime Paint"]}],y=1200,f=774;function je(e){let t=document.createElement("canvas");t.width=y,t.height=f;let n=t.getContext("2d"),o=n.createLinearGradient(0,0,0,f);return o.addColorStop(0,"#e2ddd3"),o.addColorStop(1,"#d8d2c7"),n.fillStyle=o,n.fillRect(0,0,y,f),n.fillStyle="rgba(20,19,18,.28)",n.font='italic 400 64px "Instrument Serif", Georgia, serif',n.textAlign="center",n.textBaseline="middle",n.fillText(e.name,y/2,f/2),n.font="400 14px Inter, sans-serif",n.letterSpacing="4px",n.fillText((e.place+"  \xB7  "+e.year).toUpperCase(),y/2,f/2+58),t}async function Ye(e){let t=await fetch(e,{mode:"cors"});if(!t.ok)throw new Error("HTTP "+t.status);return createImageBitmap(await t.blob())}function Me(e){let t=new be(e);return t.colorSpace=pe,t.anisotropy=8,t.minFilter=he,t.generateMipmaps=!0,t}var le=document.getElementById("gl"),S=new we({canvas:le,antialias:!0,alpha:!1,powerPreference:"high-performance"});S.setClearColor(new ge("#efebe4"),1);S.outputColorSpace=ve;S.toneMapping=fe;var V=new Ee,b=new ye(45,1,.05,120);b.position.set(0,-.06,1.6);var g=1,C=g/1.55,Ze=.024,w=g+Ze,R=v.length,Te=R*w,He=2.95,ke=1.48,Be=.3,Ie=-.21,N=.6,X=.4,We=.052,$e=.55,Se=`
uniform float uOffset, uAmp, uTime, uCurve, uZW;
uniform vec3  uShift;
varying vec2  vUv;
varying float vWX;
varying vec3  vNrm;
varying vec3  vPos;

vec3 deform(vec3 p){
  float wx = p.x + uOffset;
  float a  = wx*${He.toFixed(4)} + uTime*${Be.toFixed(4)};
  float b  = wx*${ke.toFixed(4)} + uTime*(${Ie.toFixed(4)});
  float wy = sin(a)*${N.toFixed(3)} + sin(b)*${X.toFixed(3)};
  float wz = cos(a)*${N.toFixed(3)} + cos(b)*${X.toFixed(3)};
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
}`,Ce=`
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
}`,Re=new xe(g,C,110,64),P=[],Je=document.getElementById("labels"),se=0;v.forEach((e,t)=>{let n=Me(je(e)),o=document.createElement("canvas");o.width=y,o.height=f;let a=Me(o);e._thumb=oe(e.img,400,258,70);let s={uOffset:{value:0},uAmp:{value:.03},uTime:{value:0},uCurve:{value:We},uZW:{value:$e},uOpacity:{value:1}},r=new ee({vertexShader:Se,fragmentShader:Ce,transparent:!0,uniforms:{...s,uTex:{value:a},uTex0:{value:n},uHover:{value:0},uFade:{value:0},uShadow:{value:0},uShift:{value:new B(0,0,0)},uRadius:{value:.043},uAspect:{value:g/C},uTexAspect:{value:y/f}}}),c=new ee({vertexShader:Se,fragmentShader:Ce,transparent:!0,depthWrite:!1,uniforms:{...s,uTex:{value:a},uTex0:{value:n},uHover:{value:0},uFade:{value:0},uShadow:{value:1},uShift:{value:new B(0,-.055,-.03)},uRadius:{value:.09},uAspect:{value:g/C},uTexAspect:{value:y/f}}}),i=new Q(Re,r);i.frustumCulled=!1,i.renderOrder=2,V.add(i);let d=new Q(Re,c);d.frustumCulled=!1,d.renderOrder=1,V.add(d);let M=document.createElement("div");M.className="lab",M.innerHTML='<span class="nm"></span><span class="yr"></span>',M.querySelector(".nm").textContent=e.name,M.querySelector(".yr").textContent=e.place,Je.appendChild(M);let Z=document.createElement("div"),$={p:e,mesh:i,shadow:d,mat:r,shadowMat:c,lab:M,dot:Z,offset:0,index:t,hover:0,fade:0,ready:!1};P.push($),Ye(oe(e.img,y,f)).then(k=>{o.getContext("2d").drawImage(k,0,0,y,f),k.close&&k.close(),a.needsUpdate=!0,$.ready=!0,se++}).catch(k=>{console.warn("photo failed",e.name,k.message),$.ready=!0,$.failed=!0,se++})});var I=0,G=0,D=1;function De(){I=window.innerWidth,G=window.innerHeight,D=I/G,S.setPixelRatio(Math.min(window.devicePixelRatio,2)),S.setSize(I,G,!1),b.aspect=D;let e=J.degToRad(b.fov),t=J.clamp(.53+(1.35-D)*.42,.53,.88),n=g/(2*Math.tan(e/2)*D*t),o=C/(2*Math.tan(e/2)*.66);n=Math.max(n,o),b.position.z=n,b.updateProjectionMatrix()}window.addEventListener("resize",De);De();var l=0,E=0,te=0,Ae=0,L=!1,ze=0,Ge=0,_=0,Oe=0,K=-1e4,j=-1e4,h="featured",u=!1,W=null,Qe=()=>I*.53/g;addEventListener("wheel",e=>{if(u){e.target.closest("#sheetScroll")||e.preventDefault();return}if(h!=="featured")return;let t=Math.abs(e.deltaX)>Math.abs(e.deltaY);if(Pe&&!t&&!e.shiftKey)return;e.preventDefault();let n=t?e.deltaX:e.deltaY;l+=n*.0016},{passive:!1});function et(e,t){u||h!=="featured"||(L=!0,ze=e,Ge=l,_=0,Oe=performance.now(),W=null,document.body.style.cursor="grabbing")}function tt(e,t){if(K=e,j=t,!L)return;let n=e-ze;_=Math.max(_,Math.abs(n)),l=Ge-n/Qe()*1.05}function Ue(){L&&(L=!1,document.body.style.cursor="")}le.addEventListener("pointerdown",e=>{e.button===0&&(e.preventDefault(),et(e.clientX,e.clientY))});addEventListener("pointermove",e=>tt(e.clientX,e.clientY));addEventListener("pointerup",Ue);addEventListener("pointercancel",Ue);addEventListener("pointerleave",()=>{K=j=-1e4});addEventListener("keydown",e=>{e.key==="Escape"&&Y(),!(u||h!=="featured")&&(e.key==="ArrowRight"&&(l+=w),e.key==="ArrowLeft"&&(l-=w))});var O=null;le.addEventListener("click",e=>{if(h!=="featured"||u||_>6||performance.now()-Oe>420)return;let t=qe(e.clientX,e.clientY)||O;t&&me(t.p)});function qe(e,t){let n=null,o=1e9;for(let a of P){if(!a.mesh.visible||Math.abs(a.offset)>1.6)continue;let s=F(A(0,0,a.offset,x,T)),r=Math.abs(F(A(g/2,0,a.offset,x,T)).x-s.x),c=Math.abs(F(A(0,C/2,a.offset,x,T)).y-s.y),i=Math.abs(e-s.x),d=Math.abs(t-s.y);i<r*1.02&&d<c*1.35&&i<o&&(o=i,n=a)}return n}function A(e,t,n,o,a){let s=e+n,r=s*He+a*Be,c=s*ke+a*Ie,i=Math.sin(r)*N+Math.sin(c)*X,d=Math.cos(r)*N+Math.cos(c)*X;return new B(s,t+i*o,d*o*$e-s*s*We)}var z=new B;function F(e){return z.copy(e).project(b),{x:(z.x*.5+.5)*I,y:(-z.y*.5+.5)*G,z:z.z}}var at=document.getElementById("full"),p=document.getElementById("fullList"),H=document.getElementById("thumb"),nt=H.querySelector("img");v.forEach((e,t)=>{let n=document.createElement("span");if(n.className="it",n.textContent=e.name,n.dataset.i=t,p.appendChild(n),t<v.length-1){let o=document.createElement("span");o.className="sep",o.textContent="\xB7",p.appendChild(o)}});var ae=0,ne=0;p.addEventListener("pointerover",e=>{let t=e.target.closest(".it");t&&(p.classList.add("hasHover"),p.querySelectorAll(".it.hot").forEach(n=>n.classList.remove("hot")),t.classList.add("hot"),nt.src=v[+t.dataset.i]._thumb,H.classList.add("on"))});p.addEventListener("pointerout",e=>{e.relatedTarget&&p.contains(e.relatedTarget)||(p.classList.remove("hasHover"),p.querySelectorAll(".it.hot").forEach(t=>t.classList.remove("hot")),H.classList.remove("on"))});p.addEventListener("click",e=>{let t=e.target.closest(".it");t&&me(v[+t.dataset.i])});var Ve=document.getElementById("tabFeatured"),Ne=document.getElementById("tabFull");function de(e){h=e,document.body.classList.toggle("fullmode",e==="full"),Ve.classList.toggle("on",e==="featured"),Ne.classList.toggle("on",e==="full"),at.classList.toggle("on",e==="full"),e==="full"&&H.classList.remove("on")}Ve.onclick=()=>de("featured");Ne.onclick=()=>de("full");var m=document.getElementById("sheet"),ue=document.getElementById("scrim"),Fe=m.querySelector(".sMedia");function me(e){let t=v.indexOf(e);m.querySelector(".sIdx").textContent=String(t+1).padStart(2,"0"),m.querySelector("h1").textContent=e.name,m.querySelector("p").textContent=e.desc,m.querySelector(".t1").textContent=e.place,m.querySelector(".t2").textContent=e.tag+" \xB7 "+e.year,m.querySelector(".pieces").innerHTML=e.pieces.map(o=>`<li>${o}</li>`).join(""),Fe.innerHTML="",[[e,e.name],[v[(t+5)%R],"Also finished"],[v[(t+9)%R],"Also finished"]].forEach(([o,a],s)=>{let r=document.createElement("figure"),c=document.createElement("img");c.src=oe(o.img,1400,903),c.alt=o.name,c.loading=s?"lazy":"eager";let i=document.createElement("figcaption");i.textContent=a===o.name?`${o.name} \u2014 ${o.place}`:`${a} \u2014 ${o.name}, ${o.place}`,r.appendChild(c),r.appendChild(i),Fe.appendChild(r)}),m.querySelector("#sheetScroll").scrollTop=0,u=!0,m.classList.add("on"),ue.classList.add("on"),document.body.classList.add("hidechrome");try{Pe&&window.parent!==window&&window.parent.postMessage({type:"mobel-gallery:open",index:t},"*")}catch{}}function Y(){u&&(u=!1,m.classList.remove("on"),ue.classList.remove("on"),document.body.classList.remove("hidechrome"))}document.getElementById("sheetClose").onclick=Y;ue.onclick=Y;var Xe=new Le,T=0,x=.03,U=!1,re=!1,ie=(e,t)=>(e%t+t)%t,ot=document.getElementById("counter"),ce=-1;function _e(){if(U){re=!1;return}requestAnimationFrame(_e),q(Math.min(Xe.getDelta(),.05))}function Ke(){re||(re=!0,Xe.getDelta(),requestAnimationFrame(_e))}function q(e){if(T+=e,W!==null&&!L)l=W;else if(!L&&Math.abs(te)<.0022&&h==="featured"&&!u){let a=Math.round(l/w)*w;l+=(a-l)*.055}Ae=E,E+=(l-E)*.082,te=E-Ae;let t=.019+Math.min(Math.abs(te)*1.15,.155);x+=(t-x)*.16;let n=Te/2;for(let a of P){let s=ie(a.index*w-E+n,Te)-n;a.offset=s,a.mat.uniforms.uOffset.value=s,a.mat.uniforms.uAmp.value=x,a.mat.uniforms.uTime.value=T,a.mesh.visible=a.shadow.visible=Math.abs(s)<2.9,a.ready&&a.fade<1&&(a.fade=Math.min(1,a.fade+e*1.6),a.mat.uniforms.uFade.value=a.fade)}O=h==="featured"&&!u&&!L?qe(K,j):null,document.body.style.cursor=L?"grabbing":O?"pointer":h==="featured"?"grab":"default";for(let a of P){let s=a.mesh.visible&&h==="featured"&&!u;if(a.hover+=((O===a?1:0)-a.hover)*.16,a.mat.uniforms.uHover.value=a.hover,!s){a.lab.style.opacity=0;continue}let r=a.offset,c=A(-g/2+.004,-C/2-.085,r,x,T),i=A(g/2-.004,-C/2-.085,r,x,T),d=F(c),M=F(i),Z=1-Math.min(1,Math.max(0,(Math.abs(r)-.62)/.6));a.lab.style.transform=`translate3d(${d.x.toFixed(1)}px,${d.y.toFixed(1)}px,0)`,a.lab.style.opacity=(Z*.98).toFixed(3)}let o=ie(Math.round(E/w),R);o!==ce&&(ce=o,ot.innerHTML=`<em>${String(o+1).padStart(2,"0")}</em> / ${String(R).padStart(2,"0")}`),ae+=(K-ae)*.14,ne+=(j-ne)*.14,H.style.left=ae+"px",H.style.top=ne+"px",S.render(V,b)}(function(){let t=document.createElement("canvas");t.width=t.height=180;let n=t.getContext("2d"),o=n.createImageData(180,180),a=o.data;for(let s=0;s<a.length;s+=4){let r=200+Math.random()*55;a[s]=a[s+1]=a[s+2]=r,a[s+3]=255}n.putImageData(o,0,0),document.getElementById("grain").style.backgroundImage=`url(${t.toDataURL()})`})();Ke();window.__dbg={cards:P,camera:b,renderer:S,scene:V,project:F,deformJS:A,update:q,N:R,pause(e){U=!!e,U||Ke()},state(){return{current:E,target:l,mode:h,sheetOpen:u,paused:U,loaded:se,failed:P.filter(e=>e.failed).length,counter:ce,amp:x}},jump(e){l=E=e*w,q(1/60)},scroll(e){W=e*w},free(){W=null},open(e){me(v[ie(e,R)])},close:Y,mode:de,pump(e=60,t=1/60){for(let n=0;n<e;n++)q(t)}};
