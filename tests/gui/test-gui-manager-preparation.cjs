const assert = require('node:assert/strict');
const path = require('node:path');
const {launchBrowser, BASE_URL, RESULTS_DIR} = require('./support.cjs');

(async () => {
  const browser = await launchBrowser();
  const results = [];
  try {
    const context = await browser.newContext({viewport:{width:1600,height:1050}});
    context.setDefaultTimeout(12000);
    const errors = [];
    context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    const page = await context.newPage();
    await page.goto(BASE_URL);
    await page.locator('.splash').waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Sign In',exact:true}).click();
    await page.getByRole('button',{name:'Sign in to workspace'}).click();
    await page.getByRole('button',{name:'New project',exact:true}).click();
    await page.getByRole('heading',{name:'Register a finished build'}).waitFor();
    await page.getByLabel('Build version',{exact:true}).fill('');
    await page.getByRole('button',{name:'Add to Awaiting UAT'}).click();
    assert.equal(await page.locator('#uat-new-project').isVisible(),true);
    assert.equal(await page.evaluate(()=>A.state.projects.length),10);
    results.push('Blank build version does not create a project');
    await page.getByLabel('Build version',{exact:true}).fill('v11.0.0');
    await page.getByLabel('Project overview',{exact:true}).fill('GUI acceptance preparation with uploaded requirements and selected release team.');
    await page.getByRole('button',{name:'Add to Awaiting UAT'}).click();
    await page.getByRole('heading',{name:'Project 11',exact:true}).waitFor();
    const id = await page.evaluate(()=>A.state.projects.find(p=>p.name==='Project 11').id);
    assert.equal(await page.evaluate(id=>A.state.projects.find(p=>p.id===id).uat.stage,id),'awaiting');
    assert.equal(await page.getByRole('button',{name:'Approve project and start UAT testing'}).count(),0);
    results.push('New finished build is Awaiting UAT and cannot start without scenarios');

    await page.locator('input[name=requirements]').setInputFiles({name:'GUI UAT requirements.txt',mimeType:'text/plain',buffer:Buffer.from([
      'Users can create a task with title and priority.',
      'Blank title is invalid and must show an error.',
      'Search should be fast and easy.',
      'Authorized users can edit and delete tasks.',
      'Saved tasks persist after reopen.',
      'Test data: Release checklist and Customer notes.'
    ].join('\n'))});
    await page.getByRole('button',{name:'Generate UAT scenarios ready for the tester'}).click();
    await page.getByRole('heading',{name:/Review the generated scenarios/}).waitFor();
    assert.equal(await page.locator('details.uat-manager-case').count(),8);
    await page.getByText('GUI UAT requirements.txt',{exact:true}).waitFor();
    assert.equal(await page.getByRole('heading',{name:'Missing or unclear requirements'}).count(),0);

    assert.ok(await page.locator('.uat-manager-case').first().getByText(/Related requirement/).count());
    results.push('Uploaded TXT generates eight mock drafts with requirement links; removed gaps panel stays absent');

    await page.locator('input[name=developerIds]:checked').uncheck();
    await page.getByRole('button',{name:'Approve project and start UAT testing'}).click();
    await page.getByText('Choose at least one developer and one tester to start UAT.',{exact:true}).waitFor();
    assert.equal(await page.evaluate(id=>A.state.projects.find(p=>p.id===id).uat.stage,id),'awaiting');
    await page.locator('input[name=developerIds][value=d2]').check();
    await page.locator('input[name=testerIds]:checked').uncheck();
    await page.getByRole('button',{name:'Approve project and start UAT testing'}).click();
    assert.equal(await page.evaluate(id=>A.state.projects.find(p=>p.id===id).uat.stage,id),'awaiting');
    await page.locator('input[name=testerIds][value=t2]').check();
    await page.locator('input[name=testerIds][value=t3]').check();
    assert.ok(await page.locator('select[name^=assignee-]').evaluateAll(selects=>selects.every(select=>[...select.options].filter(o=>!o.disabled).every(o=>['t2','t3'].includes(o.value)))));
    results.push('Missing developer/tester is blocked; per-case choices restrict to selected testers');

    const first = page.locator('details.uat-manager-case').first();
    await page.locator('input[name=title-0]').fill('   ');
    await page.getByRole('button',{name:'Approve project and start UAT testing'}).click();
    await page.getByText('Complete each scenario and assign it to a tester selected for this project.',{exact:true}).waitFor();
    assert.equal(await page.evaluate(id=>A.state.projects.find(p=>p.id===id).uat.stage,id),'awaiting');
    const invalidFieldVisible=await page.locator('input[name=title-0]').evaluate(el=>({top:el.getBoundingClientRect().top,headerBottom:document.querySelector('.uat-manager-preparation > .uat-preparation-title').getBoundingClientRect().bottom,focused:document.activeElement===el}));
    assert.ok(invalidFieldVisible.focused&&invalidFieldVisible.top>=invalidFieldVisible.headerBottom-1,`Invalid field must stay visible below sticky project title: ${JSON.stringify(invalidFieldVisible)}`);
    await page.locator('input[name=title-0]').fill('Create a customer release task');
    await page.locator('textarea[name=steps-0]').fill('Open the planner.\nEnter a unique task title.\nSave the task.');
    await page.locator('textarea[name=data-0]').fill('Task: GUI release acceptance. Priority: High.');
    await page.locator('textarea[name=expected-0]').fill('Exactly one task appears and preserves its title and priority.');
    await page.locator('select[name=assignee-0]').selectOption('t3');
    await first.locator('.uat-manager-code summary').click();
    await first.getByLabel('Code snippet',{exact:true}).fill('function createTask(input) {\n  validate(input);\n  return save(input);\n}');
    await page.screenshot({path:path.join(RESULTS_DIR,'gui-manager-preparation-drafts.png'),animations:'disabled'});
    await page.getByRole('button',{name:'Approve project and start UAT testing'}).click();
    await page.getByRole('heading',{name:/Active testing projects/}).waitFor();
    const project = await page.evaluate(id=>A.state.projects.find(p=>p.id===id),id);
    assert.equal(project.uat.stage,'testing');
    assert.deepEqual(project.team,['m1','d2','t2','t3']);
    assert.equal(project.uat.cases.length,8);
    assert.ok(project.uat.cases.every(test=>test.status==='pending'&&['t2','t3'].includes(test.assigneeId)));
    assert.equal(project.uat.cases[0].title,'Create a customer release task');
    assert.equal(project.uat.cases[0].assigneeId,'t3');
    assert.equal(project.uat.cases[0].steps.length,3);
    assert.ok(project.uat.cases[0].code.includes('validate(input)'));
    const invitations=await page.evaluate(id=>A.state.assignments.filter(a=>a.projectId===id),id);
    assert.deepEqual(invitations.map(a=>a.employeeId),['d2','t2','t3']);
    assert.ok(invitations.every(a=>a.key&&a.username&&a.password&&!a.accepted));
    results.push('Edited scenario/instructions/data/expected/code and per-case assignment persist; start creates exact selected-team invitations');
    const active = page.locator('#uat-testing-active').locator('..').locator('article').filter({has:page.getByRole('button',{name:'Project 11',exact:true})});
    await active.getByRole('button',{name:'Review progress'}).click();
    await page.getByRole('heading',{name:/Approved scenarios/}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Approve project and start UAT testing'}).count(),0);
    assert.equal(await page.getByRole('button',{name:'Generate UAT scenarios ready for the tester'}).count(),0);
    const team=page.getByRole('complementary',{name:'Project 11 team'});
    for(const name of ['Olivia Bennett','Amelia Chen','Liam Walker','Ava Robinson'])await team.locator('li strong').filter({hasText:name}).waitFor();
    results.push('Approved plan is read-only and project roster shows exactly its assigned team');

    await page.getByRole('button',{name:'Toggle staff workspace'}).click();
    await page.locator('#four-project').selectOption(id);
    await page.getByLabel('Tester account',{exact:true}).selectOption('t3');
    const tester=await page.locator('iframe[data-role=tester]').elementHandle().then(el=>el.contentFrame());
    await tester.waitForFunction(()=>window.A?.state.user?.id==='t3');
    const pending=tester.getByRole('region',{name:'Pending project invitation'}).filter({hasText:'Project 11'});
    await pending.getByRole('button',{name:'View invitation',exact:true}).click();
    await tester.getByRole('heading',{name:'Your next release starts here'}).waitFor();
    await tester.getByText('ava.robinson@pfizer.demo',{exact:true}).first().waitFor();
    await tester.getByRole('button',{name:'Enter assignment key'}).click();
    const key=await tester.getByLabel('Assignment key',{exact:true}).inputValue();
    assert.ok(key);
    await tester.getByLabel('Assignment key',{exact:true}).fill('INVALID');
    await tester.getByRole('button',{name:'OK, accept project'}).click();
    await tester.getByText(/That key doesn’t match your invitation/).waitFor();
    assert.equal(await tester.evaluate(id=>A.state.assignments.find(a=>a.projectId===id&&a.employeeId==='t3').accepted,id),false);
    await tester.getByLabel('Assignment key',{exact:true}).fill(key);
    await tester.getByRole('button',{name:'OK, accept project'}).click();
    await tester.locator('#uat-active-heading').locator('..').getByRole('button',{name:/Project 11/}).click();
    await tester.locator('#uat-test-queue-list').getByRole('button',{name:/Create a customer release task/}).waitFor();
    assert.equal(await tester.locator('#uat-test-queue-list [data-case-index]').count(),1);
    results.push('Selected tester sees invitation with credentials; invalid key rejected, prefilled correct key accepted, only assigned project case available');
    await page.screenshot({path:path.join(RESULTS_DIR,'gui-manager-preparation-assigned.png'),animations:'disabled'});
    await page.reload();
    const restoredManager=await page.locator('iframe[data-role=manager]').elementHandle().then(node=>node.contentFrame());
    await restoredManager.getByRole('button',{name:'New project',exact:true}).waitFor();
    assert.equal(await restoredManager.locator('.modal-content').count(),0);
    const restoredCard=restoredManager.locator('#uat-testing-active').locator('..').locator('article').filter({has:restoredManager.getByRole('button',{name:'Project 11',exact:true})});
    await restoredCard.getByRole('button',{name:'Review progress'}).click();
    await restoredManager.getByRole('heading',{name:/Approved scenarios/}).waitFor();
    assert.equal(await page.evaluate(id=>A.state.projects.find(p=>p.id===id).uat.cases[0].title,id),'Create a customer release task');
    assert.equal(await page.evaluate(id=>A.state.assignments.find(a=>a.projectId===id&&a.employeeId==='t3').accepted,id),true);
    await restoredManager.getByText('GUI UAT requirements.txt',{exact:true}).waitFor();
    results.push('Reload restores approved requirements, edited plan, team invitations and accepted assignment');
    assert.deepEqual(errors,[]);
    console.log('PASS manager preparation GUI:\n'+results.map(result=>' - '+result).join('\n'));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
