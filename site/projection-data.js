// Only intentionally projector-visible fields may be published to the unauthenticated view.
const zoneKeys=['ruby','gold','jade','bonus'];
const text=(v,max=60)=>String(v??'').slice(0,max);
const number=v=>Number.isFinite(Number(v))?Number(v):0;
function publicRecord(r){return {name:text(r.name,24),zoneLabel:text(r.zoneLabel,12),prize:number(r.prize),createdAt:text(r.createdAt,35)};}
export function toPublicProjection(view){
  const zones=Object.fromEntries(zoneKeys.filter(z=>view.prizeZones?.[z]).map(z=>[z,{label:text(view.prizeZones[z].label,20)}]));
  const remaining=Object.fromEntries(zoneKeys.filter(z=>view.remaining?.[z]).map(z=>[z,view.remaining[z].map(p=>({amount:number(p.amount),count:number(p.count)}))]));
  const current=view.activity?.result;
  return {
    activity:{
      phase:text(view.activity?.phase,24),
      animationUntil:number(view.activity?.animationUntil),
      result:current?publicRecord(current):null
    },
    records:(view.records||[]).slice(0,8).map(publicRecord),
    queue:(view.queue||[]).slice(0,25).map(q=>({name:text(q.name,24),zoneLabel:text(q.zoneLabel,12)})),
    prizeZones:zones,remaining,
    updatedAt:text(view.updatedAt,40),revision:text(view.revision,100)
  };
}
