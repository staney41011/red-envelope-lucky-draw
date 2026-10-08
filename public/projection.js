'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n||0).toLocaleString('zh-TW');
const when=s=>s?new Date(s).toLocaleString('zh-TW'):'';
const short=s=>s?new Date(s).toLocaleString('zh-TW',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
const zones=['ruby','gold','jade','bonus'];
let lastStamp='',lastDraw='';
async function tick(){
 try{
  const res=await fetch('/api/state?t='+Date.now(),{cache:'no-store'});
  if(!res.ok)throw Error();
  const d=await res.json();
  $('connection').textContent='● 投影同步中';
  if(lastStamp===d.updatedAt)return;
  lastStamp=d.updatedAt;
  $('updated').textContent=when(d.updatedAt);
  $('queueCount').textContent=d.queue.length;
  $('queue').innerHTML=d.queue.map((q,i)=>
    '<article><b>'+(i+1)+'. '+esc(q.name)+'</b><small>'+esc(q.zoneLabel)+'・'+esc(q.product||'')+'</small></article>'
   ).join('');
  $('prizes').innerHTML=zones.map(zone=>{
    const details=d.remaining[zone];
    return '<article class="'+zone+'"><h3>'+esc(d.prizeZones[zone].label)+'</h3>'+
      details.map(p=>'<p><span>NT$ '+fmt(p.amount)+'</span><b>'+p.count+' 份</b></p>').join('')+'</article>';
  }).join('');
  $('records').innerHTML=d.records.map(r=>
    '<article><span><b>'+esc(r.name)+'</b><small>'+esc(r.zoneLabel)+'・NT$ '+fmt(r.prize)+'</small></span><time>'+short(r.createdAt)+'</time></article>'
  ).join('');
  const r=d.activity.result,phase=d.activity.phase;
  $('projectionPage').classList.toggle('isDrawing',phase==='drawing');
  const stage=$('stage');
  if(r && (phase==='revealed'||phase==='drawing')){
    stage.className='projectionResult';
    stage.innerHTML='<p>'+(phase==='drawing'?'🎈 紅包氣球準備揭曉 🎈':'恭喜幸運得主')+'</p>'+
      '<h2>'+esc(r.name)+'</h2><strong>'+(phase==='drawing'?'🎈': '<small>NT$</small>'+fmt(r.prize))+'</strong>'+
      '<div class="projectionNotes"><span>得獎區域<strong>'+esc(r.zoneLabel)+'</strong></span>'+
      '<span>商品<strong>'+esc(r.product||'')+'</strong></span></div>';
  }else{
    stage.className='projectionWaiting';
    stage.innerHTML='<span>福</span><p>等待控制台開獎</p>'+
      '<h2>'+(d.queue.length?'下一份紅包即將開出':'抽獎佇列準備中')+'</h2>';
  }
 }catch{$('connection').textContent='● 連線中斷，重新連線中';}
}
tick();setInterval(tick,1100);
