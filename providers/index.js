// Switchable image provider: IMAGE_PROVIDER=replicate|xai|gemini|mock
const sharp=require('sharp');
const BASE_PROMPT=s=>`Turn the person in this photo into a ${s.prompt}. Keep their facial likeness. Single subject, centered, thick white die-cut sticker border, plain white background.`;
async function toJpegUri(buf){return 'data:image/jpeg;base64,'+(await sharp(buf).resize(1024,1024,{fit:'inside'}).jpeg({quality:90}).toBuffer()).toString('base64')}
async function grab(url){return Buffer.from(await (await fetch(url)).arrayBuffer())}
const providers={
 async mock(buf,style){ // local filter: no API cost
  const tint={chibi:[255,200,220],vaporwave:[255,120,230],graffiti:[255,200,0],glitch:[0,255,200],ink:[40,40,40],retro:[230,160,90],pixel:[120,200,255],clay:[220,150,110],comic:[255,60,60],kawaii:[255,220,240]}[style.id]||[200,200,200];
  let img=sharp(buf).resize(1024,1024,{fit:'cover'});
  if(style.id==='ink')img=img.grayscale().linear(1.4,-40);
  else if(style.id==='pixel'){const sm=await img.resize(64,64).png().toBuffer();img=sharp(sm).resize(1024,1024,{kernel:'nearest'});}
  else img=img.modulate({saturation:1.9}).tint({r:tint[0],g:tint[1],b:tint[2]});
  return img.sharpen({sigma:2}).png().toBuffer();},
 async replicate(buf,style){
  const T=process.env.REPLICATE_API_TOKEN;if(!T)throw new Error('REPLICATE_API_TOKEN missing');
  const r=await fetch('https://api.replicate.com/v1/predictions',{method:'POST',headers:{Authorization:'Bearer '+T,'Content-Type':'application/json',Prefer:'wait'},
   body:JSON.stringify({version:process.env.REPLICATE_VERSION||'764d4827ea159608a07cdde8ddf1c6000019627515eb02b6b449695fd547e5ef',input:{image:await toJpegUri(buf),prompt:style.prompt,upscale:false,steps:20,width:1024,height:1024}})});
  let p=await r.json();
  while(p.status&&!['succeeded','failed','canceled'].includes(p.status)){await new Promise(z=>setTimeout(z,1500));p=await (await fetch(p.urls.get,{headers:{Authorization:'Bearer '+T}})).json();}
  if(p.status!=='succeeded')throw new Error('replicate failed: '+(p.error||p.detail||'unknown'));
  const outs=[].concat(p.output);return grab(outs[1]||outs[0]);},
 async xai(buf,style){ // xAI image edit; endpoint/fields per docs.x.ai — verify with a real key
  const K=process.env.XAI_API_KEY;if(!K)throw new Error('XAI_API_KEY missing');
  const r=await fetch('https://api.x.ai/v1/images/edits',{method:'POST',headers:{Authorization:'Bearer '+K,'Content-Type':'application/json'},
   body:JSON.stringify({model:process.env.XAI_MODEL||'grok-imagine-image',prompt:BASE_PROMPT(style),image:{url:await toJpegUri(buf),type:'image_url'},response_format:'b64_json'})});
  const j=await r.json();if(!r.ok)throw new Error('xai: '+JSON.stringify(j).slice(0,300));
  const d=j.data[0];return d.b64_json?Buffer.from(d.b64_json,'base64'):grab(d.url);},
 async gemini(buf,style){
  const K=process.env.GEMINI_API_KEY;if(!K)throw new Error('GEMINI_API_KEY missing');
  const m=process.env.GEMINI_MODEL||'gemini-2.5-flash-image';
  const b64=(await toJpegUri(buf)).split(',')[1];
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`,{method:'POST',headers:{'x-goog-api-key':K,'Content-Type':'application/json'},
   body:JSON.stringify({contents:[{parts:[{text:BASE_PROMPT(style)},{inline_data:{mime_type:'image/jpeg',data:b64}}]}]})});
  const j=await r.json();if(!r.ok)throw new Error('gemini: '+JSON.stringify(j).slice(0,300));
  const part=(j.candidates?.[0]?.content?.parts||[]).find(p=>p.inlineData||p.inline_data);
  if(!part)throw new Error('gemini returned no image');return Buffer.from((part.inlineData||part.inline_data).data,'base64');}
};
function pick(){const n=(process.env.IMAGE_PROVIDER||(process.env.GEMINI_API_KEY?'gemini':'mock')).toLowerCase();if(!providers[n])throw new Error('unknown provider '+n);return n}
module.exports={generate:(b,s)=>providers[pick()](b,s),name:pick};
