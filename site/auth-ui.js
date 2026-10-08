// Reusable login overlay shared between control console and projector.
export function installFirebaseGate({subscribeAuth,firebaseSignIn,firebaseSignInRedirect,firebaseSignOut,isCloudReady,role}){
  const gate=document.createElement('section');
  gate.className='firebaseGate';
  gate.setAttribute('role','dialog');
  gate.setAttribute('aria-label','Firebase 登入');
  gate.innerHTML='<div class="firebaseGateCard">'+
    '<span>紅包汽球抽起來｜'+(role==='projection'?'投影顯示':'操作控制台')+'</span>'+
    '<h2>以授權 Google 帳號登入</h2>'+
    '<p>手機控制與電腦投影使用相同的 Google 帳號登入，即可共用 Firebase 雲端抽獎資料。</p>'+
    ' <p class="firebaseGateEmail">請選擇管理者已授權的 Google 帳號</p>'+
    '<button class="firebaseGoogleButton" type="button">使用 Google 帳號登入</button>'+
    '<button class="firebaseRedirectButton" type="button">無法彈出登入？改用跳轉登入</button>'+
    '<button class="firebaseLogoutButton" type="button" hidden>切換 Google 帳號</button>'+
    '<small class="firebaseGateMessage" aria-live="polite">正在檢查登入狀態…</small>'+
    '</div>';
  document.body.appendChild(gate);
  const msg=gate.querySelector('.firebaseGateMessage');
  const popup=gate.querySelector('.firebaseGoogleButton');
  const redirect=gate.querySelector('.firebaseRedirectButton');
  const logout=gate.querySelector('.firebaseLogoutButton');
  popup.addEventListener('click',()=>{
    msg.textContent='正在開啟 Google 登入視窗…';
    firebaseSignIn().catch(e=>{msg.textContent='登入失敗：'+(e?.message||e);});
  });
  redirect.addEventListener('click',()=>{
    msg.textContent='正在跳轉到 Google 登入頁面…';
    firebaseSignInRedirect().catch(e=>{msg.textContent='跳轉失敗：'+(e?.message||e);});
  });
  logout.addEventListener('click',()=>{
    firebaseSignOut().catch(e=>{msg.textContent='登出失敗：'+(e?.message||e);});
  });
  subscribeAuth(s=>{
    const ready=s.authorized&&isCloudReady();
    gate.hidden=!!ready;
    logout.hidden=!s.email;
    if(s.email&&!s.authorized){
      msg.textContent='目前登入：'+s.email+'。'+(s.error||'這個帳號沒有權限。');
      popup.hidden=true;redirect.hidden=true;
    }else{
      popup.hidden=false;redirect.hidden=false;
      msg.textContent=s.error|| (s.authorized?'已登入，正在連接雲端資料…':'尚未登入，請點選 Google 登入。');
    }
  });
  return gate;
}
