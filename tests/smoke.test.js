'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');
const config=require('../data/initial.json');
test('控制、投影、抽獎及退休名單檢查',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'red-envelope-test-'));
 const file=path.join(dir,'state.json');
 const retired={id:'past-record',name:'石淑華',zone:'ruby',zoneLabel:'第一區',
  prize:500,createdAt:'2026-09-01T00:00:00Z',product:'舊紀錄',handReceipt:0,bonusAmount:0};
 const original={names:['石淑華',...config.names],activity:{selectedName:'石淑華',selectedZone:'',
  phase:'idle',result:null,animationUntil:null,resetCount:0,updatedAt:new Date().toISOString()},
  records:[retired],queue:[]};
 fs.writeFileSync(file,JSON.stringify(original));
 const port=40000+Math.floor(Math.random()*20000);
 const proc=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),
  env:{...process.env,STATE_FILE:file,PORT:String(port),ADMIN_PASSWORD:'test-password'},
  stdio:'ignore'});
 t.after(()=>{proc.kill();fs.rmSync(dir,{recursive:true,force:true});});
 const base='http://127.0.0.1:'+port;
 async function get(route){
  const r=await fetch(base+route);assert.equal(r.status,200);return r;
 }
 async function command(action,extra={},status=200){
  const r=await fetch(base+'/api/command',{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({action,...extra})});
  assert.equal(r.status,status);return r.json();
 }
 let ready=false;
 for(let i=0;i<100;i++){try{await get('/api/state');ready=true;break;}catch{await new Promise(r=>setTimeout(r,40));}}
 assert.equal(ready,true,'伺服器啟動成功');
 assert.match(await (await get('/')).text(),/裝置的用途/);
 assert.match(await (await get('/control')).text(),/操作控制台/);
 assert.match(await (await get('/projection')).text(),/投影同步中/);
 let state=await (await get('/api/state')).json();
 assert.equal(state.names.length,15);
 assert.equal(state.names.includes('石淑華'),false);
 assert.equal(state.records.length,1);
 assert.equal(state.records[0].name,'石淑華','歷史紀錄保留原姓名');
 assert.equal(Object.keys(state.prizeZones).length,4);
 await command('selectName',{name:config.names[0]});
 await command('selectZone',{zone:'ruby'});
 state=await command('enqueue',{product:'FCN',handReceipt:20,bonusAmount:5});
 assert.equal(state.queue.length,1);
 assert.equal(state.queue[0].name,config.names[0]);
 state=await command('draw');
 assert.equal(state.records.length,2);
 assert.equal(state.queue.length,0);
 assert.equal(state.activity.phase,'drawing');
 assert.ok(config.prizeZones.ruby.prizes.some(p=>p.amount===state.activity.result.prize));
 await command('reset',{password:'wrong'},403);
 state=await command('reset',{password:'test-password'});
 assert.equal(state.records.length,0);
 assert.equal(state.names.length,15);
 assert.equal(fs.existsSync(file),true);
});
