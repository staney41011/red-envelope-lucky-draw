import {boot,snapshot,subscribe,safe,money,formatted,shortTime} from './storage.js';
const el=id=>document.getElementById(id);
const zones=['ruby','gold','jade','bonus'];
let lastRevision='',lastPhase='';
function update(){
  const d=snapshot();
  const drawing=d.activity.phase==='drawing' && Date.now()<Number(d.activity.animationUntil);
  const phase=drawing?'drawing':'revealed';
  if(d.revision===lastRevision&&phase===lastPhase)return;
  lastRevision=d.revision;lastPhase=phase;
  render(d,phase);
}
function render(d,phase){
  el('connection').textContent='● 同一瀏覽器分頁同步中';
  el('updated').textContent=formatted(d.updatedAt);
  el('queueCount').textContent=d.queue.length;
  el('queue').innerHTML=d.queue.map((q,i)=>
    '<article><b>'+(i+1)+'. '+safe(q.name)+'</b><small>'+safe(q.zoneLabel)+'・'+safe(q.product||'')+'</small></article>'
  ).join('');
  el('prizes').innerHTML=zones.map(z=>
    '<article class="'+z+'"><h3>'+safe(d.prizeZones[z].label)+'</h3>'+
    d.remaining[z].map(p=>'<p><span>NT$ '+money(p.amount)+'</span><b>'+p.count+' 份</b></p>').join('')+
    '</article>').join('');
  el('records').innerHTML=d.records.map(r=>
    '<article><span><b>'+safe(r.name)+'</b><small>'+safe(r.zoneLabel)+'・NT$ '+money(r.prize)+'</small></span>'+
    '<time>'+shortTime(r.createdAt)+'</time></article>'
  ).join('');
  const r=d.activity.result;
  el('projectionPage').classList.toggle('isDrawing',phase==='drawing');
  if(r&&(d.activity.phase==='drawing'||d.activity.phase==='revealed')){
    el('stage').className='projectionResult';
    el('stage').innerHTML='<p>'+(phase==='drawing'?'🎈 紅包氣球即將揭曉 🎈':'恭喜幸運得主')+'</p>'+
      '<h2>'+safe(r.name)+'</h2><strong>'+(phase==='drawing'?'🎈':'<small>NT$</small> '+money(r.prize))+'</strong>'+
      '<div class="projectionNotes"><span>得獎區域<strong>'+safe(r.zoneLabel)+'</strong></span>'+
      '<span>商品<strong>'+safe(r.product||'')+'</strong></span></div>';
  }else{
    el('stage').className='projectionWaiting';
    el('stage').innerHTML='<span>福</span><p>等待控制台開獎</p>'+
      '<h2>'+(d.queue.length?'下一份紅包即將開出':'抽獎佇列準備中')+'</h2>';
  }
}
try{
  await boot();
  subscribe(update);
  update();
  setInterval(update,350);
}catch(e){
  el('connection').textContent='● 讀取失敗：'+e.message;
}
