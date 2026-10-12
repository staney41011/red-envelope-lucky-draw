// Public raffle engine. No private historical records or financial notes in this state.
const now=()=>new Date().toISOString();
const uid=()=>crypto.randomUUID();
export function createOpenEngine(config){
 const names=config.names.filter(n=>n!=='石淑華');
 const zones=config.prizeZones;
 const initialStock=()=>Object.fromEntries(Object.entries(zones).map(([z,def])=>[z,Object.fromEntries(def.prizes.map(p=>[String(p.amount),Number(p.count)]))]));
 const list=x=>Array.isArray(x)?x:(x&&typeof x==='object'?Object.keys(x).sort((a,b)=>Number(a)-Number(b)).map(k=>x[k]):[]);
 function initial(){
   return {names:[...names],remainingStock:initialStock(),records:[],queue:[],
    activity:{selectedName:'',selectedZone:'',phase:'idle',result:null,animationUntil:0,resetCount:0},
    revision:uid(),updatedAt:now()};
 }
 function normalize(raw){
  if(!raw) return initial();
  return {
    names:[...names],
    remainingStock:raw.remainingStock||initialStock(),
    queue:list(raw.queue).filter(q=>q&&names.includes(q.name)&&zones[q.zone]),
    records:list(raw.records).filter(r=>r&&typeof r==='object').slice(0,8),
    activity:{...initial().activity,...(raw.activity||{})},
    updatedAt:raw.updatedAt||now(),revision:raw.revision||uid()
  };
 }
 function remaining(state,zone){
  return (zones[zone]?.prizes||[]).map(p=>({amount:p.amount,count:Math.max(0,Number(state.remainingStock[zone]?.[String(p.amount)]||0))}));
 }
 function view(raw){
  const s=normalize(raw);
  return {...s,prizeZones:zones,
    remaining:Object.fromEntries(Object.keys(zones).map(z=>[z,remaining(s,z)]))};
 }
 function choose(options){
  const total=options.reduce((v,p)=>v+p.count,0);
  if(total<=0)throw Error('這個獎區沒有剩餘紅包');
  const r=new Uint32Array(1);crypto.getRandomValues(r);
  let target=Math.floor((r[0]/2**32)*total);
  for(const option of options){if(target<option.count)return option.amount;target-=option.count;}
  throw Error('開獎資料異常');
 }
 function apply(raw,action,payload={}){
  if(!raw)throw Error('線上抽獎資料尚未初始化');
  const s=normalize(raw),act=s.activity;
  switch(action){
   case 'selectName':
    if(!names.includes(payload.name))throw Error('不在有效名單內');act.selectedName=payload.name;break;
   case 'selectZone':
    if(!zones[payload.zone])throw Error('無效獎區');act.selectedZone=payload.zone;break;
   case 'enqueue':{
    const name=String(payload.name||act.selectedName),zone=String(payload.zone||act.selectedZone);
    if(!names.includes(name)||!zones[zone])throw Error('請先選人與獎區');
    const left=remaining(s,zone).reduce((n,p)=>n+p.count,0);
    if(left<=s.queue.filter(q=>q.zone===zone).length)throw Error('這個獎區紅包已不足');
    s.queue.push({id:String(payload.id||uid()),name,zone,zoneLabel:zones[zone].label,createdAt:now()});
    if(s.queue.length>150)throw Error('待抽清單已滿');
    act.selectedName='';act.selectedZone='';
    break;
   }
   case 'draw':{
    if(!s.queue.length)throw Error('尚未加入待抽清單');
    if(act.phase==='drawing'&&Date.now()<Number(act.animationUntil))throw Error('上一份紅包尚在開獎中');
    const entry=s.queue.shift(),prize=choose(remaining(s,entry.zone));
    const key=String(prize);
    s.remainingStock[entry.zone][key]=Number(s.remainingStock[entry.zone][key])-1;
    const r={id:entry.id,name:entry.name,zone:entry.zone,zoneLabel:entry.zoneLabel,
      prize,createdAt:now()};
    s.records.unshift(r);s.records=s.records.slice(0,8);
    act.result=r;act.phase='drawing';act.animationUntil=Date.now()+3200;
    break;
   }
   case 'removeQueue':s.queue=s.queue.filter(q=>q.id!==payload.id);break;
   case 'clearScreen':{
     s.queue=[];act.selectedName='';act.selectedZone='';
     act.phase='idle';act.result=null;act.animationUntil=0;
     act.resetCount=Number(act.resetCount||0)+1;break;
   }
   default:throw Error('不支援的操作');
  }
  s.updatedAt=now();s.revision=uid();
  return s;
 }
 return {names,zones,initial,normalize,view,apply,remaining};
}
