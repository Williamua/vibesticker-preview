(function(){
'use strict';
const $= (s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
let selectedStyle=localStorage.getItem('vibe-style')||'watercolor';
let photoFile=null,photoUrl=null,reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let openPanel=null,nibbling=false;

const NAMES={anime:'日漫',chibi:'Q版',toy3d:'潮玩',pixel:'像素',watercolor:'水彩'};

async function boot(){
  await VibeAPI.loadConfig();
  showDemo(VibeAPI.isDemo());
  updateQuota();
  buildStyleGrid();
  bindChips();
  bindStyleDrag();
  bindTierDrag();
  bindUpload();
  bindGenerate();
  bindBuy();
  bindSquirrel();
  bindLeaves();
  selectStyle(selectedStyle,false);
  // lock body scroll
  document.documentElement.style.overflow='hidden';
  document.body.style.overflow='hidden';
}

function showDemo(on){const b=$('#demo-banner');if(b)b.hidden=!on}
function updateQuota(){
  const c=VibeAPI.getConfig(),el=$('#quota');
  if(el)el.textContent=(VibeAPI.isDemo()?'演示模式 · ':'')+`免费剩余 ${c.freeLeft??0}`;
}

function bindChips(){
  $$('.chip').forEach(chip=>{
    chip.addEventListener('click',()=>{
      const id=chip.dataset.panel;
      if(openPanel===id) closePanels();
      else openSheet(id);
    });
  });
  $$('[data-close]').forEach(b=>b.addEventListener('click',closePanels));
  $('#panels').addEventListener('click',e=>{if(e.target.id==='panels')closePanels()});
  addEventListener('keydown',e=>{if(e.key==='Escape')closePanels()});
}

function openSheet(id){
  openPanel=id;
  $('#panels').classList.add('is-dim');
  $$('.chip').forEach(c=>c.setAttribute('aria-expanded',c.dataset.panel===id?'true':'false'));
  $$('.panel-sheet').forEach(p=>{
    const on=p.id==='panel-'+id;
    p.hidden=!on;
    if(typeof gsap!=='undefined' && !reduceMotion){
      if(on){
        p.classList.add('is-open');
        gsap.fromTo(p,{scale:.92,opacity:0,y:24},{scale:1,opacity:1,y:0,duration:.35,ease:'power3.out'});
      } else p.classList.remove('is-open');
    } else {
      p.classList.toggle('is-open',on);
    }
  });
}
function closePanels(){
  openPanel=null;
  $('#panels').classList.remove('is-dim');
  $$('.chip').forEach(c=>c.setAttribute('aria-expanded','false'));
  $$('.panel-sheet').forEach(p=>{
    if(typeof gsap!=='undefined' && !reduceMotion && p.classList.contains('is-open')){
      gsap.to(p,{scale:.94,opacity:0,duration:.2,ease:'power2.in',onComplete:()=>{p.hidden=true;p.classList.remove('is-open')}});
    } else {p.hidden=true;p.classList.remove('is-open')}
  });
}

function buildStyleGrid(){
  const grid=$('#panel-styles-grid');if(!grid)return;
  ['anime','chibi','toy3d','pixel','watercolor'].forEach(id=>{
    const b=document.createElement('button');
    b.type='button';b.dataset.style=id;
    b.innerHTML=`<img src="/art/rebuild/hamza/style-${id}.png" alt="${NAMES[id]}">`;
    b.addEventListener('click',()=>{selectStyle(id,true);closePanels()});
    grid.appendChild(b);
  });
}

function selectStyle(id,animate){
  selectedStyle=id;localStorage.setItem('vibe-style',id);
  $$('.style-tile').forEach(t=>{
    const on=t.dataset.style===id;
    t.setAttribute('aria-pressed',on?'true':'false');
    if(on) t.scrollIntoView({inline:'center',block:'nearest',behavior:reduceMotion?'auto':'smooth'});
    if(on&&animate&&!reduceMotion&&typeof gsap!=='undefined')
      gsap.fromTo(t,{scale:.9},{scale:1.08,duration:.28,yoyo:true,repeat:1,ease:'power2.out'});
  });
  const lab=$('#style-label');if(lab)lab.textContent='当前：'+(NAMES[id]||id);
  syncGen();
}

/* Horizontal drag on style track */
function bindStyleDrag(){
  const track=$('#style-track');if(!track)return;
  let down=false,startX=0,scroll=0;
  track.addEventListener('pointerdown',e=>{down=true;startX=e.clientX;scroll=track.scrollLeft;track.classList.add('dragging');track.setPointerCapture(e.pointerId)});
  track.addEventListener('pointermove',e=>{if(!down)return;track.scrollLeft=scroll-(e.clientX-startX)});
  const up=()=>{down=false;track.classList.remove('dragging');snapStyle()};
  track.addEventListener('pointerup',up);track.addEventListener('pointercancel',up);
  $$('.style-tile').forEach(t=>t.addEventListener('click',e=>{
    // avoid click after drag
    if(Math.abs(track.scrollLeft-scroll)>8 && down===false && Math.abs(e.clientX-startX)>8) return;
    selectStyle(t.dataset.style,true);
  }));
  function snapStyle(){
    const tiles=$$('.style-tile');
    let best=null,bestD=1e9;
    const mid=track.getBoundingClientRect().left+track.clientWidth/2;
    tiles.forEach(t=>{const r=t.getBoundingClientRect();const d=Math.abs(r.left+r.width/2-mid);if(d<bestD){bestD=d;best=t}});
    if(best) selectStyle(best.dataset.style,true);
  }
}

function bindTierDrag(){
  const track=$('#tier-track');if(!track)return;
  let down=false,startX=0,scroll=0;
  track.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;down=true;startX=e.clientX;scroll=track.scrollLeft;track.setPointerCapture(e.pointerId)});
  track.addEventListener('pointermove',e=>{if(!down)return;track.scrollLeft=scroll-(e.clientX-startX)});
  track.addEventListener('pointerup',()=>down=false);
}

function bindUpload(){
  const zone=$('#upload-zone'),input=$('#photo');if(!zone)return;
  zone.addEventListener('click',()=>input.click());
  zone.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click()}});
  ['dragenter','dragover'].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.add('is-drag')}));
  ['dragleave','drop'].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.remove('is-drag')}));
  zone.addEventListener('drop',e=>{const f=e.dataTransfer?.files?.[0];if(f)setPhoto(f)});
  input.addEventListener('change',()=>{if(input.files?.[0])setPhoto(input.files[0])});
  function setPhoto(file){
    photoFile=file;if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=URL.createObjectURL(file);
    const thumb=$('#upload-thumb'),hint=$('#upload-hint');
    thumb.src=photoUrl;thumb.hidden=false;if(hint)hint.hidden=true;
    $('#upload-meta').textContent=file.name;
    syncGen();
    if(!reduceMotion&&typeof gsap!=='undefined') gsap.fromTo(zone,{scale:.95},{scale:1,duration:.3,ease:'back.out(1.7)'});
  }
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
      if(VibeAPI.isDemo())showDemo(true);
      if(!reduceMotion&&typeof gsap!=='undefined') gsap.fromTo(img,{scale:.8,opacity:0},{scale:1,opacity:1,duration:.45,ease:'back.out(1.6)'});
    }catch(e){empty.hidden=false;empty.textContent=e.message||'失败'}
    finally{loader.hidden=true;syncGen()}
  });
}
function bindBuy(){
  $$('.buy').forEach(b=>b.addEventListener('click',async()=>{
    try{const j=await VibeAPI.checkout(b.dataset.tier);if(j.url)location.href=j.url;else alert(j.error||'失败')}catch(e){alert(e.message)}
  }));
}
function bindSquirrel(){
  const s=$('#squirrel');if(!s||typeof gsap==='undefined')return;
  const xTo=gsap.quickTo(s,'x',{duration:.4,ease:'power3.out'});
  const yTo=gsap.quickTo(s,'y',{duration:.4,ease:'power3.out'});
  addEventListener('pointermove',e=>{
    if(reduceMotion||nibbling)return;
    const r=s.getBoundingClientRect(),sx=r.left+r.width/2,sy=r.top+r.height/2;
    const dx=e.clientX-sx,dy=e.clientY-sy,dist=Math.hypot(dx,dy),rad=Math.min(innerWidth,innerHeight)*.32;
    if(dist<rad){const t=1-dist/rad,str=t*120,ang=Math.atan2(dy,dx);xTo(Math.cos(ang)*-str);yTo(Math.sin(ang)*-str)}
    else{xTo(0);yTo(0)}
  },{passive:true});
  s.addEventListener('click',e=>{e.stopPropagation();if(reduceMotion)return;nibbling=true;
    gsap.timeline({onComplete:()=>nibbling=false}).to(s,{scale:1.2,rotation:-14,duration:.12}).to(s,{rotation:14,duration:.1,yoyo:true,repeat:5}).to(s,{scale:1,rotation:0,duration:.35,ease:'back.out(2)'});
  });
}
function bindLeaves(){
  if(typeof gsap==='undefined'||reduceMotion)return;
  addEventListener('pointermove',e=>{
    $$('[data-surface]').forEach(el=>{
      const r=el.getBoundingClientRect(),ex=r.left+r.width/2,ey=r.top+r.height/2,d=Math.hypot(e.clientX-ex,e.clientY-ey),rad=160;
      if(d<rad){const t=1-d/rad;gsap.to(el,{rotation:(e.clientX>ex?1:-1)*(10+t*14),duration:.25,overwrite:'auto'})}
      else gsap.to(el,{rotation:0,duration:.7,ease:'elastic.out(1,.45)',overwrite:'auto'});
    });
  },{passive:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
