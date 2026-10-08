import {boot,snapshot,subscribe,safe,money,formatted,shortTime,connectionError,hasLiveProjection} from './firebase-projector.js';
const get=id=>document.getElementById(id);
const zones=['ruby','gold','jade','bonus'];
let revision='',phaseLabel='';
function refresh(){
 const d=snapshot();
 const phase=d.activity?.phase==='drawing'&&Date.now()<Number(d.activity.animationUntil)?'drawing':'revealed';
 if(d.revision===revision&&phaseLabel===phase)return;
 revision=d.revision;phaseLabel=phase;
 paint(d,phase);
}
function paint(d,phase){
 get('connection').textContent=connectionError()?('● '+connectionError()):(hasLiveProjection()?'● Firebase 即時同步中':'● 等待控制台資料');
 get('updated').textContent=formatted(d.updatedAt);
 get('queueCount').textContent=d.queue.length;
 get('queue').innerHTML=d.queue.map((q,i)=>
  '<article><b>'+(i+1)+'. '+safe(q.name)+'</b><small>'+safe(q.zoneLabel)+'</small></article>').join('');
 get('prizes').innerHTML=zones.filter(z=>d.prizeZones?.[z]).map(z=>
  '<article class="'+z+'"><h3>'+safe(d.prizeZones[z].label)+'</h3>'+
  (d.remaining[z]||[]).map(p=>
   '<p><span>NT$ '+money(p.amount)+'</span><b>'+p.count+' 份</b></p>'
  ).join('')+'</article>').join('');
 get('records').innerHTML=d.records.map(r=>
   '<article><span><b>'+safe(r.name)+'</b><small>'+safe(r.zoneLabel)+'・NT$ '+money(r.prize)+'</small></span>'+
   '<time>'+shortTime(r.createdAt)+'</time></article>').join('');
 get('projectionPage').classList.toggle('isDrawing',phase==='drawing');
 const result=d.activity?.result;
 if(result){
  get('stage').className='projectionResult';
  get('stage').innerHTML='<p>'+(phase==='drawing'?'🎈 紅包氣球即將揭曉 🎈':'恭喜幸運得主')+'</p>'+
   '<h2>'+safe(result.name)+'</h2>'+
   '<strong>'+(phase==='drawing'?'🎈':'<small>NT$</small> '+money(result.prize))+'</strong>'+
   '<div class="projectionNotes"><span>得獎區域<strong>'+safe(result.zoneLabel)+'</strong></span></div>';
 }else{
  get('stage').className='projectionWaiting';
  get('stage').innerHTML='<span>福</span><p>等待手機控制台開獎</p>'+
   '<h2>'+(d.queue.length?'下一份紅包即將開出':(hasLiveProjection()?'抽獎佇列準備中':'等待首次雲端同步'))+'</h2>';
 }
}
try{
 await boot();subscribe(refresh);refresh();setInterval(refresh,350);
}catch(e){get('connection').textContent='● 讀取失敗：'+e.message;}
