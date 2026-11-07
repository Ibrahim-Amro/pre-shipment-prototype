(() => {
'use strict';
const launchParams=new URLSearchParams(location.search);
const embeddedRole=launchParams.get('multiView')==='1'&&['manager','developer','tester','customer'].includes(launchParams.get('workspaceRole'))?launchParams.get('workspaceRole'):null;
if(embeddedRole)document.body.classList.add('four-view-child');
const paths={
'layout-dashboard':'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
'folder':'M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z',
'folder-open':'M3 7V5a2 2 0 0 1 2-2h5l2 3h7v3 M3 7v12a2 2 0 0 0 2 2h14l3-12H7L5 19',
'bug':'M9 3l1 3m5-3-1 3 M8 7h8v10a4 4 0 0 1-8 0V7z M3 9h5m8 0h5M3 14h5m8 0h5M4 20l4-3m8 0 4 3M12 10v10',
'message-square':'M21 15a3 3 0 0 1-3 3H8l-5 4V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v9z M7 8h10M7 12h6',
'users':'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87',
'user':'M20 21v-2a7 7 0 0 0-14 0v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
'chart':'M4 3v18h18 M8 16v-4m5 4V8m5 8V5',
'bar-chart-3':'M4 3v18h18 M8 16v-4m5 4V8m5 8V5',
'settings':'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l.6 3 2.5 1.5L21 7l2 5-2.4 2 .4 3-4.8 3-2.2-1h-4L8 20l-5-3 .4-3L1 12l2-5 2.9.5L8.4 6 9 3z',
'help-circle':'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3 M12 17h.01 M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',
'search':'M21 21l-5-5 M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16',
'bell':'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
'chevron-down':'m6 9 6 6 6-6','chevron-right':'m9 6 6 6-6 6','chevron-left':'m15 6-6 6 6 6',
'arrow-right':'M4 12h16m-6-6 6 6-6 6','arrow-left':'M20 12H4m6-6-6 6 6 6',
'arrow-up-right':'M7 17 17 7 M7 7h10v10',
'plus':'M12 5v14M5 12h14','minus':'M5 12h14','x':'m6 6 12 12M6 18 18 6',
'check':'m5 12 4 4L19 6','check-circle':'M22 11v1a10 10 0 1 1-5.9-9.1 M22 4 12 14l-3-3',
'shield-check':'m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4z m-4 10 3 3 5-6',
'shield':'m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4z',
'sparkles':'m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3z M21 2v4M19 4h4',
'calendar':'M8 2v4m8-4v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2z M7 14h2m4 0h2m-8 3h2',
'clock':'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M12 6v6l4 2',
'more-horizontal':'M5 12h.01M12 12h.01M19 12h.01','filter':'M4 4h16l-6 7v8l-4 2V11L4 4z',
'list':'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
'grid':'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
'database':'M20 6c0 2.2-3.6 4-8 4S4 8.2 4 6s3.6-4 8-4 8 1.8 8 4z M4 6v12c0 2.2 3.6 4 8 4s8-1.8 8-4V6 M4 12c0 2.2 3.6 4 8 4s8-1.8 8-4',
'download':'M12 3v12m-5-5 5 5 5-5 M4 17v4h16v-4',
'upload':'M12 16V4m-5 5 5-5 5 5 M4 17v4h16v-4',
'file-text':'M14 2H5v20h14V7l-5-5z M14 2v6h5 M8 12h8m-8 4h8',
'file-archive':'M14 2H5v20h14V7l-5-5z M14 2v6h5 M10 3v2m0 2v2m0 2v2m0 2v2',
'mail':'M3 5h18v14H3V5z m0 1 9 7 9-7',
'send':'m22 2-7 20-4-9-9-4L22 2z M22 2 11 13',
'copy':'M8 8h13v13H8z M16 8V3H3v13h5',
'external-link':'M14 3h7v7 M10 14 21 3 M10 3H3v18h18v-7',
'log-out':'M9 3H3v18h6 M9 12h13m-5-5 5 5-5 5',
'sun':'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',
'moon':'M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10',
'eye':'M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
'lock':'M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4 M12 14v3',
'key':'M8 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10 M12 12l9 9m-2-2 2-2m-5 0 2-2',
'code':'m8 5-7 7 7 7m8-14 7 7-7 7M14 3l-4 18',
'terminal':'m4 5 6 7-6 7M12 19h8',
'play':'m7 3 14 9-14 9V3z',
'monitor':'M2 3h20v14H2z M8 21h8m-4-4v4',
'alert-triangle':'m12 3 10 18H2L12 3z M12 9v5m0 3h.01',
'alert-circle':'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M12 7v6m0 4h.01',
'info':'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M12 11v6m0-10h.01',
'refresh-cw':'M21 3v6h-6 M3 21v-6h6 M4 9a8 8 0 0 1 13-5l4 5M3 15l4 5a8 8 0 0 0 13-5',
'zap':'m13 2-9 12h7l-1 8L21 9h-8V2z',
'flag':'M4 22V3s4-2 8 0 8 0 8 0v11s-4 2-8 0-8 0-8 0',
'user-plus':'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M20 7v6m-3-3h6',
'clipboard-check':'M9 4H4v18h16V4h-5 M9 2h6v5H9z m-1 12 3 3 5-6',
'activity':'M2 12h4l3-9 6 18 3-9h4',
'trending-up':'m3 17 6-6 4 4 8-11 M15 4h6v6',
'target':'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12 M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4',
'rocket':'m12 3 9-1-1 9-8 8-7-7 7-9z M5 12l-3 2v6l6-1 M12 19l-1 3h6l2-7 M15 6l3 3',
'heart':'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z',
'star':'m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z',
'menu':'M3 6h18M3 12h18M3 18h18','maximize':'M4 4h16v16H4z','minimize':'M4 12h16',
'paperclip':'m21 11-9 9a6 6 0 0 1-8-8l9-9a4 4 0 0 1 6 6l-9 9a2 2 0 0 1-3-3l8-8'
};
const alias={home:'layout-dashboard','bar-chart':'chart','check-circle-2':'check-circle','circle-check':'check-circle','triangle-alert':'alert-triangle','circle-alert':'alert-circle','chevrons-up-down':'chevron-down','clipboard':'clipboard-check','file-code':'code','package':'folder','briefcase':'folder','circle':'clock','arrow-up':'trending-up','loader':'refresh-cw','wand':'sparkles','lightbulb':'sparkles','cpu':'code','inbox':'mail','shield-alert':'shield','layers':'grid','circle-help':'help-circle'};
const icon=(name,size=18)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths[alias[name]]||paths['sparkles']}"/></svg>`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function readWorkspace(){
 try{return JSON.parse(localStorage.getItem(workspaceStorageKey));}catch{return null;}
}
const workspaceStorageKey='pre-shipment-v4';
let state=readWorkspace();
if(!window.__UAT_GUI_FIXTURES__ && state?.dataRevision!=='empty-1'){
 state=window.emptyWorkspace();localStorage.setItem(workspaceStorageKey,JSON.stringify(state));sessionStorage.clear();indexedDB.deleteDatabase('pre-shipment-uat');
}
if(!state||!state.projects){state=window.__UAT_GUI_FIXTURES__?structuredClone(window.DEMO_DATA):window.emptyWorkspace();}
let workspaceBaseline=structuredClone(readWorkspace()||{});
const workspaceEpoch=state.resetEpoch||'';
function clearBetaSessionStorage(){
 for(const key of Object.keys(sessionStorage))if(key.startsWith('pre-shipment-beta-'))sessionStorage.removeItem(key);
}
const previousSessionEpoch=sessionStorage.getItem('pre-shipment-session-epoch');
if(previousSessionEpoch!==null&&previousSessionEpoch!==workspaceEpoch)clearBetaSessionStorage();
sessionStorage.setItem('pre-shipment-session-epoch',workspaceEpoch);
const navigationReload=performance.getEntriesByType('navigation')[0]?.type==='reload';
let resettingWorkspace=false;
function workspaceIsCurrent(latest){
 if((latest?.resetEpoch||'')===workspaceEpoch)return true;
 clearBetaSessionStorage();location.reload();return false;
}
function rememberActor(){
 if(!embeddedRole)sessionStorage.setItem('pre-shipment-staff-actor',JSON.stringify({role:state.role,employeeId:state.user.id}));
}
const demoUpdated=window.prepareDemoWorkspace(state);
const testerAdded=window.ensureSecondTester(state);
// Merge edits by entity so a staff tab can save without discarding another tab's work.
function mergeEdits(base,local,latest){
 if(JSON.stringify(base)===JSON.stringify(local))return latest;
 if(local===undefined)return undefined;
 const lists=[base,local,latest].filter(Array.isArray);
 if(Array.isArray(local)&&lists.flat().every(item=>item&&typeof item==='object'&&item.id)){
  const before=new Map((base||[]).map(item=>[item.id,item]));
  const current=new Map(local.map(item=>[item.id,item]));
  const remote=new Map((latest||[]).map(item=>[item.id,item]));
  const added=(latest||[]).filter(item=>!before.has(item.id)&&!current.has(item.id));
  return added.concat(local.filter(item=>!before.has(item.id)||remote.has(item.id)||JSON.stringify(item)!==JSON.stringify(before.get(item.id)))
   .map(item=>mergeEdits(before.get(item.id),item,remote.get(item.id))));
 }
 if(local&&typeof local==='object'&&!Array.isArray(local)&&latest&&typeof latest==='object'&&!Array.isArray(latest)){
  const result={...latest};
  for(const key of new Set([...Object.keys(base||{}),...Object.keys(local)])){
   const value=mergeEdits(base?.[key],local[key],latest[key]);
   if(value===undefined)delete result[key];else result[key]=value;
  }
  return result;
 }
 return local;
}
function mergeWorkspace(latest){
 const next={...latest};
 for(const key of Object.keys(state)){
  if(['role','page','user'].includes(key))continue;
  next[key]=mergeEdits(workspaceBaseline[key],state[key],latest[key]);
 }
 return next;
}
function applyWorkspace(next){
 for(const [key,value] of Object.entries(next)){
  if(['role','page','user'].includes(key))continue;
  if(Array.isArray(value)&&value.every(item=>item&&typeof item==='object'&&item.id)){
   const existing=new Map((state[key]||[]).map(item=>[item.id,item]));
   state[key]=value.map(item=>Object.assign(existing.get(item.id)||{},item));
  }else state[key]=value;
 }
 state.user=state.employees.find(person=>person.id===state.user?.id)||state.user;
}
const demoEmployee=role=>state.employees.find(e=>role==='manager'&&e.id==='m1'&&e.role==='manager')
 ||state.employees.find(e=>e.role===role&&e.available)
 ||state.employees.find(e=>e.role===role);
