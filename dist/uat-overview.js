(function () {
  'use strict';

  const overview = window.UatOverview = {};
  const app = () => window.A;
  const state = () => app().state;
  const escape = value => app().escape(value);
  const icon = (name, size = 18) => app().icon(name, size);
  const generatedFor = new Set();
  const findingRank = {Critical:0, High:1, Medium:2, Low:3};
  const dateFormat = new Intl.DateTimeFormat(undefined, {month:'short', day:'numeric'});

  function dashboardData() {
    const {projects, issues, pending} = Workspaces.overviewData();
    const sorted = projects.slice().sort(ProjectPriority.compare);
    const active = sorted.filter(project => UatWorkflow.stage(project) !== 'awaiting' && ProjectPriority.of(project).key !== 'completed').sort(ProjectPriority.compareForRole);
    const completed = sorted.filter(project => ProjectPriority.of(project).key === 'completed');
    const activeIds = new Set(active.map(project => project.id));
    const activeIssues = issues.filter(issue => activeIds.has(issue.projectId));
    const open = activeIssues.filter(issue => issue.status !== 'Resolved');
    const newFeedback = (state().feedback || []).filter(item => activeIds.has(item.projectId) && item.status === 'New');
    const betaSessions = state().role === 'manager' ? Workspaces.betaFeedbackCount() : 0;
    return {active, completed, activeIssues, open, pending, newFeedback, betaSessions};
  }

  function action(label, symbol, handler, style = 'secondary') {
    return `<button class="btn ${style}" type="button" onclick="${handler}">${icon(symbol,16)}${escape(label)}</button>`;
  }

  function assignmentNotice(pending) {
    return pending.map(assignment => {
      const project = state().projects.find(item => item.id === assignment.projectId);
      const id = escape(JSON.stringify(assignment.id));
      return `<section class="card uat-assignment" aria-label="Pending project invitation">
        <span class="uat-assignment-icon">${icon('mail')}</span>
        <div><strong>${escape(project?.name || 'New project')}</strong><p>Accept your invitation to add this project to your active list.</p></div>
        <div class="uat-assignment-actions">
          ${action('View invitation','mail',`Workspaces.previewInvite(${id})`,'ghost')}
          ${action('Accept assignment','key',`Workspaces.acceptAssignment(${id})`)}
        </div>
      </section>`;
    }).join('');
  }

  function deadline(value) {
    if (!value) return '';
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value + 'T12:00:00' : value);
    return escape(Number.isNaN(date.getTime()) ? value : dateFormat.format(date));
  }

  function projectRow(project, pendingIds, openByProject) {
    const developer = state().role === 'developer';
    const priority = developer ? ProjectPriority.forDeveloper(project, state().user.id) : ProjectPriority.of(project);
    const complete = ProjectPriority.of(project).key === 'completed';
    const insights = UatWorkflow.insights(project, state().user.id);
    const progress = developer ? insights.developerPercent : insights.testingPercent;
    const reportedCount = state().issues.filter(issue => issue.projectId === project.id).length;
    const reportedLabel = reportedCount === 1 ? '1 bug has been reported' : `${reportedCount} bugs have been reported`;
    const mark = project.abbr || project.name.split(/\s+/).slice(0,2).map(word => word[0]).join('');
    const date = deadline(complete ? project.completedAt || project.deadline : project.deadline);
    const id = escape(JSON.stringify(project.id));
    const iconLabel = complete ? 'check-circle' : 'calendar';
    return `<li class="uat-project-row-entry">
      <button type="button" class="card uat-project-row" data-project-priority="${priority.key}" onclick="Workspaces.openProject(${id})">
        <span class="uat-project-mark" aria-hidden="true">${escape(mark)}</span>
        <span class="uat-project-info">
          <strong>${escape(project.name)}</strong>
          <span class="uat-project-description">${escape(project.description || '')}</span>
          ${developer && !complete ? `<span class="uat-project-current-status">${escape(insights.developerLabel)}</span>` : ''}
          <span class="uat-project-meta">
            ${project.version ? `<span>${escape(project.version)}</span>` : ''}
            ${date ? `<span>${icon(iconLabel,13)} ${complete ? 'Shipped' : 'Due'} ${date}</span>` : ''}
            ${pendingIds.has(project.id) ? '<span>Awaiting acceptance</span>' : ''}
          </span>
        </span>
        <span class="uat-project-status">
          ${ProjectPriority.badge(project, priority)}
          ${complete ? '' : `<span class="uat-project-progress-group"><span class="uat-project-progress-label">${developer ? 'Developer progress' : 'Testing progress'} <b>${progress}%</b></span><span class="uat-project-progress" role="progressbar" aria-label="${developer ? 'Developer progress' : 'Testing progress'}" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><span class="uat-project-meter"><span style="width:${progress}%"></span></span></span></span>
          ${developer ? `<span class="uat-project-testing-detail">Testing: ${insights.testingPassed} of ${insights.testingTotal} passed (${insights.testingPercent}%)</span>` : `<span class="uat-project-testing-detail">${insights.testingPassed} of ${insights.testingTotal} scenarios passed</span>`}
          <small>${reportedLabel}</small>`}
        </span>
        <span class="uat-project-open" aria-hidden="true">${icon('chevron-right',17)}</span>
      </button>
    </li>`;
  }

  overview.projectRows = function (projects, data = dashboardData()) {
    const pendingIds = new Set(data.pending.map(assignment => assignment.projectId));
    const openByProject = new Map();
    for (const issue of data.open) {
      openByProject.set(issue.projectId, (openByProject.get(issue.projectId) || 0) + 1);
    }
    return `<ul class="uat-project-stack">${projects.slice().sort(ProjectPriority.compareForRole).map(project => projectRow(project, pendingIds, openByProject)).join('')}</ul>`;
  };

  function projectSection(key, title, projects, data, emptyText) {
    return `<section class="uat-project-section" aria-labelledby="uat-${key}-heading">
      <h2 id="uat-${key}-heading">${title} <span class="count-bubble">${projects.length}</span></h2>
      ${projects.length ? overview.projectRows(projects, data) : `<p class="card uat-empty">${emptyText}</p>`}
    </section>`;
  }

  function retestSection() {
    if (state().role !== 'tester') return '';
    const personal = UatWorkflow.retestsForTester();
    const others = state().employees.filter(person => person.role === 'tester' && person.id !== state().user.id)
      .flatMap(person => UatWorkflow.retestsForTester(person.id)
        .filter(task => task.project.team.includes(state().user.id)).map(task => ({...task,person})));
    const target = task => escape(JSON.stringify(task.project.id)) + ',' + escape(JSON.stringify(task.test.id));
    const ready = personal.length ? `<section class="uat-project-section" aria-label="Fixes ready for your retest">
      <h2>Ready to retest <span class="count-bubble">${personal.length}</span></h2>
      <p class="muted">Development submitted a new build. Repeat the original case before manager approval.</p>
      <ul class="uat-retest-list">${personal.map(task => `<li class="card uat-retest-row">
        <div><strong>${escape(task.project.name)} · ${escape(task.test.title)}</strong>
        <p>${escape(task.issue.id)} · Build ${escape(task.test.buildVersion)}${task.test.status === 'blocked' ? ' · Retest blocked' : ''}</p></div>
        ${action(task.test.status === 'blocked' ? 'Continue retest' : 'Start retest','refresh-cw',`UatTester.startRetest(${target(task)})`,'primary')}
      </li>`).join('')}</ul></section>` : '';
    const assigned = others.length ? `<section class="uat-project-section" aria-label="Retests assigned to other testers">
      <h2>Retests assigned to another tester</h2>
      <ul class="uat-retest-list">${others.map(task => `<li class="card uat-retest-row">
        <div><strong>${escape(task.project.name)} · ${escape(task.test.title)}</strong>
        <p>Build ${escape(task.test.buildVersion)} · Assigned to ${escape(task.person.name)}</p></div>
        ${action('Open as '+task.person.name,'user',`UatTester.switchToRetest(${target(task)})`)}
      </li>`).join('')}</ul></section>` : '';
    return ready + assigned;
  }

  overview.render = function () {
    const data = dashboardData();
    const role = state().role;
    const testerActions = `
      ${action('Code analysis','code',"Workspaces.runAnalysis('code')")}
      ${action('GUI test','monitor',"Workspaces.runAnalysis('gui')")}
      ${action('Report a finding','plus','Workspaces.reportFinding()','primary')}`;
    const actions = role === 'manager' ? action('New project','plus','OwnerFlow.open()','primary')
      : role === 'tester' ? testerActions : '';
    return `<div class="uat-overview">
      <header class="uat-overview-header">
        <div><div class="eyebrow">USER ACCEPTANCE TESTING</div><h1>Project overview</h1><p>Review what’s in testing and what’s ready to ship.</p></div>
        <div class="uat-overview-actions">${actions}</div>
      </header>
      ${assignmentNotice(data.pending)}
      ${retestSection()}
      ${projectSection('active','Active projects',data.active,data,'No active projects yet.')}
      ${projectSection('completed','Finished projects',data.completed,data,'Completed projects will appear here.')}
    </div>`;
  };

  function metric(label, value, description, symbol, color, page) {
    return `<button type="button" class="card uat-metric" onclick="A.navigate('${page}')">
      <span class="uat-metric-label">${label}</span><span class="uat-metric-icon uat-metric-${color}">${icon(symbol,16)}</span>
      <strong>${String(value).padStart(2,'0')}</strong><small>${description}</small>
    </button>`;
  }

  function digestSummary(data) {
    if (!data.active.length) {
      const ready=data.completed.filter(project=>UatWorkflow.canSend(project));
      return ready.length ? `<p>${ready.length} ${ready.length===1?'project has':'projects have'} finished UAT with no unresolved bugs.</p><p>${escape(ready[0].name)} is ready for the manager to send to customer acceptance.</p>` : '<p>There are no active projects to summarize.</p>';
    }
    const {role, user} = state();
    const projects = new Map(data.active.map(project => [project.id, project]));
    const cases = data.active.flatMap(project => (project.uat?.cases || [])
      .filter(test => test.status !== 'draft' && (role !== 'tester' || test.assigneeId === user.id))
      .map(test => ({...test, project})));
    const issues = data.activeIssues.filter(issue => role !== 'developer' || issue.assignee === user.id);
    const sortIssues = list => list.slice().sort((a,b) =>
      (findingRank[a.severity] ?? Infinity) - (findingRank[b.severity] ?? Infinity) ||
      ProjectPriority.compare(projects.get(a.projectId), projects.get(b.projectId)));
    const actionable = sortIssues(issues.filter(issue => ['Open','In progress','Reopened'].includes(issue.status)));
    const retests = issues.filter(issue => issue.status === 'Awaiting retest');
    const reviews = issues.filter(issue => issue.status === 'In review');
    const passed = cases.filter(test => test.status === 'pass').length;
    const reportName = issue => `<strong>${escape(projects.get(issue.projectId)?.name)} · ${escape(issue.title)}</strong>`;
    const caseName = test => `<strong>${escape(test.project.name)} · ${escape(test.title)}</strong>`;
    const summary = `<p>${data.active.length} active ${data.active.length === 1 ? 'project' : 'projects'}. ${role === 'tester' ? `${passed} of your ${cases.length} assigned scenarios passed.` : `${passed} of ${cases.length} scenarios passed.`}</p>`;
    let focus, next;
    if (role === 'developer') {
      if (actionable.length) {
        const first = actionable[0];
        focus = `${actionable.length} ${actionable.length === 1 ? 'bug needs' : 'bugs need'} your fix. Start with ${reportName(first)} (${escape(first.severity.toLowerCase())}).`;
        next = 'Use the reported steps and expected result to check the change, then send a new build back to the tester.';
      } else {
        focus = 'No developer work is waiting.';
        next = retests.length ? `${retests.length} submitted ${retests.length === 1 ? 'fix is' : 'fixes are'} waiting for retest, including ${reportName(retests[0])}. The tester has the next action.`
          : reviews.length ? `${reviews.length} verified ${reviews.length === 1 ? 'fix is' : 'fixes are'} waiting for manager approval. ${reportName(reviews[0])} has already passed retesting.`
          : cases.some(test => test.status !== 'pass') ? 'Testers are still running the approved scenarios. A new bug report will appear in your findings if they need a change.'
          : 'The approved scenarios have passed. The manager can review the release and customer feedback.';
      }
    } else if (role === 'tester') {
      const retest = cases.find(test => test.status === 'retest');
      const pending = cases.find(test => test.status === 'pending');
      const waiting = cases.find(test => ['fail','blocked'].includes(test.status));
      if (retest) {
        focus = `Ready to retest: ${caseName(retest)}${retest.buildVersion ? ` on build ${escape(retest.buildVersion)}` : ''}.`;
        next = 'Repeat the original steps. Pass sends the verified fix to the manager; fail reopens the bug for the developer.';
      } else if (pending) {
        focus = `Next untested scenario: ${caseName(pending)}.`;
        next = `${cases.filter(test => test.status === 'pending').length} assigned scenarios have not been run. Record what happened and include the steps and evidence if a test fails.`;
      } else if (waiting) {
        focus = `${caseName(waiting)} is ${waiting.status === 'blocked' ? 'blocked' : 'waiting for a developer fix'}.`;
        next = 'Keep the current result until the blocker is removed or a new build is ready. There are no other untested scenarios assigned to you.';
      } else {
        focus = cases.length ? 'All your assigned scenarios have passed.' : 'There are no scenarios assigned to you on these projects.';
        next = reviews.length ? `${reviews.length} verified ${reviews.length === 1 ? 'fix is' : 'fixes are'} with the manager for approval. You can continue exploratory testing while the review is pending.`
          : 'You can explore beyond the checklist and report anything the approved scenarios did not cover.';
      }
    } else {
      const readyReviews = sortIssues(reviews.filter(issue => UatWorkflow.canReview(issue)));
      const readyProject = [...data.active,...data.completed].find(project => UatWorkflow.canSend(project));
      if (readyReviews.length) {
        focus = `${readyReviews.length} tester-verified ${readyReviews.length === 1 ? 'fix needs' : 'fixes need'} your approval. Review ${reportName(readyReviews[0])}.`;
      } else if (readyProject) {
        focus = `<strong>${escape(readyProject.name)}</strong> has passed every approved scenario and has no unresolved bugs. It is ready for customer acceptance.`;
      } else if (actionable.length) {
        focus = `${actionable.length} ${actionable.length === 1 ? 'bug is' : 'bugs are'} with developers. ${reportName(actionable[0])} is the highest priority (${escape(actionable[0].severity.toLowerCase())}).`;
      } else {
        focus = retests.length ? `${retests.length} submitted ${retests.length === 1 ? 'fix is' : 'fixes are'} waiting for tester verification.`
          : 'There are no developer fixes waiting. Testing or customer review is still in progress.';
      }
      const notPassed = cases.filter(test => test.status !== 'pass').length;
      next = notPassed ? `${notPassed} ${notPassed === 1 ? 'scenario still needs' : 'scenarios still need'} a passing result.`
        : cases.length ? 'Every approved scenario has a passing result.' : 'No approved scenarios are running on these projects.';
      const feedback = data.newFeedback.length + data.betaSessions;
      if (feedback) next += ` ${feedback} customer feedback ${feedback === 1 ? 'item is' : 'items are'} available to review before the release decision.`;
    }
    return summary + `<p>${focus}</p><p>${next}</p>`;
  }

  function digestOwner() {
    return state().role + '/' + state().user.id;
  }

  overview.rail = function () {
    const data = dashboardData();
    const tester = state().role === 'tester';
    const resolved = data.activeIssues.length - data.open.length;
    const generated = generatedFor.has(digestOwner());
    const feedbackCount = data.newFeedback.length + data.betaSessions;
    return `<aside class="uat-right-rail" aria-label="Workspace dashboard">
      <section class="card uat-digest" aria-labelledby="uat-digest-heading">
        <div class="uat-digest-title"><span class="uat-metric-icon uat-metric-purple">${icon('sparkles',18)}</span><h2 id="uat-digest-heading">AI digest</h2></div>
        <div class="uat-digest-summary" aria-live="polite">${generated ? digestSummary(data) : '<p>Summarize project priorities and what to review before shipment.</p>'}</div>
        ${action(generated ? 'Refresh digest' : 'Generate digest','sparkles','UatOverview.generateDigest(this)','primary')}
        <small>Simulated from workspace data</small>
      </section>
      <section aria-labelledby="uat-dashboard-heading" class="uat-metrics">
        <h2 id="uat-dashboard-heading">Dashboard</h2>
        ${metric(tester ? 'Projects to test' : 'Active projects',data.active.length,tester ? 'Your active quality assignments' : 'Releases in progress','grid','blue','projects')}
        ${metric('Open findings',data.open.length,`${resolved} resolved on active projects`,'bug','amber','issues')}
        ${metric('Customer feedback',feedbackCount,data.betaSessions ? `${data.betaSessions} submitted beta ${data.betaSessions === 1 ? 'session' : 'sessions'}` : 'Notes waiting for review','message-square','purple','feedback')}
      </section>
    </aside>`;
  };

  overview.generateDigest = function (button) {
    const summary = button.closest('.uat-digest').querySelector('.uat-digest-summary');
    button.disabled = true;
    summary.innerHTML = '<p>Preparing your digest…</p>';
    setTimeout(() => {
      if (!button.isConnected) return;
      generatedFor.add(digestOwner());
      summary.innerHTML = digestSummary(dashboardData());
      button.disabled = false;
      button.innerHTML = icon('sparkles',16) + 'Refresh digest';
    }, 450);
  };
})();
