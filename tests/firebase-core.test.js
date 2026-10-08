'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {webcrypto}=require('node:crypto');
test('Firebase cloud engine preserves history, removes retired participant and commits draws',async()=>{
  const {createEngine}=await import(pathToFileURL(path.join(__dirname,'..','site','draw-core.js')).href);
  const initial=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','initial.json'),'utf8'));
  const engine=createEngine(initial);
  assert.equal(engine.names.length,15);
  assert.equal(engine.names.includes('石淑華'),false);
  const archived={name:'石淑華',id:'old-win',zone:'ruby',zoneLabel:'第一區',prize:800,
    createdAt:new Date().toISOString(),product:'歷史資料',handReceipt:0,bonusAmount:0};
  let state=engine.normalize({records:[archived],queue:[],activity:{selectedName:'石淑華'}});
  assert.equal(state.records.length,1);
  assert.equal(state.records[0].name,'石淑華');
  assert.equal(state.activity.selectedName,'');
  state=engine.apply(state,'selectName',{name:engine.names[0]});
  state=engine.apply(state,'selectZone',{zone:'ruby'});
  state=engine.apply(state,'enqueue',{product:'測試基金',handReceipt:200,bonusAmount:40});
  assert.equal(state.queue.length,1);
  state=engine.apply(state,'draw');
  assert.equal(state.records.length,2);
  assert.equal(state.queue.length,0);
  assert.equal(state.activity.phase,'drawing');
  assert.ok(engine.prizes.ruby.prizes.some(p=>p.amount===state.activity.result.prize));
  assert.throws(()=>engine.apply(state,'selectName',{name:'石淑華'}));
  const view=engine.view(state);
  assert.equal(view.remaining.ruby.reduce((s,p)=>s+p.count,0),
    initial.prizeZones.ruby.prizes.reduce((s,p)=>s+p.count,0)-2);
  const objectRecords=Object.fromEntries(state.records.map((v,i)=>[i,v]));
  assert.equal(engine.normalize({...state,records:objectRecords,queue:{}}).records.length,2);
  state=engine.apply(state,'reset');
  assert.equal(state.records.length,0);
  assert.equal(state.names.length,15);
});
