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
    await page.getByRole('button',{name:'Toggle staff workspace'}).click();
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
      const invitation = frame.getByRole('region',{name:'Pending project invitation'}).filter({hasText:'Project 1'});
      await invitation.getByRole('button',{name:'Accept assignment',exact:true}).click();
      await frame.getByRole('button',{name:'OK, accept project',exact:true}).click();
    }
    const {tester,developer,manager} = frames;
    await focus('tester');
    await accept(tester);
    await tester.locator('#uat-active-heading').locator('..').getByRole('button',{name:/Project 1/}).click();
    const cases = tester.locator('#uat-test-queue-list [data-case-index]');
    assert.equal(await cases.count(),7);
    assert.equal(await tester.locator('[data-quick-pass]').count(),1);
    await cases.nth(1).click();
    assert.equal(await tester.locator('[data-quick-pass]').count(),1);
    const row = cases.nth(1).locator('..');
    assert.equal(await row.locator('[data-quick-pass]').count(),1);
    await tester.getByRole('button',{name:'Pass selected test case',exact:true}).click();
    assert.equal(await tester.evaluate(() => A.state.projects.find(p => p.id==='p1').uat.cases[1].status),'pass');
    assert.equal(await tester.getByRole('button',{name:'Test case passed',exact:true}).isDisabled(),true);
    await cases.first().click();
    await tester.getByRole('button',{name:'Fail',exact:true}).click();
    assert.equal(await tester.locator('[data-quick-pass]').isDisabled(),true,'Do not pass while editing a failure report');
    await tester.getByLabel('What happened?').fill('The saved task disappears after reopening the planner.');
    await tester.getByRole('button',{name:'Generate bug report',exact:true}).click();
    await tester.getByRole('button',{name:'Send bug report',exact:true}).click();
    assert.equal(await tester.locator('[data-quick-pass]').count(),0,'A failed case cannot bypass development');
    const issueId = await tester.evaluate(() => A.state.issues.find(i => i.uatCaseId==='demo-p1-case-1').id);
    await focus('developer');
    await accept(developer);
    await developer.locator('[data-page=issues]').click();
    await developer.getByRole('button',{name:'Create a new task — UAT failure',exact:true}).click();
    await developer.getByRole('button',{name:'Apply a fix',exact:true}).click();
    await developer.locator('#ws-fix-build').fill('v2.4.1');
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
    await page.screenshot({path:path.join(RESULTS_DIR,'quick-pass-retest.png'),animations:'disabled'});
    assert.deepEqual(errors,[]);
    console.log('PASS: selected-case green check, pass persistence, disabled passed state, no bypass of failure, and quick-pass retest preserves manager verification handoff.');
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode=1;});
