'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = __dirname;
const DATA = path.join(ROOT, 'data');
const STATE_PATH = process.env.STATE_FILE || path.join(DATA, 'state.json');
const PORT = Number(process.env.PORT || 3000);
const config = JSON.parse(fs.readFileSync(path.join(DATA, 'initial.json'), 'utf8'));
const zoneDefs = config.prizeZones;
const people = config.names.filter(n => n !== '石淑華');
const zoneKeys = Object.keys(zoneDefs);
const fresh = () => ({
  names: [...people], records: [], queue: [],
  activity: { selectedName:'', selectedZone:'', phase:'idle', result:null, animationUntil:null, resetCount:0, updatedAt:new Date().toISOString() }
});
let state;
try {
  const raw = JSON.parse(fs.readFileSync(STATE_PATH,'utf8'));
  state = raw.cloud || raw;
  state.names = [...people];
  state.records = Array.isArray(state.records) ? state.records : [];
  state.queue = Array.isArray(state.queue) ? state.queue.filter(x => people.includes(x.name)) : [];
  state.activity = { ...fresh().activity, ...(state.activity||{}) };
  if (!people.includes(state.activity.selectedName)) state.activity.selectedName = '';
} catch { state = fresh(); }
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const json = o => JSON.stringify(o);
function save() {
  state.activity.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(STATE_PATH),{recursive:true});
  const next = STATE_PATH+'.tmp';
  fs.writeFileSync(next, JSON.stringify(state,null,2),'utf8');
  fs.renameSync(next,STATE_PATH);
}
function available(zone) {
  const def = zoneDefs[zone];
  if (!def) return [];
  return def.prizes.map(p => ({
    amount:p.amount, count:Math.max(0,p.count - state.records.filter(r => r.zone===zone && Number(r.prize)===p.amount).length)
  }));
}
function view() {
  return { names:people, activity:state.activity, records:state.records, queue:state.queue,
    prizeZones:zoneDefs, remaining:Object.fromEntries(zoneKeys.map(z=>[z,available(z)])),
    updatedAt:state.activity.updatedAt,
    adminEnabled:!!process.env.ADMIN_PASSWORD };
}
function error(status,message) { const e = new Error(message);e.status=status;throw e; }
function requireAdmin(password) {
  if (!process.env.ADMIN_PASSWORD) error(403,'尚未設定 ADMIN_PASSWORD，重置和刪除功能已停用');
  const candidate = Buffer.from(String(password||''));
  const expected = Buffer.from(process.env.ADMIN_PASSWORD);
  if(candidate.length !== expected.length || !crypto.timingSafeEqual(candidate,expected)) error(403,'管理密碼錯誤');
}
function command(x) {
  const action=String(x.action||'');
  if (action==='selectName') {
    if(!people.includes(x.name)) error(400,'參加者不在有效名單內');
    state.activity.selectedName=x.name;
  } else if (action==='selectZone') {
    if(!zoneDefs[x.zone]) error(400,'無效獎區');
    state.activity.selectedZone=x.zone;
  } else if (action==='enqueue') {
    const name=state.activity.selectedName,zone=state.activity.selectedZone;
    if(!name || !people.includes(name) || !zoneDefs[zone]) error(400,'請先選擇參加者與獎區');
    if(!String(x.product||'').trim()) error(400,'請輸入商品名稱');
    if(!available(zone).some(p=>p.count>state.queue.filter(q=>q.zone===zone).filter(q=>Number(q.reserveAmount)===p.amount).length)) error(400,'此獎區已無可用紅包');
    state.queue.push({id:crypto.randomUUID(),name,zone,zoneLabel:zoneDefs[zone].label,
      product:String(x.product).trim().slice(0,60),
      handReceipt:Math.max(0,Number(x.handReceipt)||0),bonusAmount:Math.max(0,Number(x.bonusAmount)||0),
      createdAt:new Date().toISOString()});
    state.activity.selectedName='';state.activity.selectedZone='';
  } else if(action==='draw') {
    if(!state.queue.length) error(400,'請先加入抽獎佇列');
    if(state.activity.phase==='drawing' && Date.now()<new Date(state.activity.animationUntil).getTime()) error(409,'上一筆正在開獎');
    const entry=state.queue[0],stock=available(entry.zone).filter(p=>p.count>0);
    const total=stock.reduce((s,p)=>s+p.count,0);
    if(total<=0) error(400,'獎區紅包已抽完');
    let ticket=crypto.randomInt(total),prize=stock[0].amount;
    for(const p of stock){ticket-=p.count;if(ticket<0){prize=p.amount;break;}}
    state.queue.shift();
    const result={id:crypto.randomUUID(),name:entry.name,zone:entry.zone,zoneLabel:entry.zoneLabel,
      prize,createdAt:new Date().toISOString(),product:entry.product,
      handReceipt:entry.handReceipt,bonusAmount:entry.bonusAmount};
    state.records.unshift(result);
    state.activity.result=result;state.activity.phase='drawing';
    state.activity.animationUntil=new Date(Date.now()+3000).toISOString();
    setTimeout(()=>{if(state.activity.result?.id===result.id){state.activity.phase='revealed';save();}},3100);
  } else if (action==='removeQueue') {
    state.queue=state.queue.filter(q=>q.id!==x.id);
  } else if(action==='deleteRecord') {
    requireAdmin(x.password);
    if(!state.records.some(r=>r.id===x.id)) error(404,'找不到紀錄');
    state.records=state.records.filter(r=>r.id!==x.id);
  } else if(action==='reset') {
    requireAdmin(x.password);
    const old=state.activity.resetCount||0;
    state=fresh();state.activity.resetCount=old+1;
  } else error(400,'不支援的指令');
  save();
  return view();
}
function page(title,main,script='') {
 return '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<meta name="robots" content="noindex"><title>'+escapeHtml(title)+'</title>'+
 '<link rel="stylesheet" href="/original.css"><link rel="stylesheet" href="/app.css"></head><body>'+
 main+(script?'<script defer src="/'+script+'"></script>':'')+'</body></html>';
}
function homepage() {
 return page('紅包汽球抽起來｜浮誇開獎現場',
 '<main class="modePage"><div class="modeCard"><span>紅包汽球抽起來</span><h1>請選擇這台裝置的用途</h1><p>兩個網址各司其職，開啟順序不再影響操作。</p>'+
 '<div><a href="/control"><b>操作控制台</b><small>選人、選獎區、填寫備註、排隊與開獎</small></a>'+
 '<a href="/projection"><b>投影顯示</b><small>只播放抽獎畫面，不會更動任何資料</small></a></div></div></main>');
}
function controlPage() {
 return page('紅包汽球抽起來｜操作控制台',
 '<main class="compatPage"><header class="compatHeader"><div><span>操作控制台</span><h1>紅包汽球抽起來</h1>'+
 '<p>此網址專門操作；投影幕請開啟獨立顯示網址。</p></div><div class="compatStatus">'+
 '<b id="connection">● 連線中</b><small id="updated"></small>'+
 '<a href="/projection" target="_blank">開啟投影畫面 ↗</a>'+
 '<form class="resetForm" id="resetForm"><input type="password" inputmode="numeric" placeholder="管理密碼" required name="password">'+
 '<button type="submit">全部重置</button></form></div></header>'+
 '<section class="backupProtection"><div><strong>活動資料保護</strong><span id="counts"></span><small id="lastSaved"></small></div>'+
 '<div class="backupActions"><a href="/api/backup" download="red-envelope-backup.json">下載完整備份 JSON</a></div></section>'+
 '<section class="compatGrid"><section class="compatPanel"><div class="compatTitle"><b>01</b><div><small>CHOOSE PERSON</small><h2>挑選抽獎人</h2></div></div>'+
 '<div class="compatPeople" id="people"></div></section>'+
 '<section class="compatPanel"><div class="compatTitle"><b>02</b><div><small>CHOOSE ZONE</small><h2>挑戰獎區</h2></div></div>'+
 '<div class="compatZones" id="zones"></div>'+
 '<form class="noteForm" id="enqueueForm"><h3>備註資料</h3><div class="noteFields">'+
 '<label>商品<input type="text" list="productSuggestions" maxlength="60" placeholder="輸入商品名稱" required name="product">'+
 '<datalist id="productSuggestions"><option value="基金"><option value="海外債"><option value="FCN"><option value="保險"></datalist></label>'+
 '<label>手收<input type="number" min="0" step="any" inputmode="decimal" placeholder="輸入數字" name="handReceipt"></label>'+
 '<label>獎金<input type="number" min="0" step="any" inputmode="decimal" placeholder="輸入數字" name="bonusAmount"></label></div>'+
 '<button class="compatEnqueue" id="enqueueButton" type="submit">＋ 加入抽獎佇列<small>先選姓名與獎區</small></button></form></section>'+
 '<section class="compatStage"><div class="compatTitle"><b>03</b><div><small>LIVE DRAW</small><h2>同步開獎</h2></div></div>'+
 '<div class="compatReady" id="ready"></div>'+
 '<div class="compatQueue" id="queue"></div>'+
 '<div class="compatHistory" id="history"></div></section></section>'+
 '<div id="notice" role="status" aria-live="polite"></div></main>','client.js');
}
function projectionPage() {
 return page('紅包汽球抽起來｜投影顯示',
 '<main class="projectionPage" id="projectionPage"><header><div><span>LIVE DRAW</span><h1>紅包汽球抽起來</h1></div>'+
 '<div><b id="connection">● 投影同步中</b><small id="updated"></small></div></header>'+
 '<div class="projectionBody"><aside class="projectionList"><h2>本次待抽清單 <b id="queueCount">0</b></h2><div id="queue"></div></aside>'+
 '<section class="projectionStage"><div class="projectionBurst"></div><div id="stage" class="projectionWaiting"></div></section>'+
 '<aside class="projectionInfo"><section><h2>各區剩餘獎項</h2><div class="projectionPrizes" id="prizes"></div></section>'+
 '<section class="projectionRecords"><h2>抽獎紀錄</h2><div id="records"></div></section></aside></div>'+
 '<footer><span>元氣滿滿・紅包抽起來</span><b>LUCKY DRAW</b><span>投影專用畫面</span></footer></main>','projection.js');
}
function send(res,status,body,contentType='application/json; charset=utf-8') {
 res.writeHead(status,{'Content-Type':contentType,'Cache-Control':'no-store, no-cache, must-revalidate','X-Content-Type-Options':'nosniff'});
 res.end(body);
}
const assets = {'/original.css':'original.css','/app.css':'app.css','/client.js':'client.js','/projection.js':'projection.js'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  const pathname=url.pathname.replace(/\/$/,'') || '/';
  if(req.method==='GET' && assets[pathname]){
   const ext=path.extname(pathname);
   return send(res,200,fs.readFileSync(path.join(ROOT,'public',assets[pathname])),
     ext==='.js'?'application/javascript; charset=utf-8':'text/css; charset=utf-8');
  }
  if(req.method==='GET' && pathname==='/') return send(res,200,homepage(),'text/html; charset=utf-8');
  if(req.method==='GET' && pathname==='/control') return send(res,200,controlPage(),'text/html; charset=utf-8');
  if(req.method==='GET' && pathname==='/projection') return send(res,200,projectionPage(),'text/html; charset=utf-8');
  if(req.method==='GET' && pathname==='/api/state') return send(res,200,json(view()));
  if(req.method==='GET' && pathname==='/api/backup') return send(res,200,json({
   format:'red-envelope-cloud-backup-v1',exportedAt:new Date().toISOString(),
   prizeZones:zoneDefs,cloud:state}),'application/json; charset=utf-8');
  if(req.method==='POST' && pathname==='/api/command'){
   let body='';
   for await (const part of req){body+=part;if(body.length>65536) error(413,'資料過大');}
   let input;try{input=JSON.parse(body);}catch{error(400,'資料格式錯誤');}
   return send(res,200,json(command(input)));
  }
  if(req.method==='POST' && pathname==='/api/restore') {
   let body='';for await(const part of req){body+=part;if(body.length>2097152)error(413,'備份太大');}
   let payload;try{payload=JSON.parse(body);}catch{error(400,'無效 JSON');}
   requireAdmin(payload.password);
   const back=payload.backup?.cloud||payload.backup;
   if(!back || !Array.isArray(back.records) || !Array.isArray(back.queue))error(400,'備份內容有誤');
   state={...fresh(),records:back.records,queue:back.queue.filter(x=>people.includes(x.name)),activity:{...fresh().activity,...(back.activity||{})}};
   state.names=[...people];
   if(!people.includes(state.activity.selectedName))state.activity.selectedName='';
   save();return send(res,200,json(view()));
  }
  send(res,404,json({error:'找不到此頁面'}));
 }catch(e){console.error(e.message);send(res,e.status||500,json({error:e.message||'伺服器錯誤'}));}
});
server.listen(PORT,()=>console.log('紅包汽球抽起來 running: http://localhost:'+PORT+' (15 people, existing records: '+state.records.length+')'));
