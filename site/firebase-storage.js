// Firebase Realtime Database live synchronization for mobile host and desktop projector.
import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,onAuthStateChanged,signInWithPopup,signInWithRedirect,signOut} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getDatabase,ref,onValue,runTransaction,set} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js';
import {createEngine,AUTH_EMAIL} from './draw-core.js';
import {firebaseConfig} from './firebase-config.js';
import {toPublicProjection} from './projection-data.js';


const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const database=getDatabase(app);
const stateRef=ref(database,'drawState');
const projectionRef=ref(database,'projectionView');
const observers=new Set(),authObservers=new Set();
let engine=null,live=null,authorized=false,signedUser=null,unsubscribeDb=null,initPromise=null,lastError='';
let lastPublishedRevision='';
export function subscribe(fn){observers.add(fn);return()=>observers.delete(fn);}
export function subscribeAuth(fn){authObservers.add(fn);fn(authStatus());return()=>authObservers.delete(fn);}
function publish(){observers.forEach(fn=>{try{fn();}catch(e){console.error(e);}});}
function authNotify(){authObservers.forEach(fn=>{try{fn(authStatus());}catch(e){console.error(e);}});}
export function authStatus(){return {authorized,loading:!engine,email:signedUser?.email||'',error:lastError};}
export function isCloudReady(){return !!engine&&authorized&&!!live;}
export function firebaseSignIn(){
  // Call directly in a button click handler to avoid popup blockers.
  lastError='';
  return signInWithPopup(auth,new GoogleAuthProvider()).catch(err=>{
    lastError=err.message||String(err);authNotify();throw err;
  });
}
export function firebaseSignInRedirect(){return signInWithRedirect(auth,new GoogleAuthProvider());}
export function firebaseSignOut(){return signOut(auth);}
async function publishProjection(){
  if(!isCloudReady())return;
  const publicState=toPublicProjection(engine.view(live));
  if(publicState.revision===lastPublishedRevision)return;
  lastPublishedRevision=publicState.revision;
  try{await set(projectionRef,publicState);}
  catch(err){lastPublishedRevision='';console.error('投影資料同步失敗',err);}
}
function handleAuth(user){
  if(unsubscribeDb){unsubscribeDb();unsubscribeDb=null;}
  signedUser=user;
  authorized=!!user && (user.email||'').toLowerCase()===AUTH_EMAIL && user.emailVerified===true;
  live=null;
  if(user && !authorized)lastError='僅允許指定的 Google 帳號登入';
  else lastError='';
  authNotify();publish();
  if(authorized){
    unsubscribeDb=onValue(stateRef,snap=>{
      live=snap.val();
      if(!live)lastError='雲端資料尚未初始化';
      else lastError='';
      authNotify();publish();
      void publishProjection();
    },err=>{
      lastError='Firebase 讀取失敗：'+err.message;
      live=null;authNotify();publish();
    });
  }
}
export function boot(){
  if(initPromise)return initPromise;
  initPromise=(async()=>{
    const response=await fetch(new URL('../data/initial.json',import.meta.url),{cache:'no-store'});
    if(!response.ok)throw Error('抽獎設定載入失敗');
    engine=createEngine(await response.json());
    await new Promise(resolve=>{
      let settled=false;
      onAuthStateChanged(auth,user=>{
        handleAuth(user);
        if(!settled){settled=true;resolve();}
      },err=>{
        lastError=err.message||String(err);
        authNotify();
        if(!settled){settled=true;resolve();}
      });
    });
  })();
  return initPromise;
}
export function snapshot(){
  if(!engine)throw Error('抽獎系統尚未載入');
  return engine.view(live||{...engine.fresh(),revision:'waiting-cloud'});
}
export async function change(action,payload={}){
  if(!isCloudReady())throw Error('請先登入授權 Google 帳號，並等待雲端資料載入');
  let inputError=null;
  const tx=await runTransaction(stateRef,prev=>{
    if(!prev){inputError=Error('雲端抽獎資料不存在，請聯絡管理員');return;}
    try{return engine.apply(prev,action,payload);}
    catch(err){inputError=err;return;}
  },{applyLocally:false});
  if(!tx.committed)throw inputError||Error('指令未完成，請稍後重試');
  return engine.view(tx.snapshot.val());
}
export function exportBackup(){
  if(!isCloudReady())throw Error('雲端未連線，無法匯出');
  const data={format:'red-envelope-firebase-backup-v1',exportedAt:new Date().toISOString(),
    prizeZones:engine.prizes,cloud:engine.normalize(live)};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='red-envelope-firebase-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function importBackup(raw){
  if(!isCloudReady())throw Error('尚未登入或未連線');
  const body=raw?.cloud||raw;
  if(!body||!Array.isArray(body.records)||!Array.isArray(body.queue))throw Error('不是有效的備份檔');
  if(body.records.length>100000)throw Error('備份資料過大');
  const toWrite=engine.normalize(body);
  toWrite.updatedAt=new Date().toISOString();
  toWrite.revision=crypto.randomUUID();
  const result=await runTransaction(stateRef,()=>toWrite,{applyLocally:false});
  if(!result.committed)throw Error('匯入失敗，請再試一次');
  return engine.view(result.snapshot.val());
}
export const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money=n=>Number(n||0).toLocaleString('zh-TW');
export const formatted=s=>s?new Date(s).toLocaleString('zh-TW'):'';
export const shortTime=s=>s?new Date(s).toLocaleString('zh-TW',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