state.role='manager';state.page='dashboard';state.user=demoEmployee('manager');
if(!state.cleanWorkspace&&!state.assignments.length){for(const id of ['m1','d1','t1']){const e=state.employees.find(x=>x.id===id);state.assignments.push({id:'demo-'+id,employeeId:id,projectId:'p1',username:e.email,password:'Welcome26!',key:'PS-'+({m1:'MGR1',d1:'DEV1',t1:'TEST'}[id]),accepted:false,emailSent:true,subject:'Your Project 1 assignment',body:`Hi ${e.name.split(' ')[0]},\n\nYou have been assigned to Project 1 v2.4.0 as ${e.title}. Please review the release scope and accept your assignment using the key below.\n\nUsername: ${e.email}\nPassword: Welcome26!\nAssignment key: PS-${{m1:'MGR1',d1:'DEV1',t1:'TEST'}[id]}\n\nDeadline: November 6, 2026.\n\nThank you,\nAlexander Morgan\nPre-Shipment · By Pfizer`});}}
let loggedIn=false,dropdown=false;
let theme=localStorage.getItem('pre-shipment-theme')||'light';document.documentElement.dataset.theme=theme;
const app=document.getElementById('app');
const A=window.A={state,icon,escape:esc,
 isWorkspaceCurrent(){return workspaceIsCurrent(readWorkspace());},
 refreshWorkspace(){
  const latest=readWorkspace();
  if(!latest?.projects||!workspaceIsCurrent(latest))return false;
  applyWorkspace(mergeWorkspace(latest));
  workspaceBaseline=structuredClone(latest);
  return true;
 },
 save(){
  const latest=readWorkspace();
  if(!workspaceIsCurrent(latest))return false;
  const next=mergeWorkspace(latest||{});
  localStorage.setItem(workspaceStorageKey,JSON.stringify(next));
  applyWorkspace(next);
  workspaceBaseline=structuredClone(next);
 },
 avatar(person,size=64){
  if(typeof person==='string')person=state.employees.find(employee=>employee.id===person);
  const dimension=Math.max(64,Number(size)||64);
  const style=`width:${dimension}px;height:${dimension}px`;
  if(!person)return `<span class="avatar" style="${style}" aria-label="Unassigned person">?</span>`;
  const portrait=Number(person.avatar);
  const source=portrait>=1&&portrait<=16?portrait:15;
  return `<img class="avatar" src="avatars/${source}.jpg" alt="${esc(person.name)}" style="${style}" title="${esc(person.name)}">`;
 },
 person(person,roleOverride){
  if(typeof person==='string')person=state.employees.find(employee=>employee.id===person);
  person=person||{name:'Unassigned'};
  const role=roleOverride||({manager:'Project manager',developer:'Developer',tester:'QA engineer',customer:'Customer'}[person.role])||person.title||'Team member';
  return `<div class="person-identity">${A.avatar(person)}<div class="person-copy"><strong class="person-name">${esc(person.name)}</strong><span class="person-role">${esc(role)}</span></div></div>`;
 },
 badge(text,color){color=color||({'At risk':'amber','In progress':'blue','Ready for review':'green',Completed:'gray',Critical:'red',High:'amber',Medium:'blue',Low:'gray',Open:'red','In review':'purple',Resolved:'green',New:'blue',Bug:'red',Suggestion:'purple'}[text]||'gray');return `<span class="pill ${color}"><span class="status-dot"></span>${esc(text)}</span>`;},
 progress(value,color){return `<div class="progress"><span style="width:${Math.min(100,value)}%;${color?'background:'+color:''}"></span></div>`;},
 modal(html,size='large'){document.getElementById('modal-root').innerHTML=`<div class="modal-overlay" onclick="if(event.target===this)A.closeModal()"><section class="modal-content ${size}" role="dialog" aria-modal="true" aria-label="${esc((html.match(/<h2[^>]*>(.*?)<\/h2>/)||[])[1]?.replace(/<[^>]*>/g,'')||'Workspace dialog')}">${html}</section></div>`;const focus=document.querySelector('.modal-content input:not([type=hidden]),.modal-content textarea,.modal-content button');setTimeout(()=>focus?.focus({preventScroll:true}),100);},
 closeModal(){document.getElementById('modal-root').innerHTML='';},
 toast(text,type='success'){const el=document.createElement('div');el.className='toast '+type;el.innerHTML=icon(type==='error'?'alert-circle':'check-circle',19)+`<span>${esc(text)}</span>`;document.getElementById('toast-root').appendChild(el);setTimeout(()=>el.remove(),4400);},
 async copy(text){try{await navigator.clipboard.writeText(text);A.toast('Copied to clipboard');}catch{A.modal(`<div class="modal-header"><h2>Copy this text</h2><button class="icon-btn" onclick="A.closeModal()">${icon('x')}</button></div><div class="modal-body"><textarea class="input" rows="7">${esc(text)}</textarea></div>`,'');}},
 navigate(page){if(page==='projects')page='dashboard';state.page=page;dropdown=false;A.render();document.getElementById('main-content')?.scrollTo(0,0);document.querySelector('.uat-workspace-layout')?.scrollTo(0,0);},
 render(){if(!loggedIn)return renderLogin();renderShell();},
 switchRole(role){if(embeddedRole&&role!==embeddedRole)return;const employee=demoEmployee(role);if(!['manager','developer','tester'].includes(role)||!employee)return;state.role=role;state.user=employee;state.page='dashboard';dropdown=false;loggedIn=true;rememberActor();A.closeModal();A.render();A.toast(`${capitalize(role)} workspace opened`);},
 openProject:(id,caseId)=>Workspaces.openProject(id,caseId),
 openIssue:id=>Workspaces.issueDetails(id),
 simulate(title,callback,delay=1800){A.modal(`<div class="modal-body loading-panel"><div class="spinner"></div><h3>${esc(title)}</h3><p>Preparing your sample results…</p><div class="demo-mode" style="margin-top:18px">${icon('sparkles',12)} Simulated AI analysis</div></div>`,'');setTimeout(callback,delay);},
 setTheme(value){theme=value;document.documentElement.dataset.theme=value;localStorage.setItem('pre-shipment-theme',value);if(loggedIn&&state.page==='settings')A.render();if(embeddedRole)window.parent.FourView?.refreshPanel?.(embeddedRole);},
 login(e){e.preventDefault();const username=document.getElementById('login-user').value.trim().toLowerCase();const password=document.getElementById('login-password').value;let role,employee;if(username==='admin'&&password==='admin'){role='manager';employee=demoEmployee(role);}else{const as=state.assignments.find(x=>x.username.toLowerCase()===username&&x.password===password);if(as){employee=state.employees.find(x=>x.id===as.employeeId);role=employee?.role;}else if(['developer','tester','manager'].includes(username)&&password==='admin'){role=username;employee=demoEmployee(role);}}if(!employee||!['manager','developer','tester'].includes(role)){document.getElementById('login-error').textContent='Check your username and password. Demo manager: admin / admin.';return;}loggedIn=true;state.role=role;state.user=employee;state.page='dashboard';rememberActor();const btn=document.querySelector('.login-submit');btn.innerHTML='<span>Opening your workspace…</span>';btn.disabled=true;setTimeout(()=>A.render(),450);},
 logout(){if(embeddedRole)return;sessionStorage.removeItem('pre-shipment-staff-actor');loggedIn=false;dropdown=false;A.closeModal();renderLogin();},
 toggleProfile(){dropdown=!dropdown;const old=document.getElementById('profile-menu');if(old)old.remove();if(dropdown){const el=document.createElement('div');el.id='profile-menu';el.className='dropdown';el.innerHTML=`<div class="dropdown-header">${A.person(state.user)}<p class="person-meta">${embeddedRole?'This panel stays signed in as this user.':'Switch roles to try every workflow'}</p></div>${(embeddedRole?[]:['manager','developer','tester']).map(r=>`<button class="${state.role===r?'role-selected':''}" onclick="A.switchRole('${r}')">${icon(r==='manager'?'users':r==='developer'?'code':'bug',16)}${capitalize(r)} workspace <span class="spacer"></span>${state.role===r?icon('check',14):''}</button>`).join('')}${embeddedRole?'':`<button onclick="Beta.openInvitation()">${icon('external-link',16)}Customer preview</button>`}<div class="divider" style="margin:5px 0"></div><button onclick="A.navigate('settings')">${icon('settings',16)}Workspace settings</button>${embeddedRole?'':`<button onclick="A.logout()">${icon('log-out',16)}Sign out</button>`}`;const frame=document.querySelector('.app-window');frame.appendChild(el);el.style.top=(document.querySelector('.profile-trigger').getBoundingClientRect().bottom-frame.getBoundingClientRect().top+12)+'px';}},
 searchGlobal(value){if(!value.trim()){document.getElementById('global-results')?.remove();return;}const q=value.toLowerCase();const scope=Workspaces.overviewData();const ps=scope.projects.filter(p=>p.name.toLowerCase().includes(q)).sort(ProjectPriority.compare);const issues=scope.issues.filter(i=>i.title.toLowerCase().includes(q));let el=document.getElementById('global-results');if(!el){el=document.createElement('div');el.id='global-results';el.className='dropdown';el.style.cssText='right:190px;width:360px;max-height:400px;overflow:auto';document.querySelector('.app-window').appendChild(el);}el.innerHTML=`<div class="dropdown-header"><strong>Search results</strong><small>${ps.length+issues.length} results in your workspace</small></div>${ps.map(p=>`<button onclick="A.clearSearch();A.openProject('${p.id}')">${icon('folder',15)}${esc(p.name)}<span class="spacer"></span>${ProjectPriority.badge(p)}</button>`).join('')}${issues.map(i=>`<button onclick="A.clearSearch();A.openIssue('${i.id}')">${icon('bug',15)}<span>${esc(i.title)}</span></button>`).join('')}${!ps.length&&!issues.length?'<p class="muted" style="padding:12px">No results. Try “Patient” or “upload”.</p>':''}`;},
 clearSearch(){document.getElementById('global-results')?.remove();const s=document.getElementById('global-input');if(s)s.value='';},
 markRead(id){const n=A.visibleNotifications().find(n=>n.id===id);if(n){n.read=true;A.save();A.navigate(n.page||'dashboard');}},
 markAllRead(){A.visibleNotifications().forEach(n=>n.read=true);A.save();A.render();A.toast('You’re all caught up');},
 notificationPrefs(e){localStorage.setItem('pre-shipment-alerts',e.checked?'on':'off');A.toast(e.checked?'Demo notifications enabled':'Demo notifications paused');},
 editProfile(){A.modal(`<div class="modal-header"><h2>Edit profile</h2><button class="icon-btn" onclick="A.closeModal()">${icon('x')}</button></div><form onsubmit="A.saveProfile(event)"><div class="modal-body"><div class="person-edit-header">${A.person(state.user)}</div><div class="field"><label>Full name</label><input id="profile-name" value="${esc(state.user.name)}" required></div><div class="field"><label>Job title</label><input id="profile-title" value="${esc(state.user.title)}" required></div></div><div class="modal-footer"><button type="button" class="btn" onclick="A.closeModal()">Cancel</button><button class="btn primary">Save changes</button></div></form>`,'');},
 saveProfile(e){e.preventDefault();state.user.name=document.getElementById('profile-name').value;state.user.title=document.getElementById('profile-title').value;A.save();A.closeModal();A.render();A.toast('Profile updated');},
 resetPrompt(){A.modal(`<div class="modal-header"><h2>Reset workspace?</h2><button class="icon-btn" onclick="A.closeModal()" aria-label="Close reset dialog">${icon('x')}</button></div><div class="modal-body"><p>Clear all projects, tests, bugs, assignments, invitations, messages, customer feedback and beta sessions across the open app windows. The four role accounts and your theme stay available.</p></div><div class="modal-footer"><button class="btn" onclick="A.closeModal()">Keep working</button><button class="btn danger" id="confirm-workspace-reset" onclick="A.resetWorkspace()">Reset workspace</button></div>`,'large');},
 demoPrompt(){
  const loaded=state.demoMode===true;
  A.modal(`<div class="modal-header"><h2>${loaded?'Start from zero?':'Load demo data?'}</h2><button class="icon-btn" onclick="A.closeModal()" aria-label="Close demo data dialog">${icon('x')}</button></div><div class="modal-body demo-data-description">${loaded?'<p>Remove the demo projects and everything added while trying them: tests, bugs, fixes, invitations and customer notes. You will have an empty workspace with the four role accounts.</p>':'<p>Load ten sample projects with a team, test results, bug reports, fixes and customer feedback. Some builds are ready to test; others need a fix, a retest or a manager’s decision.</p><p>You can work through every handoff. The progress bars follow the saved tests and bugs as you go.</p>'}<p>${loaded?'Your theme stays the same. You can load a fresh demo again any time.':'This replaces the current workspace in all open windows, including any work you have added. Turn Demo data off to clear it and start from zero.'}</p></div><div class="modal-footer"><button class="btn" onclick="A.closeModal()">Keep working</button><button class="btn ${loaded?'danger':'primary'}" id="confirm-demo-mode" onclick="A.setDemoMode(${!loaded})">${loaded?'Start from zero':'Load demo data'}</button></div>`,'large');
 },
 setDemoMode(enabled){
  if(embeddedRole&&window.parent!==window&&window.parent.A?.setDemoMode)return window.parent.A.setDemoMode(enabled);
  return A.replaceWorkspace(enabled?window.createDemoWorkspace():window.emptyWorkspace());
 },
 resetWorkspace(){
  if(embeddedRole&&window.parent!==window&&window.parent.A?.resetWorkspace)return window.parent.A.resetWorkspace();
  return A.replaceWorkspace(window.emptyWorkspace());
 },
 async replaceWorkspace(next){
  if(!workspaceIsCurrent(readWorkspace()))return false;
  if(resettingWorkspace)return;
  resettingWorkspace=true;
  const button=document.getElementById('confirm-workspace-reset')||document.getElementById('confirm-demo-mode');if(button){button.disabled=true;button.textContent=next.demoMode?'Loading…':'Clearing…';}
  next.resetEpoch=crypto.randomUUID();
  localStorage.setItem(workspaceStorageKey,JSON.stringify(next));
  clearBetaSessionStorage();
  try{
   await new Promise((resolve,reject)=>{const request=UatWorkflow.clearEvidence();request.onsuccess=resolve;request.onerror=()=>reject(request.error);});
  }finally{location.reload();}
 },
 editEmployee(id){const e=state.employees.find(x=>x.id===id);if(state.role!=='manager'||!e)return;A.modal(`<div class="modal-header"><h2>Manage team member</h2><button class="icon-btn" onclick="A.closeModal()">${icon('x')}</button></div><form onsubmit="A.saveEmployee(event,'${e.id}')"><div class="modal-body"><div class="row" style="margin-bottom:25px">${A.person(e)}</div><div class="field"><label>Workspace role</label><select id="employee-role" ${e.id===state.user.id?'disabled':''}>${['manager','developer','tester'].map(r=>`<option ${e.role===r?'selected':''}>${r}</option>`).join('')}</select></div><div class="field"><label>Availability</label><select id="employee-available"><option value="yes" ${e.available?'selected':''}>Available for assignments</option><option value="no" ${!e.available?'selected':''}>On holiday</option></select></div><div class="info-box">${icon('shield',16)}Role changes apply to this demonstration workspace immediately.</div></div><div class="modal-footer"><button type="button" class="btn" onclick="A.closeModal()">Cancel</button><button class="btn primary">Save member</button></div></form>`,'');},
 saveEmployee(ev,id){ev.preventDefault();const e=state.employees.find(x=>x.id===id);if(state.role!=='manager'||!e)return;const nextRole=document.getElementById('employee-role').value;if(e.role==='tester'&&nextRole!=='tester'&&state.projects.some(project=>project.uat?.cases?.some(test=>test.assigneeId===id&&!['draft','pass'].includes(test.status)))){A.toast('Complete this tester’s assigned UAT cases before changing their role.','error');return;}if(e.id!==state.user.id)e.role=nextRole;e.available=document.getElementById('employee-available').value==='yes';A.save();A.closeModal();A.render();A.toast('Team member updated');},
 inviteEmployee(){if(state.role!=='manager')return;A.modal(`<div class="modal-header"><h2>Add a team member</h2><button class="icon-btn" onclick="A.closeModal()">${icon('x')}</button></div><form onsubmit="A.addEmployee(event)"><div class="modal-body"><div class="field"><label>Full name</label><input id="invite-name" placeholder="e.g. Grace Williams" required></div><div class="field"><label>Work email</label><input type="email" id="invite-email" placeholder="grace.williams@example.com" required></div><div class="field"><label>Role</label><select id="invite-role"><option value="developer">Developer</option><option value="tester">Tester</option><option value="manager">Manager</option></select></div><p class="muted" style="font-size:10px">An invitation will appear in the simulated outbox. No email is sent.</p></div><div class="modal-footer"><button class="btn" type="button" onclick="A.closeModal()">Cancel</button><button class="btn primary">${icon('user-plus',15)}Add member</button></div></form>`,'');},
 addEmployee(ev){ev.preventDefault();if(state.role!=='manager')return;const role=document.getElementById('invite-role').value;const name=document.getElementById('invite-name').value;state.employees.push({id:'e'+Date.now(),name,email:document.getElementById('invite-email').value,role,title:capitalize(role),avatar:15,available:true,load:0,skills:['New team member']});A.save();A.closeModal();A.render();A.toast(name+' added to the team');},
 help(){A.modal(`<div class="modal-header"><div><div class="eyebrow">A QUICK LOOK AROUND</div><h2>From upload to a confident release.</h2></div><button class="icon-btn" onclick="A.closeModal()">${icon('x')}</button></div><div class="modal-body"><div class="stack">${[['01','Open a finished build','Choose a completed development project from Awaiting UAT.'],['02','Generate UAT scenarios','Review the mock scenarios and clarify any missing requirements.'],['03','Choose the project team','Select developers and testers before approving the UAT start.'],['04','Follow the work','Switch roles from your profile menu to accept assignments, report findings, submit fixes, and approve work.'],['05','Listen before you launch','Open the customer preview, try the sample application, and send your session notes to the project manager.']].map(([n,t,d])=>`<div class="row" style="align-items:flex-start;padding:12px 0"><span class="project-symbol" style="color:var(--blue);background:var(--blue-soft)">${n}</span><div><h3 style="font-size:13px;margin-bottom:5px">${t}</h3><p class="muted" style="font-size:11px">${d}</p></div></div>`).join('')}</div><div class="info-box" style="margin-top:16px">${icon('info',17)}This is an interactive prototype. AI, email, tests, and credentials are simulated. Your demo changes are saved only in this browser.</div></div><div class="modal-footer"><button class="btn" onclick="A.closeModal()">Got it</button>${state.role==='manager'? `<button class="btn primary" onclick="OwnerFlow.open()">${icon('plus',15)}Start a project</button>` : ''}</div>`);},
 forgot(){A.modal(`<div class="modal-header"><h2>Demo sign-in details</h2><button class="icon-btn" onclick="A.closeModal()">${icon('x')}</button></div><div class="modal-body"><p>Use <strong>admin / admin</strong> to explore the manager workspace.</p><p style="margin-top:14px">Use the Developer, Tester, or Manager shortcuts to explore an employee workspace. For a new assignment, use the email and password generated in the project invitation.</p><div class="info-box" style="margin-top:18px">${icon('key')}Assignment keys are included in each simulated job assignment email.</div></div><div class="modal-footer"><button class="btn primary" onclick="A.closeModal()">Back to sign in</button></div>`,'');},

};
A.notificationsFor=(role,employeeId)=>state.notifications.filter(notice=>{
 if(notice.employeeId)return notice.employeeId===employeeId&&(!notice.role||notice.role===role);
 const recipientRole=notice.role==='owner'?'manager':notice.role||'manager';
 const project=state.projects.find(item=>item.id===notice.projectId);
 const recipient=(project?.team||[]).map(id=>state.employees.find(person=>person.id===id))
  .find(person=>person?.role===recipientRole)||demoEmployee(recipientRole);
 return role===recipientRole&&recipient?.id===employeeId;
});
A.visibleNotifications=()=>A.notificationsFor(state.role,state.user.id);
function renderRequests(){if(state.role!=='manager'||!state.requests?.length)return '';return `<div class="section-heading"><h2>Team support requests</h2><span class="count-bubble">${state.requests.filter(r=>r.status==='Pending').length} pending</span></div>${state.requests.map(r=>`<div class="card card-pad" style="margin-bottom:15px"><div class="row"><span class="activity-icon" style="width:36px;height:36px">${icon('user-plus',19)}</span><div><h3 style="font-size:13px">Additional support for ${esc(state.projects.find(p=>p.id===r.projectId)?.name||'a release')}</h3><div class="person-request-author">${A.person(state.employees.find(person=>person.name===r.requestedBy)||{name:r.requestedBy},'Project manager')}</div></div><span class="spacer"></span>${A.badge(r.status,r.status==='Pending'?'amber':r.status==='Approved'?'green':'gray')}</div><p class="muted" style="font-size:11px;margin-top:13px">${esc(r.reason)}</p><div class="row person-request-row" style="margin-top:15px"><div class="person-request-team">${(r.employees||[]).map(id=>A.person(id)).join('')}</div><span class="spacer"></span>${r.status==='Pending'?`<button class="btn small" onclick="A.reviewRequest('${r.id}')">Review request ${icon('arrow-right',12)}</button>`:''}</div></div>`).join('')}<div class="section-heading" style="margin-top:24px"><h2>Workspace updates</h2></div>`;}
A.reviewRequest=id=>{if(state.role!=='manager')return;const r=state.requests.find(r=>r.id===id);const p=state.projects.find(p=>p.id===r.projectId);A.modal(`<div class="modal-header"><h2>Review additional support</h2>${closeBtn()}</div><div class="modal-body"><div class="eyebrow">${esc(p?.name||'Release support')} · ${esc(r.priority)}</div><p style="margin-top:13px">${esc(r.reason)}</p><div class="stack" style="margin-top:22px">${r.employees.map(id=>state.employees.find(e=>e.id===id)).filter(Boolean).map(e=>`<div class="row" style="padding:13px;background:var(--surface-2);border-radius:8px">${A.person(e)}<span class="spacer"></span>${A.badge(e.available?'Available':'On holiday',e.available?'green':'gray')}</div>`).join('')}</div><div class="info-box" style="margin-top:22px">${icon('mail',18)}Approving adds these people to the release team and generates their simulated job assignment emails and acceptance keys.</div></div><div class="modal-footer"><button class="btn" onclick="A.decideRequest('${id}',false)">Decline request</button><button class="btn primary" onclick="A.decideRequest('${id}',true)">${icon('check',14)}Approve & assign</button></div>`);};
A.assignSupport=(project,employeeIds)=>{
 if(state.role!=='manager')return;
 project.updatedAt=new Date().toISOString();
 for(const employeeId of employeeIds){
  const employee=state.employees.find(person=>person.id===employeeId);
  if(!employee)continue;
  if(!project.team.includes(employeeId))project.team.push(employeeId);
  if(state.assignments.some(assignment=>assignment.employeeId===employeeId&&assignment.projectId===project.id))continue;
  const key='PS-'+Math.random().toString(36).slice(2,6).toUpperCase();
  const body=`Hi ${employee.name.split(' ')[0]},

You have been assigned to ${project.name} to support this release as ${employee.title}.

Username: ${employee.email}
Password: Welcome26!
Assignment key: ${key}

Please sign in and accept the assignment to get started.

${state.user.name} · Pre-Shipment`;
  state.assignments.push({id:'as-'+Date.now()+'-'+employeeId,employeeId,projectId:project.id,username:employee.email,password:'Welcome26!',key,accepted:false,emailSent:true,subject:'Job assignment: '+project.name,body});
  state.notifications.unshift({id:'notice-'+Date.now()+'-'+employeeId,employeeId,title:'A new project has been assigned',body:project.name,page:'projects',time:'Just now',read:false,type:'assignment'});
 }
};
A.decideRequest=(id,approved)=>{if(state.role!=='manager')return;const r=state.requests.find(r=>r.id===id);if(!r||r.status!=='Pending')return;r.status=approved?'Approved':'Declined';const p=state.projects.find(p=>p.id===r.projectId);if(approved&&p)A.assignSupport(p,r.employees);const recipient=state.employees.find(person=>person.name===r.requestedBy)||state.user;state.notifications.unshift({id:'n'+Date.now(),employeeId:recipient.id,role:recipient.role,title:approved?'Support request approved':'Support request declined',body:`${p?.name||'Release'} · ${approved?'The additional team is assigned and invitations are in the simulated outbox.':'The manager has been notified.'}`,time:'Just now',read:false,page:'team',type:'users'});A.save();A.closeModal();A.render();A.toast(approved?'Request approved. Assignment emails generated.':'Request declined. Manager notified.');};
function capitalize(s){return s.charAt(0).toUpperCase()+s.slice(1);}
function closeBtn(){return `<button class="icon-btn" onclick="A.closeModal()" aria-label="Close dialog">${icon('x')}</button>`;}
function brand(){return `<div class="brand"><div class="brand-icon">${icon('shield-check',31)}</div><div><div class="brand-name">Pre-Shipment<span style="font-size:7px;vertical-align:super;margin-left:2px;font-weight:500">™</span></div><div class="brand-by">By Pfizer</div></div></div>`;}
function titlebar(betaWindow=false){return `<div class="titlebar"><span class="mini-icon">${icon('check',10)}</span>Pre-Shipment<span style="color:#c7cfdd">·</span>By Pfizer<span class="spacer"></span><span style="font-size:8px;letter-spacing:.4px">INTERACTIVE PROTOTYPE</span><div class="window-controls"><button title="Compact view" onclick="A.toast('The workspace automatically fits your screen')">${icon('minus',12)}</button><button title="Resize workspace" onclick="document.querySelector('.app-window,.login-window').classList.toggle('expanded');A.toast('Workspace fitted to your screen')">${icon('maximize',10)}</button><button title="${betaWindow?'Close beta window':'Sign out'}" onclick="${betaWindow?'window.close()':'A.logout()'}">${icon('x',12)}</button></div></div>`;}
function renderLogin(mode='choice',projectId=null){app.innerHTML=`<section class="login-window">${titlebar()}<div class="login-layout"><div class="login-story">${brand()}<h1>Great releases<br>begin with<br>confidence.</h1><p>Bring your people, projects, and quality checks together. Ship what’s next, with certainty.</p><div class="login-trust">${icon('shield-check',15)}One workspace. Every step to shipment.</div><img class="pfizer-white" src="pfizer.svg" alt="Pfizer"><div class="login-orbit"></div><span style="position:absolute;bottom:32px;right:30px;font-size:8px;color:#b6caff">BUILD BETTER. SHIP CONFIDENTLY.</span></div><div class="login-form-side">${mode==='employee'?employeeSignIn():mode==='beta'?Beta.keyForm(projectId):Beta.entryChoices()}</div></div></section>`;}
function employeeSignIn(){return `${Beta.backButton()}<div class="eyebrow">YOUR RELEASE WORKSPACE</div><h2>Welcome back.</h2><p>Sign in to see what’s moving forward.</p><form onsubmit="A.login(event)"><div class="field"><label for="login-user">Username or work email</label><input id="login-user" name="username" autocomplete="username" placeholder="Enter your work email" value="admin" required></div><div class="field"><label for="login-password">Password</label><div class="password-wrap"><input id="login-password" name="password" type="password" autocomplete="current-password" value="admin" required><button type="button" aria-label="Show or hide password" onclick="const p=document.getElementById('login-password');p.type=p.type==='password'?'text':'password'">${icon('eye',16)}</button></div></div><div class="remember-row"><label><input type="checkbox" checked>Remember this workspace</label><button type="button" class="btn link" onclick="A.forgot()">Need help signing in?</button></div><div class="login-error" id="login-error" role="alert"></div><button class="btn primary login-submit">Sign in to workspace ${icon('arrow-right',16)}</button></form><div class="demo-hint">Demo manager access <code>admin</code> / <code>admin</code></div><div class="explore-label">OR EXPLORE A ROLE</div><div class="demo-roles"><button onclick="A.switchRole('developer')">${icon('code',13)}Developer</button><button onclick="A.switchRole('tester')">${icon('bug',13)}Tester</button><button onclick="A.switchRole('manager')">${icon('users',13)}Manager</button></div>`;}
function navItem(page,label,ico,count){return `<button data-page="${page}" class="nav-item ${state.page===page||(state.role==='manager'&&page==='dashboard'&&state.page==='projects')?'active':''}" onclick="A.navigate('${page}')">${icon(ico)}${label}${count?`<span class="nav-count">${count}</span>`:''}</button>`;}
function renderShell(){const unread=A.visibleNotifications().filter(n=>!n.read).length;const scope=Workspaces.overviewData();app.innerHTML=`<section class="app-window">${titlebar()}<div class="app-layout"><aside class="sidebar" id="sidebar">${brand()}<button class="workspace-selector" onclick="A.toggleProfile()"><span class="ws-box">P</span><span><strong>Pfizer workspace</strong><small>${capitalize(state.role)} access</small></span><span class="spacer"></span>${icon('chevron-down',12)}</button><div class="nav-label">WORKSPACE</div><nav>${navItem('dashboard',state.role==='manager'?'Project stages':'Overview','layout-dashboard')}${navItem('issues',state.role==='developer'?'My findings':'Findings','bug',scope.issues.filter(i=>i.status!=='Resolved').length)}${navItem('feedback',state.role==='tester'?'Customer pre-feedback':'Feedback','message-square')}${navItem('messages','Messages','mail',unread)}</nav><div class="sidebar-bottom">${navItem('settings','Settings','settings')}<button class="nav-item" onclick="A.help()">${icon('help-circle')}Help & getting started</button><div class="sidebar-footer"><img src="pfizer.svg" alt="Pfizer"><span>Pre-Shipment v1.0</span></div></div></aside><div class="main-shell"><header class="topbar"><button class="icon-btn mobile-menu" aria-label="Toggle navigation" onclick="document.getElementById('sidebar').classList.toggle('open')">${icon('menu')}</button><div class="breadcrumb"><span class="muted">Workspace</span>${icon('chevron-right',11)}<span>${pageName()}</span></div><div class="global-search">${icon('search',14)}<input id="global-input" placeholder="Search anything…" aria-label="Search projects and findings" oninput="A.searchGlobal(this.value)"><kbd>⌘ K</kbd></div><button class="icon-btn" title="${theme==='light'?'Switch to dark theme':'Switch to light theme'}" onclick="A.setTheme('${theme==='light'?'dark':'light'}');A.render()">${icon(theme==='light'?'moon':'sun',16)}</button><button class="icon-btn workspace-reset-button" title="Reset mock data" aria-label="Reset mock data" onclick="A.resetPrompt()">${icon('refresh-cw',16)}</button><button class="workspace-demo-button" title="${state.demoMode?'Clear demo data':'Load demo data'}" aria-label="${state.demoMode?'Clear demo data':'Load demo data'}" aria-pressed="${state.demoMode===true}" onclick="A.demoPrompt()"><span class="demo-toggle-track" aria-hidden="true"></span><span>Demo data</span></button><button class="icon-btn" title="Messages and notifications" onclick="A.navigate('messages')">${icon('bell',17)}${unread?'<span class="notify-dot"></span>':''}</button><div class="top-divider"></div><button class="profile-trigger" onclick="A.toggleProfile()">${A.avatar(state.user,33)}<span class="profile-text"><strong>${esc(state.user.name)}</strong><small>${capitalize(state.role)}</small></span>${icon('chevron-down',12)}</button></header><div class="uat-workspace-layout"><main class="main-content" id="main-content"><div class="page-in">${renderPage()}</div></main>${UatOverview.rail()}</div></div></div></section>`;}
function pageName(){return {dashboard:state.role==='manager'?'Project stages':'Overview',projects:state.role==='manager'?'Project stages':'Projects',issues:'Findings',feedback:state.role==='tester'?'Customer pre-feedback':'Feedback',team:'Team members',reports:'Reports & insights',messages:'Messages',settings:'Settings'}[state.page]||'Overview';}
function header(eyebrow,title,desc,action){return `<div class="page-header"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${desc}</p></div><div class="header-actions">${action||''}</div></div>`;}
function renderPage(){if(state.page==='messages')return renderMessages();if(state.page==='settings')return renderSettings();return Workspaces.render(state.role,state.page);}
function renderMessages(){return `${header('YOUR WORKSPACE INBOX','A little less noise. More clarity.','Assignments, approvals, and updates, all in one place.',`<button class="btn" onclick="A.markAllRead()">${icon('check',14)}Mark all as read</button>`)}${renderRequests()}<div class="card" style="overflow:hidden">${A.visibleNotifications().map(n=>`<button style="display:flex;align-items:flex-start;gap:15px;width:100%;background:${n.read?'var(--surface)':'var(--blue-soft)'};border:0;border-bottom:1px solid var(--line);text-align:left;padding:21px 24px" onclick="A.markRead('${n.id}')"><span class="activity-icon" style="width:34px;height:34px">${icon(n.type==='warning'?'alert-triangle':n.type||'bell',17)}</span><div style="flex:1"><strong style="font-size:12px;font-weight:${n.read?'550':'700'}">${esc(n.title)}</strong><p class="muted" style="font-size:11px;margin-top:5px">${esc(n.body||n.text||'Your workspace has a new update.')}</p></div><span class="muted" style="font-size:9px;white-space:nowrap">${esc(n.time||'Just now')}</span>${!n.read?'<span class="status-dot" style="background:var(--blue);margin-top:5px"></span>':''}</button>`).join('')}</div>`;}
function renderSettings(){return `${header('MAKE IT YOURS','Your workspace, your way.','Set up a comfortable place to do your best work.')}<div class="settings-grid"><div class="settings-nav"><button class="active">${icon('user',14)} General</button><button onclick="A.help()">${icon('help-circle',14)} About the demo</button></div><div class="card card-pad"><div class="row">${A.person(state.user)}<span class="spacer"></span><button class="btn small" onclick="A.editProfile()">Edit profile</button></div><div class="divider"></div><h3>Appearance</h3><p class="muted" style="font-size:11px;margin-top:6px">Choose the theme that feels right for you.</p><div class="theme-options">${['light','dark'].map(t=>`<button class="theme-option ${theme===t?'selected':''}" onclick="A.setTheme('${t}')"><div class="theme-preview ${t}"></div><div class="row"><p>${capitalize(t)} theme</p><span class="spacer"></span>${theme===t?icon('check-circle',14):''}</div></button>`).join('')}</div><div class="setting-row"><div><strong>In-app notifications</strong><p>Keep assignment and quality updates close at hand.</p></div><input type="checkbox" class="switch" ${localStorage.getItem('pre-shipment-alerts')!=='off'?'checked':''} onchange="A.notificationPrefs(this)"></div><div class="setting-row"><div><strong>Prototype environment</strong><p>All data stays in this browser. AI, emails, and test results are simulated.</p></div><span class="demo-mode">Demo mode</span></div><div class="setting-row" style="border:0"><div><strong>Start fresh</strong><p>Clear project activity and start with an empty workspace.</p></div><button class="btn danger small" onclick="A.resetPrompt()">Reset workspace</button></div></div></div>`;}
A.sampleDocument=name=>A.modal(`<div class="modal-header"><h2>${esc(name)}</h2>${closeBtn()}</div><div class="modal-body"><div class="eyebrow">SAMPLE DOCUMENT</div><h2>A little guidance to get started.</h2><p class="muted" style="margin-top:18px">Welcome to your pre-release preview. Use the navigation to explore documents and support. If something feels unexpected, add it to your session notes for the project manager.</p><div class="info-box" style="margin-top:23px">${icon('check-circle',18)}Your sample document opened successfully.</div></div><div class="modal-footer"><button class="btn primary" onclick="A.closeModal()">Done</button></div>`,'');
A.sampleSupport=type=>A.modal(`<div class="modal-header"><h2>${type==='guide'?'Your quick start guide':'Preview support'}</h2>${closeBtn()}</div><div class="modal-body">${type==='guide'?'<h3>Three easy steps</h3><p class="muted" style="margin-top:15px">1. Explore the overview and your documents.<br>2. Add a sample document to try the upload experience.<br>3. Share a bug or suggestion using the feedback form.</p>':`<div class="info-box">${icon('message-square',18)}Hi! I’m your preview assistant. This sample workspace lets you explore documents, add a sample file, and share feedback. What would you like to try?</div><div class="field" style="margin-top:20px"><label>Your message</label><textarea id="support-message" placeholder="Type a sample message…"></textarea></div>`}</div><div class="modal-footer"><button class="btn" onclick="A.closeModal()">Close</button>${type==='chat'?'<button class="btn primary" onclick="A.supportReply()">Send message</button>':''}</div>`,'');
A.supportReply=()=>{if(!document.getElementById('support-message').value.trim()){A.toast('Enter a message to continue','error');return;}A.closeModal();A.toast('Thanks! Your sample support request has been received.');};
document.addEventListener('keydown',e=>{if(e.key==='Tab'&&document.querySelector('.modal-content')){const nodes=[...document.querySelectorAll('.modal-content button:not(:disabled),.modal-content input:not(:disabled),.modal-content select:not(:disabled),.modal-content textarea:not(:disabled),.modal-content a[href],.modal-content summary')].filter(el=>el.getClientRects().length);const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}if(e.key==='Escape'){A.closeModal();document.getElementById('profile-menu')?.remove();document.getElementById('global-results')?.remove();dropdown=false;}if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();document.getElementById('global-input')?.focus();}});
document.addEventListener('click',e=>{if(dropdown&&!e.target.closest('.profile-trigger,.workspace-selector,#profile-menu')){document.getElementById('profile-menu')?.remove();dropdown=false;}if(!e.target.closest('.global-search,#global-results'))document.getElementById('global-results')?.remove();});
function showSplash(){if(!sessionStorage.getItem('pre-shipment-launched')){sessionStorage.setItem('pre-shipment-launched','1');const splash=document.createElement('div');splash.className='splash';splash.innerHTML=`<div class="splash-window"><img src="pfizer.svg" alt="Pfizer"><h1>Pre-Shipment</h1><p>Confidence before every release</p><div class="splash-line"><span></span></div><p class="splash-note">By Pfizer · Prototype workspace</p></div>`;document.body.appendChild(splash);setTimeout(()=>{splash.classList.add('fade');setTimeout(()=>splash.remove(),450);},1800);}}
A.refreshNotifications=()=>{
 if(!loggedIn)return;
 const unread=A.visibleNotifications().filter(notice=>!notice.read).length;
 const bell=document.querySelector('.topbar [title="Messages and notifications"]');
 if(bell)bell.innerHTML=icon('bell',17)+(unread?'<span class="notify-dot"></span>':'');
 const messages=document.querySelector('[data-page="messages"]');
 if(messages){
  messages.querySelector('.nav-count')?.remove();
  if(unread)messages.insertAdjacentHTML('beforeend',`<span class="nav-count">${unread}</span>`);
 }
};
A.openWorkspace=(role,employeeId,projectId)=>{
 if(role==='customer'){
  loggedIn=false;
  state.role='customer';
  state.user={id:'customer-preview',name:'Jordan Lee',role:'customer'};
  Beta.startEmbedded(projectId);
  return true;
 }
 const project=state.projects.find(item=>item.id===projectId);
 const member=(project?.team||[]).map(id=>state.employees.find(person=>person.id===id)).find(person=>person?.role===role);
 const employee=state.employees.find(person=>person.id===employeeId&&person.role===role)||member||demoEmployee(role);
 if(!employee||!['manager','developer','tester'].includes(role))return false;
 state.role=role;state.user=employee;state.page='dashboard';loggedIn=true;dropdown=false;
 A.render();
 if(project&&!navigationReload&&launchParams.get('home')!=='1'){
  if(role==='manager')UatManager.openProject(project.id);
  else if(Workspaces.hasAcceptedProject(project.id))Workspaces.openProject(project.id);
 }
 return true;
};
window.addEventListener('storage',event=>{
 if(event.key!==workspaceStorageKey||!event.newValue||!A.refreshWorkspace())return;
 window.FourView?.onWorkspaceSync?.();
 if(embeddedRole==='customer'){Beta.onWorkspaceSync();return;}
 if(!loggedIn)return;
 A.refreshNotifications();
 if(window.UatTester?.onWorkspaceSync?.())return;
 if(document.querySelector('.modal-content')||document.activeElement?.closest('form'))return;
 const mainScroll=document.getElementById('main-content')?.scrollTop||0;
 const layoutScroll=document.querySelector('.uat-workspace-layout')?.scrollTop||0;
 dropdown=false;
 A.render();
 document.getElementById('main-content')?.scrollTo(0,mainScroll);
 document.querySelector('.uat-workspace-layout')?.scrollTo(0,layoutScroll);
});
let restoredInvitations=false;
for(const project of state.projects){
 if(UatWorkflow.stage(project)==='awaiting')continue;
 for(const employeeId of project.team||[]){
  const employee=state.employees.find(person=>person.id===employeeId);
  if(!employee||!['developer','tester'].includes(employee.role)||state.assignments.some(assignment=>assignment.employeeId===employeeId&&assignment.projectId===project.id))continue;
  const key='PS-'+crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(0,6).toUpperCase();
  const accepted=project.status==='Completed';
  state.assignments.push({
   id:'restored-'+project.id+'-'+employeeId, employeeId, projectId:project.id,
   username:employee.email, password:'Welcome26!', key, accepted, emailSent:true,
   subject:'Project invitation · '+project.name,
   body:`You are invited to ${project.name}. Sign in with ${employee.email} / Welcome26! and accept with assignment key ${key}.`
  });
  restoredInvitations=true;
 }
}
const restoredReviews=UatWorkflow.restoreReviewQueues();
if(demoUpdated||testerAdded||restoredInvitations||restoredReviews)A.save();
window.OwnerFlow.open=()=>UatManager.newProject();

window.initBeta({A,app,state,icon,esc,brand,titlebar,closeBtn,capitalize,renderLogin,showSplash,readWorkspace});
if(embeddedRole)A.openWorkspace(embeddedRole,launchParams.get('employee'),launchParams.get('project'));
else if(navigationReload&&!launchParams.has('betaSession')&&!launchParams.has('customer')){
 try{
  const actor=JSON.parse(sessionStorage.getItem('pre-shipment-staff-actor'));
  if(actor)A.openWorkspace(actor.role,actor.employeeId);
 }catch{}
}
window.FourView?.mount();
})();
