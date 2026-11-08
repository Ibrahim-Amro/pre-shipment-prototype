const assert=require('node:assert/strict');
const path=require('node:path');
const {launchBrowser,BASE_URL,RESULTS_DIR}=require('./support.cjs');
(async()=>{
 const browser=await launchBrowser();
 try{
  const context=await browser.newContext({viewport:{width:1800,height:1100}});
  context.setDefaultTimeout(15000);
  const page=await context.newPage();const errors=[];
  context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  await page.goto(BASE_URL);await page.locator('.splash').waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Sign In',exact:true}).click();
  await page.getByRole('button',{name:'Sign in to workspace'}).click();
  await page.getByRole('button',{name:'Toggle staff workspace'}).click();
  await page.locator('#four-project').selectOption('p10');
  const frames={};for(const role of ['manager','developer','tester']){
   frames[role]=await page.locator(`iframe[data-role=${role}]`).elementHandle().then(el=>el.contentFrame());
   await frames[role].waitForFunction(role=>window.A?.state.role===role,role);
  }
  const {manager,developer,tester}=frames;
  async function focus(role){const selected=page.locator('[data-focus-role][aria-pressed=true]');if(await selected.count()){if(await selected.getAttribute('data-focus-role')===role)return;await selected.click();}await page.locator(`[data-focus-role=${role}]`).click();}
  async function accept(frame){await frame.getByRole('region',{name:'Pending project invitation'}).filter({hasText:'Project 10'}).getByRole('button',{name:'Accept assignment',exact:true}).click();await frame.getByRole('button',{name:'OK, accept project',exact:true}).click();}
  await focus('manager');
  await manager.getByRole('button',{name:'Generate UAT scenarios ready for the tester'}).click();
  await manager.getByRole('button',{name:'Approve project and start UAT testing'}).click();
  await focus('developer');await accept(developer);
  const card=developer.locator('.uat-project-row').filter({hasText:'Project 10'});
  await card.getByText('Waiting for testers to identify bugs',{exact:true}).waitFor();
  assert.equal(await card.getAttribute('data-project-priority'),'low');
  await focus('tester');await accept(tester);
  await tester.locator('#uat-active-heading').locator('..').getByRole('button',{name:/Project 10/}).click();
  await tester.getByRole('button',{name:'Fail',exact:true}).click();
  await tester.getByLabel('What happened?').fill('Saving the task loses its title.');
  await tester.getByRole('button',{name:'Generate bug report'}).click();
  await tester.getByRole('button',{name:'Send bug report'}).click();
  await focus('developer');await developer.locator('[data-page=dashboard]').click();
  await card.getByText('1 bug has been reported',{exact:true}).waitFor();
  assert.equal(await card.getAttribute('data-project-priority'),'high');
  await card.getByText('1 bug is waiting to be fixed',{exact:true}).waitFor();
  await developer.locator('[data-page=issues]').click();
  await developer.getByRole('button',{name:'Create a task — UAT failure',exact:true}).click();
  await developer.getByRole('button',{name:'Apply a fix',exact:true}).click();
  await developer.locator('#ws-fix-build').fill('v1.0.1');
  await developer.locator('#ws-fix-notes').fill('Preserve the title before storing the task.');
  await developer.getByRole('button',{name:'Analyze proposed fix'}).click();
  await developer.getByRole('button',{name:'Submit fix for retest'}).click();
  await developer.locator('[data-page=dashboard]').click();
  await card.getByText('Waiting for retest',{exact:true}).waitFor();
  assert.equal(await card.getAttribute('data-project-priority'),'low');
  assert.equal(await card.getByRole('progressbar',{name:'Developer progress'}).getAttribute('aria-valuenow'),'100');
  await card.getByText('Testing: 0 of 8 passed (0%)',{exact:true}).waitFor();
  const fonts=await card.evaluate(el=>['.uat-project-mark','.uat-project-info > strong','.uat-project-description'].map(selector=>getComputedStyle(el.querySelector(selector)).fontSize));
  assert.deepEqual(fonts,['22px','22px','14px']);
  await page.screenshot({path:path.join(RESULTS_DIR,'developer-waiting-retest.png'),animations:'disabled'});
  await focus('tester');await tester.getByRole('button',{name:'Pass',exact:true}).click();
  await focus('developer');
  await card.getByText('Waiting for manager approval',{exact:true}).waitFor();
  await card.getByText('Testing: 1 of 8 passed (13%)',{exact:true}).waitFor();
  assert.equal(await card.getAttribute('data-project-priority'),'low');
  assert.deepEqual(errors,[]);
  console.log('PASS: developer waits neutrally before bugs and after fix submission; actionable bug has high priority; submitted progress100%, real scenario progress0->13%; pending manager approval; project title/mark22px with14px supporting copy; correct bug-reported caption.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
