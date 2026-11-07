const assert=require('node:assert/strict');
const {launchBrowser,BASE_URL,RESULTS_DIR}=require('./support.cjs');
const path=require('node:path');
(async()=>{
 const browser=await launchBrowser({fixtures:false});
 try{
  const context=await browser.newContext({viewport:{width:1600,height:1050}});
  const page=await context.newPage();
  await page.goto(BASE_URL);
  await page.locator('.splash').waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Sign In',exact:true}).click();
  await page.getByRole('button',{name:'Sign in to workspace'}).click();
  await page.getByRole('button',{name:'New project',exact:true}).waitFor();
  assert.deepEqual(await page.locator('.uat-manager-tabs button').allTextContents().then(items=>items.map(item=>item.trim().replace(/\s+\d+$/,''))),['Ready projects','UAT Testing Stage','Customer Acceptance Stage']);
  await page.getByRole('button',{name:'New project',exact:true}).click();
  await page.getByRole('button',{name:'Add to Awaiting UAT'}).click();
  await page.getByRole('button',{name:'Generate UAT scenarios ready for the tester'}).click();
  assert.equal(await page.locator('input[name=testerIds]').count(),2);
  await page.getByRole('button',{name:'Approve project and start UAT testing'}).click();
  await page.locator('.profile-trigger').click();
  await page.getByRole('button',{name:'Tester workspace',exact:true}).click();
  await page.getByRole('button',{name:'Accept assignment',exact:true}).click();
  await page.getByRole('button',{name:'OK, accept project',exact:true}).click();
  await page.locator('#uat-active-heading').locator('..').getByRole('button',{name:/Project 1/}).click();
  assert.equal(await page.locator('#uat-team-popover').isVisible(),false);
  await page.getByRole('button',{name:'Project team',exact:true}).click();
  await page.getByRole('region',{name:'Project team members'}).waitFor();
  const bounds=await page.locator('#uat-team-popover').boundingBox();
  assert.ok(bounds.x>=0&&bounds.x+bounds.width<=1600);
  await page.getByRole('region',{name:'Project team members'}).getByText('Manager',{exact:true}).first().waitFor();
  await page.screenshot({path:path.join(RESULTS_DIR,'team-menu-visible.png'),animations:'disabled'});
  await page.getByRole('button',{name:'Project team',exact:true}).click();
  assert.equal(await page.locator('#uat-team-popover').isVisible(),false);
  assert.equal(await page.locator('#uat-test-queue-list [data-case-index]').count(),8);
  assert.ok(await page.locator('.uat-readable-data li').count()>=3);
  assert.equal(await page.locator('.uat-case-section h4').filter({hasText:'What to enter or prepare'}).count(),1);
  await page.screenshot({path:path.join(RESULTS_DIR,'tester-checklist.png'),animations:'disabled'});
  async function report(){
   await page.getByRole('button',{name:'Report an exploratory finding',exact:true}).click();
   for(const [field,value] of Object.entries({title:'Export loses the last task',steps:'Create two tasks and export',expected:'Both tasks exported',actual:'Only the first task is exported'}))await page.locator('#ws-report-'+field).fill(value);
   await page.locator('#ws-report-dev').selectOption('d1');
   await page.getByRole('button',{name:'Submit finding',exact:true}).click();
  }
  await report();
  await page.locator('#uat-active-heading').locator('..').getByRole('button',{name:/Project 1/}).click();
  await report();
  const duplicateId=await page.evaluate(()=>A.state.issues.find(issue=>issue.duplicateOf).id);
  assert.ok(await page.evaluate(()=>A.state.notifications.some(note=>note.employeeId==='d1'&&note.title==='Potential duplicate exploratory finding')));
  await page.locator('.profile-trigger').click();
  await page.getByRole('button',{name:'Developer workspace',exact:true}).click();
  await page.getByRole('button',{name:'Accept assignment',exact:true}).click();
  await page.getByRole('button',{name:'OK, accept project',exact:true}).click();
  await page.locator('[data-page=issues]').click();
  await page.locator('tr').filter({hasText:duplicateId}).getByRole('button',{name:'Export loses the last task',exact:true}).click();
  await page.getByRole('region',{name:'AI duplicate analysis'}).waitFor();
  // Controlled records verify matching across tester identities and report sources.
  const checks=await page.evaluate(()=>{
   const project=A.state.projects[0];
   const first={id:'first',projectId:project.id,title:'Saving task loses title',actual:'The entered title disappears after saving',reportedById:'t1',status:'Open'};
   A.state.issues.push(first);
   const second={id:'second',projectId:project.id,title:first.title,actual:first.actual,reportedById:'t2'};
   const exploratory={id:'third',projectId:project.id,title:first.title,description:first.actual,source:'Tester report'};
   const unrelated={id:'fourth',projectId:'another-project',title:first.title,actual:first.actual};
   return {second:UatWorkflow.tagDuplicate(second),exploratory:UatWorkflow.tagDuplicate(exploratory),unrelated:UatWorkflow.tagDuplicate(unrelated),summary:UatWorkflow.duplicateSummary(second)};
  });
  assert.equal(checks.second.duplicateOf,'first');
  assert.equal(checks.exploratory.duplicateOf,'first');
  assert.equal(checks.unrelated,null);
  assert.match(checks.summary,/AI duplicate analysis/);
  console.log('PASS: two testers, GUI team toggle and prominent checklist; same-project duplicate analysis across testers and report sources; unrelated projects excluded');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
