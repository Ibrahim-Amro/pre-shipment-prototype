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
    const active = sorted.filter(project => UatWorkflow.stage(project) !== 'awaiting' && ProjectPriority.of(project).key !== 'completed');
    const completed = sorted.filter(project => ProjectPriority.of(project).key === 'completed');
    const activeIds = new Set(active.map(project => project.id));
    const activeIssues = issues.filter(issue => activeIds.has(issue.projectId));
    const open = activeIssues.filter(issue => issue.status !== 'Resolved');
    const newFeedback = (state().feedback || []).filter(item => activeIds.has(item.projectId) && item.status === 'New');
    const betaSessions = state().role === 'manager' ? Workspaces.betaFeedbackCount() : 0;
    return {active, completed, activeIssues, open, pending, newFeedback, betaSessions};
  }

  function action(label, symbol, handler, style = 'secondary') {
    return `<button class="btn ${style}" type="button" onclick="${handler}">${icon(symbol,16)}${label}</button>`;
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
    const priority = ProjectPriority.of(project);
    const complete = priority.key === 'completed';
    const progress = complete ? 100 : Math.max(0, Math.min(100, Number(project.progress ?? project.readiness) || 0));
    const openCount = openByProject.get(project.id) || 0;
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
          <span class="uat-project-meta">
            ${project.version ? `<span>${escape(project.version)}</span>` : ''}
            ${date ? `<span>${icon(iconLabel,13)} ${complete ? 'Shipped' : 'Due'} ${date}</span>` : ''}
            ${pendingIds.has(project.id) ? '<span>Awaiting acceptance</span>' : ''}
          </span>
        </span>
        <span class="uat-project-status">
          ${ProjectPriority.badge(project)}
          ${complete ? '' : `<span class="uat-project-progress" role="img" aria-label="${progress}% complete"><span class="uat-project-meter" aria-hidden="true"><span style="width:${progress}%"></span></span><span>${progress}%</span></span>
          <small>${openCount} open ${openCount === 1 ? 'finding' : 'findings'}</small>`}
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
    return `<ul class="uat-project-stack">${projects.map(project => projectRow(project, pendingIds, openByProject)).join('')}</ul>`;
  };

  function projectSection(key, title, projects, data, emptyText) {
    return `<section class="uat-project-section" aria-labelledby="uat-${key}-heading">
      <h2 id="uat-${key}-heading">${title} <span class="count-bubble">${projects.length}</span></h2>
      ${projects.length ? overview.projectRows(projects, data) : `<p class="card uat-empty">${emptyText}</p>`}
    </section>`;
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
    const top = data.active.slice().sort(ProjectPriority.compareUrgency)[0];
    if (!top) return '<p>There are no active projects to summarize.</p>';
    const priority = ProjectPriority.of(top);
    const blockers = data.open.filter(issue => issue.projectId === top.id).sort((a,b) =>
      (findingRank[a.severity] ?? Infinity) - (findingRank[b.severity] ?? Infinity));
    const first = blockers[0];
    const urgentCount = data.active.filter(project => ProjectPriority.of(project).key === 'urgent').length;
    const next = state().role === 'manager' ? 'Review open findings and any customer notes before approving shipment.'
      : state().role === 'tester' ? 'Verify the highest-priority customer workflow and capture evidence for the team.'
      : 'Start with the highest-priority finding and submit your fix for review.';
    return `<p><strong>${urgentCount ? `${urgentCount} urgent ${urgentCount === 1 ? 'project' : 'projects'}` : 'No urgent projects'}</strong> across ${data.active.length} active ${data.active.length === 1 ? 'project' : 'projects'}.</p>
      <p>Start with <strong>${escape(top.name)}</strong> (${escape(priority.label)}).${first ? ` Review ${escape(first.title)}.` : ''}</p>
      <p>${next}</p>`;
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
