'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {webcrypto}=require('node:crypto');
test('GitHub Pages 免伺服器抽獎、歷史備份及退休人員篩選',async t=>{
  const root=path.join(__dirname,'..');
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'red-pages-'));
  t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
  const dir=path.join(folder,'site');
  fs.mkdirSync(dir,{recursive:true});
  fs.copyFileSync(path.join(root,'site','storage.js'),path.join(dir,'storage.mjs'));
  const names=JSON.parse(fs.readFileSync(path.join(root,'data','initial.json'),'utf8'));
  const entries=new Map();
  global.localStorage={
    getItem:k=>entries.get(k)??null,
    setItem:(k,v)=>entries.set(k,String(v))
  };
  global.window={addEventListener:()=>{}};
  global.BroadcastChannel=class{postMessage(){}};
  global.fetch=async()=>({ok:true,json:async()=>structuredClone(names)});
  const logic=await import(pathToFileURL(path.join(dir,'storage.mjs')).href);
  await logic.boot();
  let s=logic.snapshot();
  assert.equal(s.names.length,15);
  assert.equal(s.names.includes('石淑華'),false);
  assert.deepEqual(Object.keys(s.remaining),['ruby','gold','jade','bonus']);
  assert.equal(s.revision,logic.snapshot().revision,'空白狀態不應反覆觸發渲染');
  assert.throws(()=>logic.change('selectName',{name:'石淑華'}),/有效參加者/);
  logic.change('selectName',{name:s.names[0]});
  logic.change('selectZone',{zone:'ruby'});
  s=logic.change('enqueue',{product:'基金',handReceipt:10000,bonusAmount:500});
  assert.equal(s.queue.length,1);
  s=logic.change('draw');
  assert.equal(s.queue.length,0);
  assert.equal(s.records.length,1);
  assert.ok(s.records[0].prize>0);
  assert.equal(s.records[0].product,'基金');
  assert.throws(()=>logic.change('draw'),/先加入抽獎佇列/);
  const retiredRecord={id:'historical-only',name:'石淑華',zone:'jade',zoneLabel:'第三區',prize:100,
    product:'歷史紀錄',handReceipt:0,bonusAmount:0,createdAt:'2026-09-01T00:00:00Z'};
  s=logic.importBackup({cloud:{records:[retiredRecord],queue:[],activity:{selectedName:'石淑華'}}});
  assert.equal(s.records.length,1,'歷史紀錄應被保留');
  assert.equal(s.records[0].name,'石淑華','退休後仍保留既有中獎資料');
  assert.equal(s.names.includes('石淑華'),false);
  assert.equal(s.activity.selectedName,'');
  assert.equal(logic.snapshot().remaining.jade.find(x=>x.amount===100).count,
    names.prizeZones.jade.prizes.find(x=>x.amount===100).count-1);
  s=logic.change('reset');
  assert.equal(s.records.length,0);
  assert.equal(s.names.length,15);
});
