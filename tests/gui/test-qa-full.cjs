const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {launchBrowser, BASE_URL, RESULTS_DIR} = require('./support.cjs');
const steps = [];
const output = RESULTS_DIR;
const record = label => {steps.push(label); console.log('PASS:', label);};

(async () => {
 const browser = await launchBrowser();
 let page;
 try {
  const context = await browser.newContext({viewport:{width:1800,height:1100}});
  context.setDefaultTimeout(15000);
  const errors = [];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  page = await context.newPage();
  await page.goto(BASE_URL);
  await page.locator('.splash').waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Sign In',exact:true}).click();
  await page.getByRole('button',{name:'Sign in to workspace'}).click();
  await page.getByRole('button',{name:'Toggle four-panel workspace'}).click();
  await page.locator('#four-project').selectOption('p10');
  const frames = {};
  for(const role of ['manager','developer','tester','customer']) {
   frames[role] = await page.locator(`iframe[data-role=${role}]`).elementHandle().then(el => el.contentFrame());
   await frames[role].waitForFunction(role => window.A?.state.role === role, role);
  }
  const {manager, developer, tester, customer} = frames;
  async function focus(role) {
   const selected = page.locator('[data-focus-role][aria-pressed=true]');
   if(await selected.count()) {
    if(await selected.getAttribute('data-focus-role') === role) return;
    await selected.click();
   }
   await page.locator(`[data-focus-role=${role}]`).click();
  }
  async function overview(frame) {
   await frame.locator('[data-page=dashboard]').click();
   const back = frame.getByRole('button',{name:'Back to projects',exact:true});
   if(await back.count()) await back.click();
  }
  async function accept(frame) {
   const section = frame.getByRole('region',{name:'Pending project invitation'}).filter({hasText:'Project 10'});
   await section.getByRole('button',{name:'Accept assignment',exact:true}).click();
   assert.ok(await frame.locator('#ws-assignment-key').inputValue());
   await frame.getByRole('button',{name:'OK, accept project',exact:true}).click();
  }
  async function openTests() {
   await overview(tester);
   await tester.locator('#uat-active-heading').locator('..').getByRole('button',{name:/Project 10/}).click();
   await tester.locator('#uat-test-queue-list [data-case-index]').first().waitFor();
  }
  async function managerStage() {
   await focus('manager');
   await overview(manager);
   await manager.getByRole('button',{name:/^UAT Testing Stage/}).click();
  }
  async function submitFix(title, build) {
   await focus('developer');
   await developer.locator('[data-page=issues]').click();
   await developer.getByRole('button',{name:title,exact:true}).click();
   await developer.getByRole('button',{name:'Apply a fix',exact:true}).click();
   await developer.locator('#ws-fix-build').fill(build);
   await developer.locator('#ws-fix-notes').fill('Persist the corrected state before rendering and preserve entered user data.');
   await developer.getByRole('button',{name:'Analyze proposed fix',exact:true}).click();
   await developer.getByRole('button',{name:'Submit fix for retest',exact:true}).click();
  }
  async function approve(title) {
   await focus('manager');
   await manager.locator('[data-page=issues]').click();
   const row = manager.locator('tr').filter({has:manager.getByRole('button',{name:title,exact:true})});
   await row.getByRole('button',{name:'Review',exact:true}).click();
   await manager.getByRole('button',{name:'Approve fix',exact:true}).click();
  }
  await focus('manager');
  await manager.getByRole('button',{name:'Generate UAT scenarios ready for the tester',exact:true}).click();
  await manager.locator('input[name=title-0]').waitFor();
  await manager.getByRole('button',{name:'Approve project and start UAT testing',exact:true}).click();
  await manager.getByRole('heading',{name:/Active testing projects/}).waitFor();
  const initial = manager.locator('#uat-testing-active').locator('..').locator('article').filter({hasText:'Project 10'});
  await initial.waitFor();
  assert.equal(await initial.getByRole('button',{name:'Send to Customer Acceptance Stage'}).count(),0);
  record('Manager generates, reviews and approves the UAT plan; standard customer handoff is blocked while UAT is unfinished');
  await customer.locator('#beta-embedded-waiting').waitFor({state:'attached'});
  await focus('tester');
  assert.equal(await tester.locator('#uat-active-heading').locator('..').getByRole('button',{name:/Project 10/}).count(),0);
  await accept(tester);
  await openTests();
  const originalCount = await tester.locator('#uat-test-queue-list [data-case-index]').count();
  assert.equal(originalCount,8);
  await tester.getByText('View code snippet',{exact:false}).click();
  await tester.locator('.uat-case-code code').waitFor();
  await tester.getByRole('button',{name:'Fail',exact:true}).click();
  await tester.getByLabel('What happened?').fill('A new task is lost after saving and reopening.');
  await tester.locator('#uat-failure input[type=file]').setInputFiles({name:'uat-failure.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN6kAAAAASUVORK5CYII=','base64')});
  await tester.getByRole('button',{name:'Generate bug report',exact:true}).click();
  await tester.getByRole('button',{name:'Send bug report',exact:true}).click();
  const bugTitle = 'Create a task — UAT failure';
  await developer.waitForFunction(() => A.visibleNotifications().some(note => note.title === 'UAT bug reported'));
  assert.equal(await manager.evaluate(() => A.visibleNotifications().some(note => note.title === 'UAT bug reported')),false);
  record('Project acceptance, scoped checklist, code snippet, failure evidence and exact developer notification');
  await focus('developer');
  await accept(developer);
  await submitFix(bugTitle,'v1.0.1');
  await tester.getByText('v1.0.1',{exact:true}).waitFor({state:'attached'});
  await focus('tester');
  await tester.getByRole('button',{name:'Pass',exact:true}).click();
  const queue = tester.locator('#uat-test-queue-list [data-case-index]');
  for(let index=1; index<originalCount; index++) {
   await queue.nth(index).click();
   await tester.getByRole('button',{name:'Pass',exact:true}).click();
  }
  await managerStage();
  assert.equal(await manager.locator('#uat-testing-finished').locator('..').getByRole('button',{name:'Project 10',exact:true}).count(),0);
  record('All original tests pass after developer fix; project stays active until manager approval');
  await focus('tester');
  await tester.getByRole('button',{name:'Report an exploratory finding',exact:true}).click();
  await tester.locator('#ws-report-title').fill('Exploratory export loses an item');
  await tester.locator('#ws-report-project').selectOption('p10');
  await tester.locator('#ws-report-steps').fill('1. Create two tasks\n2. Export the list\n3. Compare the result');
  await tester.locator('#ws-report-expected').fill('Both tasks appear in the export.');
  await tester.locator('#ws-report-actual').fill('Only one task appears.');
  await tester.locator('#ws-report-dev').selectOption('d1');
  await tester.getByRole('button',{name:'Submit finding',exact:true}).click();
  await approve(bugTitle);
  await managerStage();
  const wronglyFinished = await manager.locator('#uat-testing-finished').locator('..').getByRole('button',{name:'Project 10',exact:true}).count();
  await page.screenshot({path:path.join(output,'qa-unresolved-finding-gate.png'),animations:'disabled'});
  assert.equal(wronglyFinished,0,'An unresolved exploratory finding must prevent Finished UAT and customer invitation');
  record('An open exploratory finding blocks Finished UAT after all original cases and linked fix are approved');
  await submitFix('Exploratory export loses an item','v1.0.2');
  await focus('tester');
  await openTests();
  const retest = tester.locator('#uat-test-queue-list [data-case-index]').filter({hasText:'Retest · Exploratory export loses an item'});
  await retest.click();
  await tester.locator('#uat-test-detail').getByText('v1.0.2',{exact:true}).waitFor();
  await tester.getByRole('button',{name:'Pass',exact:true}).click();
  await managerStage();
  assert.equal(await manager.locator('#uat-testing-finished').locator('..').getByRole('button',{name:'Project 10',exact:true}).count(),0);
  await approve('Exploratory export loses an item');
  await managerStage();
  const finished = manager.locator('#uat-testing-finished').locator('..').locator('article').filter({hasText:'Project 10'});
  await finished.getByRole('button',{name:'Send to Customer Acceptance Stage'}).waitFor();
  assert.equal(await manager.locator('#uat-testing-active').locator('..').getByRole('button',{name:'Project 10',exact:true}).count(),0);
  assert.equal(await manager.evaluate(() => A.state.issues.filter(issue => issue.projectId === 'p10' && issue.status !== 'Resolved').length),0);
  assert.equal(await manager.evaluate(() => A.state.projects.find(project => project.id === 'p10').version),'v1.0.2');
  await manager.goto(manager.url());
  await manager.getByRole('button',{name:'Back to projects',exact:true}).click();
  await finished.getByRole('button',{name:'Send to Customer Acceptance Stage'}).waitFor();
  await page.screenshot({path:path.join(output,'qa-finished-uat.png'),animations:'disabled'});
  record('Exploratory bug retest and manager approval move the project into Finished UAT, including after reload');
  await finished.getByRole('button',{name:'Send to Customer Acceptance Stage'}).click();
  await manager.getByRole('heading',{name:'Customer acceptance email draft'}).waitFor();
  const key = await manager.getByLabel('Beta access key',{exact:true}).inputValue();
  const link = await manager.getByLabel('Beta invitation link',{exact:true}).inputValue();
  const draft = await manager.getByLabel('Email draft',{exact:true}).inputValue();
  assert.match(key,/^BETA-/); assert.ok(draft.includes(key) && draft.includes(link) && draft.includes('Project 10'));
  await manager.getByLabel('To',{exact:true}).fill('customer@example.test');
  await manager.getByRole('button',{name:'Send email',exact:true}).click();
  assert.ok(await manager.evaluate(() => A.state.projects.find(project => project.id==='p10').customerEmail.sentAt));
  await customer.getByRole('button',{name:'Open Project 10',exact:true,includeHidden:true}).waitFor({state:'attached'});
  await page.screenshot({path:path.join(output,'qa-customer-invitation.png'),animations:'disabled'});
  record('Finished project moves to Customer Acceptance with a project-specific credential key and editable email draft');
  await focus('customer');
  await customer.getByRole('button',{name:'Open Project 10',exact:true}).click();
  await customer.getByRole('button',{name:'New task',exact:true}).waitFor();
  await customer.locator('.planner-statusbar').getByText('Beta v1.0.2',{exact:true}).waitFor();
  await customer.getByRole('button',{name:'New task',exact:true}).click();
  await customer.getByLabel('Task name',{exact:true}).fill('Customer acceptance workflow verified');
  await customer.getByRole('button',{name:'Save task',exact:true}).click();
  await customer.getByText('Customer acceptance workflow verified',{exact:true}).waitFor();
  await customer.getByLabel('Title',{exact:true}).fill('Acceptance session result');
  await customer.getByLabel('Details',{exact:true}).fill('The release workflow, invitation and interactive beta were verified.');
  await customer.getByRole('button',{name:'Send Feedback & Finish',exact:true}).click();
  await manager.waitForFunction(() => A.visibleNotifications().some(note => note.betaFeedbackId));
  assert.equal(await developer.evaluate(() => A.visibleNotifications().some(note => note.betaFeedbackId)),false);
  assert.equal(await tester.evaluate(() => A.visibleNotifications().some(note => note.betaFeedbackId)),false);
  await focus('manager');
  const closeDraft = manager.getByRole('button',{name:'Close dialog',exact:true});
  if(await closeDraft.count()) await closeDraft.click();
  await manager.locator('[data-page=feedback]').click();
  const session = manager.locator('details').filter({hasText:'Project 10'});
  await session.locator('summary').click();
  await manager.getByText('Acceptance session result',{exact:true}).waitFor();
  record('Customer can use the beta and return session feedback to the correct manager');
  assert.deepEqual(errors,[]);
  record('No browser JavaScript errors during the complete four-role lifecycle');
  fs.writeFileSync(path.join(output,'qa-full-result.json'),JSON.stringify({passed:true,steps,errors,when:new Date().toISOString()},null,2));
 } catch(error) {
  if(page) await page.screenshot({path:path.join(output,'qa-full-failure.png'),animations:'disabled'}).catch(()=>{});
  fs.writeFileSync(path.join(output,'qa-full-result.json'),JSON.stringify({passed:false,steps,error:error.message,when:new Date().toISOString()},null,2));
  throw error;
 } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode=1;});
