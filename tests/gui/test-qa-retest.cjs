const assert=require('node:assert/strict');
const path=require('node:path');
const {launchBrowser, BASE_URL, RESULTS_DIR} = require('./support.cjs');

(async()=>{
 const browser=await launchBrowser();
 try{
  const context=await browser.newContext({viewport:{width:1600,height:1050}});
  context.setDefaultTimeout(12000);
  const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  const page=await context.newPage();
  await page.goto(BASE_URL);
  await page.locator('.splash').waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Sign In',exact:true}).click();
  await page.getByRole('button',{name:'Sign in to workspace'}).click();
  await page.getByRole('button',{name:'Toggle staff workspace'}).click();
  const frames={};
  for(const role of ['manager','developer','tester','customer']){
   frames[role]=await page.locator(`iframe[data-role=${role}]`).elementHandle().then(el=>el.contentFrame());
   await frames[role].waitForFunction(role=>window.A?.state.role===role,role);
  }
  const {manager,developer,tester}=frames;
  async function focus(role){
   const focused=page.locator('[data-focus-role][aria-pressed=true]');
   if(await focused.count()){if(await focused.getAttribute('data-focus-role')===role)return;await focused.click();}
   await page.locator(`[data-focus-role=${role}]`).click();
  }
  async function accept(frame,projectName){
   const pending=frame.getByRole('region',{name:'Pending project invitation'}).filter({hasText:projectName});
   const active=frame.locator('#uat-active-heading').locator('..');
   assert.equal(await active.getByRole('button',{name:new RegExp(projectName)}).count(),0);
   assert.equal(await frame.locator('#uat-test-queue-list').count(),0);
   await pending.getByRole('button',{name:'Accept assignment',exact:true}).click();
   const key=await frame.locator('#ws-assignment-key').inputValue();assert.ok(key);
   await frame.locator('#ws-assignment-key').fill('WRONG-KEY');
   await frame.getByRole('button',{name:'OK, accept project',exact:true}).click();
   await frame.locator('#ws-key-error').waitFor({state:'visible'});
   assert.equal(await frame.evaluate(()=>A.state.assignments.some(a=>a.projectId==='p1'&&a.employeeId===A.state.user.id&&a.accepted)),false);
   await frame.locator('#ws-assignment-key').fill(key);
   await frame.getByRole('button',{name:'OK, accept project',exact:true}).click();
   await active.getByRole('button',{name:new RegExp(projectName)}).waitFor();
  }
  async function openProject(frame,name='Project 1'){
   await frame.locator('[data-page=dashboard]').click();
   const close=frame.getByRole('button',{name:'Close test project',exact:true});
   if(await close.isVisible())await close.click();
   await frame.locator('#uat-active-heading').locator('..').getByRole('button',{name:new RegExp(name)}).click();
   await frame.locator('#uat-test-queue-list').waitFor();
  }
  async function failCase(text,{evidence=false,edit=false}={}){
   await tester.getByRole('button',{name:'Fail',exact:true}).click();
   await tester.getByRole('button',{name:'Generate bug report'}).click();
   assert.equal(await tester.locator('#uat-bug-draft .uat-bug-draft').count(),0);
   await tester.getByLabel('What happened?').fill('   ');
   await tester.getByRole('button',{name:'Generate bug report'}).click();
   assert.equal(await tester.locator('#uat-bug-draft .uat-bug-draft').count(),0);
   await tester.getByLabel('What happened?').fill(text);
   if(evidence)await tester.locator('#uat-failure input[type=file]').setInputFiles({name:'qa-evidence.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN6kAAAAASUVORK5CYII=','base64')});
   await tester.getByRole('button',{name:'Generate bug report'}).click();
   if(edit){
    await tester.getByRole('button',{name:'Edit evidence',exact:true}).click();
    await tester.getByLabel('What happened?').fill(text+' Updated after review.');
    await tester.getByRole('button',{name:'Generate bug report'}).click();
    await tester.locator('#uat-bug-draft').getByText(text+' Updated after review.',{exact:true}).first().waitFor();
   }
   await tester.getByRole('button',{name:'Send bug report'}).click();
   await tester.getByText('This case will return to your queue',{exact:false}).waitFor();
  }
  const issueTitle='Create a new task — UAT failure';
  let openedEvidence=false;
  async function openFix(){
   await focus('developer');
   await developer.locator('[data-page=issues]').click();
   await developer.getByRole('button',{name:issueTitle,exact:true}).click();
   const current=await developer.evaluate(title=>A.state.issues.find(i=>i.title===title),issueTitle);
   if(current.retestHistory?.some(item=>item.status==='fail')){
    await developer.getByText('qa-evidence.png',{exact:true}).waitFor();
    await developer.getByText('Failed retest · Build v2.4.1',{exact:true}).waitFor();
    await developer.getByText('The task still disappears on the updated build.',{exact:true}).waitFor();
    assert.ok(current.evidenceId,'The original evidence stays attached after a failed retest');
    assert.equal(current.description,'The task is absent after saving. Updated after review.');
   }
   if(current.reviewNotes)await developer.getByText(current.reviewNotes,{exact:true}).waitFor();
   if(!openedEvidence){
    await developer.getByText('qa-evidence.png',{exact:true}).waitFor();
    const popupPromise=context.waitForEvent('page');
    await developer.getByRole('button',{name:'Open evidence',exact:true}).click();
    const popup=await popupPromise;
    await popup.locator('img').waitFor();
    await popup.waitForFunction(()=>document.querySelector('img')?.naturalWidth>0);
    await popup.close();openedEvidence=true;
   }
   await developer.getByRole('button',{name:'Apply a fix',exact:true}).click();
  }
  async function submitFix(build){
   await openFix();
   await developer.locator('#ws-fix-build').fill(build);
   await developer.locator('#ws-fix-notes').fill('Persist the task and restore its state before rendering the updated list.');
   await developer.getByRole('button',{name:'Analyze proposed fix'}).click();
   await developer.getByRole('button',{name:'Submit fix for retest'}).click();
   await tester.getByText(build,{exact:true}).waitFor({state:'attached'});
   await tester.locator('.uat-tester-header h2 + p').getByText(build,{exact:false}).count();
  }
  await focus('tester');await accept(tester,'Project 1');await openProject(tester);
  assert.equal(await tester.locator('#uat-test-queue-list [data-case-index]').count(),7);
  assert.deepEqual(await tester.evaluate(()=>UatWorkflow.casesForProject('p1').map(t=>t.id)),await tester.locator('#uat-test-queue-list [data-case-index]').evaluateAll(nodes=>nodes.map((n,i)=>'demo-p1-case-'+(i+1))));
  await tester.getByText('View code snippet',{exact:false}).click();
  await tester.locator('.uat-case-code code').getByText('function createTask',{exact:false}).waitFor();
  await tester.getByRole('button',{name:'Blocked',exact:true}).click();
  assert.equal(await tester.evaluate(()=>A.state.projects.find(p=>p.id==='p1').uat.cases[0].status),'blocked');
  assert.equal(await tester.evaluate(()=>UatWorkflow.canSend(A.state.projects.find(p=>p.id==='p1'))),false);
  await failCase('The task is absent after saving.',{evidence:true,edit:true});
  const id=await tester.evaluate(()=>A.state.issues.find(i=>i.uatCaseId==='demo-p1-case-1').id);
  await focus('developer');await accept(developer,'Project 1');
  await openFix();
  await developer.getByRole('button',{name:'Analyze proposed fix'}).click();
  assert.equal(await developer.locator('#ws-fix-form').count(),1);
  await developer.locator('#ws-fix-build').fill('v2.4.0');
  await developer.locator('#ws-fix-notes').fill('A valid change description.');
  await developer.getByRole('button',{name:'Analyze proposed fix'}).click();
  assert.match(await developer.locator('#ws-fix-build').evaluate(el=>el.validationMessage),/different/);
  await developer.locator('#ws-fix-build').fill('v2.4.1');
  await developer.locator('#ws-fix-notes').fill('   ');
  await developer.getByRole('button',{name:'Analyze proposed fix'}).click();
  assert.equal(await developer.locator('#ws-fix-form').count(),1,'Whitespace-only fix notes must stay on fix form');
  await developer.getByRole('button',{name:'Cancel',exact:true}).click();
  await submitFix('v2.4.1');
  await focus('tester');
  await tester.getByRole('button',{name:'Blocked',exact:true}).click();
  assert.equal(await tester.evaluate(id=>A.state.issues.find(i=>i.id===id).status,id),'Awaiting retest');
  await failCase('The task still disappears on the updated build.');
  assert.equal(await tester.evaluate(id=>A.state.issues.find(i=>i.id===id).status,id),'Reopened');
  assert.equal(await tester.evaluate(()=>A.state.issues.filter(i=>i.uatCaseId==='demo-p1-case-1').length),1);
  await submitFix('v2.4.2');
  await focus('tester');await tester.getByRole('button',{name:'Pass',exact:true}).click();
  assert.equal(await tester.evaluate(id=>A.state.issues.find(i=>i.id===id).status,id),'In review');
  assert.equal(await tester.evaluate(()=>UatWorkflow.canSend(A.state.projects.find(p=>p.id==='p1'))),false);
  await focus('manager');await manager.locator('[data-page=issues]').click();
  await manager.locator('tr').filter({hasText:issueTitle}).getByRole('button',{name:'Review',exact:true}).click();
  await manager.getByRole('button',{name:'Request changes',exact:true}).click();
  await manager.getByRole('button',{name:'Send revision request'}).click();
  assert.equal(await manager.locator('#ws-review-notes').count(),1);
  await manager.locator('#ws-review-notes').fill('Also preserve the task when navigating away and back.');
  await manager.getByRole('button',{name:'Send revision request'}).click();
  await tester.waitForFunction(id=>A.state.issues.find(i=>i.id===id).status==='In progress',id);
  await submitFix('v2.4.3');
  await focus('tester');await tester.getByRole('button',{name:'Pass',exact:true}).click();
  await focus('manager');await manager.locator('[data-page=issues]').click();
  await manager.locator('tr').filter({hasText:issueTitle}).getByRole('button',{name:'Review',exact:true}).click();
  await manager.getByRole('button',{name:'Approve fix',exact:true}).click();
  await developer.waitForFunction(id=>A.state.issues.find(i=>i.id===id).status==='Resolved',id);
  await manager.getByRole('button',{name:'Resolved',exact:false}).first().click();
  assert.equal(await manager.locator('tr').filter({hasText:issueTitle}).getByRole('button',{name:'Review',exact:true}).count(),0);
  await page.screenshot({path:path.join(RESULTS_DIR,'qa-retest-approved.png'),animations:'disabled'});
  assert.deepEqual(errors,[]);
  console.log('PASS: wrong/prefilled assignment keys; no active project/checklist before acceptance; project-scoped cases/code; Blocked gate; empty/whitespace failure validation; evidence and report editing; invalid/old-build/whitespace fix gate; failed retest reopens same bug; blocked retest retains issue; tester verification; manager revision cycle; third build retest; approval and no duplicate review.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
