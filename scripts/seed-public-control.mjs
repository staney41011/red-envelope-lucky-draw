import fs from 'node:fs';
import {createOpenEngine} from '../site/open-core.js';
const [, , sourcePath, outputPath]=process.argv;
if(!sourcePath||!outputPath)throw Error('source and output paths required');
const config=JSON.parse(fs.readFileSync(new URL('../data/initial.json',import.meta.url),'utf8'));
const historical=JSON.parse(fs.readFileSync(sourcePath,'utf8'));
const records=Array.isArray(historical.records)?historical.records:Object.values(historical.records||{});
const engine=createOpenEngine(config);
const data=engine.initial();
for(const record of records){
 const zone=String(record.zone||''),key=String(record.prize||'');
 if(Object.hasOwn(data.remainingStock[zone]||{},key)){
   data.remainingStock[zone][key]=Math.max(0,data.remainingStock[zone][key]-1);
 }
}
// Do not republish old records, old queue details or any private financial fields.
data.records=[];
data.queue=[];
data.activity.phase='idle';data.activity.result=null;
const result=JSON.stringify(data,null,2);
if(/handReceipt|bonusAmount|product|石淑華/.test(result))throw Error('Sensitive information in public data');
fs.writeFileSync(outputPath,result,'utf8');
console.log('Safe draw state generated:',JSON.stringify({
 names:data.names.length,privateHistoricalRecords:records.length,
 prizeZones:Object.keys(data.remainingStock).length,
 publicHistoricalRecords:data.records.length,
 outstanding:Object.fromEntries(Object.entries(data.remainingStock).map(([z,stock])=>[z,Object.values(stock).reduce((sum,n)=>sum+n,0)]))
}));
