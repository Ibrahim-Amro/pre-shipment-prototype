(() => {
  'use strict';

  const manager = window.UatManager = {};
  const app = () => window.A;
  const workspace = () => app().state;
  const esc = value => app().escape(value);
  const arg = value => esc(JSON.stringify(value));
  const icon = (name, size = 16) => app().icon(name, size);
  const projectById = id => workspace().projects.find(project => project.id === id);
  const availablePeople = role => workspace().employees.filter(employee => employee.role === role && employee.available !== false);
  const testerList = project => {
    const available = availablePeople('tester');
    const assigned = available.filter(employee => project.team.includes(employee.id));
    return assigned.length ? assigned : available.slice(0,1);
  };
  const casesOf = project => project.uat?.cases || [];
  const activeStage = project => UatWorkflow.stage(project) === 'testing';
  const statusLabel = {draft:'Draft', pending:'To do', pass:'Passed', fail:'Failed', blocked:'Blocked', retest:'Retest'};
  const sourceLimit = 16000;
  let view = 'testing';
  let selectedProjectId = '';

  const sampleRequirements = [
    'Users can create a task with a title, description, and priority.',
    'A task title is required and validation preserves the other entered values.',
    'Users can edit, complete, and delete their tasks.',
    'Users can search tasks and filter by status and priority.',
    'List and Board views show the same tasks and their current status.',
    'Saved tasks remain available after the application is reopened.',
    'Confirm the sample task data and accepted response time for search.'
  ].join('\n');

  const mockScenarios = [
    {
      title:'Create a task',
      steps:['Open the task planner.', 'Choose New task and enter a title, description, and priority.', 'Save the task and find it in the task list.'],
      testData:'Title: Review the release. Description: Review the acceptance notes. Priority: High.',
      expected:'The task appears once with its entered details and priority.',
      code:'function createTask(input) {\n  const task = validateTask(input);\n  tasks.push(task);\n  return saveTasks(tasks);\n}'
    },
    {
      title:'Require a task title',
      steps:['Choose New task.', 'Leave the title blank and enter a description.', 'Try to save, then correct the title.'],
      testData:'Blank title. Description: Check validation without losing this text.',
      expected:'A clear validation message identifies the missing title. The description remains available.',
      code:'function validateTask(input) {\n  if (!input.title.trim()) return showTitleError();\n  return { ...input, title: input.title.trim() };\n}'
    },
    {
      title:'Edit an existing task',
      steps:['Open a saved task.', 'Change its title and priority.', 'Save and open the task again.'],
      testData:'Task: Review the release. New title: Review the customer release. New priority: Low.',
      expected:'The task shows the updated title and priority with no duplicate entry.',
      code:'function updateTask(id, changes) {\n  tasks = tasks.map(task => task.id === id ? { ...task, ...changes } : task);\n  return saveTasks(tasks);\n}'
    },
    {
      title:'Complete a task',
      steps:['Find an unfinished task.', 'Mark the task complete.', 'Use the completed filter to check its status.'],
      testData:'One saved task currently marked To do.',
      expected:'The task is marked complete and appears in the completed view.',
      code:'function completeTask(id) {\n  const task = tasks.find(item => item.id === id);\n  task.status = "done";\n  return saveTasks(tasks);\n}'
    },
    {
      title:'Find tasks with search and filters',
      steps:['Create two tasks with different titles and priorities.', 'Search for one title and apply a matching priority filter.', 'Clear the search and filter.'],
      testData:'Tasks: Release checklist (High) and Team notes (Low). Search: Release.',
      expected:'Only the matching task appears. Clearing the controls restores all tasks.',
      code:'function findTasks(query, priority) {\n  return tasks.filter(task => task.title.includes(query))\n    .filter(task => !priority || task.priority === priority);\n}'
    },
    {
      title:'Switch between List and Board views',
      steps:['Open the List view and note a task’s status.', 'Switch to Board.', 'Open the same task and return to List.'],
      testData:'A task in each available status.',
      expected:'Both views show the same saved tasks with consistent titles, priorities, and statuses.',
      code:'function changeView(view) {\n  preferences.view = view;\n  return renderTasks(tasks, preferences);\n}'
    },
    {
      title:'Delete a task',
      steps:['Create a disposable task.', 'Open its actions and delete it.', 'Check List and Board for the deleted task.'],
      testData:'Task title: Disposable acceptance test.',
      expected:'The task disappears from both views and other tasks remain intact.',
      code:'function deleteTask(id) {\n  tasks = tasks.filter(task => task.id !== id);\n  return saveTasks(tasks);\n}'
    },
    {
      title:'Restore saved tasks after reopening',
      steps:['Create a task with a unique title.', 'Close or refresh the beta application.', 'Reopen the project and find the saved task.'],
      testData:'Task title: Persistent UAT check.',
      expected:'The task and its details are restored after the application reopens.',
      code:'function restoreTasks() {\n  const saved = localStorage.getItem("planner-tasks");\n  return saved ? JSON.parse(saved) : sampleTasks;\n}'
    }
  ];
  const scenarioSubjects = [
    /\b(create|new|task|title)\b/i,
    /\b(required|blank|validation|input|field)\b/i,
    /\b(edit|update|change|priority)\b/i,
    /\b(complete|done|status)\b/i,
    /\b(search|filter|priority)\b/i,
    /\b(board|list|navigation|view)\b/i,
    /\b(delete|remove|discard)\b/i,
    /\b(refresh|reopen|persist|saved|restore)\b/i
  ];

  function paragraphs(text) {
    return text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  }

  function draftPlan(requirements) {
    const lines = paragraphs(requirements.text);
    const unclear = lines.filter(line => /\b(easy|fast|quickly|as needed|appropriate|should|tbd|etc)\b/i.test(line)).slice(0, 3);
    const gaps = unclear.map(line => 'Define a measurable acceptance result for: ' + line.slice(0, 180));
    if (!lines.some(line => /\b(role|permission|authorized|access)\b/i.test(line))) {
      gaps.push('Specify which roles can open restricted information.');
    }
    if (!lines.some(line => /\b(error|invalid|failure|retry)\b/i.test(line))) {
      gaps.push('Describe what users should see when validation or saving fails.');
    }
    if (!lines.some(line => /\b(test data|fixtures|sample data)\b/i.test(line))) {
      gaps.push('Confirm the test accounts and sample records available for UAT.');
    }
    if (!gaps.length) gaps.push('Confirm the accepted response time for the main user workflow.');
    const cases = mockScenarios.map((scenario,index) => {
      const requirement = lines.find(line => scenarioSubjects[index].test(line));
      return requirement ? {...scenario, requirement:requirement.slice(0, 240)} : scenario;
    }).sort((a,b) => Number(Boolean(b.requirement)) - Number(Boolean(a.requirement)));
    return {cases, gaps};
  }

  function button(label, handler, css='secondary', symbol='') {
    return `<button type="button" class="btn ${css}" onclick="${handler}">${symbol ? icon(symbol) : ''}${label}</button>`;
  }

  function stageButton(key, label, count, css='secondary') {
    return `<button type="button" class="btn ${view===key?'primary':css}" aria-pressed="${view===key}" onclick="UatManager.selectView('${key}')">${label} <span>${count}</span></button>`;
  }

  function stageHeading() {
    const projects = workspace().projects;
    return `<header class="uat-overview-header">
      <div><div class="eyebrow">USER ACCEPTANCE TESTING</div><h1>Project stages</h1><p>Start UAT for completed builds, verify fixes, and invite the customer to accept the release.</p></div>
      <div class="uat-overview-actions">${button('New project','UatManager.newProject()','secondary','plus')}</div>
    </header>
    <nav class="uat-manager-tabs" aria-label="Manager project stages">
      <div>
        ${stageButton('testing','UAT Testing Stage',projects.filter(activeStage).length)}
        ${stageButton('customer','Customer Acceptance Stage',projects.filter(project => UatWorkflow.stage(project)==='customer').length)}
      </div>
      ${stageButton('awaiting','Awaiting UAT',projects.filter(project => UatWorkflow.stage(project)==='awaiting').length,'ghost')}
    </nav>`;
  }

  function section(title, id, projects, card, empty) {
    return `<section class="uat-project-section" aria-labelledby="${id}">
      <h2 id="${id}">${title} <span class="count-bubble">${projects.length}</span></h2>
      ${projects.length ? `<div class="uat-manager-projects">${projects.map(card).join('')}</div>` : `<p class="card uat-empty">${empty}</p>`}
    </section>`;
  }

  function projectCard(project, detail, actions, handler) {
    const key = ProjectPriority.of(project).key;
    const open = handler || `Workspaces.openProject(${arg(project.id)})`;
    return `<article class="card uat-manager-project" data-project-priority="${key}">
      <div class="uat-manager-project-main">
        <div><button type="button" class="uat-manager-project-title" onclick="${open}">${esc(project.name)}</button>
        <p>${esc(project.version || 'Current build')}${project.description ? ` · ${esc(project.description)}` : ''}</p></div>
        ${ProjectPriority.badge(project)}
      </div>
      <div class="uat-manager-project-foot"><p>${detail}</p><div class="uat-manager-actions">${actions}</div></div>
    </article>`;
  }

  function testingView(projects) {
    const ready = projects.filter(UatWorkflow.canSend);
    const active = projects.filter(project => !UatWorkflow.canSend(project));
    const activeCard = project => {
      const cases = casesOf(project);
      const approved = cases.filter(testCase => testCase.status !== 'draft');
      const passed = approved.filter(testCase => testCase.status === 'pass').length;
      const findings = workspace().issues.filter(issue => issue.projectId === project.id && issue.status !== 'Resolved');
      const reviews = findings.filter(UatWorkflow.canReview).length;
      const progress = approved.length ? `${passed} of ${approved.length} approved cases passed` : 'UAT preparation is needed';
      const detail = [progress,
        findings.length ? `${findings.length} unresolved ${findings.length === 1 ? 'finding' : 'findings'}` : '',
        reviews ? `${reviews} verified ${reviews === 1 ? 'fix awaits' : 'fixes await'} manager approval` : ''
      ].filter(Boolean).join(' · ');
      const review = reviews ? button('Review verified fixes', "Workspaces.go('issues');Workspaces.filter('issueFilter','review')", 'primary') : '';
      return projectCard(project, detail, review + button('Review scenarios',`UatManager.openProject(${arg(project.id)})`));
    };
    const readyCard = project => projectCard(project,
      casesOf(project).length ? 'All approved test cases and fixes are complete' : 'UAT testing completed',
      button('Send to Customer Acceptance Stage',`UatManager.sendProject(${arg(project.id)})`,'primary','send'));
    return section('Active testing projects','uat-testing-active',active,activeCard,'Active UAT projects will appear here.')
      + section('Finished UAT testing','uat-testing-finished',ready,readyCard,'Projects move here when their approved tests and bug reviews are complete.');
  }

  function customerView(projects) {
    const customerCard = project => {
      const count = (workspace().betaFeedback || []).filter(session => session.projectId === project.id).length;
      const detail = count ? `${count} customer feedback ${count===1?'session':'sessions'} received` : 'Awaiting customer feedback';
      return projectCard(project, detail, button('Open invitation draft',`Beta.previewInvitation(${arg(project.id)})`,'secondary','mail'));
    };
    return section('Customer acceptance projects','uat-customer-projects',projects,customerCard,'Send a finished UAT project to start customer acceptance.');
  }

  function awaitingView(projects) {
    const card = project => projectCard(project,
      'Development complete · Ready to prepare user acceptance testing',
      button('Prepare UAT',`UatManager.openProject(${arg(project.id)})`,'primary','arrow-right'),
      `UatManager.openProject(${arg(project.id)})`);
    return section('Finished builds awaiting UAT','uat-awaiting-projects',projects,card,'Completed development builds will wait here before testing starts.');
  }

  function requirementsPanel(project, approved) {
    const requirements = project.uat?.requirements;
    return `<section class="card uat-requirements" aria-labelledby="uat-requirements-heading">
      <div><h2 id="uat-requirements-heading">Prepare the test scenarios</h2>
        <p>${requirements ? `Source document <strong>${esc(requirements.name)}</strong>` : 'Generate a ready-to-review mock checklist, or add your requirements document first.'}</p></div>
      ${approved ? '' : `<form class="uat-requirements-form" onsubmit="UatManager.generate(event,${arg(project.id)})">
        <label class="field"><span>Requirements document <span class="muted">(optional)</span></span><input name="requirements" type="file" accept=".txt,.md,.csv,.pdf,.docx,.rtf"></label>
        <div class="uat-manager-actions"><button class="btn primary" type="submit">${icon('sparkles')} Generate UAT scenarios ready for the tester</button></div>
      </form>
      <p class="uat-manager-muted">Mock AI analysis uses text from TXT, Markdown, and CSV files. Other formats use the sample requirements.</p>`}
    </section>`;
  }

  function gapsPanel(gaps) {
    if (!gaps?.length) return '';
    return `<section class="card uat-requirements" aria-labelledby="uat-gaps-heading">
      <div class="uat-manager-heading"><span>${icon('alert-triangle')}</span><h2 id="uat-gaps-heading">Missing or unclear requirements</h2></div>
      <ul class="uat-requirement-gaps">${gaps.map(gap => `<li>${esc(gap)}</li>`).join('')}</ul>
    </section>`;
  }

  function staffPicker(project) {
    const retainedCases = casesOf(project).filter(testCase => testCase.status !== 'draft');
    const retainedStaff = {
      tester:new Set(retainedCases.map(testCase => testCase.assigneeId)),
      developer:new Set(workspace().issues.filter(issue => issue.status !== 'Resolved' && retainedCases.some(testCase => testCase.bugId === issue.id)).map(issue => issue.assignee))
    };
    return `<section class="card uat-start-team" aria-labelledby="uat-start-team-heading">
      <div><h3 id="uat-start-team-heading">Choose the UAT team</h3><p>Selected developers handle fixes. Selected testers receive the approved scenarios and project invitations. Teammates with ongoing test work stay assigned.</p></div>
      <div class="uat-start-team-columns">${['developer','tester'].map(role => {
        const people = availablePeople(role);
        const selected = people.filter(person => project.team.includes(person.id));
        return `<fieldset><legend>${role === 'developer' ? 'Developers' : 'Testers'}</legend>
          ${people.length ? people.map((person,index) => `<label class="uat-team-choice">
            <input type="checkbox" name="${role}Ids" value="${esc(person.id)}"${role==='tester' ? ' onchange="UatManager.updateTesters(this.form)"' : ''}${selected.some(item => item.id === person.id) || retainedStaff[role].has(person.id) || !selected.length && index===0 ? ' checked' : ''}${retainedStaff[role].has(person.id) ? ' disabled' : ''}>
            ${app().avatar(person,28)}<span><strong>${esc(person.name)}</strong><small>${esc(person.title || role)}</small></span>
          </label>`).join('') : '<p class="uat-manager-muted">No available teammates in this role.</p>'}
        </fieldset>`;
      }).join('')}</div>
    </section>`;
  }

  function draftCase(testCase, index, testers) {
    const testerOptions = availablePeople('tester').map(tester => {
      const assigned = testCase.assigneeId ? testCase.assigneeId === tester.id : testers[index % Math.max(1,testers.length)]?.id === tester.id;
      return `<option value="${esc(tester.id)}"${assigned?' selected':''}${testers.some(person => person.id === tester.id) ? '' : ' disabled'}>${esc(tester.name)} · QA engineer</option>`;
    }).join('');
    return `<details class="card uat-manager-case"${index===0?' open':''}>
      <summary><span><small>CASE ${String(index+1).padStart(2,'0')}</small><strong>${esc(testCase.title)}</strong></span><span class="uat-manager-tag">Draft</span></summary>
      <div class="uat-manager-case-fields">
        ${testCase.requirement ? `<p class="uat-manager-muted uat-manager-field-wide"><strong>Related requirement</strong> ${esc(testCase.requirement)}</p>` : ''}
        <label class="field"><span>Scenario title</span><input name="title-${index}" value="${esc(testCase.title)}" maxlength="120" required></label>
        <label class="field"><span>Assign to tester</span><select name="assignee-${index}" required>${testerOptions || '<option value="">Choose a tester</option>'}</select></label>
        <label class="field uat-manager-field-wide"><span>Instructions, one step per line</span><textarea name="steps-${index}" rows="3" maxlength="1800" required>${esc(testCase.steps.join('\n'))}</textarea></label>
        <label class="field"><span>Required test data</span><textarea name="data-${index}" rows="2" maxlength="800" required>${esc(testCase.testData)}</textarea></label>
        <label class="field"><span>Expected result</span><textarea name="expected-${index}" rows="2" maxlength="800" required>${esc(testCase.expected)}</textarea></label>
        <details class="uat-manager-code uat-manager-field-wide"><summary>Code snippet</summary><textarea name="code-${index}" aria-label="Code snippet" rows="4" maxlength="1200" spellcheck="false">${esc(testCase.code)}</textarea></details>
      </div>
    </details>`;
  }

  function approvedCase(testCase, index) {
    const tester = workspace().employees.find(employee => employee.id === testCase.assigneeId);
    return `<details class="card uat-manager-case">
      <summary><span><small>CASE ${String(index+1).padStart(2,'0')}</small><strong>${esc(testCase.title)}</strong></span><span class="uat-manager-tag" data-status="${esc(testCase.status)}">${statusLabel[testCase.status] || 'Approved'}</span></summary>
      <div class="uat-manager-case-detail">${app().person(tester || {name:'Awaiting assignment'},'QA engineer')}
        <ol>${testCase.steps.map(step => `<li>${esc(step)}</li>`).join('')}</ol>
        <p><strong>Test data</strong> ${esc(testCase.testData)}</p><p><strong>Expected result</strong> ${esc(testCase.expected)}</p>
        ${testCase.code ? `<details class="uat-manager-code"><summary>Code snippet</summary><pre><code>${esc(testCase.code)}</code></pre></details>` : ''}
      </div>
    </details>`;
  }

  function scenarioPanel(project, cases) {
    if (!cases.length) return '';
    const testers = testerList(project);
    const drafts = cases.filter(testCase => testCase.status === 'draft');
    const approved = cases.filter(testCase => testCase.status !== 'draft');
    return `<section class="uat-project-section" aria-labelledby="uat-manager-scenarios">
      <h2 id="uat-manager-scenarios">${drafts.length ? 'Review the generated scenarios' : 'Approved scenarios'} <span class="count-bubble">${cases.length}</span></h2>
      ${drafts.length ? `<form class="uat-manager-case-list" novalidate onsubmit="UatManager.approve(event,${arg(project.id)})">
        ${staffPicker(project)}
        ${drafts.map((testCase,index) => draftCase(testCase,index,testers)).join('')}
        <div class="uat-manager-actions"><button class="btn primary" type="submit"${availablePeople('tester').length && availablePeople('developer').length?'':' disabled'}>${icon('check')} Approve project and start UAT testing</button></div>
      </form>` : ''}
      ${approved.length ? `<div class="uat-manager-case-list">${approved.map(approvedCase).join('')}</div>` : ''}
    </section>`;
  }

  function preparationView(project) {
    const cases = casesOf(project);
    const approved = cases.some(testCase => testCase.source !== 'bug-retest' && testCase.status !== 'draft');
    return `<div class="uat-manager-preparation">
      ${button('Back to projects',`UatManager.selectView('${view}')`,'ghost','arrow-left')}
      <header class="uat-preparation-title"><span class="eyebrow">${UatWorkflow.stage(project)==='awaiting' ? 'DEVELOPMENT COMPLETE · AWAITING UAT' : 'UAT SCENARIOS'}</span><h2>${esc(project.name)}</h2><p>${esc(project.version || 'Current build')} · Review the requirements, prepare the scenarios, and choose the release team.</p></header>
      ${approved ? `<div class="uat-manager-review-grid"><div>${requirementsPanel(project,true)}${gapsPanel(project.uat?.gaps)}${scenarioPanel(project,cases)}</div>${Workspaces.projectTeam(project.id)}</div>`
        : requirementsPanel(project,false) + gapsPanel(project.uat?.gaps) + scenarioPanel(project,cases)}
    </div>`;
  }

  manager.newProject = function () {
    if (workspace().role !== 'manager') return;
    const name = 'Project ' + UatWorkflow.nextProjectNumber();
    app().modal(`<header class="modal-header"><div><span class="eyebrow">DEVELOPMENT COMPLETE</span><h2>Register a finished build</h2></div>
      ${button('Close','A.closeModal()','ghost','x')}</header>
      <form id="uat-new-project">
        <div class="modal-body">
          <div class="uat-preparation-title"><h3>${esc(name)}</h3><p>Awaiting UAT</p></div>
          <label class="field"><span>Build version</span><input name="version" value="v1.0.0" required maxlength="40"></label>
          <label class="field"><span>Project overview</span><textarea name="description" rows="3" maxlength="600" placeholder="Describe what is ready for acceptance testing."></textarea></label>
          <label class="field"><span>Finished build archive (optional)</span><input name="archive" type="file" accept=".zip,.exe,.msi"></label>
        </div>
        <footer class="modal-footer"><button class="btn primary" type="submit">Add to Awaiting UAT ${icon('arrow-right')}</button></footer>
      </form>`,'medium');
    document.getElementById('uat-new-project').onsubmit = event => {
      event.preventDefault();
      const form = event.currentTarget;
      const version = form.elements.version.value.trim();
      if (!version) {form.elements.version.focus();return;}
      const project = UatWorkflow.createAwaitingProject({
        version,
        description:form.elements.description.value.trim(),
        archive:form.elements.archive.files[0]?.name || ''
      });
      if (!project) return;
      app().closeModal();
      manager.openProject(project.id);
    };
  };

  manager.render = function () {
    const projects = workspace().projects.slice().sort(ProjectPriority.compare);
    const selected = projects.find(project => project.id === selectedProjectId && UatWorkflow.stage(project) === view);
    let content;
    if (selected) content = preparationView(selected);
    else if (view === 'awaiting') content = awaitingView(projects.filter(project => UatWorkflow.stage(project)==='awaiting'));
    else if (view === 'customer') content = customerView(projects.filter(project => UatWorkflow.stage(project)==='customer'));
    else content = testingView(projects.filter(activeStage));
    return `<div class="uat-overview uat-manager-overview">${stageHeading()}${content}</div>`;
  };

  manager.selectView = function (next) {
    if (workspace().role !== 'manager' || !['testing','customer','awaiting'].includes(next)) return;
    view = next;
    selectedProjectId = '';
    app().render();
    document.querySelector('.uat-manager-tabs [aria-pressed="true"]')?.focus({preventScroll:true});
  };

  manager.openProject = function (id) {
    const project = projectById(id);
    if (workspace().role !== 'manager' || !project) return;
    view = UatWorkflow.stage(project);
    selectedProjectId = id;
    app().render();
    document.querySelector('.uat-preparation-title h2')?.scrollIntoView({block:'nearest'});
  };

  manager.openProposal = manager.openProject;

  manager.sendProject = function (id) {
    const previousView = view;
    view = 'customer';
    selectedProjectId = '';
    if (!UatWorkflow.sendToCustomer(id)) view = previousView;
  };

  function generate(project, requirements) {
    if (workspace().role !== 'manager' || !project || !['awaiting','testing'].includes(UatWorkflow.stage(project)) || casesOf(project).some(testCase => testCase.source !== 'bug-retest' && testCase.status !== 'draft')) return;
    const plan = draftPlan(requirements);
    project.uat = {
      ...project.uat,
      stage:UatWorkflow.stage(project),
      requirements,
      gaps:plan.gaps,
      cases:casesOf(project).filter(testCase => testCase.source === 'bug-retest').concat(plan.cases.map((scenario,index) => ({
        ...scenario,
        steps:[...scenario.steps],
        id:`${project.id}-uat-${index+1}`,
        status:'draft'
      })))
    };
    project.updatedAt = new Date().toISOString();
    app().save();
    app().render();
    app().toast('UAT scenarios are ready for your review and team selection.');
  }

  manager.generate = async function (event, projectId) {
    event.preventDefault();
    const project = projectById(projectId);
    if (workspace().role !== 'manager' || !project) return;
    const form = event.currentTarget;
    const file = form.elements.requirements.files[0];
    if (!file) {
      generate(project, {name:'Sample software requirements.txt', text:sampleRequirements});
      return;
    }
    const managerId = workspace().user.id;
    const submit = form.querySelector('[type="submit"]');
    if (submit.disabled) return;
    submit.disabled = true;
    try {
      const text = /\.(txt|md|csv)$/i.test(file.name) ? (await file.slice(0, sourceLimit).text()).trim() : sampleRequirements;
      if (workspace().user.id === managerId) generate(project, {name:file.name, text});
    } catch {
      app().toast('Could not read the requirements document. Try another file.','error');
    } finally {
      submit.disabled = false;
    }
  };

  manager.useSample = function (projectId) {
    generate(projectById(projectId), {name:'Sample software requirements.txt', text:sampleRequirements});
  };

  manager.updateTesters = function (form) {
    const selected = new Set([...form.querySelectorAll('input[name="testerIds"]:checked')].map(input => input.value));
    for (const select of form.querySelectorAll('select[name^="assignee-"]')) {
      for (const option of select.options) option.disabled = !selected.has(option.value);
      if (!selected.has(select.value)) select.value = [...selected][0] || '';
    }
  };

  manager.approve = function (event, projectId) {
    event.preventDefault();
    if (workspace().role !== 'manager') return;
    const project = projectById(projectId);
    if (!project || !['awaiting','testing'].includes(UatWorkflow.stage(project))) return;
    const cases = casesOf(project).filter(testCase => testCase.status === 'draft');
    if (!cases.length) return;
    const form = event.currentTarget;
    const developerIds = [...form.querySelectorAll('input[name="developerIds"]:checked')].map(input => input.value);
    const testerIds = [...form.querySelectorAll('input[name="testerIds"]:checked')].map(input => input.value);
    if (!developerIds.length || !testerIds.length) {
      app().toast('Choose at least one developer and one tester to start UAT.','error');
      return;
    }
    const testers = new Set(testerIds);
    const next = [];
    for (const [index, testCase] of cases.entries()) {
      const field = name => form.elements[name + '-' + index];
      const checks = ['title','steps','data','expected','assignee'];
      const invalid = checks.map(field).find(input => !input.value.trim() || input.name.startsWith('assignee') && !testers.has(input.value));
      if (invalid) {
        invalid.closest('details').open = true;
        invalid.focus({preventScroll:true});
        invalid.scrollIntoView({block:'center',behavior:'instant'});
        app().toast('Complete each scenario and assign it to a tester selected for this project.','error');
        return;
      }
      next.push({
        ...testCase,
        title:field('title').value.trim(),
        steps:paragraphs(field('steps').value),
        testData:field('data').value.trim(),
        expected:field('expected').value.trim(),
        code:field('code').value.trim(),
        assigneeId:field('assignee').value,
        status:'pending'
      });
    }
    const updates = new Map(next.map(testCase => [testCase.id,testCase]));
    const combined = project.uat.cases.map(testCase => updates.get(testCase.id) || testCase);
    if (!UatWorkflow.startTesting(project.id, {cases:combined, developerIds, testerIds})) return;
    view = 'testing';
    selectedProjectId = '';
    app().render();
    app().toast('UAT started. Your selected team has project invitations ready to accept.');
  };
})();
