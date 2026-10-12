import {createOpenEngine} from './open-core.js';
const ROOT='https://red-envelope-lucky-draw-2026-default-rtdb.asia-southeast1.firebasedatabase.app';
const LIVE=ROOT+'/liveState.json';
const listeners=new Set();
let engine=null,live=null,loading=null,connecting=false,lastError='';
const emit=()=>listeners.forEach(fn=>{try{fn();}catch(err){console.error(err);}});
const randomId=()=>crypto.randomUUID();
const request=async(url,init={})=>{
 const r=await fetch(url,{cache:'no-store',...init});
 if(!r.ok){
  let msg='HTTP '+r.status;
  try{msg+=(await r.json())?.error?'：'+(await r.json()).error:'';}catch{}
  throw Error(msg);
 }
 return r;
};
export const subscribe=fn=>{listeners.add(fn);return()=>listeners.delete(fn);};
export const connectionStatus=()=>({ready:!!live,error:lastError,connecting});
async function readLive(){
 if(connecting)return;
 connecting=true;
 try{
  const response=await fetch(LIVE,{cache:'no-store'});
  if(!response.ok)throw Error('雲端連線失敗（HTTP '+response.status+'）');
  const next=await response.json();
  if(!next)throw Error('雲端抽獎資料尚未初始化');
  if(!live||live.revision!==next.revision)live=next,emit();
  lastError='';
 }catch(e){lastError=e.message||String(e);emit();}
 finally{connecting=false;}
}
export async function boot(){
 if(loading)return loading;
 loading=(async()=>{
  const response=await fetch(new URL('../data/initial.json',import.meta.url),{cache:'no-store'});
  if(!response.ok)throw Error('名單設定讀取失敗');
  engine=createOpenEngine(await response.json());
  await readLive();
  setInterval(()=>void readLive(),1200);
 })();
 return loading;
}
export function snapshot(){
 if(!engine)throw Error('系統載入中');
 return engine.view(live||engine.initial());
}
async function conditionalUpdate(action,payload){
 for(let attempt=0;attempt<8;attempt++){
  const get=await fetch(LIVE,{headers:{'X-Firebase-ETag':'true'},cache:'no-store'});
  if(!get.ok)throw Error('取得抽獎資料失敗（'+get.status+'）');
  const etag=get.headers.get('ETag');
  if(!etag)throw Error('資料庫未提供交易鎖，已停止操作以避免重複開獎');
  const current=await get.json();
  const modified=engine.apply(current,action,payload);
  const put=await fetch(LIVE,{method:'PUT',headers:{'Content-Type':'application/json','If-Match':etag},body:JSON.stringify(modified)});
  if(put.status===412)continue;
  if(!put.ok)throw Error('雲端存檔失敗（'+put.status+'）');
  live=await put.json();emit();
  return engine.view(live);
 }
 throw Error('多人同時操作頻繁，請重試');
}
async function protectNote(name,zone,details,id){
 const body={id,name,zone,
  product:String(details.product||'').slice(0,80),
  handReceipt:Math.max(0,Number(details.handReceipt)||0),
  bonusAmount:Math.max(0,Number(details.bonusAmount)||0),
  createdAt:new Date().toISOString()};
 const response=await fetch(ROOT+'/protectedSubmissions/'+encodeURIComponent(id)+'.json',{
  method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(!response.ok)throw Error('內部明細儲存失敗（'+response.status+'）；抽獎佇列尚未新增');
}
export async function change(action,payload={}){
 if(!engine||!live)throw Error('尚未連上抽獎雲端，請稍候');
 if(action==='enqueue'){
  const id=randomId(),name=String(live.activity?.selectedName||''),zone=String(live.activity?.selectedZone||'');
  if(!engine.names.includes(name)||!engine.zones[zone])throw Error('請先選擇姓名與獎區');
  await protectNote(name,zone,payload,id);
  return conditionalUpdate(action,{id,name,zone});
 }
 return conditionalUpdate(action,payload);
}
export function exportBackup(){
 if(!live)throw Error('尚未連線');
 const blob=new Blob([JSON.stringify({format:'red-envelope-public-control-v1',exportedAt:new Date().toISOString(),state:live},null,2)],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='red-envelope-live-'+new Date().toISOString().slice(0,10)+'.json';
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
export const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money=n=>Number(n||0).toLocaleString('zh-TW');
export const formatted=s=>s?new Date(s).toLocaleString('zh-TW'):'';
export const shortTime=s=>s?new Date(s).toLocaleString('zh-TW',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
