import{D as pe,E as ve,G as J,Ja as Se,M as B,Q as ge,W as Q,Z as ee,_ as ye,ca as xe,k as fe,ka as Ee,ma as we,qa as be,v as he}from"./shared-7SGT65YO.js";var ke=document.documentElement.classList.contains("embed"),oe=(e,t,n,o=78)=>`../assets/images/gallery/${e}-${t}x${n}.webp`,v=[{name:"Fjordhus",place:"Bergen, NO",year:"2026",tag:"Residence",img:"1600585154340-be6161a56a0c",desc:"A glass-walled house above the fjord. Havn, Sten and Gl\xF8d, arranged for evenings that last until midnight.",pieces:["Havn sectional","Sten coffee table","Gl\xF8d pendants"]},{name:"Havnegade",place:"Copenhagen, DK",year:"2026",tag:"Apartment",img:"1583847268964-b28dc8f51f92",desc:"A harbour-side apartment furnished in wool and pale oak, with the plants doing most of the decorating.",pieces:["Havn sectional","Ull rug","Ring side table"]},{name:"The Atelier",place:"Malm\xF6, SE",year:"2025",tag:"Studio",img:"1567016376408-0226e4d0c1ea",desc:"Lime-washed walls, one dark sofa, and nothing else that needs explaining.",pieces:["Bue lounge chair","Sten coffee table"]},{name:"Villa Ljus",place:"Stockholm, SE",year:"2025",tag:"Residence",img:"1618221195710-dd6b41faaea6",desc:"A long room opened to the garden. Seating for eight, light for everyone.",pieces:["Havn sectional","Bue ottoman","Gl\xF8d pendants"]},{name:"Sommarhus",place:"Gotland, SE",year:"2024",tag:"Summer house",img:"1631679706909-1844bbd07221",desc:"Sand tones and rattan, for a house that is only ever lived in barefoot.",pieces:["Ull rug","Bue lounge chair","Ring side table"]},{name:"The Study",place:"Aarhus, DK",year:"2025",tag:"Workspace",img:"1600494603989-9650cf6ddd3d",desc:"Deep green walls and a desk by the window. A room for thinking slowly.",pieces:["Stol chair","Hylle console"]},{name:"Sovrum",place:"Oslo, NO",year:"2024",tag:"Bedroom",img:"1595526114035-0d45ed16cfbf",desc:"Linen, oak and morning light. The rest of the house can wait.",pieces:["Hylle console","Ring side table"]},{name:"Matsal",place:"Helsinki, FI",year:"2024",tag:"Dining",img:"1519710164239-da123dc03ef4",desc:"A round table, four chairs and a plant. The most-used room in the house.",pieces:["Tavle dining set","Stol chair"]},{name:"The Loft",place:"Amsterdam, NL",year:"2023",tag:"Apartment",img:"1554995207-c18c203602cb",desc:"Cognac leather against an olive wall, in a loft with more windows than walls.",pieces:["Bue lounge chair","Sten coffee table","Ull rug"]},{name:"K\xF8kken",place:"Copenhagen, DK",year:"2025",tag:"Kitchen",img:"1600607686527-6fb886090705",desc:"Oak fronts and a marble island, lit by a single pair of Gl\xF8d pendants.",pieces:["Gl\xF8d pendants","Stol chair"]},{name:"G\xE4strum",place:"Sk\xE5ne, SE",year:"2023",tag:"Guest room",img:"1615874959474-d609969a20ed",desc:"A guest room that guests are reluctant to leave.",pieces:["Ring side table","Ull rug"]},{name:"Esszimmer",place:"Berlin, DE",year:"2024",tag:"Dining",img:"1617806118233-18e1de247200",desc:"Green velvet chairs around a walnut table, under a mirror that doubles the room.",pieces:["Tavle dining set","Gl\xF8d pendants"]},{name:"Studio S\xF6der",place:"Stockholm, SE",year:"2023",tag:"Workspace",img:"1524758631624-e2822e304c36",desc:"A creative studio with a living room\u2019s manners.",pieces:["Bue lounge chair","Hylle console"]},{name:"Reading Room",place:"London, UK",year:"2026",tag:"Residence",img:"1586023492125-27b2c045efd7",desc:"One yellow chair, one lamp, one afternoon.",pieces:["Bue lounge chair","Ring side table"]}],y=1200,f=774;function je(e){let t=document.createElement("canvas");t.width=y,t.height=f;let n=t.getContext("2d"),o=n.createLinearGradient(0,0,0,f);return o.addColorStop(0,"#e2ddd3"),o.addColorStop(1,"#d8d2c7"),n.fillStyle=o,n.fillRect(0,0,y,f),n.fillStyle="rgba(20,19,18,.28)",n.font='italic 400 64px "Instrument Serif", Georgia, serif',n.textAlign="center",n.textBaseline="middle",n.fillText(e.name,y/2,f/2),n.font="400 14px Inter, sans-serif",n.letterSpacing="4px",n.fillText((e.place+"  \xB7  "+e.year).toUpperCase(),y/2,f/2+58),t}async function Ye(e){let t=await fetch(e,{mode:"cors"});if(!t.ok)throw new Error("HTTP "+t.status);return createImageBitmap(await t.blob())}function Te(e){let t=new be(e);return t.colorSpace=pe,t.anisotropy=8,t.minFilter=he,t.generateMipmaps=!0,t}var ce=document.getElementById("gl"),R=new Ee({canvas:ce,antialias:!0,alpha:!1,powerPreference:"high-performance"});R.setClearColor(new ge("#efebe4"),1);R.outputColorSpace=ve;R.toneMapping=fe;var q=new we,b=new ye(45,1,.05,120);b.position.set(0,-.06,1.6);var g=1,L=g/1.55,Ze=.024,E=g+Ze,A=v.length,Me=A*E,Fe=2.95,Pe=1.48,Be=.3,Ie=-.21,K=.6,X=.4,De=.052,$e=.55,Re=`
uniform float uOffset, uAmp, uTime, uCurve, uZW;
uniform vec3  uShift;
varying vec2  vUv;
varying float vWX;
varying vec3  vNrm;
varying vec3  vPos;

vec3 deform(vec3 p){
  float wx = p.x + uOffset;
  float a  = wx*${Fe.toFixed(4)} + uTime*${Be.toFixed(4)};
  float b  = wx*${Pe.toFixed(4)} + uTime*(${Ie.toFixed(4)});
  float wy = sin(a)*${K.toFixed(3)} + sin(b)*${X.toFixed(3)};
  float wz = cos(a)*${K.toFixed(3)} + cos(b)*${X.toFixed(3)};
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
}`,Le=`
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
}`,Ae=new xe(g,L,110,64),k=[],Je=document.getElementById("labels"),se=0;v.forEach((e,t)=>{let n=Te(je(e)),o=document.createElement("canvas");o.width=y,o.height=f;let a=Te(o);e._thumb=oe(e.img,400,258,70);let s={uOffset:{value:0},uAmp:{value:.03},uTime:{value:0},uCurve:{value:De},uZW:{value:$e},uOpacity:{value:1}},r=new ee({vertexShader:Re,fragmentShader:Le,transparent:!0,uniforms:{...s,uTex:{value:a},uTex0:{value:n},uHover:{value:0},uFade:{value:0},uShadow:{value:0},uShift:{value:new B(0,0,0)},uRadius:{value:.043},uAspect:{value:g/L},uTexAspect:{value:y/f}}}),i=new ee({vertexShader:Re,fragmentShader:Le,transparent:!0,depthWrite:!1,uniforms:{...s,uTex:{value:a},uTex0:{value:n},uHover:{value:0},uFade:{value:0},uShadow:{value:1},uShift:{value:new B(0,-.055,-.03)},uRadius:{value:.09},uAspect:{value:g/L},uTexAspect:{value:y/f}}}),l=new Q(Ae,r);l.frustumCulled=!1,l.renderOrder=2,q.add(l);let d=new Q(Ae,i);d.frustumCulled=!1,d.renderOrder=1,q.add(d);let T=document.createElement("div");T.className="lab",T.innerHTML='<span class="nm"></span><span class="yr"></span>',T.querySelector(".nm").textContent=e.name,T.querySelector(".yr").textContent=e.place,Je.appendChild(T);let Z=document.createElement("div"),$={p:e,mesh:l,shadow:d,mat:r,shadowMat:i,lab:T,dot:Z,offset:0,index:t,hover:0,fade:0,ready:!1};k.push($),Ye(oe(e.img,y,f)).then(P=>{o.getContext("2d").drawImage(P,0,0,y,f),P.close&&P.close(),a.needsUpdate=!0,$.ready=!0,se++}).catch(P=>{console.warn("photo failed",e.name,P.message),$.ready=!0,$.failed=!0,se++})});var I=0,O=0,U=1;function Ue(){I=window.innerWidth,O=window.innerHeight,U=I/O,R.setPixelRatio(Math.min(window.devicePixelRatio,2)),R.setSize(I,O,!1),b.aspect=U;let e=J.degToRad(b.fov),t=J.clamp(.53+(1.35-U)*.42,.53,.88),n=g/(2*Math.tan(e/2)*U*t),o=L/(2*Math.tan(e/2)*.66);n=Math.max(n,o),b.position.z=n,b.updateProjectionMatrix()}window.addEventListener("resize",Ue);Ue();var c=0,w=0,te=0,Ce=0,S=!1,ze=0,Oe=0,V=0,Ge=0,_=-1e4,j=-1e4,h="featured",u=!1,D=null,Qe=()=>I*.53/g;addEventListener("wheel",e=>{if(u){e.target.closest("#sheetScroll")||e.preventDefault();return}if(h!=="featured")return;let t=Math.abs(e.deltaX)>Math.abs(e.deltaY);if(ke&&!t&&!e.shiftKey)return;e.preventDefault();let n=t?e.deltaX:e.deltaY;c+=n*.0016},{passive:!1});function et(e,t){u||h!=="featured"||(S=!0,ze=e,Oe=c,V=0,Ge=performance.now(),D=null,document.body.style.cursor="grabbing")}function tt(e,t){if(_=e,j=t,!S)return;let n=e-ze;V=Math.max(V,Math.abs(n)),c=Oe-n/Qe()*1.05}function We(){S&&(S=!1,document.body.style.cursor="")}ce.addEventListener("pointerdown",e=>{e.button===0&&(e.preventDefault(),et(e.clientX,e.clientY))});addEventListener("pointermove",e=>tt(e.clientX,e.clientY));addEventListener("pointerup",We);addEventListener("pointercancel",We);addEventListener("pointerleave",()=>{_=j=-1e4});addEventListener("keydown",e=>{e.key==="Escape"&&Y(),!(u||h!=="featured")&&(e.key==="ArrowRight"&&(c+=E),e.key==="ArrowLeft"&&(c-=E))});var G=null;ce.addEventListener("click",e=>{if(h!=="featured"||u||V>6||performance.now()-Ge>420)return;let t=Ne(e.clientX,e.clientY)||G;t&&me(t.p)});function Ne(e,t){let n=null,o=1e9;for(let a of k){if(!a.mesh.visible||Math.abs(a.offset)>1.6)continue;let s=H(C(0,0,a.offset,x,M)),r=Math.abs(H(C(g/2,0,a.offset,x,M)).x-s.x),i=Math.abs(H(C(0,L/2,a.offset,x,M)).y-s.y),l=Math.abs(e-s.x),d=Math.abs(t-s.y);l<r*1.02&&d<i*1.35&&l<o&&(o=l,n=a)}return n}function C(e,t,n,o,a){let s=e+n,r=s*Fe+a*Be,i=s*Pe+a*Ie,l=Math.sin(r)*K+Math.sin(i)*X,d=Math.cos(r)*K+Math.cos(i)*X;return new B(s,t+l*o,d*o*$e-s*s*De)}var z=new B;function H(e){return z.copy(e).project(b),{x:(z.x*.5+.5)*I,y:(-z.y*.5+.5)*O,z:z.z}}var at=document.getElementById("full"),p=document.getElementById("fullList"),F=document.getElementById("thumb"),nt=F.querySelector("img");v.forEach((e,t)=>{let n=document.createElement("span");if(n.className="it",n.textContent=e.name,n.dataset.i=t,p.appendChild(n),t<v.length-1){let o=document.createElement("span");o.className="sep",o.textContent="\xB7",p.appendChild(o)}});var ae=0,ne=0;p.addEventListener("pointerover",e=>{let t=e.target.closest(".it");t&&(p.classList.add("hasHover"),p.querySelectorAll(".it.hot").forEach(n=>n.classList.remove("hot")),t.classList.add("hot"),nt.src=v[+t.dataset.i]._thumb,F.classList.add("on"))});p.addEventListener("pointerout",e=>{e.relatedTarget&&p.contains(e.relatedTarget)||(p.classList.remove("hasHover"),p.querySelectorAll(".it.hot").forEach(t=>t.classList.remove("hot")),F.classList.remove("on"))});p.addEventListener("click",e=>{let t=e.target.closest(".it");t&&me(v[+t.dataset.i])});var qe=document.getElementById("tabFeatured"),Ke=document.getElementById("tabFull");function de(e){h=e,document.body.classList.toggle("fullmode",e==="full"),qe.classList.toggle("on",e==="featured"),Ke.classList.toggle("on",e==="full"),at.classList.toggle("on",e==="full"),e==="full"&&F.classList.remove("on")}qe.onclick=()=>de("featured");Ke.onclick=()=>de("full");var m=document.getElementById("sheet"),ue=document.getElementById("scrim"),He=m.querySelector(".sMedia");function me(e){let t=v.indexOf(e);m.querySelector(".sIdx").textContent=String(t+1).padStart(2,"0"),m.querySelector("h1").textContent=e.name,m.querySelector("p").textContent=e.desc,m.querySelector(".t1").textContent=e.place,m.querySelector(".t2").textContent=e.tag+" \xB7 "+e.year,m.querySelector(".pieces").innerHTML=e.pieces.map(o=>`<li>${o}</li>`).join(""),He.innerHTML="",[[e,e.name],[v[(t+5)%A],"Also furnished"],[v[(t+9)%A],"Also furnished"]].forEach(([o,a],s)=>{let r=document.createElement("figure"),i=document.createElement("img");i.src=oe(o.img,1400,903),i.alt=o.name,i.loading=s?"lazy":"eager";let l=document.createElement("figcaption");l.textContent=a===o.name?`${o.name} \u2014 ${o.place}`:`${a} \u2014 ${o.name}, ${o.place}`,r.appendChild(i),r.appendChild(l),He.appendChild(r)}),m.querySelector("#sheetScroll").scrollTop=0,u=!0,m.classList.add("on"),ue.classList.add("on"),document.body.classList.add("hidechrome");try{ke&&window.parent!==window&&window.parent.postMessage({type:"mobel-gallery:open",index:t},"*")}catch{}}function Y(){u&&(u=!1,m.classList.remove("on"),ue.classList.remove("on"),document.body.classList.remove("hidechrome"))}document.getElementById("sheetClose").onclick=Y;ue.onclick=Y;var Xe=new Se,M=0,x=.03,W=!1,re=!1,le=(e,t)=>(e%t+t)%t,ot=document.getElementById("counter"),ie=-1;function Ve(){if(W){re=!1;return}requestAnimationFrame(Ve),N(Math.min(Xe.getDelta(),.05))}function _e(){re||(re=!0,Xe.getDelta(),requestAnimationFrame(Ve))}function N(e){if(M+=e,D!==null&&!S)c=D;else if(!S&&Math.abs(te)<.0022&&h==="featured"&&!u){let a=Math.round(c/E)*E;c+=(a-c)*.055}Ce=w,w+=(c-w)*.082,te=w-Ce;let t=.019+Math.min(Math.abs(te)*1.15,.155);x+=(t-x)*.16;let n=Me/2;for(let a of k){let s=le(a.index*E-w+n,Me)-n;a.offset=s,a.mat.uniforms.uOffset.value=s,a.mat.uniforms.uAmp.value=x,a.mat.uniforms.uTime.value=M,a.mesh.visible=a.shadow.visible=Math.abs(s)<2.9,a.ready&&a.fade<1&&(a.fade=Math.min(1,a.fade+e*1.6),a.mat.uniforms.uFade.value=a.fade)}G=h==="featured"&&!u&&!S?Ne(_,j):null,document.body.style.cursor=S?"grabbing":G?"pointer":h==="featured"?"grab":"default";for(let a of k){let s=a.mesh.visible&&h==="featured"&&!u;if(a.hover+=((G===a?1:0)-a.hover)*.16,a.mat.uniforms.uHover.value=a.hover,!s){a.lab.style.opacity=0;continue}let r=a.offset,i=C(-g/2+.004,-L/2-.085,r,x,M),l=C(g/2-.004,-L/2-.085,r,x,M),d=H(i),T=H(l),Z=1-Math.min(1,Math.max(0,(Math.abs(r)-.62)/.6));a.lab.style.transform=`translate3d(${d.x.toFixed(1)}px,${d.y.toFixed(1)}px,0)`,a.lab.style.opacity=(Z*.98).toFixed(3)}let o=le(Math.round(w/E),A);o!==ie&&(ie=o,ot.innerHTML=`<em>${String(o+1).padStart(2,"0")}</em> / ${String(A).padStart(2,"0")}`),ae+=(_-ae)*.14,ne+=(j-ne)*.14,F.style.left=ae+"px",F.style.top=ne+"px",R.render(q,b)}(function(){let t=document.createElement("canvas");t.width=t.height=180;let n=t.getContext("2d"),o=n.createImageData(180,180),a=o.data;for(let s=0;s<a.length;s+=4){let r=200+Math.random()*55;a[s]=a[s+1]=a[s+2]=r,a[s+3]=255}n.putImageData(o,0,0),document.getElementById("grain").style.backgroundImage=`url(${t.toDataURL()})`})();_e();window.__dbg={cards:k,camera:b,renderer:R,scene:q,project:H,deformJS:C,update:N,N:A,pause(e){W=!!e,W||_e()},state(){return{current:w,target:c,mode:h,sheetOpen:u,paused:W,loaded:se,failed:k.filter(e=>e.failed).length,counter:ie,amp:x}},jump(e){c=w=e*E,N(1/60)},scroll(e){D=e*E},free(){D=null},open(e){me(v[le(e,A)])},close:Y,mode:de,pump(e=60,t=1/60){for(let n=0;n<e;n++)N(t)}};
