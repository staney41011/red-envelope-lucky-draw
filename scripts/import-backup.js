'use strict';
const fs=require('node:fs'),path=require('node:path');
const file=process.argv[2];
if(!file){console.error('用法：node scripts/import-backup.js <原網站備份.json>');process.exit(1);}
const p=path.resolve(file);
const b=JSON.parse(fs.readFileSync(p,'utf8'));
const initial=require('../data/initial.json');
const cloud=b.cloud||b;
if(!Array.isArray(cloud.records)||!Array.isArray(cloud.queue)){
 console.error('匯入失敗：不是支援的雲端備份格式');process.exit(1);
}
const dest=process.env.STATE_FILE||path.join(__dirname,'..','data','state.json');
if(fs.existsSync(dest)){
 console.error('已有運行資料，為防止覆寫請先備份並移走：'+dest);process.exit(1);
}
cloud.names=initial.names.filter(n=>n!=='石淑華');
cloud.queue=cloud.queue.filter(q=>cloud.names.includes(q.name));
if(!cloud.names.includes(cloud.activity?.selectedName)){
 cloud.activity={...(cloud.activity||{}),selectedName:''};
}
fs.mkdirSync(path.dirname(dest),{recursive:true});
fs.writeFileSync(dest,JSON.stringify(cloud,null,2),'utf8');
console.log('完成：'+cloud.names.length+' 位有效候選人，保留 '+cloud.records.length+' 筆歷史紀錄。');
