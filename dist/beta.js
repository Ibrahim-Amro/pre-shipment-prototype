'use strict';

window.initBeta = function ({A, app, state, icon, esc, brand, titlebar, closeBtn, capitalize, renderLogin, showSplash, readWorkspace}) {
  const betaParams = new URLSearchParams(location.search);
  const embeddedCustomer=betaParams.get('multiView')==='1'&&betaParams.get('workspaceRole')==='customer';
  const embeddedProjectId=embeddedCustomer?betaParams.get('project'):null;
  const betaSessionKey=embeddedCustomer?'pre-shipment-beta-panel-'+embeddedProjectId:'pre-shipment-beta-session';
  const setupSteps = [
    [0, 'Downloading beta package'],
    [36, 'Setting up requirements'],
    [72, 'Starting the beta application']
  ];
  let betaSession;
  let setupGeneration=0;
  let entryProjectId = null;
  let entrySignature = '';
  // Refresh returns to beta entry; existing customer work remains saved until Open.
  let awaitingHomeEntry=performance.getEntriesByType('navigation')[0]?.type==='reload'||betaParams.get('home')==='1';
  const customerAvailable=project=>UatWorkflow.customerAvailable?.(project) ?? UatWorkflow.stage(project)==='customer';

  function betaKey(project) {
    return project.betaKey || 'BETA-' + project.id.toUpperCase();
  }

  function invitationUrl(id) {
    const url = new URL(location.pathname, location.href);
    url.searchParams.set('customer', '1');
    if (id) url.searchParams.set('project', id);
    return url;
  }

  function projectManager(project, workspace) {
    return project.team.map(id => workspace.employees.find(employee => employee.id === id))
      .find(employee => employee?.role === 'manager') ||
      workspace.employees.find(employee=>employee.role==='manager'&&employee.available!==false) ||
      workspace.employees.find(employee=>employee.role==='manager');
  }

  function saveBetaSession() {
    if(A.isWorkspaceCurrent?.()===false)return false;
    sessionStorage.setItem(betaSessionKey, JSON.stringify(betaSession));
    return true;
  }

  function readBetaSession() {
    try { return JSON.parse(sessionStorage.getItem(betaSessionKey)); }
    catch { return null; }
  }

  // Compare only visible invitation details so unrelated staff activity does not
  // replace a customer's half-entered key or clear validation feedback.
  function invitationSignature(projects, pinnedId) {
    return JSON.stringify(projects.filter(project => customerAvailable(project) && (!pinnedId || project.id === pinnedId))
      .map(project => [project.id, project.name, betaKey(project), Boolean(project.uat?.earlyBeta?.unfinished)]));
  }

  function pinnedProjectId() {
    return embeddedProjectId || betaParams.get('project') || (betaParams.has('betaSession') ? betaSession?.projectId : null);
  }

  function localDate() {
    const now = new Date();
    return [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('-');
  }

  function changeTaskStatus(task, status) {
    if (status === 'done' && task.status !== 'done') task.previousStatus = task.status;
    if (status !== 'done') delete task.previousStatus;
    task.status = status;
  }

  const Beta = window.Beta = {
    startEmbedded(projectId) {
      const project=state.projects.find(item=>item.id===projectId);
      if(awaitingHomeEntry){
        setupGeneration++;
        renderEmbeddedWaiting(project);
        return;
      }
      if(!project||!customerAvailable(project)){
        setupGeneration++;
        renderEmbeddedWaiting(project);
        return;
      }
      if(!betaSession){
        betaSession=readBetaSession();
        if(!betaSession||betaSession.projectId!==projectId){
          betaSession=null;
          renderEmbeddedWaiting(project);
          return;
        }
      }
      if(betaSession.stage==='finished')renderBetaConfirmation();
      else if(betaSession.stage==='active')renderBetaApp();
      else renderBetaSetup(project);
    },

    onWorkspaceSync() {
      if(!embeddedCustomer){
        if(document.getElementById('beta-entry-heading')){
          const pinned = pinnedProjectId();
          if(invitationSignature(state.projects, pinned) !== entrySignature){
            const selected = pinned || state.projects.find(item => item.id === entryProjectId && customerAvailable(item))?.id;
            renderLogin('beta', selected);
          }
        }else if(betaSession?.stage === 'active' && document.querySelector('.beta-topbar')){
          updateBetaStatus();
        }
        return;
      }
      const project=state.projects.find(item=>item.id===embeddedProjectId);
      const waiting=document.getElementById('beta-embedded-waiting');
      if(!customerAvailable(project)){
        if(waiting?.dataset.ready!=='false'){
          setupGeneration++;
          if(document.querySelector('.planner-task-dialog')) A.closeModal();
          renderEmbeddedWaiting(project);
        }
      }else if(waiting && (waiting.dataset.ready!=='true' || entrySignature!==invitationSignature(state.projects, embeddedProjectId))){
        Beta.startEmbedded(embeddedProjectId);
      }else if(!waiting && betaSession?.stage==='active'){
        updateBetaStatus();
      }
    },

    restartEmbedded() {
      if(!embeddedCustomer)return;
      sessionStorage.removeItem(betaSessionKey);
      betaSession=null;
      Beta.startEmbedded(embeddedProjectId);
    },

    entryChoices() {
      return `<div class="eyebrow">PRE-SHIPMENT BY PFIZER</div>
        <h2>Welcome to Pre-Shipment.</h2><p>Choose how you’d like to continue.</p>
        <div class="login-choices">
          <button class="btn primary" aria-labelledby="employee-choice" aria-describedby="employee-choice-description" onclick="Beta.showEmployee()"><span class="beta-entry-icon">${icon('users',20)}</span><span><strong id="employee-choice">Sign In</strong><small id="employee-choice-description">Manager, developer, and tester</small></span>${icon('arrow-right',17)}</button>
          <button class="btn secondary" aria-labelledby="beta-choice" aria-describedby="beta-choice-description" onclick="Beta.showKey()"><span class="beta-entry-icon">${icon('external-link',20)}</span><span><strong id="beta-choice">Open Your Beta Version</strong><small id="beta-choice-description">For customers with a beta access key</small></span>${icon('arrow-right',17)}</button>
        </div>`;
    },

    backButton() {
      return `<button type="button" class="btn link login-back" onclick="Beta.showChoices()">${icon('arrow-right',14)} Back to options</button>`;
    },

    showChoices() {
      renderLogin();
      document.querySelector('.login-choices button').focus();
    },

    showEmployee() {
      renderLogin('employee');
      document.getElementById('login-user').focus();
    },

    showKey() {
      renderLogin('beta', pinnedProjectId());
      (document.getElementById('beta-key') || document.getElementById('beta-entry-heading'))?.focus();
    },

    keyForm(id) {
      const workspace = readWorkspace() || state;
      const available = workspace.projects.filter(project => customerAvailable(project));
      const project = id ? available.find(item => item.id === id) : available[0];
      entryProjectId = project?.id || id || null;
      entrySignature = invitationSignature(workspace.projects, pinnedProjectId());
      if (!project) {
        return `${embeddedCustomer?'':Beta.backButton()}<div class="eyebrow">CUSTOMER BETA ACCESS</div><h2 id="beta-entry-heading" tabindex="-1">Your beta is being prepared.</h2>
          <p>${betaSession && betaSession.projectId === id ? 'Customer access is paused. Your saved session will be available here when the manager reopens the beta.' : 'This page will update when the manager opens customer access.'}</p>`;
      }
      return `${embeddedCustomer?'':Beta.backButton()}<div class="eyebrow">CUSTOMER BETA ACCESS</div>
        <h2 id="beta-entry-heading" tabindex="-1">Open Your Beta Version</h2>
        <p>Your demo access key for ${esc(project.name)} is ready.</p>${project.uat?.earlyBeta?.unfinished ? '<div class="warning-box" role="status"><strong>Early beta · UAT unfinished</strong><p>Testing and fixes are still in progress. This beta has not passed internal UAT.</p></div>' : ''}
        <form onsubmit="Beta.launch(event)">
          ${available.length > 1 && !pinnedProjectId() ? `<div class="field"><label for="beta-project">Project</label><select id="beta-project" name="project" onchange="Beta.selectCustomerProject(this.value)">${available.map(item => `<option value="${esc(item.id)}"${item.id === project.id ? ' selected' : ''}>${esc(item.name)}</option>`).join('')}</select></div>` : `<input type="hidden" name="project" value="${esc(project.id)}">`}
          <div class="field"><label for="beta-key">Beta access key</label><input id="beta-key" name="key" value="${esc(betaKey(project))}" autocomplete="off" spellcheck="false" required aria-describedby="beta-key-error"></div>
          <div id="beta-key-error" class="login-error" role="alert"></div>
          <button class="btn primary login-submit">Open ${esc(project.name)} ${icon('external-link',16)}</button>
        </form>`;
    },

    selectCustomerProject(id) {
      renderLogin('beta', id);
      document.getElementById('beta-key')?.focus();
    },

    launch(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const input = form.elements.key;
      const error = document.getElementById('beta-key-error');
      const workspace = readWorkspace() || state;
      const requestedId = form.elements.project?.value || betaParams.get('project');
      const key = input.value.trim().toUpperCase();
      const project = workspace.projects.find(item => customerAvailable(item) && (!requestedId || item.id === requestedId) && betaKey(item) === key);
      if (!project) {
        error.textContent = 'That key does not match this beta invitation. Check the key and try again.';
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');
      const saved=readBetaSession();
      const resume=awaitingHomeEntry && saved?.projectId===project.id &&
        (embeddedCustomer || saved.id===betaParams.get('betaSession'));
      const session = resume ? saved : {
        id: 'beta-' + Array.from(crypto.getRandomValues(new Uint32Array(3)), value => value.toString(36)).join('-'),
        projectId: project.id,
        stage: 'setup',
        planner: null,
        notes: [],
        draft: {type: 'Suggestion', title: '', body: ''}
      };
      awaitingHomeEntry=false;
      if(embeddedCustomer){
        betaSession=session;saveBetaSession();
        if(session.stage==='finished')renderBetaConfirmation();
        else if(session.stage==='active')renderBetaApp();
        else renderBetaSetup(project);
        return;
      }
      if(resume){
        betaSession=session;
        if(session.stage==='finished')renderBetaConfirmation();
        else if(session.stage==='active')renderBetaApp();
        else renderBetaSetup(project);
        return;
      }
      const url = new URL(location.pathname, location.href);
      url.searchParams.set('betaSession', session.id);
      // A new window initially copies its opener's session storage.
      const previousSession=sessionStorage.getItem(betaSessionKey);
      sessionStorage.setItem(betaSessionKey, JSON.stringify(session));
      const popup = window.open(url.href, '_blank', 'popup,width=1200,height=820,resizable,scrollbars');
      if (!popup) {
        session.sameTab = true;
        sessionStorage.setItem(betaSessionKey, JSON.stringify(session));
        location.assign(url.href);
        return;
      }
      if(previousSession)sessionStorage.setItem(betaSessionKey,previousSession);
      else sessionStorage.removeItem(betaSessionKey);
      error.textContent = '';
      form.reset();
      A.toast('Your beta is opening in a new window');
    },

    openInvitation(id) {
      window.open(invitationUrl(id).href, '_blank', 'noopener');
    },

    windowCloseLabel() {
      return embeddedCustomer || betaSession?.sameTab ? 'Return to beta entry' : 'Close beta window';
    },

    closeWindow() {
      if(embeddedCustomer){
        awaitingHomeEntry=true;
        setupGeneration++;
        renderEmbeddedWaiting(state.projects.find(project => project.id===embeddedProjectId));
      }else if(betaSession?.sameTab){
        if(betaSession.stage==='finished') location.replace(invitationUrl(betaSession.projectId).href);
        else {
          awaitingHomeEntry=true;
          setupGeneration++;
          renderLogin('beta', betaSession.projectId);
        }
      }else window.close();
    },

    prepareInvitation(project) {
      if (state.role !== 'manager' || !customerAvailable(project)) return;
      if (!project.betaKey) {
        do {
          const number = crypto.getRandomValues(new Uint32Array(1))[0];
          project.betaKey = 'BETA-' + number.toString(16).padStart(8, '0').toUpperCase();
        } while (state.projects.some(item => item !== project && betaKey(item) === project.betaKey));
      }
      const url = invitationUrl(project.id).href;
      const key = betaKey(project);
      project.customerLink = url;
      project.customerEmail = {
        to: project.customerEmail?.to || 'customer@example.com',
        subject: `Customer acceptance · ${project.name}`,
        body: `Hi,

${project.uat?.earlyBeta?.unfinished ? `${project.name} is available as an early beta. WARNING: internal UAT is not finished and known issues may remain. This invitation does not mean the release has passed UAT.` : `${project.name} has completed internal UAT and is ready for your acceptance review.`} Open the link and enter your beta access key. Add notes as you explore and send them together when you finish.

Open your beta: ${url}
Beta access key: ${key}

${projectManager(project, state)?.name || 'Project manager'} · Pre-Shipment`
      };
    },

    previewInvitation(id) {
      const project = state.projects.find(item => item.id === id);
      if (state.role !== 'manager' || !customerAvailable(project)) return;
      if (!project.customerEmail) {
        Beta.prepareInvitation(project);
        A.save();
      }
      const url = invitationUrl(id).href;
      const key = betaKey(project);
      const draft = project.customerEmail;
      if (!draft.to?.trim()) draft.to = 'customer@example.com';
      A.modal(`<div class="modal-header"><h2>Customer acceptance email draft</h2>${closeBtn()}</div>
        <form id="beta-invitation-form">
          <div class="modal-body">
            <div class="field"><label for="beta-invite-to">To</label><input id="beta-invite-to" name="to" type="email" value="${esc(draft.to)}" placeholder="customer@example.com" required></div>
            <div class="field"><label for="beta-invite-subject">Subject</label><input id="beta-invite-subject" name="subject" value="${esc(draft.subject)}" required></div>
            ${project.uat?.earlyBeta?.unfinished ? '<div class="warning-box" role="status"><strong>Early beta · UAT unfinished</strong><p>This invitation shares an unfinished release. Testing and bug fixes are still required.</p></div>' : ''}
            <div class="field beta-email-message"><label for="beta-invite-draft">Email draft</label><textarea id="beta-invite-draft" name="body" rows="12" required>${esc(draft.body)}</textarea></div>
            <div class="field"><label for="beta-invite-url">Beta invitation link</label><div class="row"><input id="beta-invite-url" readonly value="${esc(url)}"><button type="button" class="btn" onclick="A.copy(document.getElementById('beta-invite-url').value)">Copy link</button></div></div>
            <div class="field"><label for="beta-invite-key">Beta access key</label><div class="row"><input id="beta-invite-key" readonly value="${esc(key)}"><button type="button" class="btn" onclick="A.copy(document.getElementById('beta-invite-key').value)">Copy key</button></div></div>
            <p class="muted">Email delivery is simulated in this prototype.</p>
          </div><div class="modal-footer">
            <button type="button" class="btn" onclick="A.closeModal()">${icon('arrow-left',14)} Back</button>
            <button class="btn primary">${icon('send',14)} Send email</button>
          </div>
        </form>`, 'wide beta-email-composer');
      const message = document.getElementById('beta-invite-draft');
      const fitMessage = () => {message.style.height='auto';message.style.height=message.scrollHeight+'px';};
      fitMessage();
      message.addEventListener('input', fitMessage);
      message.addEventListener('input', () => message.setCustomValidity(''));
      document.getElementById('beta-invite-subject').oninput = event => event.target.setCustomValidity('');
      document.getElementById('beta-invitation-form').onsubmit = event => {
        event.preventDefault();
        const fields = event.currentTarget.elements;
        for (const field of [fields.subject, fields.body]) field.setCustomValidity(field.value.trim() ? '' : 'Enter visible text.');
        if (!event.currentTarget.reportValidity()) return;
        if(!A.refreshWorkspace()) return;
        const current = state.projects.find(item => item.id===id);
        if(!customerAvailable(current)){
          A.toast('Customer access is paused. Reopen the beta before sending its invitation.', 'error');
          return;
        }
        current.customerEmail = {to:fields.to.value, subject:fields.subject.value.trim(), body:fields.body.value.trim(), sentAt:new Date().toISOString()};
        if(A.save()===false) return;
        A.toast('Customer invitation added to the simulated outbox');
      };
    },

    plannerNavigate(view) {
      betaSession.planner.view = view;
      saveBetaSession();
      renderBetaApp();
    },

    plannerMode(mode) {
      betaSession.planner.mode = mode;
      saveBetaSession();
      renderBetaApp();
    },

    plannerSearch(value) {
      betaSession.planner.query = value;
      saveBetaSession();
      renderPlannerContent();
    },

    plannerFilter(value) {
      betaSession.planner.priority = value;
      saveBetaSession();
      renderPlannerContent();
    },

    clearPlannerFilters() {
      Object.assign(betaSession.planner,{query:'',priority:'all'});
      saveBetaSession();
      renderBetaApp();
      document.querySelector('.planner-search input')?.focus();
    },

    plannerToggle(id) {
      const task = betaSession.planner.tasks.find(item => item.id === id);
      if (!task) return;
      changeTaskStatus(task, task.status === 'done' ? task.previousStatus || 'planned' : 'done');
      saveBetaSession();
      renderBetaApp();
      A.toast(task.status === 'done' ? 'Task completed' : 'Task moved back to your plan');
    },

    plannerMove(id, status) {
      const task = betaSession.planner.tasks.find(item => item.id === id);
      if (!task || !['planned','today','done'].includes(status)) return;
      changeTaskStatus(task, status);
      saveBetaSession();
      renderBetaApp();
    },

    plannerEdit(id) {
      const task = betaSession.planner.tasks.find(item => item.id === id);
      const draft = task || {title:'', notes:'', priority:'normal', due:localDate(), status:'today'};
      A.modal(`<div class="modal-header"><h2>${task ? 'Edit task' : 'New task'}</h2>${closeBtn()}</div>
        <form id="planner-task-form"><div class="modal-body">
          <div class="field"><label for="planner-task-title">Task name</label><input id="planner-task-title" name="title" maxlength="100" value="${esc(draft.title)}" required></div>
          <div class="field"><label for="planner-task-notes">Notes</label><textarea id="planner-task-notes" name="notes" maxlength="600" rows="3">${esc(draft.notes)}</textarea></div>
          <div class="grid-2"><div class="field"><label for="planner-task-due">Due date</label><input id="planner-task-due" name="due" type="date" value="${esc(draft.due)}"></div>
          <div class="field"><label for="planner-task-priority">Priority</label><select id="planner-task-priority" name="priority">${['high','normal','low'].map(priority => `<option value="${priority}"${draft.priority === priority ? ' selected' : ''}>${capitalize(priority)}</option>`).join('')}</select></div></div>
          <div class="field"><label for="planner-task-status">Status</label><select id="planner-task-status" name="status">${Object.entries({today:'My day',planned:'Planned',done:'Completed'}).map(([value,label]) => `<option value="${value}"${draft.status === value ? ' selected' : ''}>${label}</option>`).join('')}</select></div>
        </div><div class="modal-footer">${task ? '<button type="button" class="btn" id="planner-delete-task">Delete task</button>' : ''}<span class="spacer"></span><button type="button" class="btn" onclick="A.closeModal()">Cancel</button><button class="btn primary">Save task</button></div></form>`, 'planner-task-dialog');
      fitPlannerDialog();
      document.getElementById('planner-task-form').onsubmit = event => {
        event.preventDefault();
        const fields = event.currentTarget.elements;
        if (!fields.title.value.trim()) {
          fields.title.setCustomValidity('Enter a task name.');
          fields.title.reportValidity();
          return;
        }
        const values = {title:fields.title.value.trim(), notes:fields.notes.value.trim(), due:fields.due.value, priority:fields.priority.value, status:fields.status.value};
        if (task) {
          changeTaskStatus(task, values.status);
          Object.assign(task, values);
        }
        else betaSession.planner.tasks.unshift({id:'task-' + crypto.getRandomValues(new Uint32Array(1))[0].toString(36), ...values});
        saveBetaSession();
        A.closeModal();
        renderBetaApp();
        A.toast(task ? 'Task updated' : 'Task added to your plan');
      };
      document.getElementById('planner-task-title').oninput = event => event.target.setCustomValidity('');
      if (task) document.getElementById('planner-delete-task').onclick = () => {
        betaSession.planner.tasks = betaSession.planner.tasks.filter(item => item.id !== task.id);
        saveBetaSession();
        A.closeModal();
        renderBetaApp();
        A.toast('Task deleted');
      };
    },

    plannerWindow(action) {
      const planner = betaSession.planner;
      if (action === 'minimize') planner.minimized = !planner.minimized;
      if (action === 'maximize') planner.maximized = !planner.maximized;
      if (action === 'close') planner.closed = true;
      if (action === 'open') {planner.closed = false; planner.minimized = false;}
      saveBetaSession();
      renderBetaApp();
    },

    editDraft(field, value) {
      betaSession.draft[field] = value;
      saveBetaSession();
    },

    queueNote(event) {
      event.preventDefault();
      const draft = noteFromDraft();
      if (!draft) return;
      betaSession.notes.push(draft);
      betaSession.draft = {type: 'Suggestion', title: '', body: ''};
      saveBetaSession();
      renderBetaApp();
      document.getElementById('beta-note-title').focus();
      A.toast('Note added to this session');
    },

    removeNote(index) {
      betaSession.notes.splice(index, 1);
      saveBetaSession();
      renderBetaApp();
      document.getElementById('beta-note-title').focus();
    },

    finish() {
      if (betaSession.stage !== 'active') return;
      const notes = [...betaSession.notes];
      const {title, body} = betaSession.draft;
      if (title.trim() || body.trim()) {
        const draft = noteFromDraft();
        if (!draft) return;
        notes.push(draft);
      }
      const status = document.getElementById('beta-feedback-status');
      if (!notes.length) {
        status.textContent = 'Add at least one note before sending feedback.';
        return;
      }
      A.refreshWorkspace();
      const workspace = state;
      const project = workspace.projects.find(item => item.id === betaSession.projectId);
      if (!project || !customerAvailable(project)) {
        status.textContent = 'Customer acceptance is paused while this project returns to UAT. Your notes are saved in this session. Try again after the manager reopens customer acceptance.';
        return;
      }
      const manager = project && projectManager(project, workspace);
      if (!manager) {
        status.textContent = 'The project manager is unavailable. Your notes are still saved in this session.';
        return;
      }
      workspace.betaFeedback ||= [];
      if (!workspace.betaFeedback.some(batch => batch.id === betaSession.id)) {
        workspace.betaFeedback.unshift({
          id: betaSession.id,
          projectId: project.id,
          managerId: manager.id,
          submittedAt: new Date().toISOString(),
          notes
        });
        workspace.notifications.unshift({
          id: 'notice-' + betaSession.id,
          betaFeedbackId: betaSession.id,
          employeeId: manager.id,
          role: 'manager',
          page: 'feedback',
          title: 'New beta session feedback',
          body: `${project.name} · ${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`,
          type: 'message-square',
          time: 'Just now',
          read: false
        });
      }
      try {
        if(A.save()===false)return;
      } catch {
        status.textContent = 'Your feedback could not be saved. Your notes are still in this session. Try again.';
        return;
      }
      betaSession.stage = 'finished';
      betaSession.sentCount = notes.length;
      saveBetaSession();
      renderBetaConfirmation();
    }
  };

  function noteFromDraft() {
    const {type, title, body} = betaSession.draft;
    if (title.trim() && body.trim()) return {type, title: title.trim(), body: body.trim()};
    document.getElementById('beta-feedback-status').textContent = 'Enter a title and details for this note.';
    document.getElementById(title.trim() ? 'beta-note-body' : 'beta-note-title').focus();
    return null;
  }

  function renderBetaSetup(project) {
    const generation=++setupGeneration;
    document.title = 'Running Your Beta Environment · Pre-Shipment';
    app.innerHTML = `<section class="app-window">${titlebar(true)}<main class="beta-setup">
      <div class="card beta-setup-card"><span class="beta-setup-icon">${icon('download',28)}</span>
        <div class="eyebrow">BETA ENVIRONMENT</div><h1>Running Your Beta Environment</h1>
        <p>Preparing ${esc(project.name)} ${esc(project.version)} for your session.</p>
        <div class="beta-setup-meta"><span id="beta-setup-status" aria-live="polite">${setupSteps[0][1]}</span><strong id="beta-setup-percent">0%</strong></div>
        <div class="progress" id="beta-setup-progress" role="progressbar" aria-label="Beta setup progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span style="width:0%"></span></div>
        <ol class="beta-setup-steps">${setupSteps.map(([,label]) => `<li>${icon('check',15)}${label}</li>`).join('')}</ol>
        <p class="beta-setup-note">Simulated setup · Your beta will open automatically.</p>
      </div></main></section>`;
    const status = document.getElementById('beta-setup-status');
    const percent = document.getElementById('beta-setup-percent');
    const progress = document.getElementById('beta-setup-progress');
    const steps = document.querySelectorAll('.beta-setup-steps li');
    const start = performance.now();
    function tick() {
      if(generation!==setupGeneration||!status.isConnected)return;
      const value = Math.min(100, Math.floor((performance.now() - start) / 48));
      const current = setupSteps.findLastIndex(([threshold]) => value >= threshold);
      const label = value === 100 ? 'Setup complete' : setupSteps[current][1];
      if (status.textContent !== label) status.textContent = label;
      percent.textContent = value + '%';
      progress.firstElementChild.style.width = value + '%';
      progress.setAttribute('aria-valuenow', value);
      steps.forEach((step, index) => {
        step.classList.toggle('active', value < 100 && current === index);
        step.classList.toggle('complete', value === 100 || current > index);
      });
      if (value < 100) {
        setTimeout(tick, 80);
        return;
      }
      setTimeout(() => {
        if(generation!==setupGeneration||!status.isConnected)return;
        betaSession.stage = 'active';
        saveBetaSession();
        renderBetaApp();
      }, 500);
    }
    tick();
  }

  function updateBetaStatus() {
    const status = document.getElementById('beta-session-status');
    const project = state.projects.find(item => item.id===betaSession.projectId);
    if (!status || !project) return;
    document.getElementById('beta-version-summary').textContent = `Explore ${project.version} and collect notes for your project manager.`;
    const plannerVersion = document.getElementById('planner-build');
    if (plannerVersion) plannerVersion.textContent = 'Beta '+project.version;
    const paused = !customerAvailable(project);
    const early = !paused && Boolean(project.uat?.earlyBeta?.unfinished);
    const mode = paused ? 'paused' : early ? 'early' : 'ready';
    if(status.dataset.mode === mode) return;
    status.dataset.mode = mode;
    status.innerHTML = paused
      ? '<div class="warning-box beta-session-warning" role="status"><strong>Customer acceptance paused</strong><p>Your session is saved. You can send feedback after the manager reopens customer access.</p></div>'
      : early ? '<div class="warning-box beta-session-warning" role="status"><strong>Early beta · UAT unfinished</strong><p>Testing and fixes are still in progress. Share any problems with the manager in your session notes.</p></div>' : '';
    const ready = document.getElementById('beta-ready-badge');
    ready.innerHTML = A.badge(paused ? 'Feedback paused' : 'Beta environment ready', paused ? 'amber' : 'green');
    const feedbackStatus = document.getElementById('beta-feedback-status');
    if(!paused && feedbackStatus?.textContent.startsWith('Customer acceptance is paused')) feedbackStatus.textContent='';
  }

  function renderBetaApp() {
    const p = state.projects.find(project => project.id === betaSession.projectId);
    ensurePlanner();
    document.title = p.name + ' Beta · Pre-Shipment';
    app.innerHTML = `<section class="app-window">${titlebar(true)}<div class="customer-shell">
      <header class="customer-topbar beta-topbar">${brand()}<span class="spacer"></span><span class="demo-mode">${icon('eye',12)} CUSTOMER BETA</span></header>
      <main class="customer-page">
        <div class="customer-hero"><div><div class="eyebrow">YOUR BETA SESSION</div><h1>${esc(p.name)}</h1>
          <p id="beta-version-summary"></p></div><span id="beta-ready-badge"></span></div>
        <div id="beta-session-status"></div><div class="customer-layout beta-workspace-layout"><section class="beta-app-area" aria-label="Beta application">${plannerApp(p)}</section>${betaFeedbackPanel()}</div>
      </main></div></section>`;
    updateBetaStatus();
  }

  function ensurePlanner() {
    if (betaSession.planner?.tasks) return;
    const today = localDate();
    betaSession.planner = {
      view:'all', mode:'list', query:'', priority:'all', minimized:false, maximized:false, closed:false,
      tasks:state.cleanWorkspace?[]:[
        {id:'task-1',title:'Plan the product launch',notes:'Review the checklist and agree on the next milestone.',due:today,priority:'high',status:'today'},
        {id:'task-2',title:'Book a team catch-up',notes:'Find a time that works for design and development.',due:today,priority:'normal',status:'today'},
        {id:'task-3',title:'Explore the new dashboard',notes:'Try the list and board views, then share your feedback.',due:'',priority:'normal',status:'planned'},
        {id:'task-4',title:'Prepare a release note',notes:'Summarize the changes your team is about to ship.',due:'',priority:'low',status:'planned'},
        {id:'task-5',title:'Create your beta workspace',notes:'Your personal task planner is ready.',due:today,priority:'low',status:'done'}
      ]
    };
    saveBetaSession();
  }

  function fitPlannerDialog() {
    const dialog=document.querySelector('.planner-task-dialog');
    const planner=document.querySelector('.planner-window');
    if(!dialog||!planner)return;
    const overlay=dialog.closest('.modal-overlay');
    overlay.classList.add('planner-dialog-overlay');
    const fit=()=>{
      const bounds=planner.getBoundingClientRect();
      const left=Math.max(4,bounds.left);
      const top=Math.max(4,bounds.top);
      const width=Math.max(0,Math.min(innerWidth-4,bounds.right)-left);
      const height=Math.max(0,Math.min(innerHeight-4,bounds.bottom)-top);
      overlay.style.inset='auto';
      Object.assign(overlay.style,{left:left+'px',top:top+'px',width:width+'px',height:height+'px'});
      dialog.style.width=Math.min(560,Math.max(0,width-16))+'px';
      dialog.style.height=Math.min(600,Math.max(0,height-16))+'px';
      dialog.style.maxHeight=Math.max(0,height-16)+'px';
      dialog.style.maxWidth=Math.max(0,width-16)+'px';
    };
    fit();
    window.addEventListener('resize',fit);
    const observer=new MutationObserver(()=>{
      if(dialog.isConnected)return;
      window.removeEventListener('resize',fit);
      observer.disconnect();
    });
    observer.observe(document.getElementById('modal-root'),{childList:true});
  }

  function plannerArg(value) {
    return esc(JSON.stringify(value));
  }

  function plannerApp(project) {
    const planner = betaSession.planner;
    const title = esc(project.name);
    const open = planner.tasks.filter(task => task.status !== 'done').length;
    if (planner.closed || planner.minimized) {
      return `<div class="planner-desktop planner-desktop-idle"><span class="planner-desktop-icon">${icon('clipboard-check',36)}</span>
        <h2>${title}</h2><p>${planner.closed ? 'The application is closed.' : 'The application is minimized.'}</p>
        <button class="btn primary" onclick="Beta.plannerWindow('open')">Open ${title}</button>
        ${plannerTaskbar(project)}</div>`;
    }
    return `<div class="planner-desktop">
      <div class="planner-window ${planner.maximized ? 'is-maximized' : ''}">
        <header class="planner-titlebar"><span class="planner-app-icon">${icon('clipboard-check',16)}</span><strong>${title}</strong><span class="planner-title-caption">Task planner</span><span class="spacer"></span>
          <button type="button" aria-label="Minimize application" onclick="Beta.plannerWindow('minimize')">${icon('minus',14)}</button>
          <button type="button" aria-label="Maximize application" aria-pressed="${planner.maximized}" title="${planner.maximized ? 'Restore application size' : 'Maximize application'}" onclick="Beta.plannerWindow('maximize')">${icon(planner.maximized ? 'minimize' : 'maximize',13)}</button>
          <button type="button" class="planner-window-close" aria-label="Close application" onclick="Beta.plannerWindow('close')">${icon('x',15)}</button>
        </header>
        <div class="planner-profile">${A.person({name:'Jordan Lee',avatar:16,role:'customer'})}</div><div class="planner-workspace">
          <nav class="planner-sidebar" aria-label="Planner navigation">
            
            ${Object.entries({today:['sun','My day'],all:['clipboard-check','All tasks'],completed:['check-circle','Completed']}).map(([view,[symbol,label]]) => `<button class="${planner.view === view ? 'active' : ''}" aria-current="${planner.view === view ? 'page' : 'false'}" onclick="Beta.plannerNavigate('${view}')">${icon(symbol,17)}<span>${label}</span><small>${planner.tasks.filter(task => view === 'today' ? task.status === 'today' : view === 'completed' ? task.status === 'done' : true).length}</small></button>`).join('')}
          </nav>
          <section class="planner-main" aria-label="Tasks">
            <header class="planner-page-heading"><div><h2>${{today:'My day',all:'All tasks',completed:'Completed'}[planner.view]}</h2><p>${open} open ${open === 1 ? 'task' : 'tasks'} in your plan.</p></div><button class="planner-primary" onclick="Beta.plannerEdit()">${icon('plus',16)} New task</button></header>
            <div class="planner-toolbar"><label class="planner-search">${icon('search',16)}<input aria-label="Search tasks" placeholder="Search your tasks" value="${esc(planner.query)}" oninput="Beta.plannerSearch(this.value)"></label>
              <select aria-label="Filter task priority" onchange="Beta.plannerFilter(this.value)">${['all','high','normal','low'].map(priority => `<option value="${priority}"${planner.priority === priority ? ' selected' : ''}>${priority === 'all' ? 'All priorities' : capitalize(priority) + ' priority'}</option>`).join('')}</select>
              <div class="planner-view-toggle" aria-label="Task view">${['list','board'].map(mode => `<button class="${planner.mode === mode ? 'active' : ''}" aria-label="${capitalize(mode)} view" aria-pressed="${planner.mode === mode}" onclick="Beta.plannerMode('${mode}')">${icon(mode === 'list' ? 'list' : 'grid',15)}</button>`).join('')}</div>
            </div>
            <div id="planner-task-content">${plannerContent()}</div>
          </section>
        </div>
        <footer class="planner-statusbar"><span>${icon('check-circle',12)} Saved in this session</span><span id="planner-build"></span></footer>
      </div>
      ${plannerTaskbar(project)}
    </div>`;
  }

  function plannerTaskbar(project) {
    return `<div class="planner-taskbar"><span class="planner-start" aria-hidden="true"><i></i><i></i><i></i><i></i></span><button onclick="Beta.plannerWindow('open')">${icon('clipboard-check',16)} ${esc(project.name)}</button><span class="spacer"></span><span>${icon('monitor',14)} ${icon('bell',14)}</span><time>${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time></div>`;
  }

  function visibleTasks() {
    const {tasks, view, query, priority} = betaSession.planner;
    return tasks.filter(task => (view === 'all' || view === 'today' && task.status === 'today' || view === 'completed' && task.status === 'done') &&
      (priority === 'all' || task.priority === priority) && (task.title + ' ' + task.notes).toLowerCase().includes(query.toLowerCase()));
  }

  function plannerContent() {
    const tasks = visibleTasks();
    if (!tasks.length) {
      const {query,priority,view} = betaSession.planner;
      if (query || priority !== 'all') return `<div class="planner-empty">${icon('search',28)}<h3>No matching tasks</h3><button onclick="Beta.clearPlannerFilters()">Clear search and filters</button></div>`;
      const heading = {all:'No tasks yet',today:'Nothing in My day',completed:'No completed tasks'}[view];
      return `<div class="planner-empty">${icon('check-circle',28)}<h3>${heading}</h3>${view==='completed' ? '<p>Tasks you complete will appear here.</p>' : `<button onclick="Beta.plannerEdit()">Add a task ${icon('plus',14)}</button>`}</div>`;
    }
    if (betaSession.planner.mode === 'board') {
      return `<div class="planner-board">${Object.entries({today:'My day',planned:'Planned',done:'Completed'}).map(([status,label]) => `<section><h3><span class="planner-board-dot ${status}"></span>${label}<small>${tasks.filter(task => task.status === status).length}</small></h3>${tasks.filter(task => task.status === status).map(task => plannerTask(task,true)).join('') || '<p class="planner-column-empty">No tasks</p>'}</section>`).join('')}</div>`;
    }
    return `<div class="planner-task-list">${tasks.map(task => plannerTask(task,false)).join('')}</div>`;
  }

  function plannerTask(task, board) {
    const due = task.due ? new Date(task.due + 'T12:00:00').toLocaleDateString([], {month:'short',day:'numeric'}) : 'No due date';
    return `<article class="planner-task ${task.status === 'done' ? 'is-done' : ''} ${board ? 'is-card' : ''}">
      <button type="button" class="planner-task-check" aria-label="${task.status === 'done' ? 'Reopen' : 'Complete'} ${esc(task.title)}" aria-pressed="${task.status === 'done'}" onclick="Beta.plannerToggle(${plannerArg(task.id)})">${task.status === 'done' ? icon('check',13) : ''}</button>
      <button class="planner-task-details" onclick="Beta.plannerEdit(${plannerArg(task.id)})"><strong>${esc(task.title)}</strong><small>${esc(task.notes)}</small><span><i class="planner-priority ${task.priority}">${capitalize(task.priority)}</i>${icon('calendar',12)} ${due}</span></button>
      ${board ? `<select aria-label="Move ${esc(task.title)}" onchange="Beta.plannerMove(${plannerArg(task.id)},this.value)">${Object.entries({today:'My day',planned:'Planned',done:'Completed'}).map(([value,label]) => `<option value="${value}"${task.status === value ? ' selected' : ''}>${label}</option>`).join('')}</select>` : `<button class="planner-task-edit" aria-label="Edit ${esc(task.title)}" onclick="Beta.plannerEdit(${plannerArg(task.id)})">${icon('more-horizontal',17)}</button>`}
    </article>`;
  }

  function renderPlannerContent() {
    const content = document.getElementById('planner-task-content');
    if (content) content.innerHTML = plannerContent();
  }

  function betaFeedbackPanel() {
    const {notes, draft} = betaSession;
    return `<aside class="card customer-form beta-feedback" aria-labelledby="beta-feedback-heading">
      <h2 id="beta-feedback-heading">Session notes</h2><p>Save ideas, bugs, or general feedback as you explore. Send everything together when you finish.</p>
      <form onsubmit="Beta.queueNote(event)">
        <div class="field"><label for="beta-note-type">Note type</label><select id="beta-note-type" onchange="Beta.editDraft('type',this.value)">${['Suggestion','Bug','General feedback'].map(type => `<option${type === draft.type ? ' selected' : ''}>${type}</option>`).join('')}</select></div>
        <div class="field"><label for="beta-note-title">Title</label><input id="beta-note-title" maxlength="120" value="${esc(draft.title)}" oninput="Beta.editDraft('title',this.value)" required></div>
        <div class="field"><label for="beta-note-body">Details</label><textarea id="beta-note-body" rows="3" maxlength="2000" oninput="Beta.editDraft('body',this.value)" required>${esc(draft.body)}</textarea></div>
        <button class="btn secondary">${icon('plus',15)} Add note</button>
      </form>
      <div class="beta-finish"><h3>Queued notes (${notes.length})</h3>
        ${notes.length ? `<ol class="beta-note-list">${notes.map((note,index) => `<li class="beta-note"><div class="row">${A.badge(note.type)}<span class="spacer"></span><button class="btn link" type="button" aria-label="Remove note ${index + 1}" onclick="Beta.removeNote(${index})">Remove</button></div><strong>${esc(note.title)}</strong><p>${esc(note.body)}</p></li>`).join('')}</ol>` : '<p class="muted">Your added notes will appear here.</p>'}
        <p id="beta-feedback-status" class="beta-feedback-status" role="alert"></p>
        <button class="btn primary" type="button" onclick="Beta.finish()">Send Feedback &amp; Finish ${icon('send',14)}</button>
      </div>
    </aside>`;
  }

  function renderBetaConfirmation() {
    const count = betaSession.sentCount;
    app.innerHTML = `<section class="app-window">${titlebar(true)}<main class="beta-setup beta-confirmation">
      <div class="card beta-setup-card"><span class="beta-setup-icon">${icon('check',30)}</span>
        <div class="eyebrow">SESSION COMPLETE</div><h1>Thanks for testing the beta.</h1>
        <p>${count === 1 ? 'Your note was' : 'All ' + count + ' notes were'} sent to the project manager.</p>
        ${embeddedCustomer?'<button class="btn primary" onclick="Beta.restartEmbedded()">Start another beta session</button>':`<button class="btn primary" onclick="Beta.closeWindow()">${Beta.windowCloseLabel()}</button>`}
      </div></main></section>`;
  }

  function renderEmbeddedWaiting(project) {
    const ready=customerAvailable(project);
    app.innerHTML=`<section class="app-window"><main id="beta-embedded-waiting" data-ready="${ready}" class="beta-setup">
      <div class="beta-entry-panel">
      ${ready?Beta.keyForm(project.id):`<div class="eyebrow">CUSTOMER BETA ACCESS</div><h1>Open Your Beta Version</h1><p>${esc(project?.name||'Select a project')} · The manager must finish UAT and approve customer access first.</p><label class="field"><span>Beta access key</span><input disabled placeholder="Available after manager approval"></label><button class="btn primary" disabled>Open ${esc(project?.name||'beta')}</button>`}
      </div></main></section>`;
  }

  function startBeta() {
    if(betaParams.get('multiView')==='1'&&['manager','developer','tester','customer'].includes(betaParams.get('workspaceRole')))return;
    const requestedSession = betaParams.get('betaSession');
    if (requestedSession) {
      const saved = readBetaSession();
      const project = state.projects.find(item => item.id === saved?.projectId);
      if (saved?.id === requestedSession && project) {
        window.opener = null;
        betaSession = saved;
        if(awaitingHomeEntry || !customerAvailable(project)){
          awaitingHomeEntry=true;
          renderLogin('beta',project.id);
          return;
        }
        if (saved.stage === 'finished') renderBetaConfirmation();
        else if (saved.stage === 'active') renderBetaApp();
        else renderBetaSetup(project);
        return;
      }
    }
    if (betaParams.has('customer')) renderLogin('beta', betaParams.get('project'));
    else {
      renderLogin();
      showSplash();
    }
  }

  startBeta();
};
