import {boot,snapshot,change,subscribe,exportBackup,importBackup,safe,money,formatted,subscribeAuth,firebaseSignIn,firebaseSignInRedirect,firebaseSignOut,isCloudReady} from './firebase-storage.js';
import {installFirebaseGate} from './auth-ui.js';
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
  el('connection').textContent='● Firebase 雲端同步中';
  el('updated').textContent='最後更新 '+formatted(d.updatedAt);
  el('lastSaved').textContent='資料儲存在 Firebase，手機／電腦即時共享';
  el('counts').textContent=d.names.length+' 位參加者・'+d.records.length+' 筆紀錄・'+d.queue.length+' 筆待抽';
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
      '<small>'+safe(q.product||'')+'｜手收 '+money(q.handReceipt)+'｜獎金 '+money(q.bonusAmount)+'</small></span>'+
      '<button type="button" data-remove="'+safe(q.id)+'">移除</button></div>').join(''):
    '<p class="empty">目前沒有待抽資料</p>');
  el('history').innerHTML='<h3>全部抽獎紀錄</h3>'+(d.records.length?
    d.records.map(r=>'<div><span><b>'+safe(r.name)+'・'+safe(r.zoneLabel)+'・NT$ '+money(r.prize)+'</b>'+
    '<small>'+formatted(r.createdAt)+'｜'+safe(r.product||'')+'｜手收 '+money(r.handReceipt)+'｜獎金 '+money(r.bonusAmount)+'</small>'+
    '</span><button class="deleteLocal" type="button" data-delete="'+safe(r.id)+'">刪除</button></div>').join(''):
    '<p class="empty">目前沒有抽獎紀錄</p>');
}
document.addEventListener('click',async e=>{
  const n=e.target.closest('[data-name]'),z=e.target.closest('[data-zone]'),
    draw=e.target.closest('[data-draw]'),rm=e.target.closest('[data-remove]'),del=e.target.closest('[data-delete]');
  try {
    if(n)await change('selectName',{name:n.dataset.name});
    else if(z)await change('selectZone',{zone:z.dataset.zone});
    else if(draw)await change('draw');
    else if(rm && confirm('確定移除這筆待抽項目？'))await change('removeQueue',{id:rm.dataset.remove});
    else if(del && confirm('確定從雲端永久刪除這筆紀錄？'))await change('deleteRecord',{id:del.dataset.delete});
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
  if(!confirm('警告：將清空 Firebase 雲端的所有抽獎紀錄與待抽清單。請確認已有備份。'))return;
  if(!confirm('最後確認：確定清空所有歷史資料？這個操作無法復原。'))return;
  try{await change('reset');update();flash('已清空雲端抽獎資料');}catch(err){flash(err.message,true);}
});
el('exportButton').addEventListener('click',()=>{
  try{exportBackup();flash('備份檔已下載');}catch(err){flash(err.message,true);}
});
el('importInput').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    if(file.size>3_000_000)throw new Error('檔案超過 3 MB，請確認備份內容');
    const raw=JSON.parse(await file.text());
    const cloud=raw.cloud||raw;
    const count=cloud.records?.length||0;
    if(!confirm('匯入後將取代 Firebase 雲端的所有抽獎紀錄與待抽名單，共 '+count+' 筆歷史紀錄。確定嗎？'))return;
    await importBackup(raw);update();flash('成功匯入 '+count+' 筆歷史紀錄；退休同事不會重新加入候選名單');
  }catch(err){flash('匯入失敗：'+err.message,true);}
  finally{e.target.value='';}
});
installFirebaseGate({subscribeAuth,firebaseSignIn,firebaseSignInRedirect,firebaseSignOut,isCloudReady,role:'control'});
try{
  await boot();
  subscribe(update);
  update();
  setInterval(update,350);
}catch(err){
  el('connection').textContent='● 載入失敗';
  flash(err.message,true);
}
