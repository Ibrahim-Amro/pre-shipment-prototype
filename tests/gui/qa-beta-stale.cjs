const assert=require('node:assert/strict');
const path=require('node:path');
const {launchBrowser, BASE_URL, RESULTS_DIR} = require('./support.cjs');
(async()=>{
 const browser=await launchBrowser();
 let page;
 try{
  const context=await browser.newContext({viewport:{width:1800,height:1100}});
  context.setDefaultTimeout(15000);
  const errors=[];
  context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  page=await context.newPage();
  await page.goto(BASE_URL);
  await page.locator('.splash').waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Sign In',exact:true}).click();
  await page.getByRole('button',{name:'Sign in to workspace'}).click();
  await page.getByRole('button',{name:'Toggle four-panel workspace'}).click();
  await page.locator('#four-project').selectOption('p10');
  const frames={};
  for(const role of ['manager','developer','tester','customer']){
   frames[role]=await page.locator(`iframe[data-role=${role}]`).elementHandle().then(el=>el.contentFrame());
   await frames[role].waitForFunction(role=>window.A?.state.role===role,role);
  }
  const {manager,developer,tester,customer}=frames;
  async function focus(role){
   const selected=page.locator('[data-focus-role][aria-pressed=true]');
   if(await selected.count()){
    if(await selected.getAttribute('data-focus-role')===role)return;
    await selected.click();
   }
   await page.locator(`[data-focus-role=${role}]`).click();
  }
  async function overview(frame){
   await frame.locator('[data-page=dashboard]').click();
   const back=frame.getByRole('button',{name:'Back to projects',exact:true});
   if(await back.count())await back.click();
  }
  async function accept(frame){
   const invitation=frame.getByRole('region',{name:'Pending project invitation'}).filter({hasText:'Project 10'});
   await invitation.getByRole('button',{name:'Accept assignment',exact:true}).click();
   await frame.getByRole('button',{name:'OK, accept project',exact:true}).click();
  }
  async function openTests(){
   await overview(tester);
   await tester.locator('#uat-active-heading').locator('..').getByRole('button',{name:/Project 10/}).click();
   await tester.locator('#uat-test-queue-list [data-case-index]').first().waitFor();
  }
  async function sendCustomer(){
   await focus('manager');
   await overview(manager);
   await manager.getByRole('button',{name:/^UAT Testing Stage/}).click();
   const finished=manager.locator('#uat-testing-finished').locator('..').locator('article').filter({hasText:'Project 10'});
   await finished.getByRole('button',{name:'Send to Customer Acceptance Stage',exact:true}).click();
   await manager.getByRole('heading',{name:'Customer acceptance email draft',exact:true}).waitFor();
  }
  await focus('manager');
  await manager.getByRole('button',{name:'Generate UAT scenarios ready for the tester',exact:true}).click();
  await manager.locator('input[name=title-0]').waitFor();
  await manager.getByRole('button',{name:'Approve project and start UAT testing',exact:true}).click();
  await manager.getByRole('heading',{name:/Active testing projects/}).waitFor();
  await focus('developer');await accept(developer);
  await focus('tester');await accept(tester);await openTests();
  const queue=tester.locator('#uat-test-queue-list [data-case-index]');
  assert.equal(await queue.count(),8);
  for(let index=0;index<8;index++){
   await queue.nth(index).click();
   await tester.getByRole('button',{name:'Pass',exact:true}).click();
  }
  await sendCustomer();
  const invitation=await context.newPage();
  await invitation.goto(await manager.getByLabel('Beta invitation link',{exact:true}).inputValue());
  assert.ok(await invitation.getByLabel('Beta access key',{exact:true}).inputValue());
  const popupEvent=invitation.waitForEvent('popup');
  await invitation.getByRole('button',{name:'Open Project 10',exact:true}).click();
  const beta=await popupEvent;
  await beta.getByRole('button',{name:'New task',exact:true}).waitFor();
  await beta.getByLabel('Title',{exact:true}).fill('Retained regression note');
  await beta.getByLabel('Details',{exact:true}).fill('Do not lose these notes while the project returns to UAT.');
  console.log('PASS: real GUI project prepared, accepted, all eight cases passed, Finished UAT and normal customer beta opened');
  await focus('tester');
  await tester.getByRole('button',{name:'Report an exploratory finding',exact:true}).click();
  await tester.locator('#ws-report-title').fill('Post-acceptance regression');
  await tester.locator('#ws-report-project').selectOption('p10');
  await tester.locator('#ws-report-steps').fill('1. Open a saved task\n2. Change its priority\n3. Reopen the task');
  await tester.locator('#ws-report-expected').fill('The updated priority remains saved.');
  await tester.locator('#ws-report-actual').fill('Priority returns to the previous value.');
  await tester.locator('#ws-report-dev').selectOption('d1');
  await tester.getByRole('button',{name:'Submit finding',exact:true}).click();
  await customer.locator('#beta-embedded-waiting').waitFor({state:'attached'});
  await beta.getByRole('button',{name:'Send Feedback & Finish',exact:true}).click();
  await beta.getByText('Customer acceptance is paused while this project returns to UAT. Your notes are saved in this session. Try again after the manager reopens customer acceptance.',{exact:true}).waitFor();
  assert.equal(await beta.getByLabel('Title',{exact:true}).inputValue(),'Retained regression note');
  await manager.waitForFunction(()=>A.visibleNotifications().some(note=>note.title==='Customer acceptance paused'));
  assert.equal(await manager.evaluate(()=>A.state.projects.find(project=>project.id==='p10').uat.stage),'testing');
  assert.equal(await manager.evaluate(()=>new Set(A.state.notifications.map(note=>note.id)).size),await manager.evaluate(()=>A.state.notifications.length));
  console.log('PASS: customer acceptance pauses immediately when a new finding is reported, before development submits a fix');
  await focus('developer');
  await developer.locator('[data-page=issues]').click();
  await developer.getByRole('button',{name:'Post-acceptance regression',exact:true}).click();
  await developer.getByRole('button',{name:'Apply a fix',exact:true}).click();
  await developer.locator('#ws-fix-build').fill('v1.0.1');
  await developer.locator('#ws-fix-notes').fill('Save updated priority before closing the task form.');
  await developer.getByRole('button',{name:'Analyze proposed fix',exact:true}).click();
  await developer.getByRole('button',{name:'Submit fix for retest',exact:true}).click();
  await customer.locator('#beta-embedded-waiting').waitFor({state:'attached'});
  await beta.getByRole('button',{name:'Send Feedback & Finish',exact:true}).click();
  await beta.getByText('Customer acceptance is paused while this project returns to UAT. Your notes are saved in this session. Try again after the manager reopens customer acceptance.',{exact:true}).waitFor();
  assert.equal(await beta.getByLabel('Title',{exact:true}).inputValue(),'Retained regression note');
  assert.equal(await manager.evaluate(()=>(A.state.betaFeedback||[]).filter(batch=>batch.projectId==='p10').length),0);
  await beta.screenshot({path:path.join(RESULTS_DIR,'qa-beta-paused.png'),animations:'disabled'});
  console.log('PASS: exploratory regression reopens UAT; embedded customer waits and stale popup submission blocks without losing notes');
  await focus('tester');
  await openTests();
  await tester.locator('#uat-test-queue-list [data-case-index]').filter({hasText:'Retest · Post-acceptance regression'}).click();
  await tester.getByRole('button',{name:'Pass',exact:true}).click();
  await focus('manager');
  await manager.getByRole('button',{name:'Close dialog',exact:true}).click();
  await manager.locator('[data-page=issues]').click();
  const review=manager.locator('tr').filter({has:manager.getByRole('button',{name:'Post-acceptance regression',exact:true})});
  await review.getByRole('button',{name:'Review',exact:true}).click();
  await manager.getByRole('button',{name:'Approve fix',exact:true}).click();
  await sendCustomer();
  await focus('customer');
  if(await customer.getByRole('button',{name:'Open Project 10',exact:true}).count())await customer.getByRole('button',{name:'Open Project 10',exact:true}).click();
  await customer.getByRole('button',{name:'New task',exact:true}).waitFor();
  await beta.getByRole('button',{name:'Send Feedback & Finish',exact:true}).click();
  await beta.getByText('Your note was sent to the project manager.',{exact:true}).waitFor();
  await beta.reload();
  await beta.getByRole('heading',{name:'Open Your Beta Version',exact:true}).waitFor();
  await beta.getByRole('button',{name:'Open Project 10',exact:true}).click();
  await beta.getByText('Your note was sent to the project manager.',{exact:true}).waitFor();
  await manager.waitForFunction(()=>A.state.betaFeedback.some(batch=>batch.projectId==='p10'));
  assert.equal(await manager.evaluate(()=>A.state.betaFeedback.filter(batch=>batch.projectId==='p10').length),1);
  assert.equal(await manager.evaluate(()=>A.state.betaFeedback.find(batch=>batch.projectId==='p10').notes[0].title),'Retained regression note');
  assert.deepEqual(errors,[]);
  console.log('PASS: retest + manager approval + new customer invitation allows retry with retained note exactly once, including after reload; no browser errors');
 }catch(error){if(page)await page.screenshot({path:path.join(RESULTS_DIR,'qa-beta-stale-failure.png'),animations:'disabled'}).catch(()=>{});throw error;}
 finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
