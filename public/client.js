'use strict';
let current = null, lastStamp = '', loading = false;
const el = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => Number(n||0).toLocaleString('zh-TW');
const stamp = s => s ? new Date(s).toLocaleString('zh-TW') : '';
const order = ['ruby','gold','jade','bonus'];
const zoneClass = {ruby:'ruby',gold:'gold',jade:'jade',bonus:'bonus'};
function notice(message,bad=false) {
  const node=el('notice');node.textContent=message;node.className=bad?'error':'success';
  window.clearTimeout(notice.timer);notice.timer=setTimeout(()=>node.textContent='',4200);
}
async function request(action,params={}) {
  const r=await fetch('/api/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...params})});
  const data=await r.json();
  if(!r.ok)throw Error(data.error||'操作失敗');
  current=data;render(data);return data;
}
async function refresh(){
  if(loading)return;
  loading=true;
  try{
    const r=await fetch('/api/state?t='+Date.now(),{cache:'no-store'});
    if(!r.ok)throw Error('連線失敗');
    const data=await r.json();
    el('connection').textContent='● 雲端已連線';
    if(data.updatedAt!==lastStamp){lastStamp=data.updatedAt;current=data;render(data);}
  }catch(e){el('connection').textContent='● 等待重新連線';}finally{loading=false;}
}
function render(d){
 el('updated').textContent='最後更新 '+stamp(d.updatedAt);
 el('lastSaved').textContent='本頁雲端資料更新於 '+stamp(d.updatedAt);
 el('counts').textContent=d.names.length+' 位參加者・'+d.records.length+' 筆紀錄・'+d.queue.length+' 筆待抽';
 el('people').innerHTML=d.names.map((name,i)=>
   '<form><button type="button" data-name="'+esc(name)+'" class="'+(d.activity.selectedName===name?'selected':'')+'"><small>'+String(i+1).padStart(2,'0')+'</small><strong>'+esc(name)+'</strong></button></form>'
 ).join('');
 el('zones').innerHTML=order.map((key,i)=>{
   const def=d.prizeZones[key],left=d.remaining[key].reduce((s,p)=>s+p.count,0);
   return '<form><button type="button" data-zone="'+key+'" class="'+zoneClass[key]+' '+(d.activity.selectedZone===key?'selected':'')+'"><small>'+String(i+1).padStart(2,'0')+'</small><strong>'+esc(def.label)+'</strong><em>'+left+' 包</em></button></form>';
 }).join('');
 const ready=d.activity.phase, result=d.activity.result;
 el('enqueueButton').disabled=!(d.activity.selectedName&&d.activity.selectedZone);
 if(result && (ready==='revealed'||ready==='drawing')){
   el('ready').className='compatResult';
   el('ready').innerHTML='<span>🎉</span><p>'+(ready==='drawing'?'正在開獎…':'本次幸運得主')+'</p>'+
     '<h2>'+esc(result.name)+'</h2><strong><small>NT$</small> '+(ready==='drawing'?'🎈':money(result.prize))+'</strong>'+
     '<b>'+esc(result.zoneLabel)+'</b><p>'+esc(result.product||'')+'</p>'+
     (d.queue.length?'<button data-draw type="button" '+(ready==='drawing'?'disabled':'')+'>開出下一筆</button>':'');
 }else{
   el('ready').className='compatReady';
   el('ready').innerHTML='<span>福</span><p>佇列共 '+d.queue.length+' 筆</p><h2>'+(d.queue.length?'準備揭曉下一份紅包':'請先加入抽獎佇列')+'</h2>'+
     '<button data-draw type="button" '+(!d.queue.length?'disabled':'')+'>開出下一筆</button>';
 }
 el('queue').innerHTML='<h3>待抽順序</h3>'+(d.queue.length?d.queue.map((q,i)=>
    '<div class="queueEntry"><span><b>'+(i+1)+'. '+esc(q.name)+'・'+esc(q.zoneLabel)+'</b><small>'+esc(q.product||'')+'　手收 '+money(q.handReceipt)+'　獎金 '+money(q.bonusAmount)+'</small></span><button data-remove="'+esc(q.id)+'" type="button">移除</button></div>'
 ).join(''):'<p class="empty">目前沒有待抽資料</p>');
 el('history').innerHTML='<h3>全部抽獎紀錄</h3>'+(d.records.length?d.records.map(r=>
   '<div><span><b>'+esc(r.name)+'・'+esc(r.zoneLabel)+'・NT$ '+money(r.prize)+'</b>'+
   '<small>'+stamp(r.createdAt)+'｜'+esc(r.product||'')+'｜手收 '+money(r.handReceipt)+'｜獎金 '+money(r.bonusAmount)+'</small></span>'+
   '<form class="deleteRecordForm" data-record="'+esc(r.id)+'"><input type="password" placeholder="密碼" required name="password" aria-label="管理密碼"><button type="submit">刪除</button></form></div>'
 ).join(''):'<p class="empty">目前沒有抽獎紀錄</p>');
}
document.addEventListener('click',async e=>{
 const name=e.target.closest('[data-name]'),zone=e.target.closest('[data-zone]'),
   draw=e.target.closest('[data-draw]'),remove=e.target.closest('[data-remove]');
 try{
  if(name)await request('selectName',{name:name.dataset.name});
  else if(zone)await request('selectZone',{zone:zone.dataset.zone});
  else if(draw)await request('draw');
  else if(remove){if(confirm('確定將此項目從待抽佇列移除？'))await request('removeQueue',{id:remove.dataset.remove});}
 }catch(err){notice(err.message,true);}
});
el('enqueueForm').addEventListener('submit',async e=>{
 e.preventDefault();const f=new FormData(e.currentTarget);
 try{await request('enqueue',Object.fromEntries(f));e.currentTarget.reset();notice('已加入抽獎佇列');}
 catch(err){notice(err.message,true);}
});
document.addEventListener('submit',async e=>{
 const form=e.target;
 if(form.matches('.deleteRecordForm')){
  e.preventDefault();if(!confirm('確定永久刪除此筆紀錄？'))return;
  try{await request('deleteRecord',{id:form.dataset.record,password:form.elements.password.value});notice('已刪除');}
  catch(err){notice(err.message,true);}
 }
});
el('resetForm').addEventListener('submit',async e=>{
 e.preventDefault();
 if(!confirm('將永久清空目前所有抽獎紀錄與待抽名單。確定全部重置？'))return;
 try{await request('reset',{password:e.currentTarget.elements.password.value});e.currentTarget.reset();notice('重置完成');}
 catch(err){notice(err.message,true);}
});
refresh();setInterval(refresh,1300);
