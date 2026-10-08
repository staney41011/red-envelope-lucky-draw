// Passive projector subscribes to a redacted, publicly readable Firebase node.
// No Google OAuth, no private drawState read and no write permissions on this page.
import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getDatabase,ref,onValue} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js';
import {getAuth,signInAnonymously,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {firebaseConfig} from './firebase-config.js';
const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const database=getDatabase(app);
const projectionRef=ref(database,'projectionView');
const observers=new Set();
let latest=null,initial=null,error='',started=false;
const notify=()=>observers.forEach(fn=>{try{fn();}catch(e){console.error(e);}});
const list=x=>Array.isArray(x)?x:(x&&typeof x==='object'?Object.values(x):[]);
export function subscribe(fn){observers.add(fn);return()=>observers.delete(fn);}
export function connectionError(){return error;}
export function hasLiveProjection(){return !!latest;}
export async function boot(){
  if(started)return;
  started=true;
  const res=await fetch(new URL('../data/initial.json',import.meta.url),{cache:'no-store'});
  if(!res.ok)throw Error('獎區設定讀取失敗');
  initial=await res.json();
  await auth.authStateReady();
  if(!auth.currentUser) await signInAnonymously(auth);
  onValue(projectionRef,snapshot=>{
    latest=snapshot.val();
    error='';
    notify();
  },err=>{
    error='同步失敗：'+err.message;
    latest=null;notify();
  });
}
export function snapshot(){
  const base=latest||{};
  const prizes=base.prizeZones||initial?.prizeZones||{};
  const remain=base.remaining||Object.fromEntries(Object.entries(prizes).map(([z,def])=>[z,def.prizes||[]]));
  return {
    activity:base.activity||{phase:'idle',result:null},
    queue:list(base.queue),records:list(base.records),
    prizeZones:prizes,remaining:remain,
    updatedAt:base.updatedAt||'',revision:base.revision||'waiting-cloud'
  };
}
export const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money=n=>Number(n||0).toLocaleString('zh-TW');
export const formatted=s=>s?new Date(s).toLocaleString('zh-TW'):'';
export const shortTime=s=>s?new Date(s).toLocaleString('zh-TW',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
