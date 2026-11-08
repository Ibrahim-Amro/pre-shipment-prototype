const assert = require('node:assert/strict');
const {BASE_URL, launchBrowser} = require('./support.cjs');

(async () => {
  const browser = await launchBrowser({fixtures:false});
  try {
    const page = await (await browser.newContext({viewport:{width:1440,height:960}})).newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(BASE_URL);
    await page.locator('.splash').waitFor({state:'hidden'});
    await page.evaluate(() => {
      const s = A.state;
      s.employees.push({...s.employees.find(e=>e.id==='d1'), id:'d2', name:'Second Developer', email:'d2@example.test'});
      for (const [number,developer] of [[1,'d1'],[2,'d2']]) {
        const id='scope-'+number;
        const project=UatWorkflow.createAwaitingProject({version:'v1.0'});
        project.team.push('d1','d2','t1');
        const test={id, title:'Test '+number, steps:['Open the task'], testData:'Task A', expected:'Task appears', status:'draft', assigneeId:'t1'};
        project.uat.cases.push(test);
        // Simulate a teammate added before the release manager selects the final UAT team.
        A.assignSupport(project,['t2']);
        A.save();
        if (!UatWorkflow.startTesting(project.id,{developerIds:['d1','d2'],testerIds:['t1'],cases:[test]})) throw new Error('Unable to start testing');
        if (A.state.assignments.some(a=>a.projectId===project.id&&a.employeeId==='t2')) throw new Error('Deselected tester kept an invitation');
        for(const a of s.assignments.filter(a=>a.projectId===project.id))a.accepted=true;
        s.issues.push({id:'BUG-'+project.number, title:'Team finding '+project.number, projectId:project.id, assignee:developer, status:'Open', severity:'High'});
        s.feedback.push({id:'f'+project.number, projectId:project.id, type:'Bug', status:'New', title:'Feedback '+project.number});
        A.save();
      }
      A.switchRole('developer');
    });
    await page.locator('[data-page=issues]').click();
    await page.getByRole('button',{name:'Team finding 1',exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Team finding 2',exact:true}).count(),0);
    await page.evaluate(() => {
      A.state.issues.find(i=>i.title==='Team finding 1').assignee='d2';
      A.save();A.render();
    });
    assert.equal(await page.locator('.ws-table-title').count(),0,'An empty personal queue must remain empty');
    await page.locator('[data-page=dashboard]').click();
    await page.locator('.uat-project-row').filter({hasText:'Project 2'}).click();
    await page.getByText('Not scheduled',{exact:true}).waitFor();
    await page.getByRole('button',{name:'View all issues',exact:true}).click();
    await page.getByRole('heading',{name:'Project findings',exact:true}).waitFor();
    assert.deepEqual(await page.locator('.ws-table-title').allTextContents(),['Team finding 2']);
    await page.getByRole('button',{name:'Back to project',exact:true}).click();
    await page.getByRole('heading',{name:'Project 2',exact:true}).waitFor();
    await page.getByRole('button',{name:'Close project',exact:true}).click();
    await page.locator('[data-page=feedback]').click();
    await page.getByRole('button',{name:'Feedback 1',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'Approve as bug',exact:true}).count(),0);
    await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).last().click();
    await page.evaluate(()=>{
      A.openWorkspace('tester','t2');
    });
    await page.getByRole('button',{name:'Report a finding',exact:true}).click();
    assert.equal(await page.locator('#ws-report-form').count(),0);
    await page.locator('[data-page=feedback]').click();
    assert.equal(await page.locator('.ws-feedback-title').count(),0);
    await page.evaluate(()=>{
      A.openWorkspace('tester','t1');
      // A different ID scheme and a legacy large sequential ID must never create duplicate reports.
      const project=A.state.projects[0];
      for (const id of ['UAT-12345678901234567890123','PS-9007199254740992']) {
        A.state.issues.push({id,projectId:project.id,title:'Existing record',status:'Resolved',severity:'Low'});
      }
      A.save();
    });
    for(const title of ['First exploratory finding','Second exploratory finding']) {
      await page.getByRole('button',{name:'Report a finding',exact:true}).click();
      for(const [field,value] of Object.entries({title,steps:'Open the task',expected:'Task appears',actual:'Task is missing'})) {
        await page.locator('#ws-report-'+field).fill(value);
      }
      await page.getByRole('button',{name:'Submit finding',exact:true}).click();
    }
    const ids=await page.evaluate(()=>A.state.issues.filter(i=>i.title.endsWith('exploratory finding')).map(i=>i.id).sort());
    assert.deepEqual(ids,['PS-9007199254740993','PS-9007199254740994']);
    await page.evaluate(()=>{
      A.switchRole('manager');
      const project=A.state.projects[0], test=project.uat.cases[0];
      const finding=A.state.issues.find(i=>i.id==='BUG-1');
      Object.assign(finding,{uatCaseId:test.id,status:'In review',verifiedAt:'2026-11-01T10:00:00Z',verifiedBy:'t1',fix:{buildVersion:'v1.1'}});
      Object.assign(test,{bugId:finding.id,status:'pass',buildVersion:'v1.1'});
      A.save();
      A.navigate('issues');
    });
    const review=page.locator('tr').filter({hasText:'Team finding 1'}).getByRole('button',{name:'Review',exact:true});
    await review.click();
    await page.getByText('Verified build v1.1 for manager approval.',{exact:true}).waitFor();
    const other=await page.context().newPage();
    await other.goto(BASE_URL);
    await other.evaluate(()=>{
      const project=A.state.projects[0], test=project.uat.cases[0];
      const finding=A.state.issues.find(i=>i.id==='BUG-1');
      // A later revision returns from the tester while the first review is still open.
      finding.fix.buildVersion='v1.2';
      finding.verifiedAt='2026-11-01T11:00:00Z';
      test.buildVersion='v1.2';
      A.save();
    });
    await page.getByRole('button',{name:'Approve fix',exact:true}).click();
    assert.equal(await page.evaluate(()=>A.state.issues.find(i=>i.id==='BUG-1').status),'In review');
    await review.click();
    await page.getByText('Verified build v1.2 for manager approval.',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Approve fix',exact:true}).click();
    assert.equal(await page.evaluate(()=>A.state.issues.find(i=>i.id==='BUG-1').status),'Resolved');
    assert.deepEqual(errors,[]);
    console.log('PASS: project/team scope, empty developer queue, undated release, selected invitations, scoped feedback, exploratory report IDs, and a stale manager review cannot approve a later build.');
  } finally {
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
