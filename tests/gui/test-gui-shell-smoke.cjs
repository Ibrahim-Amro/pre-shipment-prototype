const assert=require('node:assert/strict');
const path=require('node:path');
const {launchBrowser, BASE_URL, RESULTS_DIR} = require('./support.cjs');
(async()=>{
 const browser=await launchBrowser();
 const results=[];
 try{
  const context=await browser.newContext({viewport:{width:1600,height:1050}});
  context.setDefaultTimeout(10000);
  const errors=[];context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
  const page=await context.newPage();
  await page.goto(BASE_URL);await page.locator('.splash').waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Sign In',exact:true}).click();
  await page.getByLabel('Password',{exact:true}).fill('wrong');
  await page.getByRole('button',{name:'Show or hide password'}).click();
  assert.equal(await page.getByLabel('Password',{exact:true}).getAttribute('type'),'text');
  await page.getByRole('button',{name:'Sign in to workspace'}).click();
  await page.getByRole('alert').filter({hasText:'Check your username and password.'}).waitFor();
  assert.equal(await page.locator('.topbar').count(),0);
  await page.getByLabel('Password',{exact:true}).fill('admin');
  await page.getByRole('button',{name:'Sign in to workspace'}).click();await page.locator('.topbar').waitFor();
  results.push('Wrong credentials rejected; password toggle and valid login work');

  await page.getByLabel('Search projects and findings').fill('Project 2');
  await page.locator('#global-results').getByRole('button',{name:/^Project 2\b/}).click();
  await page.locator('.modal-content').getByRole('heading',{name:'Project 2',exact:true}).waitFor();
  await page.getByRole('button',{name:'Close project'}).click();
  await page.getByLabel('Search projects and findings').fill('ImpossibleProject999');
  await page.locator('#global-results').getByText(/No results/).waitFor();
  await page.getByLabel('Search projects and findings').fill('');
  assert.equal(await page.locator('#global-results').count(),0);
  results.push('Global search opens numbered project; missing query and clearing behave correctly');

  await page.locator('.topbar [title="Switch to dark theme"]').click();
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark');
  await page.locator('[data-page=settings]').click();
  await page.getByRole('button',{name:'Light theme',exact:true}).click();
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'light');
  await page.getByRole('button',{name:'Edit profile',exact:true}).click();
  await page.locator('#profile-name').fill('Olivia Bennett QA');
  await page.locator('#profile-title').fill('UAT Quality Manager');
  await page.getByRole('button',{name:'Save changes',exact:true}).click();
  assert.equal(await page.locator('.topbar .profile-trigger strong').innerText(),'Olivia Bennett QA');
  assert.equal(await page.evaluate(()=>A.state.employees.find(person=>person.id==='m1').title),'UAT Quality Manager');
  results.push('Header and settings theme controls work; profile edits update signed-in identity');

  await page.locator('[data-page=messages]').click();
  const before=await page.evaluate(()=>A.visibleNotifications().filter(n=>!n.read).length);
  assert.ok(before>0);
  await page.getByRole('button').filter({hasText:'Project 1 needs your attention'}).click();
  assert.equal(await page.evaluate(()=>A.visibleNotifications().filter(n=>!n.read).length),before-1);
  await page.locator('[data-page=messages]').click();
  await page.getByRole('button',{name:'Mark all as read',exact:true}).click();
  assert.equal(await page.evaluate(()=>A.visibleNotifications().filter(n=>!n.read).length),0);
  assert.equal(await page.locator('.topbar .notify-dot').count(),0);
  results.push('Inbox individual read and mark-all-read update messages and bell');

  async function switchRole(role){await page.locator('.topbar .profile-trigger').click();await page.locator('#profile-menu').getByRole('button',{name:role+' workspace',exact:true}).click();}
  await switchRole('Developer');
  assert.equal(await page.evaluate(()=>A.state.role),'developer');
  await switchRole('Tester');assert.equal(await page.evaluate(()=>A.state.role),'tester');
  const invitation=page.getByRole('region',{name:'Pending project invitation'}).filter({hasText:'Project 1'});
  await invitation.getByRole('button',{name:'Accept assignment',exact:true}).click();
  await page.getByRole('button',{name:'OK, accept project',exact:true}).click();
  results.push('Profile role switching opens independent staff identities; tester accepts its invitation');

  async function analysis(type,dev){
   await page.getByRole('button',{name:type==='code'?'Code analysis':'GUI test',exact:true}).click();
   await page.locator('#ws-analysis-project').selectOption('p1');
   await page.locator('.modal-content').getByRole('button',{name:type==='code'?'Start analysis':'Run GUI test',exact:true}).click();
   await page.getByRole('heading',{name:'A clearer view of your next steps.'}).waitFor();
   assert.equal(await page.locator('.ws-analysis-finding').count(),type==='code'?3:2);
   const title=await page.locator('.ws-analysis-finding').first().locator('h3').innerText();
   await page.locator('.ws-analysis-finding').first().getByRole('button',{name:'Send to dev'}).click();
   const choices=await page.locator('#ws-finding-dev option').evaluateAll(options=>options.map(o=>o.value));assert.deepEqual(choices,['d1','d2']);
   await page.locator('#ws-finding-dev').selectOption(dev);
   await page.locator('#ws-finding-note').fill('GUI smoke: confirmed sample finding for the selected release developer.');
   await page.getByRole('button',{name:'Send finding',exact:true}).click();
   await page.getByText('Sent to developer',{exact:true}).waitFor();
   const issue=await page.evaluate(title=>A.state.issues.find(issue=>issue.title===title),title);
   assert.equal(issue.assignee,dev);assert.equal(issue.projectId,'p1');assert.equal(issue.source,'AI '+(type==='code'?'code analysis':'GUI test'));
   const notice=await page.evaluate(title=>A.state.notifications.find(n=>n.title==='A new finding is assigned to you'&&n.body.includes(title)),title);
   assert.equal(notice.employeeId,dev);assert.equal(notice.role,'developer');
   await page.getByRole('button',{name:'Close results',exact:true}).click();
   return title;
  }
  await analysis('code','d2');const guiTitle=await analysis('gui','d1');
  results.push('Mock code and GUI analysis complete; each finding creates a project issue and exact developer notification');
  await switchRole('Developer');
  const developerInvite=page.getByRole('region',{name:'Pending project invitation'}).filter({hasText:'Project 1'});
  await developerInvite.getByRole('button',{name:'Accept assignment',exact:true}).click();
  await page.getByRole('button',{name:'OK, accept project',exact:true}).click();
  await page.locator('[data-page=issues]').click();await page.getByRole('button',{name:guiTitle,exact:true}).click();
  await page.getByRole('heading',{name:guiTitle,exact:true}).waitFor();
  await page.keyboard.press('Escape');
  await switchRole('Manager');
  assert.equal(await page.locator('.topbar .profile-trigger strong').innerText(),'Olivia Bennett QA');
  await page.locator('.topbar .profile-trigger').click();
  await page.locator('#profile-menu').getByRole('button',{name:'Sign out',exact:true}).click();
  await page.getByRole('button',{name:'Sign In',exact:true}).click();
  await page.getByRole('button',{name:'Sign in to workspace'}).click();
  await page.locator('.topbar').waitFor();
  assert.equal(await page.locator('.topbar .profile-trigger strong').innerText(),'Olivia Bennett QA');
  assert.ok(await page.evaluate(()=>A.state.notifications.filter(n=>['n1','n2','n3'].includes(n.id)).every(n=>n.read)));
  assert.ok(await page.evaluate(()=>A.visibleNotifications().some(n=>!n.read&&n.title==='Assignment accepted')));
  results.push('Developer opens assigned mock finding; manager profile and inbox state survive role changes/logout/re-entry');
  assert.equal(await page.getByRole('button',{name:'Export report',exact:true}).count(),0);
  results.push('CSV export is not exposed by the simplified navigation; no removed route was forced');
  await page.screenshot({path:path.join(RESULTS_DIR,'gui-shell-smoke.png'),animations:'disabled'});
  assert.deepEqual(errors,[]);console.log('PASS shared shell GUI:\n'+results.map(r=>' - '+r).join('\n'));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
