(function () {
  'use strict';

  const tester = window.UatTester = {};
  const app = () => window.A;
  const escape = value => app().escape(value);
  const icon = (name, size = 16) => app().icon(name, size);
  const states = {
    pending: ['To do', 'blue'],
    pass: ['Passed', 'green'],
    fail: ['Failed', 'red'],
    blocked: ['Blocked', 'amber'],
    retest: ['Ready to retest', 'purple']
  };
  const canExecute = testCase => ['pending', 'blocked', 'retest'].includes(testCase.status);

  function badge(testCase) {
    const bug = app().state.issues.find(issue => issue.id === testCase.bugId);
    if (testCase.status === 'pass' && bug?.status === 'In review') return app().badge('Awaiting manager approval','purple');
    return app().badge(...(states[testCase.status] || states.pending));
  }

  function projectById(projectId) {
    return app().state.projects.find(project => project.id === projectId);
  }

  tester.openProject = function (projectId, caseId) {
    const project = projectById(projectId);
    if (!project || app().state.role !== 'tester' || !Workspaces.hasAcceptedProject(project.id)) return;
    const assigned = UatWorkflow.casesForProject(project.id);
    const team = project.team.map(id => app().state.employees.find(person => person.id === id)).filter(Boolean);
    let selectedId = assigned.find(testCase => testCase.id === caseId)?.id ||
      assigned.find(canExecute)?.id ||
      assigned[0]?.id;

    app().modal(`<header class="modal-header uat-tester-header">
      <div><div class="eyebrow">TESTER PROJECT</div><h2>${escape(project.name)}</h2><p>${escape(project.version || '')} · User acceptance testing</p></div>
      <div class="uat-tester-actions">
        <button type="button" class="btn secondary" id="uat-exploratory">${icon('bug')} Report an exploratory finding</button>
        <button type="button" class="icon-btn" aria-label="Close test project" onclick="A.closeModal()">${icon('x', 20)}</button>
      </div>
    </header>
    <div class="uat-tester-body">
      <section class="uat-test-detail" id="uat-test-detail" aria-label="Test instructions"></section>
      <div class="uat-tester-side">
        <details class="uat-project-team-disclosure" open><summary><span><strong>Project team</strong><small>${team.length} teammates</small></span><span class="uat-team-avatars">${team.slice(0,4).map(person=>app().avatar(person,24)).join('')}</span></summary>${Workspaces.projectTeam(project.id)}</details>
        <aside class="uat-test-queue" aria-labelledby="uat-test-queue-heading">
        <h3 id="uat-test-queue-heading">Assigned test cases</h3>
        <p>Manager-approved AI scenarios</p>
        <ol id="uat-test-queue-list"></ol>
      </aside></div>
    </div>`, 'wide uat-tester-modal');

    const detail = document.getElementById('uat-test-detail');
    const queue = document.getElementById('uat-test-queue-list');
    document.getElementById('uat-exploratory').onclick = () => Workspaces.reportFinding(project.id);

    function render(focusCase = false) {
      const cases = UatWorkflow.casesForProject(project.id);
      const selected = cases.find(testCase => testCase.id === selectedId);
      queue.innerHTML = cases.map((testCase, index) =>
        `<li><button type="button" data-case-index="${index}" aria-pressed="${selectedId === testCase.id}">
          <span class="uat-case-number">${String(index + 1).padStart(2, '0')}</span>
          <span><strong>${escape(testCase.title)}</strong>${badge(testCase)}</span>
        </button></li>`
      ).join('');
      detail.innerHTML = selected ? caseDetail(selected) : `<div class="uat-tester-empty">
        ${icon('clipboard-check', 24)}<h3>No cases assigned yet</h3>
        <p>Approved scenarios appear here when the manager assigns them to you.</p>
      </div>`;
      if (focusCase) detail.querySelector('h3').focus();
      queue.onclick = event => {
        const button = event.target.closest('[data-case-index]');
        if (!button) return;
        selectedId = cases[Number(button.dataset.caseIndex)].id;
        render(true);
      };

      if (!selected) return;
      detail.querySelectorAll('[data-outcome]').forEach(button => {
        button.onclick = () => {
          const outcome = button.dataset.outcome;
          if (outcome === 'fail') showFailure(detail, project.id, selected.id, record);
          else record(outcome);
        };
      });

      function record(outcome, details = {}) {
        const isRetest = Boolean(selected.bugId && selected.buildVersion);
        if (!UatWorkflow.recordOutcome(project.id, selected.id, outcome, details)) {
          app().toast('This test result could not be saved. Reopen the project and try again.', 'error');
          return false;
        }
        app().render();
        render(true);
        const message = outcome === 'pass' ? (isRetest ? 'Fix verified and sent to the manager for approval.' : 'Test passed.')
          : outcome === 'blocked' ? 'Test marked blocked.'
            : isRetest ? 'Bug reopened and sent back to development.' : 'Bug report sent to development.';
        app().toast(message);
        return true;
      }
    }

    tester.onWorkspaceSync=()=>{
      if(!detail.isConnected)return false;
      if(detail.querySelector('.uat-failure-form'))return true;
      const detailScroll=detail.scrollTop;
      const side=document.querySelector('.uat-tester-side');
      const sideScroll=side?.scrollTop||0;
      render();
      detail.scrollTop=detailScroll;
      if(side)side.scrollTop=sideScroll;
      return true;
    };
    render();
  };

  function caseDetail(testCase) {
    const retest = testCase.status === 'retest' || (testCase.status === 'blocked' && testCase.bugId && testCase.buildVersion);
    const editable = canExecute(testCase);
    const steps = Array.isArray(testCase.steps) ? testCase.steps : String(testCase.steps || '').split('\n');
    return `<div class="uat-case-heading"><div><span class="eyebrow">${retest ? 'FIX RETEST' : 'TEST CASE'}</span>
      <h3 tabindex="-1">${escape(testCase.title)}</h3></div>${badge(testCase)}</div>
      ${retest ? `<div class="info-box uat-retest-build">${icon('refresh-cw')}<span>Retest the original steps on build <strong>${escape(testCase.buildVersion || 'submitted by development')}</strong>.</span></div>` : ''}
      <section class="uat-case-section"><h4>Instructions</h4>
        <ol>${steps.filter(Boolean).map(step => `<li>${escape(step)}</li>`).join('')}</ol>
      </section>
      <section class="uat-case-section uat-case-expectations"><div><h4>Required test data</h4><p>${escape(testCase.testData)}</p></div>
        <div><h4>Expected result</h4><p>${escape(testCase.expected)}</p></div>
      </section>
      <details class="uat-case-code"><summary>${icon('code')} View code snippet</summary><pre><code>${escape(testCase.code)}</code></pre></details>
      ${editable ? `<div class="uat-result-actions" aria-label="Record result">
        <button type="button" class="btn primary" data-outcome="pass">${icon('check')} Pass</button>
        <button type="button" class="btn secondary uat-fail-action" data-outcome="fail">${icon('bug')} Fail</button>
        <button type="button" class="btn secondary" data-outcome="blocked">${icon('alert-circle')} Blocked</button>
      </div>` : testCase.status === 'fail' ? '<p class="uat-case-message">This case will return to your queue after development submits a fix.</p>'
        : app().state.issues.some(issue => issue.id === testCase.bugId && issue.status === 'In review')
          ? '<p class="uat-case-message">You verified the fix. The manager will review it for approval.</p>'
          : '<p class="uat-case-message">This test case passed.</p>'}
      <div id="uat-failure"></div>`;
  }

  function showFailure(detail, projectId, caseId, record) {
    const region = detail.querySelector('#uat-failure');
    const actions = detail.querySelector('.uat-result-actions');
    const existingForm = region.querySelector('form');
    if (existingForm) {
      (region.querySelector('[data-send]') || existingForm.elements.description).focus();
      return;
    }

    actions.hidden = true;
    region.innerHTML = `<form class="uat-failure-form">
      <h4>Describe the failure</h4>
      <label class="field">What happened?
        <textarea name="description" rows="3" required maxlength="2000" placeholder="Describe what you observed and where it differed from the expected result."></textarea>
      </label>
      <label class="field">Screenshot or screen recording (optional)
        <input name="evidence" type="file" accept="image/*,video/*">
      </label>
      <p class="muted">Attachments up to 25 MB are saved in this browser.</p>
      <div class="uat-result-actions">
        <button type="submit" class="btn primary">${icon('sparkles')} Generate bug report</button>
        <button type="button" class="btn secondary" data-cancel>Cancel</button>
      </div>
    </form><div id="uat-bug-draft"></div>`;
    const form = region.querySelector('form');
    form.elements.description.focus();
    form.querySelector('[data-cancel]').onclick = () => {
      region.replaceChildren();
      actions.hidden = false;
      actions.querySelector('[data-outcome="fail"]').focus();
    };
    form.onsubmit = event => {
      event.preventDefault();
      const description = form.elements.description.value.trim();
      if (!description) {
        form.elements.description.setCustomValidity('Describe what happened during the test.');
        form.elements.description.reportValidity();
        return;
      }
      const file = form.elements.evidence.files[0];
      const evidence = file?.name || '';
      const details = {description, evidence};
      const report = UatWorkflow.draftFailure(projectId, caseId, details);
      if (!report) {
        app().toast('The report could not be drafted for this case.', 'error');
        return;
      }
      form.hidden = true;
      const preview = region.querySelector('#uat-bug-draft');
      preview.innerHTML = bugDraft(report);
      const send = preview.querySelector('[data-send]');
      const edit = preview.querySelector('[data-edit]');
      const message = preview.querySelector('[role="alert"]');
      let evidenceId;
      send.onclick = async () => {
        if (send.disabled) return;
        send.disabled = true;
        edit.disabled = true;
        message.textContent = '';
        try {
          if (file && !evidenceId) evidenceId = await UatWorkflow.storeEvidence(file);
          if (record('fail', {...details, evidenceId, report})) return;
        } catch (error) {
          message.textContent = error.message || 'The attachment could not be saved. Try again or remove the file.';
        }
        send.disabled = false;
        edit.disabled = false;
      };
      edit.onclick = () => {
        preview.replaceChildren();
        form.hidden = false;
        form.elements.description.focus();
      };
      preview.querySelector('h4').focus();
    };
    form.elements.description.oninput = () => form.elements.description.setCustomValidity('');
  }

  function bugDraft(report) {
    const steps = Array.isArray(report.steps) ? report.steps : String(report.steps || '').split('\n');
    return `<section class="uat-bug-draft">
      <span class="eyebrow">SIMULATED AI BUG REPORT</span><h4 tabindex="-1">${escape(report.title)}</h4>
      <p>${escape(report.description)}</p>
      <strong>Steps to reproduce</strong><ol>${steps.filter(Boolean).map(step => `<li>${escape(step.replace(/^\d+[.)]\s*/, ''))}</li>`).join('')}</ol>
      <dl><dt>Expected</dt><dd>${escape(report.expected)}</dd><dt>Actual</dt><dd>${escape(report.actual)}</dd>
        ${report.evidence ? `<dt>Evidence</dt><dd>${escape(report.evidence)}</dd>` : ''}</dl>
      <div class="uat-result-actions">
        <button type="button" class="btn primary" data-send>${icon('send')} Send bug report</button>
        <button type="button" class="btn secondary" data-edit>Edit evidence</button>
      </div>
      <p role="alert"></p>
    </section>`;
  }
})();
