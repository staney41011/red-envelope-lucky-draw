import test from 'node:test';
import assert from 'node:assert/strict';
import {toPublicProjection} from '../site/projection-data.js';
test('Projector contains only required display data',()=>{
  const record={name:'甲',zoneLabel:'第一區',prize:500,createdAt:'2026-10-08T00:00:00Z',
    product:'PRIVATE_PRODUCT',handReceipt:777777,bonusAmount:888888};
  const state={
    activity:{phase:'drawing',animationUntil:12345,result:record},
    records:Array.from({length:65},()=>record),
    queue:[record],
    prizeZones:{ruby:{label:'第一區',prizes:[{amount:500,count:10}]}},
    remaining:{ruby:[{amount:500,count:7}]},
    updatedAt:'2026-10-08T00:00:00Z',revision:'r1'
  };
  const out=toPublicProjection(state);
  assert.equal(out.records.length,8);
  assert.equal(out.queue.length,1);
  assert.equal(out.activity.result.prize,500);
  const json=JSON.stringify(out);
  for(const secret of ['PRIVATE_PRODUCT','handReceipt','bonusAmount','777777','888888']){
    assert.ok(!json.includes(secret),'Sensitive data leaked: '+secret);
  }
  assert.deepEqual(Object.keys(out),['activity','records','queue','prizeZones','remaining','updatedAt','revision']);
});
