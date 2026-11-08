const assert = require('node:assert/strict');
const path = require('node:path');
const {launchBrowser, BASE_URL, RESULTS_DIR} = require('./support.cjs');

(async () => {
  const browser = await launchBrowser({fixtures:false});
  try {
    const context = await browser.newContext({viewport:{width:1600,height:1050}});
    context.setDefaultTimeout(15000);
    const errors = [];
    context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    const page = await context.newPage();
    await page.goto(BASE_URL);
    await page.locator('.splash').waitFor({state:'hidden'});
    async function signIn(target) {
      await target.getByRole('button',{name:'Sign In',exact:true}).click();
      await target.getByRole('button',{name:'Sign in to workspace'}).click();
      await target.getByRole('button',{name:'New project',exact:true}).waitFor();
    }
    await signIn(page);
    assert.equal(await page.evaluate(() => A.state.projects.length), 0);
    await page.locator('.topbar [title="Switch to dark theme"]').click();
    const toggle = page.locator('.topbar').getByRole('button',{name:'Load demo data',exact:true});
    assert.equal(await toggle.count(), 1);
    assert.ok(await toggle.evaluate(node => {
      const siblings = [...node.parentElement.children];
      const index = siblings.indexOf(node);
      return siblings.slice(Math.max(0,index-2), index+3).some(other => /theme/.test(other.title || other.getAttribute('aria-label') || ''));
    }), 'Demo toggle is next to the theme/reset controls');

    await toggle.click();
    await page.getByRole('dialog').getByRole('button',{name:/Cancel|Keep working/}).click();
    assert.equal(await page.evaluate(() => A.state.projects.length), 0, 'Cancelling keeps the empty workspace');
    await toggle.click();
    await page.getByRole('dialog').getByRole('button',{name:'Load demo data',exact:true}).click();
    await page.waitForFunction(() => window.A?.state.demoMode === true && A.state.projects.length === 10);
    await page.getByRole('button',{name:'New project',exact:true}).waitFor();
    assert.equal(await page.evaluate(() => A.state.page), 'dashboard');
    assert.equal(await page.evaluate(() => A.state.user.id), 'm1');
    assert.equal(await page.evaluate(() => localStorage.getItem('pre-shipment-theme')), 'dark');
    assert.equal(await page.locator('.topbar').getByRole('button',{name:'Clear demo data',exact:true}).count(), 1);

    const audit = await page.evaluate(() => {
      const s = A.state;
      const problems = [];
      const employee = id => s.employees.find(person => person.id === id);
      const byId = id => s.projects.find(project => project.id === id);
      for (const project of s.projects) {
        const tests = (project.uat?.cases || []).filter(test => test.status !== 'draft');
        const insight = UatWorkflow.insights(project);
        const passed = tests.filter(test => test.status === 'pass').length;
        if (insight.testingPercent !== (tests.length ? Math.round(100*passed/tests.length) : 0)) problems.push(project.name+' has an inaccurate scenario percentage');
        if (!project.description || project.description.length < 35) problems.push(project.name+' lacks a useful description');
        if (project.uat?.stage === 'customer' && project.status !== 'Completed' && ProjectPriority.of(project).key === 'completed') problems.push(project.name+' is marked completed before customer acceptance');
        if (UatWorkflow.canSend(project) && ProjectPriority.of(project).label !== 'UAT complete') problems.push(project.name+' has no finished-UAT status');
        for (const test of tests) {
          if (employee(test.assigneeId)?.role !== 'tester' || !project.team.includes(test.assigneeId)) problems.push(test.id+' has no assigned project tester');
          if (!test.steps?.length || !test.testData || !test.expected) problems.push(test.id+' is missing test instructions');
          if (!test.bugId) continue;
          const bug = s.issues.find(issue => issue.id === test.bugId);
          if (!bug || bug.projectId !== project.id || bug.uatCaseId !== test.id) problems.push(test.id+' has a broken bug link');
          if (bug && ['Open','In progress','Reopened'].includes(bug.status) && test.status !== 'fail') problems.push(test.id+' has an actionable bug without a failed result');
          if (bug?.status === 'Awaiting retest' && (test.status !== 'retest' || !bug.fix?.buildVersion || test.buildVersion !== bug.fix.buildVersion)) problems.push(test.id+' is not ready for a valid retest');
          if (bug && ['In review','Resolved'].includes(bug.status) && test.status !== 'pass') problems.push(test.id+' has an approved or reviewable bug without a passed result');
        }
      }
      for (const bug of s.issues) {
        if (employee(bug.assignee)?.role !== 'developer' || !byId(bug.projectId)?.team.includes(bug.assignee)) problems.push(bug.id+' has no project developer');
        if (!bug.description || !bug.steps || !bug.expected || !bug.actual) problems.push(bug.id+' lacks reproducible details');
        if (bug.duplicateOf && !s.issues.some(original => original.id === bug.duplicateOf && original.projectId === bug.projectId)) problems.push(bug.id+' has a broken duplicate link');
      }
      for (const notice of s.notifications) {
        if (!notice.employeeId || employee(notice.employeeId)?.role !== notice.role) problems.push(notice.id+' has no specific recipient');
      }
      return {
        problems,
        names:s.projects.map(project => project.name).sort((a,b) => Number(a.split(' ')[1])-Number(b.split(' ')[1])),
        testers:s.employees.filter(person => person.role === 'tester').length,
        stages:[...new Set(s.projects.map(UatWorkflow.stage))],
        statuses:[...new Set(s.issues.map(bug => bug.status))],
        finished:s.projects.filter(UatWorkflow.canSend).map(project => project.name),
        feedback:s.betaFeedback.length,
        duplicate:s.issues.some(bug => bug.duplicateOf && bug.duplicateAnalysis),
        pending:s.assignments.some(assignment => !assignment.accepted),
        accepted:s.assignments.some(assignment => assignment.accepted),
        revision:s.dataRevision, clean:s.cleanWorkspace
      };
    });
    assert.deepEqual(audit.problems, []);
    assert.deepEqual(audit.names, Array.from({length:10}, (_,i) => 'Project '+(i+1)));
    assert.equal(audit.testers, 2);
    for (const stage of ['awaiting','testing','customer']) assert.ok(audit.stages.includes(stage), stage+' is represented');
    for (const status of ['Open','Awaiting retest','In review','Resolved']) assert.ok(audit.statuses.includes(status), status+' is represented');
    assert.ok(audit.finished.length > 0, 'A genuinely finished UAT project is ready for a customer invitation');
    assert.ok(audit.feedback > 0 && audit.duplicate && audit.pending && audit.accepted);
    assert.equal(audit.revision, 'empty-1');
    assert.equal(audit.clean, true);

    // Continue a seeded handoff through the actual UI. A ready-looking demo
    // report must still be reviewable under the same rules as a real report.
    const review = await page.evaluate(() => {
      const bug = A.state.issues.find(UatWorkflow.canReview);
      if (!bug) return null;
      const project = A.state.projects.find(project => project.id === bug.projectId);
      const canSendAfter = project.uat.cases.every(test => test.status === 'pass' &&
        (!test.bugId || test.bugId === bug.id || A.state.issues.find(item => item.id === test.bugId)?.status === 'Resolved')) &&
        !A.state.issues.some(item => item.projectId === project.id && item.id !== bug.id && item.status !== 'Resolved');
      return {id:bug.id,title:bug.title,projectId:project.id,assignee:bug.assignee,canSendAfter};
    });
    assert.ok(review, 'A seeded verified fix can be reviewed by the manager');
    await page.locator('[data-page=issues]').click();
    const reviewRow = page.locator('tr').filter({has:page.getByRole('button',{name:review.title,exact:true})});
    await reviewRow.getByRole('button',{name:'Review',exact:true}).click();
    await page.getByRole('button',{name:'Approve fix',exact:true}).click();
    const approval = await page.evaluate(({id,projectId,assignee}) => ({
      status:A.state.issues.find(bug => bug.id === id).status,
      ready:UatWorkflow.canSend(A.state.projects.find(project => project.id === projectId)),
      notice:A.state.notifications.some(note => note.title === 'Verified fix approved' && note.employeeId === assignee && note.role === 'developer')
    }), review);
    assert.equal(approval.status, 'Resolved');
    assert.equal(approval.ready, review.canSendAfter);
    assert.equal(approval.notice, true);
    await page.reload();
    await page.getByRole('button',{name:'New project',exact:true}).waitFor();
    assert.equal(await page.evaluate(() => A.state.projects.length), 10);
    assert.equal(await page.evaluate(() => A.state.demoMode), true);
    assert.equal(await page.evaluate(id => A.state.issues.find(bug => bug.id === id).status, review.id), 'Resolved');
    assert.equal(await page.locator('.modal-content').count(), 0);
    await page.screenshot({path:path.join(RESULTS_DIR,'demo-manager-home.png'),animations:'disabled'});
    console.log('PASS: demo loads from the app, cancellation is safe, theme/actor persist, all ten project lifecycles and progress links are consistent, and a seeded fix approval persists');

    const stale = await context.newPage();
    await stale.goto(BASE_URL); await stale.locator('.splash').waitFor({state:'hidden'}); await signIn(stale);
    await stale.locator('.profile-trigger').click();
    await stale.getByRole('button',{name:'Workspace settings',exact:true}).click();
    await stale.getByRole('button',{name:'Edit profile',exact:true}).click();
    await stale.locator('#profile-name').fill('Stale demo profile');
    await stale.evaluate(() => { A.refreshWorkspace = () => false; });

    await page.getByRole('button',{name:'Toggle staff workspace'}).click();
    const frames = {};
    for (const role of ['manager','developer','tester','customer']) {
      frames[role] = await page.locator(`iframe[data-role=${role}]`).elementHandle().then(node => node.contentFrame());
      await frames[role].waitForFunction(role => window.A?.state.role === role, role);
    }
    for (const role of ['manager','developer','tester']) {
      const panel = page.locator(`.four-panel[data-role=${role}]`);
      assert.equal(await panel.getByRole('button',{name:'Clear demo data',exact:true}).count(), 1);
    }
    await page.screenshot({path:path.join(RESULTS_DIR,'demo-four-role-workspace.png'),animations:'disabled'});
    await page.locator('[data-focus-role=tester]').click();
    await page.locator('.four-panel[data-role=tester]').getByRole('button',{name:'Clear demo data',exact:true}).click();
    await frames.tester.getByRole('dialog').getByRole('button',{name:'Start from zero',exact:true}).click();
    await page.waitForFunction(() => window.A?.state.projects.length === 0 && !A.state.demoMode);
    await page.locator('.four-view-shell').waitFor();
    assert.equal(await page.locator('.four-panel:visible').count(), 3);
    for (const role of ['manager','developer','tester','customer']) {
      const frame = await page.locator(`iframe[data-role=${role}]`).elementHandle().then(node => node.contentFrame());
      await frame.waitForFunction(() => window.A?.state.projects.length === 0);
      assert.equal(await frame.locator('.modal-content').count(), 0);
      assert.equal(await frame.evaluate(() => A.state.page), 'dashboard');
    }
    const cleared = await page.evaluate(() => ({
      count:A.state.employees.length,
      records:['projects','issues','assignments','notifications','feedback','betaFeedback','messages','requests'].map(key => [key,A.state[key]?.length || 0]),
      theme:localStorage.getItem('pre-shipment-theme'),
      actor:A.state.user.id
    }));
    assert.equal(cleared.count, 4);
    for (const [key,count] of cleared.records) assert.equal(count, 0, key+' cleared');
    assert.equal(cleared.theme, 'dark');
    assert.equal(cleared.actor, 'm1');
    await stale.getByRole('button',{name:'Save changes',exact:true}).click();
    await stale.waitForFunction(() => window.A?.state.projects.length === 0);
    assert.equal(await stale.evaluate(() => A.state.employees.find(person => person.id === 'm1').name), 'Manager');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('pre-shipment-v4')).projects.length), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: any staff panel can clear demo data across all windows, restore four role accounts and home pages, and reject old demo writes');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
