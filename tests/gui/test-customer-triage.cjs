const assert=require('node:assert/strict');
const path=require('node:path');
const {launchBrowser,BASE_URL,RESULTS_DIR}=require('./support.cjs');

(async()=>{
 const browser=await launchBrowser();
 let page;
 try{
  const context=await browser.newContext({viewport:{width:1800,height:1100}});
  context.setDefaultTimeout(15000);
  const errors=[];context.on('page',p=>p.on('pageerror',error=>errors.push(error.message)));
  page=await context.newPage();
  await page.goto(BASE_URL);await page.locator('.splash').waitFor({state:'hidden'});
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
   if(await selected.count()){if(await selected.getAttribute('data-focus-role')===role)return;await selected.click();}
   await page.locator(`[data-focus-role=${role}]`).click();
  }
  async function accept(frame){
   await frame.getByRole('region',{name:'Pending project invitation'}).filter({hasText:'Project 10'}).getByRole('button',{name:'Accept assignment',exact:true}).click();
   await frame.getByRole('button',{name:'OK, accept project',exact:true}).click();
  }
  async function customerStage(){
   await focus('manager');await manager.locator('[data-page=dashboard]').click();
   await manager.getByRole('button',{name:/^Customer Acceptance Stage/}).click();
  }
  const card=()=>manager.locator('.uat-manager-project').filter({has:manager.getByRole('button',{name:'Project 10',exact:true})});
  await focus('manager');
  await manager.getByRole('button',{name:'Generate UAT scenarios ready for the tester'}).click();
  await manager.getByRole('button',{name:'Approve project and start UAT testing'}).click();
  await card().getByRole('button',{name:'Review progress',exact:true}).waitFor();
  await card().getByRole('button',{name:'Share early beta',exact:true}).click();
  await manager.getByRole('heading',{name:'Share beta before UAT is finished?',exact:true}).waitFor();
  await manager.locator('.modal-content').getByRole('button',{name:'Share early beta',exact:true}).click();
  assert.equal(await manager.evaluate(()=>Boolean(A.state.projects.find(p=>p.id==='p10').uat.earlyBeta?.enabled)),false);
  await manager.locator('#uat-early-beta-ack').check();
  await manager.locator('.modal-content').getByRole('button',{name:'Share early beta',exact:true}).click();
  await manager.getByRole('heading',{name:'Customer acceptance email draft',exact:true}).waitFor();
  assert.equal(await manager.getByLabel('To',{exact:true}).inputValue(),'customer@example.com');
  assert.match(await manager.getByLabel('Email draft',{exact:true}).inputValue(),/WARNING: internal UAT is not finished/);
  assert.equal(await manager.getByRole('button',{name:'Copy draft',exact:true}).count(),0);
  assert.equal(await manager.getByRole('button',{name:'Open invitation',exact:true}).count(),0);
  await manager.getByRole('button',{name:'Send email',exact:true}).click();
  assert.ok(await manager.evaluate(()=>A.state.projects.find(p=>p.id==='p10').customerEmail.sentAt));
  assert.equal(await manager.evaluate(()=>A.state.projects.find(p=>p.id==='p10').uat.stage),'testing');
  await manager.getByRole('button',{name:'Back',exact:true}).click();
  console.log('PASS: early beta requires acknowledgement; default email and honest unfinished-UAT warning; simplified composer sends and returns without completing UAT');

  // Early customer access must not disable internal UAT execution.
  await focus('tester');await accept(tester);
  await tester.locator('#uat-active-heading').locator('..').getByRole('button',{name:/Project 10/}).click();
  await tester.getByRole('button',{name:'Pass',exact:true}).click();
  assert.equal(await tester.evaluate(()=>A.state.projects.find(p=>p.id==='p10').uat.cases.filter(test=>test.status==='pass').length),1);
  await focus('customer');
  await customer.getByRole('button',{name:'Open Project 10',exact:true}).click();
  await customer.getByRole('button',{name:'New task',exact:true}).waitFor();
  await customer.getByLabel('Note type',{exact:true}).selectOption('Bug');
  await customer.getByLabel('Title',{exact:true}).fill('Customer priority changes are not saved');
  await customer.getByLabel('Details',{exact:true}).fill('Change a task priority, save it, then reopen the task. The previous priority returns.');
  await customer.getByRole('button',{name:'Send Feedback & Finish',exact:true}).click();
  await customer.getByText('Your note was sent to the project manager.',{exact:true}).waitFor();
  await manager.waitForFunction(()=>A.visibleNotifications().some(note=>note.betaFeedbackId));
  await customerStage();
  await card().getByText(/Needs action/).waitFor();
  await card().getByText(/Customer acceptance: Not reviewed/).waitFor();
  await card().getByText('Customer priority changes are not saved',{exact:false}).waitFor();
  await card().getByRole('button',{name:'Review customer feedback',exact:true}).click();
  await manager.getByRole('heading',{name:'Customer acceptance feedback',exact:true}).waitFor();
  await manager.getByLabel('Feedback status',{exact:true}).selectOption('Needs review');
  await manager.getByLabel('Customer acceptance result',{exact:true}).selectOption('Failed');
  await manager.getByRole('button',{name:'Save review',exact:true}).click();
  await card().getByText(/Customer acceptance: Failed/).waitFor();
  await card().getByRole('button',{name:'Review customer feedback',exact:true}).click();
  await manager.getByLabel('Feedback status',{exact:true}).selectOption('Ignored');
  await manager.getByLabel('Customer acceptance result',{exact:true}).selectOption('Passed');
  await manager.getByRole('button',{name:'Save review',exact:true}).click();
  await card().getByText(/No action needed/).waitFor();
  await card().getByRole('button',{name:'Review customer feedback',exact:true}).click();
  await manager.getByLabel('Feedback status',{exact:true}).selectOption('Needs review');
  await manager.getByLabel('Customer acceptance result',{exact:true}).selectOption('Failed');
  await manager.getByRole('button',{name:'Save review',exact:true}).click();
  await card().getByRole('button',{name:'Review customer feedback',exact:true}).click();
  await manager.getByRole('button',{name:'Send to developers',exact:true}).click();
  await manager.getByLabel('Assign developer',{exact:true}).selectOption('d1');
  await manager.getByRole('button',{name:'Send selected notes',exact:true}).click();
  await card().getByText(/Under treatment by Devs/).waitFor();
  assert.equal(await manager.evaluate(()=>A.state.issues.filter(finding=>finding.source==='Customer beta'&&finding.projectId==='p10').length),1);
  assert.equal(await manager.evaluate(()=>A.state.betaFeedback.find(batch=>batch.projectId==='p10').acceptance),'Failed');
  await developer.waitForFunction(()=>A.visibleNotifications().some(note=>note.title==='Customer feedback assigned to you'&&note.employeeId==='d1'));
  assert.equal(await tester.evaluate(()=>A.visibleNotifications().some(note=>note.title==='Customer feedback assigned to you')),false);
  console.log('PASS: early customer can report a bug while UAT continues; glance shows needs action, failed acceptance and developer-treatment status; forwarding creates one correctly routed finding');

  // Forwarding the same note again must remain impossible through the UI.
  await card().getByRole('button',{name:'Review customer feedback',exact:true}).click();
  await manager.getByRole('button',{name:'Send to developers',exact:true}).click();
  assert.equal(await manager.locator('[data-beta-note]:disabled').count(),1);
  await manager.getByRole('button',{name:'Send selected notes',exact:true}).click();
  assert.equal(await manager.evaluate(()=>A.state.issues.filter(finding=>finding.source==='Customer beta'&&finding.projectId==='p10').length),1);
  await manager.getByRole('button',{name:'Back',exact:true}).click();
  await manager.getByRole('button',{name:'Back',exact:true}).click();
  await focus('developer');await accept(developer);
  await developer.locator('[data-page=issues]').click();
  await developer.getByRole('button',{name:'Customer priority changes are not saved',exact:true}).click();
  await developer.getByRole('button',{name:'Apply a fix',exact:true}).waitFor();
  await focus('manager');
  await card().getByRole('button',{name:'Review customer feedback',exact:true}).click();
  await manager.getByLabel('Feedback status',{exact:true}).selectOption('Ignored');
  await manager.getByLabel('Customer acceptance result',{exact:true}).selectOption('Passed');
  await manager.getByRole('button',{name:'Save review',exact:true}).click();
  await card().getByText(/Needs action/).waitFor();
  assert.equal(await manager.evaluate(()=>A.state.issues.filter(finding=>finding.source==='Customer beta'&&finding.status!=='Resolved').length),1);
  await card().getByText(/Customer acceptance: Passed/).waitFor();
  await card().getByText(/Ignored/).waitFor();
  await page.screenshot({path:path.join(RESULTS_DIR,'customer-triage-glance.png'),animations:'disabled'});
  assert.deepEqual(errors,[]);
  console.log('PASS: duplicate forwarding blocked; assigned developer can open actionable bug; manager can mark feedback ignored/passed and glance keeps unresolved linked development work actionable; no browser errors');
 }catch(error){if(page)await page.screenshot({path:path.join(RESULTS_DIR,'customer-triage-failure.png'),animations:'disabled'}).catch(()=>{});throw error;}
 finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
