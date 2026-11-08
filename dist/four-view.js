(() => {
  'use strict';

  const view = window.FourView = {};
  const params = new URLSearchParams(location.search);
  const embedded = params.get('multiView') === '1';
  const roles = ['manager', 'developer', 'tester', 'customer'];
  const labels = {manager:'Manager', developer:'Developer', tester:'Tester', customer:'Customer'};
  let shell;
  let toggle;
  let projectId;
  let customerProjectId;
  let lastInvitation;
  let pendingInvitation;
  let focusedRole;
  let compactRole = 'manager';
  const compactScreen = matchMedia('(max-width: 799px), (max-width: 1000px) and (max-height: 500px)');
  let previousAppState;
  let homeOnLaunch=false;
  let controlsInitialized=false;
  const viewStorageKey='pre-shipment-four-view';
  function rememberView(){if(shell)sessionStorage.setItem(viewStorageKey,JSON.stringify({open:!shell.hidden,projectId,customerProjectId,lastInvitation,people}));}
  const people = {};
  const manualPeople = new Set();

  if (embedded) document.body.classList.add('four-view-child');

  const app = () => window.A;
  const state = () => app().state;
  const escape = value => app().escape(value);
  const icon = (name, size = 18) => app().icon(name, size);

  function projects() {
    return state().projects.slice().sort((a, b) => {
      const first = a.number || Number(a.name.match(/\d+$/)?.[0]) || 0;
      const second = b.number || Number(b.name.match(/\d+$/)?.[0]) || 0;
      return first - second;
    });
  }

  function selectedProject() {
    return state().projects.find(project => project.id === projectId);
  }

  function rolePeople(role) {
    return state().employees.filter(person => person.role === role);
  }

  function assignedPerson(role) {
    const team = selectedProject()?.team || [];
    return rolePeople(role).find(person => team.includes(person.id)) ||
      rolePeople(role).find(person => person.available !== false) || rolePeople(role)[0];
  }

  function frameUrl(role) {
    const url = new URL(location.pathname, location.href);
    url.searchParams.set('multiView', '1');
    url.searchParams.set('workspaceRole', role);
    const frameProject=role==='customer'?customerProjectId:projectId;
    if (frameProject) url.searchParams.set('project', frameProject);
    if(homeOnLaunch)url.searchParams.set('home','1');
    if (role !== 'customer' && people[role]) url.searchParams.set('employee', people[role]);
    return url.href;
  }

  function loadFrame(role) {
    const frame = shell.querySelector(`iframe[data-role="${role}"]`);
    const url = frameUrl(role);
    if (frame.getAttribute('src') !== url) frame.src = url;
  }

  function panelApp(role) {
    const child = shell.querySelector(`iframe[data-role="${role}"]`).contentWindow;
    return child?.A?.state.role === role && (role === 'customer' || child.A.state.user.id === people[role]) ? child.A : null;
  }

  function refreshPanel(role) {
    const panel = shell.querySelector(`.four-panel[data-role="${role}"]`);
    const person = role === 'customer' ? {name:'Jordan Lee', avatar:16} : rolePeople(role).find(person => person.id === people[role]);
    const photo = panel.querySelector('.four-profile-photo');
    const portrait = Number(person?.avatar);
    photo.src = `avatars/${portrait >= 1 && portrait <= 16 ? portrait : 15}.jpg`;
    photo.alt = person?.name || labels[role];
    if (role === 'customer') return;
    const unread = app().unreadCountFor(role, people[role]);
    const messages = panel.querySelector('[data-panel-action="messages"]');
    messages.innerHTML = `${icon('bell', 17)}${unread ? `<span class="four-unread">${unread > 99 ? '99+' : unread}</span>` : ''}`;
    messages.setAttribute('aria-label', `${labels[role]} messages${unread ? `, ${unread} unread` : ''}`);
    const childApp = panelApp(role);
    const theme = childApp ? panel.querySelector('iframe').contentDocument.documentElement.dataset.theme : document.documentElement.dataset.theme;
    panel.querySelector('.four-panel-header').dataset.theme = theme || 'light';
    const themeButton = panel.querySelector('[data-panel-action="theme"]');
    themeButton.innerHTML = icon(theme === 'dark' ? 'sun' : 'moon', 16);
    themeButton.setAttribute('aria-label', `${labels[role]}: switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
    const demoButton=panel.querySelector('[data-panel-action="demo"]');
    const demoEnabled=app().state.demoMode===true;
    demoButton.setAttribute('aria-pressed',String(demoEnabled));
    demoButton.setAttribute('aria-label',demoEnabled?'Clear demo data':'Load demo data');
    demoButton.title=demoEnabled?'Demo data is on · Clear and start from zero':'Load demo data';
    for (const button of panel.querySelectorAll('[data-panel-action]')) button.disabled = !childApp;
  }

  function refreshCustomer(resetSelection=false) {
    const eligible=projects().filter(project=>UatWorkflow.customerAvailable(project));
    const latest=eligible.filter(project=>project.customerEmail?.sentAt)
      .sort((a,b)=>Date.parse(b.customerEmail.sentAt)-Date.parse(a.customerEmail.sentAt))[0];
    const stamp=latest ? latest.id+'|'+latest.customerEmail.sentAt : '';
    if(lastInvitation!==undefined && stamp!==lastInvitation && latest)pendingInvitation=latest.id;
    lastInvitation=stamp;
    if(resetSelection || !state().projects.some(project=>project.id===customerProjectId)){
      customerProjectId=(resetSelection||eligible.some(item=>item.id===projectId)?projectId:null) || latest?.id || projectId || eligible[0]?.id;
      if(resetSelection)pendingInvitation=null;
    }
    const panel=shell.querySelector('#customer-beta-overlay');
    const frame=panel.querySelector('iframe');
    const atEntry=frame.contentDocument?.getElementById('beta-embedded-waiting');
    if(pendingInvitation && (panel.hidden || shell.hidden || atEntry)){
      if(eligible.some(project=>project.id===pendingInvitation))customerProjectId=pendingInvitation;
      pendingInvitation=null;
    }
    const current=state().projects.find(project=>project.id===customerProjectId);
    const choices=current&&!eligible.includes(current)?[current,...eligible]:eligible;
    const picker=shell.querySelector('.beta-project-choice');
    picker.innerHTML=choices.map(project=>`<option value="${escape(project.id)}"${project.id===customerProjectId?' selected':''}>${escape(project.name)}</option>`).join('');
    picker.hidden=choices.length<2;
    const ready=UatWorkflow.customerAvailable(current);
    const status=shell.querySelector('[data-customer-status]');
    status.classList.toggle('is-ready',ready);
    status.title=ready?(current.uat?.earlyBeta?.enabled?'Early beta · UAT unfinished':'Beta ready'):'Waiting for customer handoff';
    status.setAttribute('aria-label',status.title);
    refreshPanel('customer');
    loadFrame('customer');
  }

  function refreshControls(resetPeople = false) {
    const choices = projects();
    if (!choices.some(project => project.id === projectId)) {
      projectId = !controlsInitialized&&!homeOnLaunch ? choices.find(project => UatWorkflow.stage(project) === 'testing')?.id || choices[0]?.id : undefined;
    }
    controlsInitialized=true;
    const select = shell.querySelector('#four-project');
    select.innerHTML = '<option value="">All projects</option>'+choices.map(project => `<option value="${escape(project.id)}"${project.id === projectId ? ' selected' : ''}>${escape(project.name)}</option>`).join('');

    for (const role of roles.filter(role => role !== 'customer')) {
      const list = rolePeople(role);
      const current = list.find(person => person.id === people[role]);
      const assigned = assignedPerson(role);
      if (resetPeople || !current || !manualPeople.has(role)) people[role] = assigned?.id;
      const personSelect = shell.querySelector(`[data-person-role="${role}"]`);
      personSelect.innerHTML = list.map(person => `<option value="${escape(person.id)}"${person.id === people[role] ? ' selected' : ''}>${escape(person.name)}</option>`).join('');
      personSelect.disabled = !list.length;
      loadFrame(role);
      refreshPanel(role);
    }
    refreshCustomer(resetPeople);
    rememberView();
  }

  function syncPanelLayout() {
    const compact = compactScreen.matches;
    const visibleRole = compact ? compactRole : focusedRole;
    shell.classList.toggle('four-compact-screen', compact);
    shell.classList.toggle('four-view-focused', Boolean(visibleRole));
    const bar = shell.querySelector('.four-compact-bar');
    bar.hidden = false;
    const controlsParent = bar;
    const controls = shell.querySelector('.four-workspace-controls');
    if (controls.parentElement !== controlsParent) controlsParent.appendChild(controls);
    for (const choice of bar.querySelectorAll('[data-show-role]')) {
      choice.setAttribute('aria-pressed', String(choice.dataset.showRole === compactRole));
    }
    for (const panel of shell.querySelectorAll('.four-panel:not([data-role=customer])')) {
      const focused = panel.dataset.role === visibleRole;
      panel.classList.toggle('is-focused', focused);
      const button = panel.querySelector('[data-focus-role]');
      button.setAttribute('aria-pressed', String(focused));
      button.setAttribute('aria-label', focused ? 'Return to three panes' : `Focus ${labels[panel.dataset.role]} panel`);
      button.innerHTML = icon(focused ? 'grid' : 'maximize', 16);
    }
  }

  function focusPanel(role) {
    focusedRole = focusedRole === role ? null : role;
    if (focusedRole) compactRole = focusedRole;
    syncPanelLayout();
  }

  function setCustomerOpen(open) {
    const panel=shell.querySelector('.four-panel[data-role=customer]');
    const trigger=shell.querySelector('.beta-overlay-toggle');
    if(open){app().refreshWorkspace();refreshCustomer();}
    panel.hidden=!open;
    trigger.setAttribute('aria-expanded',String(open));
    if(open){
      clampOverlay();
      panel.querySelector('.beta-overlay-close').focus();
    } else trigger.focus();
  }

  function clampOverlay(x,y) {
    const panel=shell.querySelector('.four-panel[data-role=customer]');
    if(panel.hidden||shell.hidden)return;
    const rect=panel.getBoundingClientRect();
    panel.style.left=Math.max(0,Math.min(x??rect.left,innerWidth-rect.width))+'px';
    panel.style.top=Math.max(0,Math.min(y??rect.top,innerHeight-rect.height))+'px';
  }

  function setupCustomerOverlay() {
    const panel=shell.querySelector('.four-panel[data-role=customer]');
    panel.hidden=true;
    panel.id='customer-beta-overlay';
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-label','Customer beta');
    const header=panel.querySelector('header');
    header.querySelector('h2').textContent='Customer beta';
    const picker=document.createElement('select');
    picker.className='beta-project-choice';
    picker.setAttribute('aria-label','Customer beta project');
    header.insertBefore(picker,header.querySelector('.four-focus'));
    picker.onchange=()=>{customerProjectId=picker.value;pendingInvitation=null;refreshCustomer();rememberView();};
    const close=header.querySelector('[data-focus-role]');
    close.removeAttribute('data-focus-role');
    close.className='beta-overlay-close';
    close.setAttribute('aria-label','Close customer beta');
    close.title='Close customer beta';
    close.innerHTML=icon('x',18);
    close.onclick=()=>setCustomerOpen(false);
    const trigger=document.createElement('button');
    trigger.className='beta-overlay-toggle';
    trigger.type='button';
    trigger.textContent='Customer beta';
    trigger.setAttribute('aria-controls',panel.id);
    trigger.setAttribute('aria-expanded','false');
    trigger.onclick=()=>setCustomerOpen(panel.hidden);
    shell.querySelector('.four-workspace-controls').insertBefore(trigger,shell.querySelector('.four-view-close'));

    let drag;
    header.tabIndex=0;
    header.title='Drag to move, or use the arrow keys';
    header.onpointerdown=event=>{
      if(event.button!==0||event.target.closest('button,select'))return;
      const rect=panel.getBoundingClientRect();
      drag={id:event.pointerId,x:event.clientX-rect.left,y:event.clientY-rect.top};
      header.setPointerCapture(event.pointerId);
    };
    header.onpointermove=event=>{
      if(drag?.id===event.pointerId)clampOverlay(event.clientX-drag.x,event.clientY-drag.y);
    };
    header.onlostpointercapture=()=>{drag=null;};
    header.onkeydown=event=>{
      const offset={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]}[event.key];
      if(event.target!==header||!offset)return;
      event.preventDefault();
      const rect=panel.getBoundingClientRect();clampOverlay(rect.left+offset[0],rect.top+offset[1]);
    };
    window.addEventListener('resize',()=>clampOverlay());
  }

  function createShell() {
    shell = document.createElement('section');
    shell.className = 'four-view-shell';
    shell.hidden = true;
    shell.setAttribute('aria-label', 'Staff workspace');
    shell.innerHTML = `<div class="four-compact-bar" hidden><div class="four-role-choices" role="group" aria-label="Choose workspace">${roles.filter(role=>role!=='customer').map(role => `<button type="button" data-show-role="${role}">${labels[role]}</button>`).join('')}</div></div><div class="four-view-grid">${roles.map(role => `<section class="four-panel" data-role="${role}" aria-label="${labels[role]} panel">
      <header class="four-panel-header">
        <img class="four-profile-photo" alt="">
        <h2 class="four-role four-role-${role}">${labels[role]}</h2>
        ${role === 'customer' ? '<strong class="four-customer-name">Jordan Lee</strong><span class="four-customer-status" data-customer-status role="img"></span>' : `<label class="four-person-select"><span class="four-screen-reader">${labels[role]} account</span><select data-person-role="${role}" aria-label="${labels[role]} account"></select></label>
          <button type="button" data-panel-action="theme" data-panel-role="${role}" title="Change this panel’s theme">${icon('moon', 16)}</button>
          <button type="button" data-panel-action="reset" data-panel-role="${role}" aria-label="Reset mock data" title="Reset mock data">${icon('refresh-cw',16)}</button>
          <button type="button" data-panel-action="demo" data-panel-role="${role}" aria-label="Load demo data" aria-pressed="false" title="Load demo data">${icon('database',16)}<span class="four-demo-state" aria-hidden="true"></span></button>
          <button type="button" data-panel-action="messages" data-panel-role="${role}" title="Messages and notifications">${icon('bell', 17)}</button>
          <button type="button" data-panel-action="settings" data-panel-role="${role}" aria-label="${labels[role]} settings" title="Workspace settings">${icon('settings', 16)}</button>`}
        <button type="button" class="four-focus" data-focus-role="${role}" aria-label="Focus ${labels[role]} panel" aria-pressed="false" title="Focus this panel">${icon('maximize', 16)}</button>
        ${role === 'customer' ? `<div class="four-workspace-controls"><label class="four-view-project"><span class="four-screen-reader">Shared project</span><select id="four-project" aria-label="Shared project" title="Shared project"></select></label><button type="button" class="four-view-close" aria-label="Close staff workspace" title="Return to normal view">${icon('x', 16)}<span>Normal view</span></button></div>` : ''}
      </header>
      <iframe data-role="${role}" title="${labels[role]} workspace" allow="clipboard-write"></iframe>
    </section>`).join('')}</div>`;
    document.body.appendChild(shell);
    for (const button of shell.querySelectorAll('[data-show-role]')) {
      button.onclick = () => {
        compactRole = button.dataset.showRole;
        syncPanelLayout();
      };
    }
    setupCustomerOverlay();
    compactScreen.addEventListener('change', syncPanelLayout);
    syncPanelLayout();
    shell.querySelector('.four-view-close').onclick = view.close;
    shell.querySelector('#four-project').onchange = event => {
      homeOnLaunch=false;
      projectId = event.target.value;
      manualPeople.clear();
      refreshControls(true);
    };
    for (const select of shell.querySelectorAll('[data-person-role]')) {
      select.onchange = event => {
        const role = event.target.dataset.personRole;
        people[role] = event.target.value;
        manualPeople.add(role);
        loadFrame(role);
        refreshPanel(role);
        rememberView();
      };
    }
    for (const frame of shell.querySelectorAll('iframe')) {
      frame.addEventListener('load', () => refreshPanel(frame.dataset.role));
    }
    for (const button of shell.querySelectorAll('[data-panel-action]')) {
      button.onclick = () => {
        const role = button.dataset.panelRole;
        const childApp = panelApp(role);
        if (!childApp) return;
        if (button.dataset.panelAction === 'reset') {
          childApp.closeModal();childApp.resetPrompt();
        } else if (button.dataset.panelAction === 'demo') {
          childApp.closeModal();childApp.demoPrompt();
        } else if (button.dataset.panelAction === 'theme') {
          const frame = shell.querySelector(`iframe[data-role="${role}"]`);
          childApp.setTheme(frame.contentDocument.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
          childApp.render();
        } else {
          childApp.closeModal();
          childApp.navigate(button.dataset.panelAction);
        }
        refreshPanel(role);
      };
    }
    for (const button of shell.querySelectorAll('[data-focus-role]')) {
      button.onclick = () => focusPanel(button.dataset.focusRole);
    }
  }

  view.open = function () {
    if (embedded || !app()) return;
    if (shell && !shell.hidden) return;
    if (location.protocol === 'file:') {
      app().modal(`<div class="modal-header"><h2>Open the shared workspace</h2><button class="icon-btn" aria-label="Close" onclick="A.closeModal()">${icon('x')}</button></div>
        <div class="modal-body"><p>The staff panes and customer beta share projects through the local server. Double-click <strong>Start Prototype.cmd</strong> in the project folder, or run <code>npm start</code> there.</p></div>
        <div class="modal-footer"><button class="btn" onclick="A.closeModal()">Stay here</button><a class="btn primary" href="http://127.0.0.1:4173/">Open local prototype</a></div>`, '');
      return;
    }
    if (!shell) createShell();
    const normalApp = document.getElementById('app');
    previousAppState = {inert:normalApp.inert, ariaHidden:normalApp.getAttribute('aria-hidden')};
    normalApp.inert = true;
    normalApp.setAttribute('aria-hidden', 'true');
    document.body.classList.add('four-view-active');
    shell.hidden = false;
    toggle.setAttribute('aria-pressed', 'true');
    toggle.innerHTML = `${icon('x', 20)}<span>Close staff workspace</span>`;
    refreshControls();
    const entryFocus = compactScreen.matches ? shell.querySelector(`[data-show-role="${compactRole}"]`) : shell.querySelector('#four-project');
    entryFocus.focus({preventScroll:true});
  };

  view.close = function () {
    if (!shell || shell.hidden) return;
    shell.hidden = true;
    document.body.classList.remove('four-view-active');
    const normalApp = document.getElementById('app');
    normalApp.inert = previousAppState?.inert || false;
    if (previousAppState?.ariaHidden === null) normalApp.removeAttribute('aria-hidden');
    else if (previousAppState?.ariaHidden) normalApp.setAttribute('aria-hidden', previousAppState.ariaHidden);
    toggle.setAttribute('aria-pressed', 'false');
    toggle.innerHTML = `${icon('grid', 20)}<span>Open staff workspace</span>`;
    toggle.focus();
    rememberView();
  };

  view.onWorkspaceSync = function () {
    if (shell) refreshControls();
  };

  view.refreshPanel = function (role) {
    if (shell && roles.includes(role)) refreshPanel(role);
  };

  view.mount = function () {
    if (embedded || toggle || !app()) return;
    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.id = 'four-view-toggle';
    toggle.className = 'four-view-toggle';
    toggle.setAttribute('aria-pressed', 'false');
    toggle.setAttribute('aria-label', 'Toggle staff workspace');
    toggle.innerHTML = `${icon('grid', 20)}<span>Open staff workspace</span>`;
    toggle.onclick = () => shell && !shell.hidden ? view.close() : view.open();
    document.body.appendChild(toggle);
    if(performance.getEntriesByType('navigation')[0]?.type==='reload'){
      try{
        const saved=JSON.parse(sessionStorage.getItem(viewStorageKey));
        if(saved?.open){
          homeOnLaunch=true;projectId=saved.projectId;customerProjectId=saved.customerProjectId;lastInvitation=saved.lastInvitation;
          for(const role of roles.filter(role=>role!=='customer'))if(saved.people?.[role]){people[role]=saved.people[role];manualPeople.add(role);}
          view.open();
        }
      }catch{}
    }
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape' && shell && !shell.hidden) {
        if (!shell.querySelector('[data-role=customer].four-panel').hidden) setCustomerOpen(false);
        else if (focusedRole && !compactScreen.matches) focusPanel(focusedRole);
        else view.close();
      }
    });
  };
})();
