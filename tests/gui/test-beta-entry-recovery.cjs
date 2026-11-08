const assert = require('node:assert/strict');
const {launchBrowser, BASE_URL} = require('./support.cjs');

(async () => {
  const browser = await launchBrowser({fixtures:false});
  const errors = [];
  const watch = context => context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  try {
    const empty = await browser.newContext();
    watch(empty);
    const home = await empty.newPage();
    await home.goto(BASE_URL);
    await home.getByRole('button',{name:'Open Your Beta Version',exact:true}).click();
    const waiting = home.getByRole('heading',{name:'Your beta is being prepared.'});
    assert.equal(await waiting.evaluate(node => node === document.activeElement), true);
    await home.getByRole('button',{name:'Back to options'}).click();
    await home.getByRole('button',{name:'Sign In',exact:true}).waitFor();
    await empty.close();

    const context = await browser.newContext({viewport:{width:390,height:844}, timezoneId:'America/Los_Angeles'});
    await context.addInitScript(() => {window.__UAT_GUI_FIXTURES__ = true;});
    context.setDefaultTimeout(15000);
    watch(context);
    const staff = await context.newPage();
    await staff.goto(BASE_URL);
    const customer = await context.newPage();
    await customer.goto(BASE_URL+'?multiView=1&workspaceRole=customer&project=p7');
    const key = customer.getByLabel('Beta access key');
    await key.fill('PARTLY-TYPED');
    await staff.evaluate(() => {A.state.notifications[0].read=true; A.save();});
    await customer.waitForFunction(() => A.state.notifications[0].read);
    assert.equal(await key.inputValue(),'PARTLY-TYPED');

    // Model the browser blocking a new window. The validated invitation should
    // still run, and the customer's refresh must always resume this project.
    const entry = await context.newPage();
    await entry.goto(BASE_URL+'?customer=1&project=p7');
    await entry.evaluate(() => {window.open=()=>null;});
    const open = entry.getByRole('button',{name:'Open Project 7',exact:true});
    await open.click();
    await entry.getByRole('button',{name:'New task',exact:true}).waitFor();
    const sessionId = new URL(entry.url()).searchParams.get('betaSession');
    assert.ok(sessionId);
    await entry.clock.setFixedTime(new Date('2026-06-01T02:00:00Z'));
    await entry.getByRole('button',{name:'New task',exact:true}).click();
    assert.equal(await entry.getByLabel('Due date').inputValue(),'2026-05-31');
    await entry.getByLabel('Task name').fill('Test the new planner');
    await entry.getByRole('button',{name:'Save task',exact:true}).click();
    await entry.getByRole('button',{name:'Complete Test the new planner',exact:true}).click();
    await entry.getByRole('button',{name:'Reopen Test the new planner',exact:true}).click();
    await entry.getByRole('button',{name:/^My day/}).click();
    await entry.getByRole('button',{name:'Edit Test the new planner',exact:true}).waitFor();
    await entry.getByLabel('Search tasks').fill('not present');
    await entry.getByRole('button',{name:'Clear search and filters'}).click();
    await entry.getByRole('button',{name:'Edit Test the new planner',exact:true}).waitFor();
    await entry.getByLabel('Title',{exact:true}).fill('Saved unfinished note');
    await entry.getByLabel('Details',{exact:true}).fill('The reopened beta still has my task.');

    async function setStage(stage) {
      await staff.evaluate(stage => {
        A.refreshWorkspace();
        const p=A.state.projects.find(project=>project.id==='p7');
        p.uat.stage=stage;
        if (stage==='testing') p.version='v2.1.1';
        A.save();
      },stage);
    }
    await setStage('testing');
    await entry.getByText('Customer acceptance paused',{exact:true}).waitFor();
    assert.equal(await entry.locator('#planner-build').innerText(),'Beta v2.1.1');
    await entry.reload();
    await entry.getByRole('heading',{name:'Your beta is being prepared.'}).waitFor();
    assert.equal(await entry.getByLabel('Beta access key').count(),0);
    await setStage('customer');
    await open.waitFor();
    assert.equal(await entry.getByLabel('Project',{exact:true}).count(),0);
    await open.click();
    await entry.getByRole('button',{name:'Edit Test the new planner',exact:true}).waitFor();
    assert.equal(await entry.getByLabel('Title',{exact:true}).inputValue(),'Saved unfinished note');
    await entry.getByTitle('Return to beta entry').click();
    await open.click();
    assert.equal(await entry.getByLabel('Title',{exact:true}).inputValue(),'Saved unfinished note');
    await entry.getByRole('button',{name:'Send Feedback & Finish',exact:true}).click();
    await entry.getByText('Your note was sent to the project manager.',{exact:true}).waitFor();
    await entry.locator('.beta-confirmation button').click();
    await open.waitFor();
    const reports = await staff.evaluate(id => {
      A.refreshWorkspace();
      return A.state.betaFeedback.filter(report => report.id===id);
    },sessionId);
    assert.equal(reports.length,1);
    assert.equal(reports[0].projectId,'p7');
    assert.deepEqual(errors,[]);
    console.log('PASS: empty beta entry, typed key on live sync, same-tab launch when popups are blocked, local task dates, reversible completion, filters, paused entry, retained task and draft, and single feedback delivery.');
  } finally {
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
