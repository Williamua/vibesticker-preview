(function(){
'use strict';
const $= (s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const ART = window.VibeArt ? VibeArt('roof') : {url:f=>'/art/rebuild/roof/'+f,styleUrl:id=>'/art/rebuild/roof/style-'+id+'.png'};
let cfg={demoMode:true,provider:'mock',freeLeft:0,credits:0};
let selectedStyle=localStorage.getItem('vibe-style')||'watercolor';
let photoFile=null,photoUrl=null,reduceMotion=false,scrollP=0,nibbling=false;
const pointer={x:.5,y:.5,sx:.5,sy:.5};

async function boot(){
  cfg = window.VibeAPI ? await VibeAPI.loadConfig() : cfg;
  showDemo(VibeAPI?VibeAPI.isDemo():true);
  updateQuota();
  bindUpload(); bindCases(); bindGenerate(); bindBuy(); bindSquirrelClick();
  selectStyle(selectedStyle,false);
  if(typeof gsap==='undefined')return;
  gsap.registerPlugin(ScrollTrigger);
  gsap.matchMedia().add({reduce:'(prefers-reduced-motion: reduce)'},(ctx)=>{
    reduceMotion=!!ctx.conditions.reduce;
    setupScroll(reduceMotion); setupEntrances(reduceMotion); setupPointer(reduceMotion); setupDust(reduceMotion);
    return()=>ScrollTrigger.getAll().forEach(t=>t.kill());
  });
}
function showDemo(on){const b=$('#demo-banner');if(b)b.hidden=!on}
function updateQuota(){const el=$('#quota');if(!el)return;const c=VibeAPI?VibeAPI.getConfig():cfg;el.textContent=(c.demoMode||c.provider==='mock'?'演示模式 · ':'')+`剩余免费 ${c.freeLeft??0} 次`}

function setupScroll(reduce){
  const grade=$('#grade'), flies=$('.atmos-flies');
  if(reduce){gsap.set(grade,{opacity:0});return}
  gsap.to(grade,{opacity:.55,ease:'none',scrollTrigger:{trigger:document.body,start:'top top',end:'bottom bottom',scrub:1.15,onUpdate:s=>scrollP=s.progress}});
  if(flies) gsap.to(flies,{opacity:.85,ease:'none',scrollTrigger:{trigger:document.body,start:'60% top',end:'bottom bottom',scrub:1}});
  $$('.case').forEach(caseEl=>{
    const media=caseEl.querySelector('.case-media'), copy=caseEl.querySelector('.case-copy');
    gsap.fromTo(media,{scale:.88,y:50,opacity:.25},{scale:1,y:0,opacity:1,ease:'none',scrollTrigger:{trigger:caseEl,start:'top 82%',end:'top 32%',scrub:.9}});
    gsap.fromTo(copy,{y:36,opacity:0},{y:0,opacity:1,ease:'none',scrollTrigger:{trigger:caseEl,start:'top 75%',end:'top 40%',scrub:.9}});
  });
}
function setupEntrances(reduce){
  if(reduce)return;
  gsap.from('#hero h1, #hero .lede, #hero .btn',{y:40,opacity:0,duration:.9,stagger:.09,ease:'power3.out'});
  $$('#make, #pricing, #cta, #work').forEach(sec=>{
    const parts=sec.querySelectorAll('h2,.section-lede,.panel,.price-card,.cta-line');
    if(!parts.length)return;
    gsap.set(parts,{y:32,opacity:0});
    ScrollTrigger.batch(parts,{start:'top 88%',once:true,onEnter:b=>gsap.to(b,{y:0,opacity:1,duration:.7,stagger:.08,ease:'power3.out',overwrite:'auto'})});
  });
}
function setupPointer(reduce){
  const squirrel=$('#squirrel'); if(!squirrel)return;
  const xTo=reduce?()=>{}:gsap.quickTo(squirrel,'x',{duration:.42,ease:'power3.out'});
  const yTo=reduce?()=>{}:gsap.quickTo(squirrel,'y',{duration:.42,ease:'power3.out'});
  const rotTo=reduce?()=>{}:gsap.quickTo(squirrel,'rotation',{duration:.32,ease:'power2.out'});
  function onPtr(cx,cy){
    pointer.x=cx/innerWidth;pointer.y=cy/innerHeight;
    if(reduce||nibbling)return;
    const r=squirrel.getBoundingClientRect(),sx=r.left+r.width/2,sy=r.top+r.height/2;
    const dx=cx-sx,dy=cy-sy,dist=Math.hypot(dx,dy),radius=Math.min(innerWidth,innerHeight)*.36;
    if(dist<radius){const t=1-dist/radius,str=t*150,ang=Math.atan2(dy,dx);xTo(Math.cos(ang)*-str);yTo(Math.sin(ang)*-str);rotTo(Math.cos(ang)*-20)}
    else{xTo(0);yTo(0);rotTo(0)}
    $$('[data-surface]').forEach(el=>{
      const br=el.getBoundingClientRect(),ex=br.left+br.width/2,ey=br.top+br.height/2,d=Math.hypot(cx-ex,cy-ey),rad=Math.max(br.width,br.height)*.95;
      if(d<rad){const t=1-d/rad;gsap.to(el,{rotation:(cx>ex?1:-1)*(12+t*16),x:((cx-ex)/rad)*-24*t,duration:.26,ease:'power2.out',overwrite:'auto'})}
      else gsap.to(el,{rotation:0,x:0,duration:.85,ease:'elastic.out(1,.4)',overwrite:'auto'});
    });
  }
  addEventListener('pointermove',e=>{if(e.pointerType==='touch'&&!e.buttons)return;onPtr(e.clientX,e.clientY)},{passive:true});
  addEventListener('pointerdown',e=>onPtr(e.clientX,e.clientY),{passive:true});
}
function bindSquirrelClick(){
  const s=$('#squirrel');if(!s)return;
  s.addEventListener('click',e=>{e.stopPropagation();if(reduceMotion)return;nibbling=true;
    gsap.timeline({onComplete:()=>nibbling=false}).to(s,{scale:1.14,rotation:-12,duration:.14}).to(s,{rotation:14,duration:.1,yoyo:true,repeat:5}).to(s,{scale:1,rotation:0,duration:.35,ease:'back.out(2)'});
  });
}
function setupDust(reduce){
  const canvas=$('#dust');if(!canvas||reduce)return;
  const ctx=canvas.getContext('2d');let w,h,dpr,pts=[];
  for(let i=0;i<32;i++)pts.push({x:Math.random(),y:Math.random(),size:.3+Math.random()*.7,drift:.5+Math.random(),z:.3+Math.random()*.7,phase:Math.random()*6.28});
  function resize(){dpr=Math.min(2,devicePixelRatio||1);w=innerWidth;h=innerHeight;canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0)}
  resize();addEventListener('resize',resize);
  let t0=performance.now();
  (function frame(now){const t=(now-t0)/1000;ctx.clearRect(0,0,w,h);const glow=Math.max(0,(scrollP-.55)*2);
    pts.forEach(p=>{const px=p.x*w+Math.sin(t*p.drift*.4+p.phase)*18*p.z,py=p.y*h+Math.cos(t*p.drift*.3+p.phase)*12*p.z+scrollP*40*p.z,r=(1+p.size*2.5)*p.z,a=.08+p.size*.2+glow*.2;
      ctx.beginPath();ctx.fillStyle=`rgba(232,154,92,${a*.3*glow})`;ctx.arc(px,py,r*4,0,6.28);ctx.fill();
      ctx.beginPath();ctx.fillStyle=`rgba(28,25,22,${a})`;ctx.arc(px,py,r,0,6.28);ctx.fill()});
    requestAnimationFrame(frame)})(t0);
}
function bindCases(){$$('.case').forEach(c=>{const go=()=>selectStyle(c.dataset.style,true);c.addEventListener('click',go);c.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}})})}
function selectStyle(id,animate){
  selectedStyle=id;localStorage.setItem('vibe-style',id);
  const names={anime:'日漫',chibi:'Q 版',toy3d:'3D 潮玩',pixel:'像素',watercolor:'水彩'};
  $$('.case').forEach(c=>{const on=c.dataset.style===id;c.setAttribute('aria-pressed',on?'true':'false');
    if(on&&animate&&!reduceMotion){const m=c.querySelector('.case-media');gsap.fromTo(m,{scale:.94},{scale:1.05,duration:.32,yoyo:true,repeat:1,ease:'power2.out'})}});
  const lab=$('#style-label');if(lab)lab.textContent='当前风格：'+(names[id]||id);
  syncGen();
}
function bindUpload(){
  const zone=$('#upload-zone'),input=$('#photo'),preview=$('#upload-preview');if(!zone||!input)return;
  zone.addEventListener('click',()=>input.click());
  zone.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click()}});
  ['dragenter','dragover'].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.add('is-drag')}));
  ['dragleave','drop'].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.remove('is-drag')}));
  zone.addEventListener('drop',e=>{const f=e.dataTransfer?.files?.[0];if(f)setPhoto(f)});
  input.addEventListener('change',()=>{if(input.files?.[0])setPhoto(input.files[0])});
  function setPhoto(file){photoFile=file;if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=URL.createObjectURL(file);
    preview.querySelectorAll('img:not(.plate-bg),.upload-hint').forEach(n=>n.remove());
    const img=document.createElement('img');img.src=photoUrl;img.alt='已选照片';preview.appendChild(img);
    $('#upload-meta').textContent=file.name;syncGen();
    if(!reduceMotion)gsap.fromTo(preview,{scale:.92},{scale:1,duration:.35,ease:'back.out(1.7)'})}
}
function syncGen(){const b=$('#gen-btn');if(b)b.disabled=!(photoFile&&selectedStyle)}
function bindGenerate(){
  const btn=$('#gen-btn');if(!btn)return;
  btn.addEventListener('click',async()=>{
    if(!photoFile||!selectedStyle)return;
    const loader=$('#gen-loader'),empty=$('#result-empty'),img=$('#result-img'),actions=$('#result-actions');
    loader.hidden=false;empty.hidden=true;img.hidden=true;actions.hidden=true;btn.disabled=true;
    try{
      const j=await VibeAPI.generate(photoFile,selectedStyle);
      updateQuota();img.src=j.png+'?t='+Date.now();img.hidden=false;
      $('#dl-png').href=j.png+'?dl=1';$('#dl-gif').href=j.gif+'?dl=1';actions.hidden=false;
      if(!reduceMotion)gsap.fromTo(img,{scale:.78,opacity:0},{scale:1,opacity:1,duration:.5,ease:'back.out(1.6)'});
      if(VibeAPI.isDemo())showDemo(true);
    }catch(e){empty.hidden=false;empty.textContent=e.message||'生成失败'}
    finally{loader.hidden=true;syncGen()}
  });
}
function bindBuy(){$$('.buy').forEach(b=>b.addEventListener('click',async()=>{try{const j=await VibeAPI.checkout(b.dataset.tier);if(j.url)location.href=j.url;else alert(j.error||'失败')}catch(e){alert(e.message)}}))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
