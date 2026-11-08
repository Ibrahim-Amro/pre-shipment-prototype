const assert=require('node:assert/strict');
const {launchBrowser,BASE_URL}=require('./support.cjs');
(async()=>{
 const browser=await launchBrowser({fixtures:false});
 try{
  const context=await browser.newContext({viewport:{width:1800,height:1100}});
  context.setDefaultTimeout(15000);
  const errors=[];
  context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
  const page=await context.newPage();
  await page.goto(BASE_URL);
  await page.locator('.splash').waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Sign In',exact:true}).click();
  await page.getByRole('button',{name:'Sign in to workspace'}).click();
  await page.locator('.topbar').getByRole('button',{name:'Load demo data',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Load demo data',exact:true}).click();
  await page.waitForFunction(()=>A.state.demoMode);
  await page.getByRole('button',{name:'Toggle staff workspace'}).click();
  await page.locator('#four-project').selectOption('p1');
  const frames={};
  for(const role of ['manager','developer','tester']){
   frames[role]=await page.locator('iframe[data-role='+role+']').elementHandle().then(el=>el.contentFrame());
   await frames[role].waitForFunction(role=>window.A?.state.role===role,role);
  }
  const {manager,developer,tester}=frames;
  async function focus(role){
   const selected=page.locator('[data-focus-role][aria-pressed=true]');
   if(await selected.count()){if(await selected.getAttribute('data-focus-role')===role)return;await selected.click();}
   await page.locator('[data-focus-role='+role+']').click();
  }
  async function fix(title,version){
   await focus('developer');
   if(await developer.getByRole('button',{name:'Close project',exact:true}).isVisible())await developer.getByRole('button',{name:'Close project',exact:true}).click();
   await developer.locator('[data-page=issues]').click();
   await developer.getByRole('button',{name:title,exact:true}).click();
   await developer.getByRole('button',{name:'Apply a fix',exact:true}).click();
   await developer.locator('#ws-fix-build').fill(version);
   await developer.locator('#ws-fix-notes').fill('Save task changes before reopening and restore the stored task list.');
   await developer.getByRole('button',{name:'Analyze proposed fix',exact:true}).click();
   await developer.getByRole('button',{name:'Submit fix for retest',exact:true}).click();
  }
  assert.equal(await tester.evaluate(()=>A.state.user.id),'t1');
  await developer.getByRole('button',{name:'Close project',exact:true}).waitFor();
  await fix('A saved dispatch task disappears after reopening','v1.3.1');
  await tester.waitForFunction(()=>A.state.user.id==='t2'&&A.state.issues.find(b=>b.id==='BUG-2401').status==='Awaiting retest');
  assert.equal(await page.locator('[data-person-role=tester]').inputValue(),'t2');
  await focus('tester');
  await tester.locator('.uat-retest-build').getByText('v1.3.1',{exact:true}).waitFor();
  console.log('PASS: submitting the demo fix automatically switches the tester pane from Emma to Liam and opens the exact case/build without an extra routing click.');
  await page.locator('[data-person-role=tester]').selectOption('t1');
  await tester.waitForFunction(()=>A.state.user.id==='t1');
  if(await tester.getByRole('button',{name:'Close test project',exact:true}).isVisible())await tester.getByRole('button',{name:'Close test project',exact:true}).click();
  await tester.locator('[data-page=dashboard]').click();
  const other=tester.getByRole('region',{name:'Retests assigned to other testers'});
  await other.locator('li').filter({hasText:'Project 1 ·'}).getByRole('button',{name:'Open as Liam Walker',exact:true}).click();
  await tester.waitForFunction(()=>A.state.user.id==='t2');
  assert.equal(await page.locator('[data-person-role=tester]').inputValue(),'t2');
  await tester.getByText('Retest the original steps on build').waitFor();
  await tester.locator('.uat-retest-build').getByText('v1.3.1',{exact:true}).waitFor();
  await tester.getByRole('button',{name:'Blocked',exact:true}).click();
  await tester.getByRole('button',{name:'Close test project',exact:true}).click();
  const ready=tester.getByRole('region',{name:'Fixes ready for your retest'});
  await ready.getByRole('button',{name:'Continue retest',exact:true}).click();
  await tester.getByRole('button',{name:'Pass',exact:true}).click();
  await manager.waitForFunction(()=>A.state.issues.find(b=>b.id==='BUG-2401').status==='In review');
  assert.equal(await manager.evaluate(()=>A.state.issues.find(b=>b.id==='BUG-2401').verifiedBy),'t2');
  console.log('PASS: developer fix for Tester 2 is visible from Tester 1, switches the live panel account, opens the submitted build, preserves Blocked, and passes to manager review.');

  await tester.getByRole('button',{name:'Report an exploratory finding',exact:true}).click();
  await tester.locator('#ws-report-title').fill('Keep my unsent observation');
  await fix('New callback task is missing when the planner is reopened','v1.3.2');
  await tester.waitForFunction(()=>A.state.issues.find(b=>b.id==='BUG-2402').status==='Awaiting retest');
  assert.equal(await tester.evaluate(()=>A.state.user.id),'t2');
  assert.equal(await tester.locator('#ws-report-title').inputValue(),'Keep my unsent observation');
  console.log('PASS: an automatic handoff preserves an unsent tester report while keeping the new retest queued.');
  await focus('tester');
  await tester.getByRole('button',{name:'Close dialog',exact:true}).click();
  await page.locator('[data-person-role=tester]').selectOption('t1');
  await tester.waitForFunction(()=>A.state.user.id==='t1');
  await tester.getByRole('button',{name:'Close test project',exact:true}).click();
  await tester.locator('[data-page=dashboard]').click();
  await tester.getByRole('region',{name:'Fixes ready for your retest'}).getByRole('button',{name:'Start retest',exact:true}).waitFor();
  await tester.locator('#uat-active-heading').locator('..').getByRole('button',{name:/Project 1/}).click();
  await tester.locator('.uat-retest-build').getByText('v1.3.2',{exact:true}).waitFor();
  await tester.getByRole('button',{name:'Close test project',exact:true}).click();
  await tester.locator('[data-page=issues]').click();
  await tester.getByRole('button',{name:'New callback task is missing when the planner is reopened',exact:true}).click();
  await tester.getByRole('dialog').getByRole('button',{name:'Start retest',exact:true}).click();
  await tester.locator('.uat-retest-build').getByText('v1.3.2',{exact:true}).waitFor();
  await tester.getByRole('button',{name:'Close test project',exact:true}).click();
  await tester.locator('[data-page=messages]').click();
  const notice=tester.getByRole('button').filter({hasText:'Fix ready to retest'}).filter({hasText:'v1.3.2'});
  await notice.click();
  await tester.locator('.uat-retest-build').getByText('v1.3.2',{exact:true}).waitFor();
  await tester.getByRole('button',{name:'Pass',exact:true}).click();
  await manager.waitForFunction(()=>A.state.issues.find(b=>b.id==='BUG-2402').status==='In review');
  console.log('PASS: exploratory fix gains a case; retest is selected before pending work and is accessible from its issue, dashboard and exact notification.');

  // Corrupt only an isolated saved record to verify repair of an older retest.
  const repair=await context.newPage();
  await repair.goto(BASE_URL);
  await repair.locator('.splash').waitFor({state:'hidden'});
  await repair.evaluate(()=>{
   const p=A.state.projects.find(p=>p.id==='p1'),b=A.state.issues.find(b=>b.id==='BUG-2401'),t=p.uat.cases.find(t=>t.id===b.uatCaseId);
   b.status='Awaiting retest';b.fix.buildVersion='v1.3.1';t.status='fail';delete t.bugId;delete t.buildVersion;
   p.status='Finished';p.progress=40;p.version='v9.0.0';A.save();
  });
  await repair.reload();
  const recovered=await repair.evaluate(()=>{
   const p=A.state.projects.find(p=>p.id==='p1'),b=A.state.issues.find(b=>b.id==='BUG-2401'),t=p.uat.cases.find(t=>t.id===b.uatCaseId);
   return {status:t.status,build:t.buildVersion,bug:t.bugId,projectStatus:p.status,history:b.retestHistory.length,again:UatWorkflow.restoreRetestQueues()};
  });
  assert.deepEqual(recovered,{status:'retest',build:'v1.3.1',bug:'BUG-2401',projectStatus:'In progress',history:1,again:false});
  await repair.evaluate(()=>{
   A.state.employees.find(person=>person.id==='t2').name='<b>Tester Two</b>';
   A.save();A.switchRole('tester');
  });
  const otherRow=repair.getByRole('region',{name:'Retests assigned to other testers'}).locator('li').filter({hasText:'Project 1 ·'});
  await otherRow.getByRole('button',{name:'Open as <b>Tester Two</b>',exact:true}).waitFor();
  assert.equal(await otherRow.locator('b').count(),0);
  console.log('PASS: saved retest links/status/build are recovered idempotently using the submitted fix version while preserving history.');

  // Hold an account navigation so the requested tester URL exists before its app is ready.
  let releaseNavigation, navigationStarted;
  const started=new Promise(resolve=>{navigationStarted=resolve;});
  const testerUrl=url=>url.searchParams.get('multiView')==='1'&&url.searchParams.get('workspaceRole')==='tester'&&url.searchParams.get('employee')==='t2';
  await page.route(testerUrl,async route=>{
   navigationStarted();
   await new Promise(resolve=>{releaseNavigation=resolve;});
   await route.continue();
  });
  await page.locator('[data-person-role=tester]').selectOption('t2');
  await started;
  const caseId=await manager.evaluate(()=>A.state.issues.find(b=>b.id==='BUG-2401').uatCaseId);
  assert.equal(await page.evaluate(caseId=>FourView.openRetest('p1',caseId,{automatic:true}),caseId),true);
  releaseNavigation();
  await tester.waitForFunction(()=>A.state.user.id==='t2');
  await tester.locator('.uat-retest-build').getByText('v1.3.1',{exact:true}).waitFor();
  await page.unroute(testerUrl);
  assert.deepEqual(errors,[]);
  console.log('PASS: an automatic retest handoff waits for an already-loading tester account before opening the exact case.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
