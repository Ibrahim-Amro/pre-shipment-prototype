const assert = require('node:assert/strict');
const path = require('node:path');
const {launchBrowser, BASE_URL, RESULTS_DIR} = require('./support.cjs');

(async () => {
  const browser = await launchBrowser();
  try {
    const context = await browser.newContext({viewport:{width:1600,height:1050}});
    context.setDefaultTimeout(15000);
    const errors = [];
    context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    const page = await context.newPage();
    await page.goto(BASE_URL);
    await page.locator('.splash').waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Sign In',exact:true}).click();
    await page.getByRole('button',{name:'Sign in to workspace'}).click();
    await page.getByRole('button',{name:'Toggle four-panel workspace'}).click();
    await page.locator('#four-project').selectOption('p10');
    const frames = {};
    for (const role of ['manager','developer','tester']) {
      frames[role] = await page.locator(`iframe[data-role=${role}]`).elementHandle().then(node => node.contentFrame());
      await frames[role].waitForFunction(role => window.A?.state.role === role, role);
    }
    async function focus(role) {
      const current = page.locator('[data-focus-role][aria-pressed=true]');
      if (await current.count()) {
        if (await current.getAttribute('data-focus-role') === role) return;
        await current.click();
      }
      await page.locator(`[data-focus-role=${role}]`).click();
    }
    async function accept(frame) {
      const invitation = frame.getByRole('region',{name:'Pending project invitation'}).filter({hasText:'Project 10'});
      await invitation.getByRole('button',{name:'Accept assignment',exact:true}).click();
      await frame.getByRole('button',{name:'OK, accept project',exact:true}).click();
    }
    const {tester,developer,manager} = frames;
    await focus('manager');
    await manager.getByRole('button',{name:'Generate UAT scenarios ready for the tester',exact:true}).click();
    await manager.locator('input[name=title-0]').waitFor();
    await manager.getByRole('button',{name:'Approve project and start UAT testing',exact:true}).click();
    await focus('tester');
    await accept(tester);
    await tester.locator('#uat-active-heading').locator('..').getByRole('button',{name:/Project 10/}).click();
    const cases = tester.locator('#uat-test-queue-list [data-case-index]');
    assert.equal(await cases.count(),8);
    await tester.getByRole('button',{name:'Fail',exact:true}).click();
    assert.equal(await tester.locator('[data-quick-pass]').isDisabled(),true,'Do not pass while editing a failure report');
    await tester.getByLabel('What happened?').fill('The saved task disappears after reopening the planner.');
    await tester.getByRole('button',{name:'Generate bug report',exact:true}).click();
    await tester.getByRole('button',{name:'Send bug report',exact:true}).click();
    assert.equal(await tester.locator('[data-quick-pass]').count(),0,'A failed case cannot bypass development');
    const issueId = await tester.evaluate(() => A.state.issues.find(i => i.projectId==='p10'&&i.source==='UAT test case').id);
    await focus('developer');
    await accept(developer);
    await developer.locator('[data-page=issues]').click();
    await developer.getByRole('button',{name:'Create a task — UAT failure',exact:true}).click();
    await developer.getByRole('button',{name:'Apply a fix',exact:true}).click();
    await developer.locator('#ws-fix-build').fill('v1.0.1');
    await developer.locator('#ws-fix-notes').fill('Persist the saved task before rendering the planner.');
    await developer.getByRole('button',{name:'Analyze proposed fix',exact:true}).click();
    await developer.getByRole('button',{name:'Submit fix for retest',exact:true}).click();
    await tester.waitForFunction(id => A.state.issues.find(issue => issue.id===id)?.status==='Awaiting retest',issueId);
    await focus('tester');
    await tester.getByRole('button',{name:'Pass selected test case',exact:true}).click();
    await manager.waitForFunction(id => A.state.issues.find(issue => issue.id===id)?.status==='In review',issueId);
    assert.equal(await tester.evaluate(id => A.state.issues.find(issue => issue.id===id).verifiedBy,issueId),'t1');
    assert.ok(await manager.evaluate(() => A.visibleNotifications().some(note => note.title==='Tester verified a fix for approval')));
    assert.equal(await tester.getByRole('button',{name:'Test case passed',exact:true}).isDisabled(),true);
    await focus('manager');
    await manager.locator('[data-page=issues]').click();
    let row=manager.locator('tr').filter({hasText:issueId});
    await row.getByRole('button',{name:'Review',exact:true}).click();
    await manager.getByRole('button',{name:'Approve fix',exact:true}).click();
    await manager.getByRole('button',{name:/^Active issues/}).click();
    assert.equal(await manager.locator('tr').filter({hasText:issueId}).count(),0);
    await manager.getByRole('button',{name:/^Resolved/}).click();
    await manager.locator('tr').filter({hasText:issueId}).waitFor();
    assert.equal(await manager.locator('tr').filter({hasText:issueId}).count(),1);
    await manager.getByRole('button',{name:/^Active issues/}).click();
    assert.equal(await manager.locator('tr').filter({hasText:issueId}).count(),0);
    await focus('developer');
    await developer.locator('[data-page=dashboard]').click();
    await developer.locator('#uat-active-heading').locator('..').getByRole('button',{name:/Project 10/}).click();
    const metrics=developer.locator('.ws-project-detail-stats');
    const devMetric=metrics.locator(':scope > div').filter({hasText:'Your progress as a developer'});
    const testMetric=metrics.locator(':scope > div').filter({hasText:'Testing scenario progress'});
    await devMetric.getByText('100%',{exact:true}).waitFor();
    await devMetric.getByText('1 of 1 reported bugs submitted or resolved',{exact:true}).waitFor();
    await testMetric.getByText('13%',{exact:true}).waitFor();
    await testMetric.getByText('1 of 8 approved scenarios passed',{exact:true}).waitFor();
    assert.equal(await developer.locator('.ws-modal-issues .ws-table-title').count(),0);
    assert.equal(await developer.getByRole('button',{name:'Create a task — UAT failure',exact:true}).count(),0);
    await developer.locator('.ws-resolved-bugs summary').click();
    await developer.locator('.ws-resolved-bugs').getByRole('button',{name:'Create a task — UAT failure',exact:true}).waitFor();
    assert.equal(await developer.locator('.ws-modal-issues .ws-table-title').count(),0);
    await page.screenshot({path:path.join(RESULTS_DIR,'resolved-views-progress.png'),animations:'disabled'});
    assert.deepEqual(errors,[]);
    console.log('PASS: real fail/fix/quick-pass/review lifecycle; resolved bug absent from Active and present only in Resolved; project hides resolved bugs until disclosure; developer progress100% (1/1), testing progress13% (1/8).');
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode=1;});
