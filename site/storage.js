// GitHub Pages local-storage draw engine. Public code contains no private history.
const KEY = 'red-envelope-lucky-draw-static-v1';
const source = new URL('../data/initial.json', import.meta.url);
let settings = null;
let channel = null;
const listeners = new Set();
const uuid = () => globalThis.crypto?.randomUUID?.() || (Date.now()+'-'+Math.random().toString(36).slice(2));
const newActivity = () => ({selectedName:'',selectedZone:'',phase:'idle',result:null,animationUntil:0,resetCount:0,updatedAt:new Date().toISOString()});
function fresh() {return {names:[...settings.names],records:[],queue:[],activity:newActivity(),updatedAt:new Date().toISOString(),revision:'empty'};}
const validNumber = x => Math.max(0,Number.isFinite(Number(x))?Number(x):0);
function normalize(data) {
  const base=data?.cloud ?? data;
  if(!base||typeof base!=='object')return fresh();
  const state={names:[...settings.names],
    records:Array.isArray(base.records)?base.records.filter(r=>r&&typeof r==='object'):[],
    queue:Array.isArray(base.queue)?base.queue.filter(q=>q&&settings.names.includes(q.name)&&settings.prizeZones[q.zone]):[],
    activity:{...newActivity(),...(base.activity||{})},
    updatedAt:typeof base.updatedAt==='string'?base.updatedAt:new Date().toISOString(),
    revision:base.revision||uuid()};
  if(!settings.names.includes(state.activity.selectedName))state.activity.selectedName='';
  if(!settings.prizeZones[state.activity.selectedZone])state.activity.selectedZone='';
  return state;
}
function read(){
  let raw;
  try{raw=localStorage.getItem(KEY);}catch{throw new Error('瀏覽器封鎖本機儲存，請允許網站使用儲存空間');}
  if(!raw)return fresh();
  try{return normalize(JSON.parse(raw));}catch{throw new Error('儲存資料已損壞，請先備份或改用其他瀏覽器');}
}
function write(next) {
  next.names=[...settings.names];
  next.updatedAt=new Date().toISOString();
  next.activity.updatedAt=next.updatedAt;
  next.revision=uuid();
  try{localStorage.setItem(KEY,JSON.stringify(next));}catch{throw new Error('瀏覽器儲存空間不足，無法儲存抽獎結果');}
  listeners.forEach(fn=>fn(next));
  try{channel?.postMessage({revision:next.revision});}catch{}
  return next;
}
export async function boot(){
  if(settings)return;
  const res=await fetch(source,{cache:'no-store'});
  if(!res.ok)throw new Error('名單載入失敗（HTTP '+res.status+'）');
  settings=await res.json();
  settings.names=settings.names.filter(n=>n!=='石淑華');
  if(settings.names.length!==15)console.warn('參加人數與預期不同，請確認 data/initial.json');
  try{channel=new BroadcastChannel(KEY);}catch{}
  if(channel)channel.onmessage=()=>listeners.forEach(fn=>fn(read()));
  window.addEventListener('storage',e=>{if(e.key===KEY)listeners.forEach(fn=>fn(read()));});
}
export const subscribe=fn=>{listeners.add(fn);return ()=>listeners.delete(fn);};
export const snapshot=()=>{
  if(!settings)throw new Error('網站尚未載入');
  const s=read();
  return {...s,prizeZones:settings.prizeZones,
    remaining:Object.fromEntries(Object.keys(settings.prizeZones).map(z=>[z,remaining(z,s.records)]))};
};
export const remaining=(zone,records)=>(settings.prizeZones[zone]?.prizes||[]).map(p=>({
  amount:p.amount,count:Math.max(0,p.count-records.filter(r=>r.zone===zone&&Number(r.prize)===p.amount).length)
}));
function choosePrize(choices){
  const total=choices.reduce((sum,p)=>sum+p.count,0);
  if(!total)throw new Error('這個獎區已經沒有紅包');
  const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);
  let pick=Math.floor((bytes[0]/4294967296)*total);
  for(const item of choices){if(pick<item.count)return item.amount;pick-=item.count;}
  throw new Error('抽獎計算異常');
}
export function change(action,payload={}){
  if(!settings)throw new Error('網站尚未載入');
  const state=read(),act=state.activity,zoneDefs=settings.prizeZones;
  switch(action){
    case 'selectName':
      if(!settings.names.includes(payload.name))throw new Error('不是有效參加者');
      act.selectedName=payload.name;break;
    case 'selectZone':
      if(!zoneDefs[payload.zone])throw new Error('沒有這個獎區');
      act.selectedZone=payload.zone;break;
    case 'enqueue': {
      const name=act.selectedName,zone=act.selectedZone;
      if(!settings.names.includes(name)||!zoneDefs[zone])throw new Error('請先選擇參加者與獎區');
      if(!String(payload.product||'').trim())throw new Error('請先填寫商品名稱');
      const total=remaining(zone,state.records).reduce((n,p)=>n+p.count,0);
      const reserved=state.queue.filter(q=>q.zone===zone).length;
      if(reserved>=total)throw new Error('此獎區可用紅包不足');
      state.queue.push({id:uuid(),name,zone,zoneLabel:zoneDefs[zone].label,
        product:String(payload.product).trim().slice(0,60),handReceipt:validNumber(payload.handReceipt),
        bonusAmount:validNumber(payload.bonusAmount),createdAt:new Date().toISOString()});
      act.selectedName='';act.selectedZone='';break;
    }
    case 'draw': {
      if(!state.queue.length)throw new Error('請先加入抽獎佇列');
      if(act.phase==='drawing'&&Date.now()<Number(act.animationUntil))throw new Error('上一筆仍在開獎動畫中');
      const entry=state.queue[0],prize=choosePrize(remaining(entry.zone,state.records));
      state.queue.shift();
      const result={id:uuid(),name:entry.name,zone:entry.zone,zoneLabel:entry.zoneLabel,prize,
        createdAt:new Date().toISOString(),product:entry.product,
        handReceipt:entry.handReceipt,bonusAmount:entry.bonusAmount};
      state.records.unshift(result);
      act.result=result;act.phase='drawing';act.animationUntil=Date.now()+3200;break;
    }
    case 'removeQueue':state.queue=state.queue.filter(q=>q.id!==payload.id);break;
    case 'deleteRecord':state.records=state.records.filter(r=>r.id!==payload.id);break;
    case 'reset':{
      const reset=fresh();reset.activity.resetCount=(Number(act.resetCount)||0)+1;
      return write(reset);
    }
    default:throw new Error('未知的操作');
  }
  return write(state);
}
export function exportBackup(){
  const result={format:'red-envelope-browser-backup-v1',exportedAt:new Date().toISOString(),prizeZones:settings.prizeZones,cloud:read()};
  const blob=new Blob([JSON.stringify(result,null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='red-envelope-backup-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function importBackup(raw){
  const imported=raw?.cloud??raw;
  if(!imported||!Array.isArray(imported.records)||!Array.isArray(imported.queue))throw new Error('不是有效的原網站備份 JSON');
  if(imported.records.length>100000)throw new Error('備份檔太大，請先確認');
  return write(normalize(imported));
}
export const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money=n=>Number(n||0).toLocaleString('zh-TW');
export const formatted=s=>s?new Date(s).toLocaleString('zh-TW'):'';
export const shortTime=s=>s?new Date(s).toLocaleString('zh-TW',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
