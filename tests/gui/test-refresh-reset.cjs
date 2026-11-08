const assert=require('node:assert/strict');
const {launchBrowser,BASE_URL}=require('./support.cjs');

(async()=>{
 const browser=await launchBrowser();
 try{
  const context=await browser.newContext({viewport:{width:1600,height:1050}});
  context.setDefaultTimeout(15000);
  const errors=[];
  context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
  const page=await context.newPage();
  await page.goto(BASE_URL);
  await page.locator('.splash').waitFor({state:'hidden'});
  async function signIn(target){
   await target.getByRole('button',{name:'Sign In',exact:true}).click();
   await target.getByRole('button',{name:'Sign in to workspace'}).click();
   await target.getByRole('button',{name:'New project',exact:true}).waitFor();
  }
  await signIn(page);
  await page.locator('.topbar [title="Switch to dark theme"]').click();
  await page.locator('[data-page=issues]').click();
  await page.getByRole('button',{name:'Session expires during document upload',exact:true}).click();
  await page.locator('.modal-content').waitFor();
  await page.reload();
  await page.getByRole('button',{name:'New project',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>A.state.role),'manager');
  assert.equal(await page.evaluate(()=>A.state.page),'dashboard');
  assert.equal(await page.locator('.modal-content').count(),0);
  assert.equal(await page.locator('.topbar [aria-label="Reset mock data"]').count(),1);
  assert.ok(await page.locator('.topbar [aria-label="Reset mock data"]').evaluate(node=>/theme/.test(node.previousElementSibling.title)));
  console.log('PASS: staff reload preserves actor and opens home without project/dialog; reset is next to theme');

  // A separate staff tab holds an unsaved form. Suppress its storage listener to
  // exercise the save-time epoch guard rather than relying on timely events.
  const stale=await context.newPage();
  await stale.goto(BASE_URL);await stale.locator('.splash').waitFor({state:'hidden'});await signIn(stale);
  await stale.locator('.profile-trigger').click();
  await stale.getByRole('button',{name:'Workspace settings',exact:true}).click();
  await stale.getByRole('button',{name:'Edit profile',exact:true}).click();
  await stale.locator('#profile-name').fill('Unsaved stale profile');
  await stale.evaluate(()=>{A.refreshWorkspace=()=>false;});

  await page.getByRole('button',{name:'Toggle staff workspace'}).click();
  const frames={};
  for(const role of ['manager','developer','tester','customer']){
   frames[role]=await page.locator(`iframe[data-role=${role}]`).elementHandle().then(node=>node.contentFrame());
   await frames[role].waitForFunction(role=>window.A?.state.role===role,role);
  }
  let manager=frames.manager,tester=frames.tester;
  async function focus(role){
   const selected=page.locator('[data-focus-role][aria-pressed=true]');
   if(await selected.count()){if(await selected.getAttribute('data-focus-role')===role)return;await selected.click();}
   await page.locator(`[data-focus-role=${role}]`).click();
  }
  await focus('manager');
  await manager.locator('[data-page=issues]').click();
  await manager.getByRole('button',{name:'Session expires during document upload',exact:true}).click();
  await Promise.all([manager.waitForNavigation({waitUntil:'load'}),manager.evaluate(()=>location.reload())]);
  await manager.getByRole('button',{name:'New project',exact:true}).waitFor();
  assert.equal(await manager.locator('.modal-content').count(),0);
  assert.equal(await manager.getByRole('button',{name:'Back to projects',exact:true}).count(),0);
  await focus('tester');
  await tester.getByRole('region',{name:'Pending project invitation'}).filter({hasText:'Project 1'}).getByRole('button',{name:'Accept assignment',exact:true}).click();
  await tester.getByRole('button',{name:'OK, accept project',exact:true}).click();
  await tester.locator('#uat-active-heading').locator('..').getByRole('button',{name:/Project 1/}).click();
  await tester.getByRole('button',{name:'Fail',exact:true}).click();
  await tester.getByLabel('What happened?').fill('Reset verification evidence fixture.');
  await tester.locator('#uat-failure input[type=file]').setInputFiles({name:'reset-evidence.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN6kAAAAASUVORK5CYII=','base64')});
  await tester.getByRole('button',{name:'Generate bug report',exact:true}).click();
  await tester.getByRole('button',{name:'Send bug report',exact:true}).click();
  await tester.waitForFunction(()=>A.state.issues.some(issue=>issue.evidenceId));
  await Promise.all([tester.waitForNavigation({waitUntil:'load'}),tester.evaluate(()=>location.reload())]);
  await tester.locator('#uat-active-heading').waitFor();
  assert.equal(await tester.locator('.modal-content').count(),0);
  assert.equal(await tester.evaluate(()=>A.state.user.id),'t1');
  console.log('PASS: iframe refresh opens manager/tester home and retains accepted assignments and evidence');

  await page.reload();
  await page.locator('.four-view-shell').waitFor();
  assert.equal(await page.locator('.four-panel:visible').count(),3);
  for(const role of ['manager','developer','tester','customer']){
   frames[role]=await page.locator(`iframe[data-role=${role}]`).elementHandle().then(node=>node.contentFrame());
   await frames[role].waitForFunction(role=>window.A?.state.role===role,role);
   assert.equal(await frames[role].locator('.modal-content').count(),0);
  }
  manager=frames.manager;tester=frames.tester;
  await manager.getByRole('button',{name:'New project',exact:true}).waitFor();
  await tester.locator('#uat-active-heading').waitFor();
  console.log('PASS: whole-workspace refresh restores four identities on their home pages without project dialogs');

  const entry=await context.newPage();
  await entry.goto(new URL('?customer=1&project=p7',BASE_URL).href);
  const betaEvent=entry.waitForEvent('popup');
  await entry.getByRole('button',{name:'Open Project 7',exact:true}).click();
  const beta=await betaEvent;
  await beta.getByRole('button',{name:'New task',exact:true}).waitFor();
  await beta.getByLabel('Title',{exact:true}).fill('Draft cleared by global reset');
  await beta.getByLabel('Details',{exact:true}).fill('This application session must not survive a workspace reset.');
  assert.ok(await beta.evaluate(()=>Object.keys(sessionStorage).some(key=>key.startsWith('pre-shipment-beta'))));
  const lateBetaEvent=entry.waitForEvent('popup');
  await entry.getByRole('button',{name:'Open Project 7',exact:true}).click();
  const lateBeta=await lateBetaEvent;
  await lateBeta.getByRole('button',{name:'New task',exact:true}).waitFor();
  await lateBeta.evaluate(()=>{A.refreshWorkspace=()=>false;});


  await focus('manager');
  await page.locator('.four-panel[data-role=manager] [data-panel-action=reset]').click();
  await manager.getByRole('dialog').waitFor();
  const before=await manager.evaluate(()=>A.state.projects.length);
  await manager.getByRole('button',{name:/Cancel|Keep/}).click();
  assert.equal(await manager.evaluate(()=>A.state.projects.length),before);
  await page.locator('.four-panel[data-role=manager] [data-panel-action=reset]').click();
  await manager.getByRole('button',{name:'Reset workspace',exact:true}).click();
  await page.waitForFunction(()=>window.A?.state.projects.length===0);
  await beta.waitForFunction(()=>window.A?.state.projects.length===0);
  for(const key of ['projects','issues','assignments','notifications','feedback','betaFeedback','messages','requests'])assert.equal(await page.evaluate(key=>A.state[key]?.length||0,key),0,key+' cleared');
  assert.equal(await page.evaluate(()=>A.state.employees.length),4);
  assert.equal(await page.evaluate(()=>localStorage.getItem('pre-shipment-theme')),'dark');
  assert.equal(await beta.evaluate(()=>Object.keys(sessionStorage).filter(key=>key.startsWith('pre-shipment-beta')).length),0);
  assert.equal(await page.evaluate(async()=> (await indexedDB.databases()).some(database=>database.name==='pre-shipment-uat')),false);
  assert.equal(await page.locator('.modal-content').count(),0);
  console.log('PASS: cancel preserves data; confirmation clears all records, beta session state, evidence and other live views while retaining role accounts/theme');

  await lateBeta.getByLabel('Title',{exact:true}).fill('Stale beta write after reset');
  await lateBeta.waitForFunction(()=>window.A?.state.projects.length===0);
  assert.equal(await lateBeta.evaluate(()=>Object.keys(sessionStorage).filter(key=>key.startsWith('pre-shipment-beta')).length),0);
  await stale.getByRole('button',{name:'Save changes',exact:true}).click();
  await stale.waitForFunction(()=>window.A?.state.projects.length===0);
  assert.equal(await stale.evaluate(()=>A.state.employees.find(person=>person.id==='m1').name),'Manager');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pre-shipment-v4')).projects.length),0);
  await page.reload();
  await page.waitForFunction(()=>window.A?.state.projects.length===0);
  assert.equal(await page.locator('.modal-content').count(),0);
  const freshManager=await page.locator('iframe[data-role=manager]').elementHandle().then(node=>node.contentFrame());
  await freshManager.getByRole('button',{name:'New project',exact:true}).click();
  await freshManager.getByRole('button',{name:'Add to Awaiting UAT'}).click();
  await freshManager.getByRole('heading',{name:'Project 1',exact:true}).waitFor();
  assert.equal(await freshManager.evaluate(()=>A.state.projects.length),1);
  const newEvidence=await freshManager.evaluate(()=>UatWorkflow.storeEvidence(new File([new Uint8Array([1,2,3])],'new-after-reset.png',{type:'image/png'})));
  const later=await context.newPage();await later.goto(BASE_URL);
  await later.waitForFunction(()=>window.A?.state.projects.length===1);
  const storedSize=await later.evaluate(id=>new Promise((resolve,reject)=>{
   const request=indexedDB.open('pre-shipment-uat');
   request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{const database=request.result;const tx=database.transaction('evidence');const read=tx.objectStore('evidence').get(id);read.onsuccess=()=>resolve(read.result?.size);tx.oncomplete=()=>database.close();};
  }),newEvidence);
  assert.equal(storedSize,3,'A new browser tab must preserve evidence created after reset');

  assert.deepEqual(errors,[]);
  console.log('PASS: stale unsaved form cannot resurrect reset data; refresh remains empty and at home; next new project is Project 1; no browser errors');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
