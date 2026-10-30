// features
module.exports=({app,db,save,ipOf,STYLES})=>{
 const today=()=>new Date().toISOString().slice(0,10);
 const dayStats=key=>{db.days=db.days||{};const t=today();db.days[t]=db.days[t]||{visitors:{},unlocks:0};db.days[t].visitors[key]=1;return db.days[t]};
