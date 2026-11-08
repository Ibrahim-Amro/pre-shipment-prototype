const assert=require('node:assert/strict');
const path=require('node:path');
const {launchBrowser,BASE_URL,RESULTS_DIR}=require('./support.cjs');

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
  await page.getByRole('button',{name:'Sign In',exact:true}).click();
  await page.getByRole('button',{name:'Sign in to workspace'}).click();
  await page.getByRole('button',{name:/Customer Acceptance Stage/}).click();
  await page.locator('.uat-manager-project').filter({hasText:'Project 7'}).getByRole('button',{name:'Open invitation draft',exact:true}).click();
  assert.equal(await page.getByLabel('To',{exact:true}).inputValue(),'customer@example.com');
  assert.equal(await page.getByRole('button',{name:'Copy draft',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Open invitation',exact:true}).count(),0);
  const draft=page.getByLabel('Email draft',{exact:true});
  assert.ok(await draft.evaluate(node=>node.scrollHeight<=node.clientHeight+2),'email uses outer scroll, not a clipped textarea');
  const composer=await page.locator('.beta-email-composer').boundingBox();
  assert.ok(composer.height>=950,'composer fills the pane vertically');
  const invitation=await page.getByLabel('Beta invitation link',{exact:true}).inputValue();
  await page.getByRole('button',{name:'Send email',exact:true}).click();
  assert.ok(await page.evaluate(()=>A.state.projects.find(project=>project.id==='p7').customerEmail.sentAt));
  await page.screenshot({path:path.join(RESULTS_DIR,'email-composer.png'),animations:'disabled'});
  await page.getByRole('button',{name:'Back',exact:true}).click();
  assert.equal(await page.locator('.beta-email-composer').count(),0);

  // The same key-entry flow works independently from the removed preview shortcut.
  const entry=await context.newPage();
  await entry.goto(invitation);
  assert.ok(await entry.getByLabel('Beta access key',{exact:true}).inputValue());
  const popupEvent=entry.waitForEvent('popup');
  await entry.getByRole('button',{name:'Open Project 7',exact:true}).click();
  const beta=await popupEvent;
  await beta.getByRole('button',{name:'New task',exact:true}).waitFor();
  await beta.close();

  await page.getByRole('button',{name:'Toggle staff workspace'}).click();
  await page.locator('#four-project').selectOption('p7');
  await page.locator('.beta-overlay-toggle').click();
    const customer=await page.locator('iframe[data-role=customer]').elementHandle().then(element=>element.contentFrame());
  await customer.getByRole('button',{name:'Open Project 7',exact:true}).click();
  await customer.getByRole('button',{name:'New task',exact:true}).click();
  await customer.getByRole('dialog',{name:'New task',exact:true}).waitFor();
  // Wait for the existing dialog entrance animation before checking actual bounds.
  await customer.locator('.planner-task-dialog').evaluate(node=>Promise.all(node.getAnimations().map(animation=>animation.finished)));
  const bounds=await customer.evaluate(()=>{
   const dialog=document.querySelector('.planner-task-dialog').getBoundingClientRect();
   const planner=document.querySelector('.planner-window').getBoundingClientRect();
   const save=[...document.querySelectorAll('#planner-task-form button')].find(button=>button.textContent.trim()==='Save task').getBoundingClientRect();
   return {dialog:{left:dialog.left,right:dialog.right,top:dialog.top,bottom:dialog.bottom},planner:{left:planner.left,right:planner.right,top:planner.top,bottom:planner.bottom},save:{top:save.top,bottom:save.bottom},width:innerWidth,height:innerHeight};
  });
  assert.ok(bounds.dialog.left>=Math.max(0,bounds.planner.left)&&bounds.dialog.right<=Math.min(bounds.width,bounds.planner.right));
  assert.ok(bounds.dialog.top>=Math.max(0,bounds.planner.top)&&bounds.dialog.bottom<=Math.min(bounds.height,bounds.planner.bottom));
  assert.ok(bounds.save.bottom<=bounds.height&&bounds.save.top>=bounds.dialog.top,'Save stays visible inside the quarter');
  await customer.getByLabel('Task name',{exact:true}).fill('Bounded beta task');
  await customer.getByRole('button',{name:'Save task',exact:true}).click();
  await customer.getByText('Bounded beta task',{exact:true}).waitFor();
  await customer.getByRole('button',{name:'Edit Bounded beta task',exact:true}).click();
  await customer.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.screenshot({path:path.join(RESULTS_DIR,'quarter-beta-task.png'),animations:'disabled'});
  assert.deepEqual(errors,[]);
  console.log('PASS: ready example email, Send email and Back, removed preview/copy controls, full-pane readable email; normal key launch; quarter-sized task editor with visible Save and working create/edit/cancel');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
