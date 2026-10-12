import {boot,snapshot,change,subscribe,exportBackup,safe,money,formatted,connectionStatus} from './open-storage.js';
const el=id=>document.getElementById(id);
const zones=['ruby','gold','jade','bonus'];
let lastRevision='',lastPhase='';
function flash(msg,error=false){
  const node=el('notice');node.textContent=msg;node.className=error?'error':'success';
  clearTimeout(flash.timer);flash.timer=setTimeout(()=>node.textContent='',4800);
}
function update() {
  const d=snapshot();
  const drawing=d.activity.phase==='drawing' && Date.now()<Number(d.activity.animationUntil);
  const phase=drawing?'drawing':'revealed';
  if(d.revision===lastRevision && phase===lastPhase)return;
  lastRevision=d.revision;lastPhase=phase;
  render(d,phase);
}
function render(d,phase){
  el('connection').textContent=connectionStatus().ready?'● 免登入・雲端即時同步中':'● 等待雲端連線';
  el('updated').textContent='最後更新 '+formatted(d.updatedAt);
  el('lastSaved').textContent='歷史完整紀錄及業績明細不公開；本畫面僅保留最近 8 筆開獎結果';
  el('counts').textContent=d.names.length+' 位參加者・最近 '+d.records.length+' 筆結果・'+d.queue.length+' 筆待抽';
  el('people').innerHTML=d.names.map((name,i)=>
    '<form><button type="button" data-name="'+safe(name)+'" class="'+(d.activity.selectedName===name?'selected':'')+'">'+
    '<small>'+String(i+1).padStart(2,'0')+'</small><strong>'+safe(name)+'</strong></button></form>'
  ).join('');
  el('zones').innerHTML=zones.map((zone,i)=>{
    const stock=d.remaining[zone].reduce((s,p)=>s+p.count,0);
    return '<form><button type="button" data-zone="'+zone+'" class="'+zone+' '+(d.activity.selectedZone===zone?'selected':'')+'">'+
      '<small>'+String(i+1).padStart(2,'0')+'</small><strong>'+safe(d.prizeZones[zone].label)+'</strong><em>'+stock+' 包</em></button></form>';
  }).join('');
  el('enqueueButton').disabled=!(d.activity.selectedName&&d.activity.selectedZone);
  const result=d.activity.result;
  if(result && (d.activity.phase==='drawing'||d.activity.phase==='revealed')){
    el('ready').className='compatResult';
    el('ready').innerHTML='<span>🎈</span><p>'+(phase==='drawing'?'紅包氣球準備揭曉':'恭喜幸運得主')+'</p>'+
      '<h2>'+safe(result.name)+'</h2><strong><small>NT$</small> '+(phase==='drawing'?'🎈':money(result.prize))+'</strong>'+
      '<b>'+safe(result.zoneLabel)+'</b><p>'+safe(result.product||'')+'</p>'+
      (d.queue.length?'<button data-draw type="button" '+(phase==='drawing'?'disabled':'')+'>開出下一筆</button>':'');
  }else{
    el('ready').className='compatReady';
    el('ready').innerHTML='<span>福</span><p>佇列共 '+d.queue.length+' 筆</p>'+
      '<h2>'+(d.queue.length?'準備揭曉下一份紅包':'請先加入抽獎佇列')+'</h2>'+
      '<button data-draw type="button" '+(!d.queue.length?'disabled':'')+'>開出下一筆</button>';
  }
  el('queue').innerHTML='<h3>待抽順序</h3>'+(d.queue.length?
    d.queue.map((q,i)=>'<div class="queueEntry"><span><b>'+(i+1)+'. '+safe(q.name)+'・'+safe(q.zoneLabel)+'</b>'+
      '<small>雲端待抽中</small></span>'+
      '<button type="button" data-remove="'+safe(q.id)+'">移除</button></div>').join(''):
    '<p class="empty">目前沒有待抽資料</p>');
  el('history').innerHTML='<h3>全部抽獎紀錄</h3>'+(d.records.length?
    d.records.map(r=>'<div><span><b>'+safe(r.name)+'・'+safe(r.zoneLabel)+'・NT$ '+money(r.prize)+'</b>'+
    '<small>'+formatted(r.createdAt)+'</small>'+
    '</span></div>').join(''):
    '<p class="empty">目前沒有抽獎紀錄</p>');
}
document.addEventListener('click',async e=>{
  const n=e.target.closest('[data-name]'),z=e.target.closest('[data-zone]'),
    draw=e.target.closest('[data-draw]'),rm=e.target.closest('[data-remove]');
  try {
    if(n)await change('selectName',{name:n.dataset.name});
    else if(z)await change('selectZone',{zone:z.dataset.zone});
    else if(draw)await change('draw');
    else if(rm && confirm('確定移除這筆待抽項目？'))await change('removeQueue',{id:rm.dataset.remove});
    update();
  }catch(err){flash(err.message,true);}
});
el('enqueueForm').addEventListener('submit',async e=>{
  e.preventDefault();
  try{
    await change('enqueue',Object.fromEntries(new FormData(e.currentTarget)));
    e.currentTarget.reset();update();flash('已加入抽獎佇列');
  }catch(err){flash(err.message,true);}
});
el('resetButton').addEventListener('click',async ()=>{
  if(!confirm('確定清空待抽清單及目前開獎顯示？已抽出的紅包存量不會回復。'))return;
  try{await change('clearScreen');update();flash('已清空待抽與目前畫面，獎池數量未重置');}catch(err){flash(err.message,true);}
});
el('exportButton').addEventListener('click',()=>{
  try{exportBackup();flash('備份檔已下載');}catch(err){flash(err.message,true);}
});
try{
  await boot();
  subscribe(update);
  update();
  setInterval(update,350);
}catch(err){
  el('connection').textContent='● 載入失敗';
  flash(err.message,true);
}
