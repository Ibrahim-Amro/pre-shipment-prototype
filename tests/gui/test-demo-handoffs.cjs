const assert = require('node:assert/strict');
const path = require('node:path');
const {launchBrowser, BASE_URL, RESULTS_DIR} = require('./support.cjs');

(async () => {
  const browser = await launchBrowser({fixtures:false});
  let page;
  try {
    const context = await browser.newContext({viewport:{width:1800,height:1100}});
    context.setDefaultTimeout(15000);
    const errors = [];
    context.on('page', target => target.on('pageerror', error => errors.push(error.message)));
    page = await context.newPage();
    await page.goto(BASE_URL);
    await page.locator('.splash').waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Sign In',exact:true}).click();
    await page.getByRole('button',{name:'Sign in to workspace'}).click();
    await page.locator('.topbar').getByRole('button',{name:'Load demo data',exact:true}).click();
    await page.getByRole('dialog').getByRole('button',{name:'Load demo data',exact:true}).click();
    await page.waitForFunction(() => window.A?.state.demoMode && A.state.projects.length === 10);
    await page.getByRole('button',{name:'Toggle staff workspace'}).click();
    await page.locator('#four-project').selectOption('p2');
    await page.locator('[data-person-role=tester]').selectOption('t2');
    const frames = {};
    for (const role of ['manager','developer','tester','customer']) {
      frames[role] = await page.locator(`iframe[data-role=${role}]`).elementHandle().then(element => element.contentFrame());
      await frames[role].waitForFunction(role => window.A?.state.role === role, role);
    }
    const {manager,developer,tester,customer} = frames;
    async function focus(role) {
    if(await page.locator('.beta-overlay-close').isVisible())await page.locator('.beta-overlay-close').click();
      const selected = page.locator('[data-focus-role][aria-pressed=true]');
      if (await selected.count()) {
        if (await selected.getAttribute('data-focus-role') === role) return;
        await selected.click();
      }
      await page.locator(`[data-focus-role=${role}]`).click();
    }
    await tester.waitForFunction(() => window.A?.state.user.id === 't2');
    await focus('tester');
    await tester.locator('#uat-test-queue-list').getByRole('button',{name:/Filter High priority tasks in both views/}).click();
    await tester.locator('#uat-test-detail').getByText('v2.1.1',{exact:true}).waitFor();
    assert.equal(await tester.evaluate(() => A.state.issues.find(bug => bug.id === 'BUG-2403').status), 'Awaiting retest');
    await tester.getByRole('button',{name:'Pass',exact:true}).click();
    await manager.waitForFunction(() => A.state.issues.find(bug => bug.id === 'BUG-2403')?.status === 'In review');
    assert.equal(await manager.evaluate(() => UatWorkflow.canSend(A.state.projects.find(project => project.id === 'p2'))), false);
    const verification = await manager.evaluate(() => {
      const bug=A.state.issues.find(item => item.id === 'BUG-2403');
      return {tester:bug.verifiedBy,build:bug.fix.buildVersion,notice:A.visibleNotifications().some(note => note.title === 'Tester verified a fix for approval' && note.employeeId === 'm1')};
    });
    assert.deepEqual(verification,{tester:'t2',build:'v2.1.1',notice:true});
    await focus('manager');
    await manager.locator('[data-page=issues]').click();
    const reviewRow = manager.locator('tr').filter({has:manager.getByRole('button',{name:'Board view ignores the High priority filter',exact:true})});
    await reviewRow.getByRole('button',{name:'Review',exact:true}).click();
    await manager.getByRole('button',{name:'Approve fix',exact:true}).click();
    await tester.waitForFunction(() => A.state.issues.find(bug => bug.id === 'BUG-2403')?.status === 'Resolved');
    assert.equal(await manager.evaluate(() => UatWorkflow.canSend(A.state.projects.find(project => project.id === 'p2'))), false, 'One unrun persistence scenario still prevents finished UAT');
    assert.equal(await developer.evaluate(() => A.state.user.id), 'd2');
    await developer.waitForFunction(() => A.visibleNotifications().some(note => note.title === 'Verified fix approved' && note.employeeId === 'd2'));
    await focus('tester');
    await tester.locator('#uat-test-queue-list').getByRole('button',{name:/Keep saved task details after reopening/}).click();
    await tester.getByRole('button',{name:'Pass',exact:true}).click();
    await manager.waitForFunction(() => UatWorkflow.canSend(A.state.projects.find(project => project.id === 'p2')));
    assert.equal(await manager.evaluate(() => UatWorkflow.insights(A.state.projects.find(project => project.id === 'p2')).testingPercent), 100);
    console.log('PASS: seeded submitted fix returns to the correct second tester, manager approval resolves it, and only completing the final scenario finishes UAT');

    // A second release was already finished when the demo was loaded. Send it
    // through the invitation and customer workflow without inventing more passes.
    // Staff remain on Project 2 while the manager invites a customer to Project 4.
    await manager.waitForFunction(() => A.state.role === 'manager' && A.state.projects.some(project => project.id === 'p4'));
    await focus('manager');
    await manager.locator('[data-page=dashboard]').click();
    const back = manager.getByRole('button',{name:'Back to projects',exact:true});
    if(await back.isVisible())await back.click();
    const finished = manager.locator('#uat-testing-finished').locator('..').locator('article').filter({hasText:'Project 4'});
    await finished.getByRole('button',{name:'Send to Customer Acceptance Stage',exact:true}).waitFor();
    assert.equal(await manager.evaluate(() => ProjectPriority.of(A.state.projects.find(project => project.id === 'p4')).label), 'UAT complete');
    await finished.getByRole('button',{name:'Send to Customer Acceptance Stage',exact:true}).click();
    await manager.getByRole('heading',{name:'Customer acceptance email draft',exact:true}).waitFor();
    const key = await manager.getByLabel('Beta access key',{exact:true}).inputValue();
    const invitation = await manager.getByLabel('Email draft',{exact:true}).inputValue();
    assert.match(key,/^BETA-/);
    assert.ok(invitation.includes('Project 4') && invitation.includes(key));
    assert.ok(await manager.getByLabel('To',{exact:true}).inputValue());
    await manager.getByRole('button',{name:'Send email',exact:true}).click();
    assert.equal(await page.locator('#four-project').inputValue(),'p2');
    await page.locator('.beta-overlay-toggle').click();
    await customer.getByRole('button',{name:'Open Project 4',exact:true}).waitFor();
    assert.equal(await customer.getByLabel('Beta access key',{exact:true}).inputValue(), key);
    await customer.getByRole('button',{name:'Open Project 4',exact:true}).click();
    await customer.getByRole('button',{name:'New task',exact:true}).waitFor();
    await customer.getByRole('button',{name:'New task',exact:true}).click();
    await customer.getByLabel('Task name',{exact:true}).fill('Call Morgan when the brake pads arrive');
    await customer.getByRole('button',{name:'Save task',exact:true}).click();
    await customer.getByText('Call Morgan when the brake pads arrive',{exact:true}).waitFor();
    await customer.getByLabel('Title',{exact:true}).fill('The workshop team can use this build');
    await customer.getByLabel('Details',{exact:true}).fill('I added a parts follow-up and found it again after switching views. The list is clear enough for our morning handover. We can start with this version.');
    await customer.getByRole('button',{name:'Send Feedback & Finish',exact:true}).click();
    await customer.getByText('Your note was sent to the project manager.',{exact:true}).waitFor();
    await manager.waitForFunction(() => A.state.betaFeedback.some(batch => batch.projectId === 'p4' && batch.notes.some(note => note.title === 'The workshop team can use this build')));
    const delivery = await manager.evaluate(() => {
      const batch=A.state.betaFeedback.find(batch => batch.projectId === 'p4' && batch.notes.some(note => note.title === 'The workshop team can use this build'));
      return {id:batch.id,managerId:batch.managerId,notices:A.state.notifications.filter(note => note.betaFeedbackId === batch.id).map(note => ({employeeId:note.employeeId,role:note.role}))};
    });
    assert.equal(delivery.managerId,'m1');
    assert.deepEqual(delivery.notices,[{employeeId:'m1',role:'manager'}]);
    await focus('manager');
    const closeDraft=manager.getByRole('button',{name:'Close dialog',exact:true});
    if (await closeDraft.count()) await closeDraft.click();
    await manager.locator('[data-page=feedback]').click();
    const batchCard=manager.locator('details.ws-beta-session').filter({hasText:'Project 4'});
    await batchCard.locator('summary').click();
    await manager.getByText('The workshop team can use this build',{exact:true}).waitFor();
    await batchCard.getByRole('button',{name:'Review customer feedback',exact:true}).click();
    await manager.getByLabel('Feedback status',{exact:true}).selectOption('Ignored');
    await manager.getByLabel('Customer acceptance result',{exact:true}).selectOption('Passed');
    await manager.getByRole('button',{name:'Save review',exact:true}).click();
    assert.equal(await manager.evaluate(id => A.state.betaFeedback.find(batch => batch.id === id).acceptance,delivery.id),'Passed');
    await page.screenshot({path:path.join(RESULTS_DIR,'demo-customer-handoff.png'),animations:'disabled'});
    console.log('PASS: seeded finished UAT sends a keyed invitation, customer uses the beta and sends notes only to the manager, and customer acceptance can be recorded');
    assert.deepEqual(errors,[]);
  } catch (error) {
    if (page) await page.screenshot({path:path.join(RESULTS_DIR,'demo-handoffs-failure.png'),animations:'disabled'}).catch(() => {});
    throw error;
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error);process.exitCode=1;});
