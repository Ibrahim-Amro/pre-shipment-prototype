const assert = require('node:assert/strict');
const path = require('node:path');
const {launchBrowser, BASE_URL, RESULTS_DIR} = require('./support.cjs');

(async () => {
  const browser = await launchBrowser({fixtures:false});
  try {
    const context = await browser.newContext({viewport:{width:2555,height:1244}});
    context.setDefaultTimeout(15000);
    const errors = [];
    context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    const page = await context.newPage();
    await page.goto(BASE_URL);
    await page.locator('.splash').waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Sign In',exact:true}).click();
    await page.getByRole('button',{name:'Sign in to workspace'}).click();
    await page.locator('.topbar').getByRole('button',{name:'Load demo data',exact:true}).click();
    await page.getByRole('dialog').getByRole('button',{name:'Load demo data',exact:true}).click();
    await page.waitForFunction(() => window.A?.state.demoMode && A.state.projects.length === 10);
    await page.getByRole('button',{name:'Toggle four-panel workspace'}).click();
    // A whole-workspace refresh returns all roles to their project lists.
    await page.reload();
    const frames = {};
    for (const role of ['manager','developer','tester','customer']) {
      frames[role] = await page.locator(`iframe[data-role=${role}]`).elementHandle().then(node => node.contentFrame());
      await frames[role].waitForFunction(role => window.A?.state.role === role, role);
    }
    const {manager,developer,tester} = frames;
    const names = frame => frame.locator('#uat-active-heading').locator('..').locator('.uat-project-info > strong').allTextContents();
    const managerNames = () => manager.locator('#uat-testing-active').locator('..').locator('.uat-manager-project-title').allTextContents();
    assert.deepEqual(await names(developer), ['Project 1','Project 7','Project 3','Project 5'], 'Developer fixes appear before projects waiting on another role');
    assert.deepEqual(await names(tester), ['Project 1','Project 2','Project 7','Project 3','Project 4','Project 5'], 'Urgent and high-priority testing comes before completed scenarios');
    assert.deepEqual(await managerNames(), ['Project 1','Project 2','Project 7','Project 3','Project 8'], 'Manager active projects use urgency, with numeric ties');
    assert.deepEqual(await manager.locator('#uat-testing-finished').locator('..').locator('.uat-manager-project-title').allTextContents(), ['Project 4']);

    async function typography(frame) {
      return frame.locator('.uat-project-row').first().evaluate(card => Object.fromEntries([
        ['title','.uat-project-info > strong'],['mark','.uat-project-mark'],
        ['description','.uat-project-description'],['status','.uat-project-current-status']
      ].map(([key,selector]) => [key,card.querySelector(selector) ? getComputedStyle(card.querySelector(selector)).fontSize : null])));
    }
    for (const [role,frame] of [['developer',developer],['tester',tester]]) {
      const fonts = await typography(frame);
      assert.equal(fonts.title, '22px', role+' project heading stays prominent');
      assert.equal(fonts.mark, '22px', role+' number keeps the heading scale');
      assert.equal(fonts.description, '14px', role+' description uses the shared body size');
      if (role === 'developer') assert.equal(fonts.status, '14px', 'Developer handoff text uses the shared body size');
    }
    assert.equal(await manager.locator('.uat-manager-project-main p').first().evaluate(node => getComputedStyle(node).fontSize), '14px');
    await page.screenshot({path:path.join(RESULTS_DIR,'project-order-2555x1244.png'),animations:'disabled'});

    // The other tester's retest stays above projects whose scenarios have passed.
    await page.locator('[data-person-role=tester]').selectOption('t2');
    const tester2 = await page.locator('iframe[data-role=tester]').elementHandle().then(node => node.contentFrame());
    await tester2.waitForFunction(() => window.A?.state.user.id === 't2');
    const secondOrder = await names(tester2);
    for (const waiting of ['Project 3','Project 4','Project 5']) {
      assert.ok(secondOrder.indexOf('Project 2') < secondOrder.indexOf(waiting), 'A retest appears before '+waiting);
    }

    // Submitting a real seeded fix removes that project's developer urgency and
    // returns it to the waiting group without changing numeric tie ordering.
    await page.locator('[data-focus-role=developer]').click();
    await developer.locator('[data-page=issues]').click();
    await developer.getByRole('button',{name:'Editing priority cuts off the customer handover note',exact:true}).click();
    await developer.getByRole('button',{name:'Apply a fix',exact:true}).click();
    await developer.locator('#ws-fix-build').fill('v1.4.1');
    await developer.locator('#ws-fix-notes').fill('Keep the full saved note when changing priority. Checked that all three paragraphs remain after saving.');
    await developer.getByRole('button',{name:'Analyze proposed fix',exact:true}).click();
    await developer.getByRole('button',{name:'Submit fix for retest',exact:true}).click();
    await developer.locator('[data-page=dashboard]').click();
    const waitingCard = developer.locator('.uat-project-row').filter({hasText:'Project 7'});
    await waitingCard.getByText('Waiting for retest',{exact:true}).waitFor();
    assert.equal(await waitingCard.getAttribute('data-project-priority'),'low');
    assert.deepEqual(await names(developer), ['Project 1','Project 3','Project 5','Project 7']);
    await page.locator('[data-focus-role=developer]').click();
    await page.setViewportSize({width:1600,height:1050});
    assert.equal((await typography(developer)).description,'14px');
    assert.equal((await typography(tester2)).description,'14px');
    await page.screenshot({path:path.join(RESULTS_DIR,'project-order-1600x1050.png'),animations:'disabled'});
    assert.deepEqual(errors,[]);
    console.log('PASS: active project cards sort by role urgency with numeric ties, finished UAT remains separate, both testers see retests before passed work, shared card text stays14px, and submitted fixes move out of the developer action group.');
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error);process.exitCode=1;});
