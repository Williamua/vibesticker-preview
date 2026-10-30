const express=require('express'),multer=require('multer'),sharp=require('sharp'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const STYLES=require('./styles'),provider=require('./providers'),{makeGif}=require('./lib/gif');
const PUBLIC_STYLES=STYLES.filter(s=>!s.hidden);
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
const genInfo=()=>{const i=provider.info();return {provider:i.name,demo:i.demo,demoReason:i.reason}};
app.get('/api/config',(req,res)=>res.json({styles:PUBLIC_STYLES.map(({id,name,motion})=>({id,name,motion})),tiers:TIERS,...genInfo(),stripeMock:STRIPE_MOCK,...status(ipOf(req))}));
app.post('/api/generate',upload.single('photo'),async(req,res)=>{
 try{ if(!req.file)return res.status(400).json({error:'JPG/PNG/HEIC only'});
  const style=PUBLIC_STYLES.find(s=>s.id===req.body.style)||PUBLIC_STYLES[0], ip=ipOf(req), st=status(ip);
  if(st.freeLeft<=0&&st.credits<=0)return res.status(402).json({error:'quota',...st});
  let src;try{src=await sharp(req.file.buffer).rotate().toBuffer()}catch(e){return res.status(415).json({error:'Cannot decode image (HEIC is converted in-browser; try JPG)'})}
  const gi=genInfo();
  const out=await provider.generate(src,style);
  let png;try{png=await sharp(out).resize(1024,1024,{fit:'contain',background:{r:255,g:255,b:255,alpha:1}}).png().toBuffer()}catch(e){throw Object.assign(new Error('provider returned an unreadable image'),{code:'empty',status:502})}
  const id=crypto.randomBytes(12).toString('hex');
  fs.writeFileSync(path.join(DATA,id+'.png'),png);
  const gif=await makeGif(png,style.motion);fs.writeFileSync(path.join(DATA,id+'.gif'),gif.buffer);
  if(st.freeLeft>0)db.ipUsed[ip]=(db.ipUsed[ip]||0)+1; else db.credits[ip]--;   // only charge quota on success
  db.items[id]={style:style.id,t:Date.now(),demo:gi.demo}; save();
  res.json({id,style:style.id,png:`/api/file/${id}.png`,gif:`/api/file/${id}.gif`,gifFrames:gif.frames,...gi,...status(ip)});
 }catch(e){console.error('[generate]',e.code||'',e.message);res.status(e.status||500).json({error:e.message,code:e.code||'internal'})}});
app.get('/api/file/:f',(req,res)=>{const m=/^([a-f0-9]{24})\.(png|gif)$/.exec(req.params.f);if(!m||!db.items[m[1]])return res.sendStatus(404);
 const it=db.items[m[1]],name=`VibeSticker-${it.style}${it.demo?'-demo':''}-${m[1].slice(0,6)}.${m[2]}`;
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
app.get('/health',(q,r)=>r.json({ok:true,...genInfo(),stripeMock:STRIPE_MOCK}));
app.listen(process.env.PORT||3000,()=>console.log('listening',{...provider.info(),STRIPE_MOCK}));
