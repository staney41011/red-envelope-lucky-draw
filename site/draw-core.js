// Shared deterministic state shape and prize inventory logic. No Firebase secrets.
export const AUTH_EMAIL = 'a10014521@gmail.com';
export const newActivity = () => ({
  selectedName:'',selectedZone:'',phase:'idle',result:null,animationUntil:0,
  resetCount:0,updatedAt:new Date().toISOString()
});
const uuid = () => globalThis.crypto?.randomUUID?.() || Date.now()+'-'+Math.random().toString(36).slice(2);
export function createEngine(initial){
  if(!initial || !Array.isArray(initial.names) || !initial.prizeZones)throw Error('抽獎基本設定錯誤');
  const names=initial.names.filter(n=>n!=='石淑華');
  const prizes=initial.prizeZones;
  function fresh(){
    return {names:[...names],records:[],queue:[],activity:newActivity(),
      updatedAt:new Date().toISOString(),revision:uuid()};
  }
  function normalize(raw){
    let s=raw?.cloud||raw;
    if(!s||typeof s!=='object')s=fresh();
    const activity={...newActivity(),...(s.activity||{})};
    const asList=value=>Array.isArray(value)?value:(value && typeof value==='object'?Object.entries(value).sort(([a],[b])=>Number(a)-Number(b)).map(([,v])=>v):[]);
    if(!names.includes(activity.selectedName))activity.selectedName='';
    if(!prizes[activity.selectedZone])activity.selectedZone='';
    return {...s,names:[...names],activity,
      records:asList(s.records).filter(r=>r && typeof r==='object'),
      queue:asList(s.queue).filter(q=>q && names.includes(q.name) && !!prizes[q.zone]),
      updatedAt:s.updatedAt||new Date().toISOString(),revision:s.revision||'legacy'};
  }
  function remaining(zone,records){
    return (prizes[zone]?.prizes||[]).map(p=>({
      amount:p.amount,
      count:Math.max(0,Number(p.count)-records.filter(r=>r.zone===zone&&Number(r.prize)===Number(p.amount)).length)
    }));
  }
  function view(raw){
    const s=normalize(raw);
    return {...s,prizeZones:prizes,remaining:Object.fromEntries(
      Object.keys(prizes).map(z=>[z,remaining(z,s.records)]))};
  }
  function ticketDraw(options){
    const total=options.reduce((sum,p)=>sum+p.count,0);
    if(total<=0)throw Error('該獎區已無剩餘紅包');
    const bits=new Uint32Array(1);crypto.getRandomValues(bits);
    let ticket=Math.floor((bits[0]/4294967296)*total);
    for(const entry of options){if(ticket<entry.count)return entry.amount;ticket-=entry.count;}
    throw Error('抽獎計算錯誤');
  }
  function apply(raw,action,payload={}){
    const s=normalize(raw),a=s.activity;
    switch(action){
      case 'selectName':
        if(!names.includes(payload.name))throw Error('參加者不在有效名單內');
        a.selectedName=payload.name;break;
      case 'selectZone':
        if(!prizes[payload.zone])throw Error('找不到獎區');
        a.selectedZone=payload.zone;break;
      case 'enqueue':{
        const name=a.selectedName,zone=a.selectedZone;
        if(!names.includes(name)||!prizes[zone])throw Error('請先選擇人員與獎區');
        if(!String(payload.product||'').trim())throw Error('請輸入商品名稱');
        const qty=remaining(zone,s.records).reduce((n,p)=>n+p.count,0);
        if(s.queue.filter(q=>q.zone===zone).length>=qty)throw Error('這個獎區紅包不足');
        const numeric=n=>Math.max(0,Number(n)||0);
        s.queue.push({id:uuid(),name,zone,zoneLabel:prizes[zone].label,
          product:String(payload.product).trim().slice(0,60),
          handReceipt:numeric(payload.handReceipt),bonusAmount:numeric(payload.bonusAmount),
          createdAt:new Date().toISOString()});
        a.selectedName='';a.selectedZone='';break;
      }
      case 'draw':{
        if(!s.queue.length)throw Error('請先加入抽獎佇列');
        if(a.phase==='drawing'&&Date.now()<Number(a.animationUntil))throw Error('上一筆仍在開獎動畫中');
        const entry=s.queue[0],prize=ticketDraw(remaining(entry.zone,s.records));
        s.queue.shift();
        const result={id:uuid(),name:entry.name,zone:entry.zone,zoneLabel:entry.zoneLabel,
          prize,product:entry.product,handReceipt:entry.handReceipt,bonusAmount:entry.bonusAmount,
          createdAt:new Date().toISOString()};
        s.records.unshift(result);
        a.result=result;a.phase='drawing';a.animationUntil=Date.now()+3300;break;
      }
      case 'removeQueue':s.queue=s.queue.filter(q=>q.id!==payload.id);break;
      case 'deleteRecord':s.records=s.records.filter(r=>r.id!==payload.id);break;
      case 'reset':{
        const empty=fresh();empty.activity.resetCount=Number(a.resetCount||0)+1;
        return empty;
      }
      default:throw Error('未知的操作：'+String(action));
    }
    s.updatedAt=new Date().toISOString();s.activity.updatedAt=s.updatedAt;s.revision=uuid();
    return s;
  }
  return {names,prizes,fresh,normalize,remaining,view,apply};
}
