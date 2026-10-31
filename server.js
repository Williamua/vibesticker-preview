const express=require('express'),multer=require('multer'),sharp=require('sharp'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const STYLES=require('./styles'),provider=require('./providers');
const STRIPE_MOCK=!process.env.STRIPE_SECRET_KEY;
const stripe=STRIPE_MOCK?null:require('stripe')(process.env.STRIPE_SECRET_KEY);
const BASE=process.env.BASE_URL||'http://localhost:3000',FREE=parseInt(process.env.FREE_PER_IP||'5');
// three tiers: credits granted per purchase (placeholders, edit via env)
const TIERS={single:{cents:100,credits:1,name:'1 sticker'},pack:{cents:499,credits:8,name:'8 stickers'},pro:{cents:899,credits:20,name:'20 stickers'}};
const DATA=path.join(__dirname,'data');fs.mkdirSync(DATA,{recursive:true});
const DBF=path.join(DATA,'db.json');
const db=fs.existsSync(DBF)?JSON.parse(fs.readFileSync(DBF)):{ipUsed:{},credits:{},paidSessions:{},items:{}};
const save=()=>fs.writeFileSync(DBF,JSON.stringify(db));
const app=express();app.set('trust proxy',true);
const upload=multer({limits:{fileSize:15e6},storage:multer.memoryStorage(),fileFilter:(q,f,cb)=>cb(null,/jpe?g|png|hei[cf]/i.test(f.mimetype+f.originalname))});
const ipOf=req=>req.ip||'0';
function credit(sess){ if(db.paidSessions[sess.id])return; const t=TIERS[sess.metadata.tier]; if(!t)return;
 db.paidSessions[sess.id]=1; db.credits[sess.metadata.ip]=(db.credits[sess.metadata.ip]||0)+t.credits; save();}
app.post('/webhook',express.raw({type:'application/json'}),(req,res)=>{
 if(STRIPE_MOCK)return res.sendStatus(200);
 let ev;try{ev=stripe.webhooks.constructEvent(req.body,req.headers['stripe-signature'],process.env.STRIPE_WEBHOOK_SECRET)}catch(e){return res.status(400).send(e.message)}
 if(ev.type==='checkout.session.completed'&&ev.data.object.payment_status==='paid')credit(ev.data.object);
 res.sendStatus(200)});
app.use(express.json());app.use(express.static(path.join(__dirname,'public')));
const status=ip=>({freeLeft:Math.max(0,FREE-(db.ipUsed[ip]||0)),credits:db.credits[ip]||0});
app.get('/api/config',(req,res)=>{const pname=provider.name();res.json({styles:STYLES.filter(s=>!s.hidden).map(({id,name})=>({id,name})),tiers:TIERS,provider:pname,demoMode:pname==='mock',stripeMock:STRIPE_MOCK,...status(ipOf(req))});});
app.post('/api/generate',upload.single('photo'),async(req,res)=>{
 try{ if(!req.file)return res.status(400).json({error:'JPG/PNG/HEIC only'});
  const style=STYLES.find(s=>s.id===req.body.style)||STYLES[0], ip=ipOf(req), st=status(ip);
  if(st.freeLeft<=0&&st.credits<=0)return res.status(402).json({error:'quota',...st});
  let src;try{src=await sharp(req.file.buffer).rotate().toBuffer()}catch(e){return res.status(415).json({error:'Cannot decode image (HEIC is converted in-browser; try JPG)'})}
  const out=await provider.generate(src,style);
  const png=await sharp(out).resize(1024,1024,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  const id=crypto.randomBytes(12).toString('hex');
  fs.writeFileSync(path.join(DATA,id+'.png'),png); await makeGif(id);
  if(st.freeLeft>0)db.ipUsed[ip]=(db.ipUsed[ip]||0)+1; else db.credits[ip]--;   // only charge quota on success
  db.items[id]={style:style.id,t:Date.now()}; save();
  res.json({id,style:style.id,png:`/api/file/${id}.png`,gif:`/api/file/${id}.gif`,...status(ip)});
 }catch(e){console.error(e);res.status(500).json({error:e.message})}});
app.get('/api/file/:f',(req,res)=>{const m=/^([a-f0-9]{24})\.(png|gif)$/.exec(req.params.f);if(!m||!db.items[m[1]])return res.sendStatus(404);
 const name=`VibeSticker-${db.items[m[1]].style}-${m[1].slice(0,6)}.${m[2]}`;
 req.query.dl?res.download(path.join(DATA,req.params.f),name):res.sendFile(path.join(DATA,req.params.f))});
app.post('/api/checkout',async(req,res)=>{const tier=req.body.tier,t=TIERS[tier];if(!t)return res.status(400).json({error:'bad tier'});
 const ip=ipOf(req);
 if(STRIPE_MOCK){const s={id:'mock_'+crypto.randomBytes(6).toString('hex'),metadata:{tier,ip}};credit(s);return res.json({url:`${BASE}/?paid=1`})}
 const s=await stripe.checkout.sessions.create({mode:'payment',
  line_items:[{price_data:{currency:'usd',unit_amount:t.cents,product_data:{name:'VibeSticker – '+t.name}},quantity:1}],
  metadata:{tier,ip},success_url:`${BASE}/?paid=1&session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${BASE}/`});
 res.json({url:s.url})});
app.get('/api/confirm',async(req,res)=>{ // fallback if webhook is slow
 if(!STRIPE_MOCK&&req.query.session_id){try{const s=await stripe.checkout.sessions.retrieve(req.query.session_id);if(s.payment_status==='paid')credit(s)}catch(e){}}
 res.json(status(ipOf(req)))});
async function makeGif(id){ // 2.4s seamless bounce+wobble loop, 24 frames x 100ms, 512px
 const S=512,N=24,src=await sharp(path.join(DATA,id+'.png')).resize(S,S).png().toBuffer(),frames=[];
 for(let i=0;i<N;i++){const a=i/N*2*Math.PI,sz=Math.round(S*(0.86+0.05*Math.sin(a)));
  const fr=await sharp(src).resize(sz,sz).rotate(4*Math.sin(a),{background:{r:0,g:0,b:0,alpha:0}}).toBuffer();
  const m=await sharp(fr).metadata(),w=Math.min(m.width,S),h=Math.min(m.height,S);
  const c=await sharp(fr).extract({left:Math.floor((m.width-w)/2),top:Math.floor((m.height-h)/2),width:w,height:h}).toBuffer();
  frames.push(await sharp({create:{width:S,height:S,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:c,left:Math.floor((S-w)/2),top:Math.max(0,Math.floor((S-h)/2-10*Math.sin(a)))}]).raw().toBuffer());}
 await sharp(Buffer.concat(frames),{raw:{width:S,height:S*N,channels:4,pageHeight:S}}).gif({delay:Array(N).fill(100),loop:0}).toFile(path.join(DATA,id+'.gif'));}

app.get('/api/studio-stickers',(req,res)=>{
  const primary=path.join(__dirname,'public','studio','webgl-assets','stickers-flat-thick');
  const legacy=path.join(__dirname,'public','studio','webgl-assets','stickers');
  const source=path.join(__dirname,'..','vibesticker','cartoon','cards','rebuild','sticker-studio','user-picks','stickers-flat-thick');
  let manifest={include:[],exclude:[],pattern:'^sticker-.*\\.png$',style:'flat-thick'};
  for (const dir of [primary, legacy]){
    try{ manifest={...manifest,...JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'))}; break; }catch(e){}
  }
  const exclude=new Set((manifest.exclude||[]).map(String));
  const re=new RegExp(manifest.pattern||'^sticker-.*\\.png$','i');
  function listDir(dir, urlBase){
    let files=[]; try{files=fs.readdirSync(dir)}catch(e){return []}
    return files.filter(f=>!exclude.has(f)&&re.test(f)).map(f=>({file:f, url:`${urlBase}/${f}`}));
  }
  // Primary pack is the hot-plug source; legacy only if primary empty
  let listed=listDir(primary, '/studio/webgl-assets/stickers-flat-thick');
  if(!listed.length) listed=listDir(source, '/api/studio-sticker-file').map(x=>({file:x.file, url:`/api/studio-sticker-file/${encodeURIComponent(x.file)}`}));
  if(!listed.length) listed=listDir(legacy, '/studio/webgl-assets/stickers');
  const order=manifest.include||[];
  listed.sort((a,b)=>{
    const ia=order.indexOf(a.file), ib=order.indexOf(b.file);
    if(ia<0&&ib<0) return a.file.localeCompare(b.file);
    if(ia<0) return 1; if(ib<0) return -1; return ia-ib;
  });
  res.json({files:listed.map(x=>x.file), items:listed, base:'/studio/webgl-assets/stickers-flat-thick/', style:'flat-thick', primary:true});
});
app.get('/api/studio-sticker-file/:name',(req,res)=>{
  const name=path.basename(req.params.name);
  if(!/^sticker-.*\.png$/i.test(name)) return res.sendStatus(400);
  const cands=[
    path.join(__dirname,'public','studio','webgl-assets','stickers-flat-thick',name),
    path.join(__dirname,'..','vibesticker','cartoon','cards','rebuild','sticker-studio','user-picks','stickers-flat-thick',name),
    path.join(__dirname,'public','studio','webgl-assets','stickers',name),
  ];
  for(const c of cands){ if(fs.existsSync(c)) return res.sendFile(c); }
  res.sendStatus(404);
});
app.get('/favicon.ico',(q,r)=>r.redirect(301,'/favicon.svg'));
app.get('/health',(q,r)=>r.json({ok:true,provider:provider.name(),stripeMock:STRIPE_MOCK}));
app.listen(process.env.PORT||3000,()=>console.log('listening',{provider:provider.name(),STRIPE_MOCK}));
