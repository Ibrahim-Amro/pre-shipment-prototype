const assert=require('node:assert/strict');
const {launchBrowser,BASE_URL}=require('./support.cjs');

(async()=>{
 const browser=await launchBrowser();
 try{
  const context=await browser.newContext({viewport:{width:1600,height:1050}});
  context.setDefaultTimeout(15000);
  const errors=[];
  context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
  const invitation=await context.newPage();
  await invitation.goto(BASE_URL+'?customer=1&project=p7');
  const popup=invitation.waitForEvent('popup');
  await invitation.getByRole('button',{name:'Open Project 7',exact:true}).click();
  const beta=await popup;
  await beta.getByRole('button',{name:'New task',exact:true}).waitFor();
  async function prepare(page,title){
   await page.getByRole('button',{name:'New task',exact:true}).click();
   await page.getByLabel('Task name',{exact:true}).fill(title);
   await page.getByRole('button',{name:'Save task',exact:true}).click();
   await page.getByLabel('Title',{exact:true}).fill(title+' note');
   await page.getByLabel('Details',{exact:true}).fill('Keep this draft when refreshing to home.');
  }
  await prepare(beta,'Normal refresh task');
  const sessionId=await beta.evaluate(()=>JSON.parse(sessionStorage.getItem('pre-shipment-beta-session')).id);
  await beta.evaluate(()=>sessionStorage.removeItem('pre-shipment-session-epoch'));
  await beta.reload();
  await beta.getByRole('heading',{name:'Open Your Beta Version',exact:true}).waitFor();
  assert.equal(await beta.locator('.planner-window').count(),0);
  const key=await beta.getByLabel('Beta access key',{exact:true}).inputValue();
  await beta.getByLabel('Beta access key',{exact:true}).fill('WRONG');
  await beta.getByRole('button',{name:'Open Project 7',exact:true}).click();
  await beta.getByText('That key does not match this beta invitation. Check the key and try again.',{exact:true}).waitFor();
  await beta.getByLabel('Beta access key',{exact:true}).fill(key);
  await beta.getByRole('button',{name:'Open Project 7',exact:true}).click();
  await beta.getByText('Normal refresh task',{exact:true}).waitFor();
  assert.equal(await beta.getByLabel('Title',{exact:true}).inputValue(),'Normal refresh task note');
  assert.equal(await beta.evaluate(()=>JSON.parse(sessionStorage.getItem('pre-shipment-beta-session')).id),sessionId);
  await beta.getByRole('button',{name:'Send Feedback & Finish',exact:true}).click();
  await beta.getByText('Your note was sent to the project manager.',{exact:true}).waitFor();
  await beta.reload();
  await beta.getByRole('heading',{name:'Open Your Beta Version',exact:true}).waitFor();
  await beta.getByRole('button',{name:'Open Project 7',exact:true}).click();
  await beta.getByText('Your note was sent to the project manager.',{exact:true}).waitFor();
  assert.equal(await beta.evaluate(()=>A.state.betaFeedback.filter(batch=>batch.projectId==='p7').length),1);

  const embedded=await context.newPage();
  await embedded.goto(BASE_URL+'?multiView=1&workspaceRole=customer&project=p7');
  await embedded.getByRole('button',{name:'Open Project 7',exact:true}).click();
  await embedded.getByRole('button',{name:'New task',exact:true}).waitFor();
  await prepare(embedded,'Embedded refresh task');
  const embeddedId=await embedded.evaluate(()=>JSON.parse(sessionStorage.getItem('pre-shipment-beta-panel-p7')).id);
  await embedded.reload();
  await embedded.getByRole('heading',{name:'Open Your Beta Version',exact:true}).waitFor();
  assert.equal(await embedded.locator('.planner-window').count(),0);
  const manager=await context.newPage();
  await manager.goto(BASE_URL);
  await manager.locator('.splash').waitFor({state:'hidden'});
  await manager.getByRole('button',{name:'Sign In',exact:true}).click();
  await manager.getByRole('button',{name:'Sign in to workspace'}).click();
  await manager.locator('[data-page=messages]').click();
  await manager.getByRole('button',{name:'Mark all as read',exact:true}).click();
  await embedded.waitForFunction(()=>A.state.notifications.find(note=>note.id==='n1')?.read===true);
  assert.equal(await embedded.locator('.planner-window').count(),0,'Storage sync must not reopen the beta after refresh');
  await embedded.getByRole('button',{name:'Open Project 7',exact:true}).click();
  await embedded.getByText('Embedded refresh task',{exact:true}).waitFor();
  assert.equal(await embedded.getByLabel('Title',{exact:true}).inputValue(),'Embedded refresh task note');
  assert.equal(await embedded.evaluate(()=>JSON.parse(sessionStorage.getItem('pre-shipment-beta-panel-p7')).id),embeddedId);
  await embedded.goto(embedded.url()+'&home=1');
  await embedded.getByRole('heading',{name:'Open Your Beta Version',exact:true}).waitFor();
  assert.equal(await embedded.locator('.planner-window').count(),0,'Restored four-panel navigation starts at home');
  await embedded.getByRole('button',{name:'Open Project 7',exact:true}).click();
  await embedded.getByText('Embedded refresh task',{exact:true}).waitFor();
  assert.equal(await embedded.evaluate(()=>JSON.parse(sessionStorage.getItem('pre-shipment-beta-panel-p7')).id),embeddedId);
  assert.deepEqual(errors,[]);
  console.log('PASS: normal and embedded beta refresh to entry home; tasks, notes and session IDs survive explicit Open; invalid keys stay blocked; storage sync does not reopen beta; finished reload does not duplicate feedback.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
