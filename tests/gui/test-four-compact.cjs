const assert=require('node:assert/strict');
const {launchBrowser,BASE_URL}=require('./support.cjs');
(async()=>{
 const browser=await launchBrowser();
 try{
  const page=await (await browser.newContext({viewport:{width:1600,height:900}})).newPage();
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.goto(BASE_URL);
  await page.locator('.splash').waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Toggle staff workspace'}).click();
  const panels=page.locator('.four-panel:visible');
  for(const width of [1280,1600,2560]){
   await page.setViewportSize({width,height:900});
   assert.equal(await panels.count(),3);
   const rects=await panels.evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().toJSON()));
   assert.ok(rects.every(rect=>rect.y===rects[0].y&&rect.height>800&&Math.abs(rect.width-width/3)<8));
   assert.ok(rects[1].x>=rects[0].right&&rects[2].x>=rects[1].right);
  }
  await page.setViewportSize({width:1280,height:900});
  await page.locator('#four-project').selectOption('p7');
  await page.locator('.beta-overlay-toggle').click();
  const beta=page.frameLocator('iframe[data-role=customer]');
  await beta.getByRole('button',{name:'Open Project 7',exact:true}).click();
  await beta.getByRole('button',{name:'New task',exact:true}).waitFor();
  await beta.getByLabel('Title',{exact:true}).fill('Retain this draft');
  const panel=page.locator('#customer-beta-overlay');
  const before=await panel.boundingBox(),h=await panel.locator('header').first().boundingBox();
  await page.mouse.move(h.x+90,h.y+15);await page.mouse.down();await page.mouse.move(h.x+160,h.y+55);await page.mouse.up();
  const after=await panel.boundingBox();
  assert.ok(after.x-before.x>=65&&after.y-before.y>=35,'Overlay follows pointer');
  await page.getByRole('button',{name:'Close customer beta'}).click();
  assert.equal(await panels.count(),3);
  await page.locator('.beta-overlay-toggle').click();
  assert.equal(await beta.getByLabel('Title',{exact:true}).inputValue(),'Retain this draft');
  assert.equal((await panel.boundingBox()).x,after.x);
  assert.deepEqual(errors,[]);
  console.log('PASS: three equal columns, drag and close, reopened position and retained customer feedback.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
