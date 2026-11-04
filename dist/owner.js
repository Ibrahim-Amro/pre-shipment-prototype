(function () {
  'use strict';
  var source = document.currentScript && document.currentScript.src;
  if (!document.querySelector('[data-owner-style]')) {
    var stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = source ? new URL('owner.css', source).href : 'owner.css';
    stylesheet.dataset.ownerStyle = 'true';
    document.head.appendChild(stylesheet);
  }
  var state = null, analysisTimer = null, sendingTimer = null;
  function a() { return window.A; }
  function esc(value) { return a().escape(String(value == null ? '' : value)); }
  function icon(name, size) { return a().icon(name, size || 18); }
  function people(role) { return a().state.employees.filter(function (p) { return p.role === role; }); }
  function person(id) { return a().state.employees.find(function (p) { return String(p.id) === String(id); }); }
  function selectedPeople() { return ['manager', 'developer', 'tester'].flatMap(function (role) { return state.selected[role].map(person).filter(Boolean); }); }
  function selectedIds() { return selectedPeople().map(function (p) { return p.id; }); }
  function roleLabel(role) { return role.charAt(0).toUpperCase() + role.slice(1); }
  function closeButton() { return '<button class="of-close" title="Close" onclick="OwnerFlow.close()">' + icon('x', 20) + '</button>'; }
  function header(title, subtitle, tag) {
    return '<div class="of-header"><div><div class="eyebrow">NEW PRE-SHIPMENT PROJECT' + (tag ? '<span class="of-demo-tag">' + esc(tag) + '</span>' : '') + '</div><h2>' + title + '</h2><p class="muted">' + subtitle + '</p></div>' + closeButton() + '</div>';
  }
  function rail() {
    var current = {upload: 0, analysis: 0, results: 0, reassess: 0, manager: 1, developer: 2, tester: 3, review: 4, complete: 5}[state.step];
    var steps = [['Project & analysis', 'A clear starting point'], ['Choose a manager', 'One project lead'], ['Build your dev team', 'The right expertise'], ['Add your testers', 'Quality, from day one'], ['Review & launch', 'Personalized invitations']];
    return '<aside class="of-rail"><div class="of-rail-brand"><span class="of-brand-symbol">P</span><span>Pre-Shipment<span>BY PFIZER</span></span></div><div class="of-rail-steps">' + steps.map(function (item, index) {
      return '<div class="of-rail-step ' + (index === current ? 'is-current' : index < current ? 'is-done' : '') + '"><span class="of-step-number">' + (index < current ? icon('check', 14) : String(index + 1).padStart(2, '0')) + '</span><div><strong>' + item[0] + '</strong><small>' + item[1] + '</small></div></div>';
    }).join('') + '</div><div class="of-rail-bottom">' + icon('shield-check', 20) + '<strong>A confident release starts here.</strong><span>Keep every handoff, finding, and decision in one place.</span></div></aside>';
  }
  function shell(content, footer) {
    a().modal('<div class="of-shell">' + rail() + '<section class="of-main">' + content + (footer ? '<footer class="of-footer">' + footer + '</footer>' : '') + '</section></div>', 'wide');
  }
  function back(step) { return '<button class="btn secondary" onclick="OwnerFlow.go(\'' + step + '\')">' + icon('arrow-left', 16) + ' Back</button>'; }
  function next(label, method, disabled) { return '<button class="btn primary" ' + (disabled ? 'disabled ' : '') + 'onclick="OwnerFlow.' + method + '">' + label + ' ' + icon('arrow-right', 17) + '</button>'; }
  function recommendation() {
    return '<div class="of-recommendation"><span class="of-spark">' + icon('sparkles', 20) + '</span><div><strong>Your recommended release team</strong><p>1 manager <span>·</span> 3 developers <span>·</span> 2 testers</p><small>Based on 74% readiness, 12 findings, and a 7-day release window. Simulated recommendation.</small></div><span class="of-recommendation-tag">AI SUGGESTION</span></div>';
  }
  function upload() {
    state.step = 'upload';
    shell(header('Let’s get your project ready.', 'Upload a project archive. We’ll turn the first look into a clear release plan.') +
      '<div class="of-body"><div class="of-upload" id="of-drop-zone" ondragover="event.preventDefault();this.classList.add(\'is-dragging\')" ondragleave="this.classList.remove(\'is-dragging\')" ondrop="OwnerFlow.drop(event)"><div class="of-upload-icon">' + icon('upload-cloud', 30) + '</div><h3>' + (state.filename ? esc(state.filename) : 'Drop your project ZIP here') + '</h3><p>' + (state.filename ? esc(state.size) + ' · Ready for a simulated review' : 'or choose a file from your computer') + '</p><label class="btn secondary of-file-label">' + icon('folder', 16) + (state.filename ? 'Choose a different ZIP' : 'Browse files') + '<input type="file" accept=".zip,application/zip" onchange="OwnerFlow.file(this.files[0])"></label><small>ZIP archives up to 250 MB · No files leave your browser</small></div>' +
      '<div class="of-sample"><div><span class="of-sample-icon">' + icon('file-archive', 21) + '</span><div><strong>Just exploring?</strong><span>Try a realistic project, with everything prefilled.</span></div></div><button class="btn ghost" onclick="OwnerFlow.sample()">Use sample project ' + icon('arrow-up-right', 16) + '</button></div>' +
      '<div class="grid-2 of-form"><label class="field">Project name<input class="input" id="of-name" value="' + esc(state.name) + '" placeholder="e.g. ConnectCare Portal" maxlength="65" oninput="OwnerFlow.field(\'name\',this.value)"></label><label class="field">Release version<input class="input" value="' + esc(state.version) + '" placeholder="e.g. 2.4.0" maxlength="20" oninput="OwnerFlow.field(\'version\',this.value)"></label><label class="field of-span-2">Project overview<textarea class="input" rows="2" placeholder="Give your team a little context about this release…" oninput="OwnerFlow.field(\'description\',this.value)">' + esc(state.description) + '</textarea></label></div><div class="of-privacy">' + icon('lock', 14) + ' Prototype workspace. Archive contents are not opened or processed.</div></div>',
      '<span class="muted of-footer-note">Step 1 of 5 <span>·</span> Project & analysis</span>' + next('Analyze project', 'analyze()', false));
  }
  function analysis() {
    state.step = 'analysis';
    var progress = state.analysisProgress;
    var checks = [['Project structure', 12], ['Code health & coverage', 36], ['Security & accessibility', 62], ['Release readiness', 88]];
    shell(header('A first look at your release.', 'Reviewing ' + esc(state.filename) + ' · ' + esc(state.name), 'SIMULATED ANALYSIS') +
      '<div class="of-body of-analysis"><div class="of-orbit"><div class="of-orbit-ring"></div><div class="of-orbit-center">' + icon('sparkles', 36) + '</div><span class="of-orbit-dot"></span></div><h3>' + (progress < 25 ? 'Getting to know your project…' : progress < 55 ? 'Connecting the details…' : progress < 85 ? 'Checking the release signals…' : 'Preparing your release overview…') + '</h3><p class="muted">A little clarity before your next big step.</p><div class="of-analysis-meter"><span style="width:' + progress + '%"></span></div><span class="of-analysis-percent">' + progress + '%</span><div class="of-analysis-checks">' + checks.map(function (check) { return '<div class="' + (progress >= check[1] ? 'is-checked' : '') + '"><span>' + (progress >= check[1] ? icon('check', 14) : '<i></i>') + '</span>' + check[0] + '</div>'; }).join('') + '</div><div class="of-demo-note">This is a sample analysis. No AI service or file processing is running.</div></div>', '<span class="muted of-footer-note">Your release overview is on its way</span><button class="btn secondary" onclick="OwnerFlow.skipAnalysis()">Skip animation ' + icon('arrow-right', 16) + '</button>');
  }
  function results() {
    state.step = 'results';
    shell(header('A strong start. A clear path ahead.', 'Your first release overview is ready. Use it to build a team with confidence.', 'SIMULATED ANALYSIS') +
      '<div class="of-body"><div class="of-result-hero"><div class="of-readiness-ring" style="--of-value:74"><div><strong>74<span>%</span></strong><small>RELEASE READY</small></div></div><div class="of-result-copy"><span class="of-status-label">' + icon('check-circle', 16) + ' Ready for team review</span><h3>' + esc(state.name) + '</h3><p>The foundation looks solid. Focus on authentication, export reliability, and accessibility before shipment.</p><div class="of-completeness"><span>Feature completeness</span><strong>82%</strong><div><i style="width:82%"></i></div></div></div></div>' +
      '<div class="of-metrics"><div><span class="of-metric-icon red">' + icon('alert-triangle', 20) + '</span><strong>3</strong><span>Critical findings</span></div><div><span class="of-metric-icon amber">' + icon('bug', 20) + '</span><strong>12</strong><span>Total findings</span></div><div><span class="of-metric-icon blue">' + icon('clock', 20) + '</span><strong>~36h</strong><span>Estimated effort</span></div></div>' +
      '<div class="of-findings"><div><span class="of-severity-dot red"></span><div><strong>Session expiry interrupts a saved workflow</strong><small>Authentication · Critical · ~6 hours</small></div><span class="of-finding-tag">P0</span></div><div><span class="of-severity-dot amber"></span><div><strong>Large report exports can time out</strong><small>Reporting · High · ~4 hours</small></div><span class="of-finding-tag">P1</span></div><div><span class="of-severity-dot blue"></span><div><strong>Keyboard navigation needs refinement</strong><small>Accessibility · Medium · ~3 hours</small></div><span class="of-finding-tag">P2</span></div></div>' + recommendation() + '</div>',
      '<button class="btn secondary" onclick="OwnerFlow.reassess()">' + icon('send', 16) + ' Send for urgent reassessment</button>' + next('Start assigning roles', 'go(\'manager\')', false));
  }
  function employeeCard(p, role, checked, urgent) {
    var available = p.available !== false, load = Number(p.load) || 0;
    var expertise = p.skills || (role === 'manager' ? ['Release planning', 'Agile delivery'] : role === 'developer' ? ['React', 'TypeScript', 'API design'] : ['Regression', 'Accessibility', 'Automation']);
    if (typeof expertise === 'string') expertise = expertise.split(',');
    return '<button class="of-person ' + (checked ? 'is-selected ' : '') + (!available ? 'on-holiday' : '') + '" ' + (!available ? 'disabled' : '') + ' onclick="OwnerFlow.' + (urgent ? 'pickReassessor' : 'toggle') + '(\'' + esc(p.id) + '\'' + (urgent ? '' : ',\'' + role + '\'') + ')"><span class="of-person-avatar">' + a().avatar(p, 44) + (available ? '<i></i>' : '') + '</span><span class="of-person-info"><strong>' + esc(p.name) + '</strong><span>' + esc(p.title || roleLabel(role)) + '</span><span class="of-skill-tags">' + expertise.slice(0, 3).map(function (skill) { return '<small>' + esc(skill.trim ? skill.trim() : skill) + '</small>'; }).join('') + '</span></span><span class="of-person-capacity">' + (available ? '<span class="of-available">Available</span><span>' + load + '% allocated</span><i><b style="width:' + load + '%"></b></i>' : '<span class="of-away">On holiday</span><span>Back next week</span>') + '</span><span class="of-select-box ' + (role === 'manager' ? 'is-radio' : '') + '">' + (checked ? icon('check', 13) : '') + '</span></button>';
  }
  function team(role) {
    state.step = role;
    var names = {manager: ['Choose your project manager.', 'One clear owner for timelines, quality, and the final handoff.'], developer: ['Build your development team.', 'Choose the people who will turn findings into confident fixes.'], tester: ['Give quality a dedicated team.', 'Choose testers to validate fixes and listen to early customer feedback.']};
    var count = state.selected[role].length, list = people(role), query = (state.search || '').toLowerCase();
    var filtered = list.filter(function (p) { return (p.name + ' ' + (p.title || '') + ' ' + (p.skills || '')).toLowerCase().includes(query); });
    var available = filtered.filter(function (p) { return p.available !== false; }), unavailable = filtered.filter(function (p) { return p.available === false; });
    shell(header(names[role][0], names[role][1]) + '<div class="of-body">' + recommendation() +
      '<div class="of-team-toolbar"><div><h3>' + (role === 'manager' ? 'Project managers' : role === 'developer' ? 'Developers' : 'Quality assurance') + ' <span>' + list.filter(function (p) { return p.available !== false; }).length + ' available</span></h3><p class="muted">' + (role === 'manager' ? 'Select exactly one manager' : 'Select one or more ' + role + 's') + '</p></div><label class="of-search">' + icon('search', 16) + '<input value="' + esc(state.search || '') + '" placeholder="Search people or skills" oninput="OwnerFlow.search(this.value)"></label></div>' +
      '<div class="of-people-list">' + available.map(function (p) { return employeeCard(p, role, state.selected[role].map(String).includes(String(p.id))); }).join('') + (available.length ? '' : '<div class="of-empty">No available people match your search.</div>') + '</div>' +
      (unavailable.length ? '<div class="of-away-label">Currently away <span>· ' + unavailable.length + ' on holiday</span></div><div class="of-people-list of-away-list">' + unavailable.map(function (p) { return employeeCard(p, role, false); }).join('') + '</div>' : '') +
      '<div class="of-team-summary"><div class="of-selected-avatars">' + selectedPeople().slice(0, 7).map(function (p) { return a().avatar(p, 28); }).join('') + '</div><span><strong>' + selectedPeople().length + '</strong> people on your release team</span>' + (count ? '<span class="of-count-selected">' + count + ' ' + role + (count > 1 ? 's' : '') + ' selected</span>' : '') + '</div></div>',
      back(role === 'manager' ? 'results' : role === 'developer' ? 'manager' : 'developer') + next(role === 'manager' ? 'Choose developers' : role === 'developer' ? 'Choose testers' : 'Review invitations', 'nextTeam()', !count));
  }
  function makeDrafts() {
    selectedPeople().forEach(function (p, index) {
      if (!state.drafts[p.id]) {
        var key = 'PS-' + String(7400 + index * 137 + String(p.id).split('').reduce(function (sum, c) { return sum + c.charCodeAt(0); }, 0)).slice(-4);
        var duties = p.role === 'manager' ? 'coordinate the release team, keep milestones on track, and review fixes before final approval' : p.role === 'developer' ? 'review assigned findings, implement resilient fixes, and submit your changes for manager approval' : 'validate the application, triage customer pre-feedback, and document findings with clear reproduction steps and evidence';
        state.drafts[p.id] = {username: p.email, password: 'Welcome26!', key: key, subject: 'Job assignment: ' + state.name + ' · ' + roleLabel(p.role), body: 'Hi ' + p.name.split(' ')[0] + ',\n\nYou’ve been assigned as a ' + p.role + ' for ' + state.name + ' (v' + state.version + ').\n\nYour focus: ' + duties + '. Please review your dashboard and accept the assignment using your access key.\n\nSign in: ' + window.location.href.split('#')[0].split('?')[0] + '\nUsername: ' + p.email + '\nTemporary password: Welcome26!\nAssignment key: ' + key + '\n\nTarget shipment: ' + deadlineLabel() + '\nCustomer feedback window: 48 hours after the customer opens their preview.\n\nThank you for helping us ship with confidence.\nAlexander Morgan\nProject Owner · Pre-Shipment by Pfizer'};
      }
    });
    if (!state.customerEmail) state.customerEmail = {to: 'jordan.lee@northstar-demo.com', subject: 'Your early look at ' + state.name + ' — feedback welcome', body: 'Hi Jordan,\n\nWe’re sharing an early preview of ' + state.name + ' before its upcoming release. You’ll have 48 hours from opening your preview to share feedback.\n\nTry the app, report anything unexpected, or share an idea. Your feedback goes straight to our quality team.\n\nYour private preview: ' + customerLink() + '\nFeedback window: 48 hours after opening this preview.\n\nThank you for being part of this release.\nAlexander Morgan\nPre-Shipment by Pfizer'};
    if (!state.selectedEmail || !state.drafts[state.selectedEmail]) state.selectedEmail = selectedPeople()[0].id;
  }
  function deadlineLabel() { return new Date(state.deadline + 'T17:00:00').toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}); }
  function customerLink() { return window.location.href.split('?')[0].split('#')[0] + '?customer=1&project=' + encodeURIComponent(state.projectId); }
  function review() {
    state.step = 'review'; makeDrafts();
    var all = selectedPeople(), p = person(state.selectedEmail), draft = state.drafts[state.selectedEmail], customer = state.emailTab === 'customer';
    shell(header('One team. Ready to move.', 'Review each personalized invitation, then launch your pre-shipment workspace.') +
      '<div class="of-body of-review-body"><div class="of-launch-summary"><div class="of-project-symbol">' + esc(state.name.split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('')) + '</div><div><strong>' + esc(state.name) + '</strong><span>v' + esc(state.version) + ' <b>·</b> ' + all.length + ' team members <b>·</b> 74% ready</span></div><label>Target shipment<input type="date" value="' + state.deadline + '" onchange="OwnerFlow.field(\'deadline\',this.value)"></label></div>' +
      '<div class="of-email-tabs"><button class="' + (!customer ? 'is-active' : '') + '" onclick="OwnerFlow.emailTab(\'team\')">' + icon('users', 16) + ' Team invitations <span>' + all.length + '</span></button><button class="' + (customer ? 'is-active' : '') + '" onclick="OwnerFlow.emailTab(\'customer\')">' + icon('message-square', 16) + ' Customer preview</button></div>' +
      (!customer ? '<div class="of-email-layout"><aside class="of-recipients">' + all.map(function (employee) { return '<button class="' + (String(employee.id) === String(state.selectedEmail) ? 'is-active' : '') + '" onclick="OwnerFlow.emailPerson(\'' + esc(employee.id) + '\')">' + a().avatar(employee, 32) + '<span><strong>' + esc(employee.name) + '</strong><small>' + roleLabel(employee.role) + '</small></span><i>' + icon('check', 12) + '</i></button>'; }).join('') + '</aside><div class="of-email-preview"><div class="of-draft-label">' + icon('sparkles', 14) + ' AI-DRAFTED INVITATION <span>Editable preview</span></div><div class="of-email-to"><span>To</span><strong>' + esc(p.name) + '</strong><small>&lt;' + esc(p.email) + '&gt;</small></div><label class="of-email-subject"><span>Subject</span><input value="' + esc(draft.subject) + '" oninput="OwnerFlow.draft(\'subject\',this.value)"></label><textarea class="of-email-content" oninput="OwnerFlow.draft(\'body\',this.value)">' + esc(draft.body) + '</textarea><div class="of-credentials"><span>' + icon('key-round', 16) + '</span><div><small>LOGIN & ASSIGNMENT KEY</small><strong>' + esc(draft.username) + ' <b>·</b> ' + esc(draft.password) + ' <b>·</b> ' + esc(draft.key) + '</strong></div><button class="of-icon-button" title="Copy credentials" onclick="OwnerFlow.copyCredentials()">' + icon('copy', 15) + '</button></div></div></div>' :
      '<div class="of-customer-preview"><div class="of-preview-info"><span class="of-preview-globe">' + icon('globe', 24) + '</span><div><strong>A little early access. A lot of useful insight.</strong><p>Customers can explore a simulated app, report a bug, or share an idea. Testers receive every submission.</p><div><span>' + icon('clock', 14) + ' 48-hour feedback window</span><span>' + icon('shield-check', 14) + ' Private preview link</span></div></div></div><div class="of-email-preview"><div class="of-draft-label">' + icon('sparkles', 14) + ' AI-DRAFTED CUSTOMER EMAIL <span>Editable preview</span></div><label class="of-email-subject"><span>To</span><input value="' + esc(state.customerEmail.to) + '" oninput="OwnerFlow.customerDraft(\'to\',this.value)"></label><label class="of-email-subject"><span>Subject</span><input value="' + esc(state.customerEmail.subject) + '" oninput="OwnerFlow.customerDraft(\'subject\',this.value)"></label><textarea class="of-email-content" oninput="OwnerFlow.customerDraft(\'body\',this.value)">' + esc(state.customerEmail.body) + '</textarea><div class="of-preview-link"><span>' + icon('link', 16) + '</span><code>' + esc(customerLink()) + '</code><button class="btn ghost" onclick="OwnerFlow.copyLink()">Copy link</button></div></div></div>') +
      '<div class="of-review-footnote">' + icon('info', 14) + ' Demo invitations appear instantly in the outbox. No real emails are sent.</div></div>',
      back('tester') + '<div class="of-footer-actions"><button class="btn secondary" onclick="OwnerFlow.previewEmail()">' + icon('eye', 16) + ' Preview email</button><button class="btn primary" ' + (state.sending ? 'disabled' : '') + ' onclick="OwnerFlow.launch()">' + icon(state.sending ? 'loader-circle' : 'send', 17) + (state.sending ? ' Launching project…' : ' Launch & send invitations') + '</button></div>');
  }
  function complete() {
    state.step = 'complete';
    shell(header('Your next release is in motion.', 'Every person has a clear role. Every handoff has a home.') +
      '<div class="of-body of-success-body"><div class="of-success-check">' + icon('check', 36) + '</div><span class="of-status-label">WORKSPACE LAUNCHED</span><h3>' + esc(state.name) + ' is ready for your team.</h3><p class="muted">' + selectedPeople().length + ' personalized invitations are in the demo outbox.<br>Your team can sign in and accept their assignments now.</p><div class="of-success-avatars">' + selectedPeople().map(function (p) { return a().avatar(p, 42); }).join('') + '</div><div class="of-success-stats"><div><strong>1</strong><span>Project manager</span></div><div><strong>' + state.selected.developer.length + '</strong><span>Developers</span></div><div><strong>' + state.selected.tester.length + '</strong><span>Testers</span></div></div><div class="of-share-card"><div><span class="of-share-icon">' + icon('link', 20) + '</span><div><strong>Your customer preview is ready</strong><span>A private link for 48 hours of early feedback.</span></div></div><div class="of-preview-link"><code>' + esc(customerLink()) + '</code><button class="btn secondary" onclick="OwnerFlow.copyLink()">' + icon('copy', 15) + ' Copy link</button></div><button class="btn ghost" onclick="OwnerFlow.openCustomer()">Open customer experience ' + icon('external-link', 15) + '</button></div></div>',
      '<button class="btn secondary" onclick="OwnerFlow.downloadInvitations()">' + icon('download', 16) + ' Export invitations</button>' + next('Go to project', 'viewProject()', false));
  }
  var OwnerFlow = {
    open: function () {
      clearInterval(analysisTimer); clearTimeout(sendingTimer);
      var due = new Date(); due.setDate(due.getDate() + 7);
      state = {step: 'upload', projectId: 'ps-' + Date.now().toString(36), name: '', description: '', version: '1.0.0', filename: '', size: '', selected: {manager: [], developer: [], tester: []}, drafts: {}, selectedEmail: null, emailTab: 'team', deadline: due.toISOString().slice(0, 10), analysisProgress: 0, search: ''};
      upload();
    },
    close: function () { clearInterval(analysisTimer); a().closeModal(); },
    field: function (field, value) {
      if (!state) return;
      if (field !== 'deadline') { state[field] = value; return; }
      if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
      var previousDate = deadlineLabel();
      state.deadline = value;
      var updatedDate = deadlineLabel();
      Object.keys(state.drafts).forEach(function (id) { var draft = state.drafts[id]; draft.body = draft.body.split(previousDate).join(updatedDate); });
      if (state.customerEmail) state.customerEmail.body = state.customerEmail.body.replace('Feedback closes: ' + previousDate, 'Feedback window: 48 hours after opening this preview.').split(previousDate).join(updatedDate);
      if (state.step === 'review') review();
    },
    file: function (file) {
      if (!file) return;
      if (!/\.zip$/i.test(file.name)) { a().toast('Choose a .zip archive to continue.', 'error'); return; }
      if (file.size > 250 * 1024 * 1024) { a().toast('Please choose an archive smaller than 250 MB.', 'error'); return; }
      state.filename = file.name; state.size = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      if (!state.name) state.name = file.name.replace(/\.zip$/i, '').replace(/[_-]/g, ' ');
      upload(); a().toast('Archive attached. Ready for a simulated analysis.');
    },
    drop: function (event) { event.preventDefault(); OwnerFlow.file(event.dataTransfer.files[0]); },
    sample: function () { state.filename = 'connectcare-portal-v2.4.zip'; state.size = '24.8 MB'; state.name = 'ConnectCare Portal'; state.version = '2.4.0'; state.description = 'A secure partner collaboration portal with document sharing, release reporting, and a more accessible account experience.'; upload(); a().toast('Sample project loaded. You’re ready to analyze.'); },
    analyze: function () {
      if (!state.filename) { a().toast('Attach a ZIP archive or use the sample project.', 'error'); return; }
      if (!state.name.trim()) { a().toast('Add a project name to continue.', 'error'); document.getElementById('of-name').focus(); return; }
      state.analysisProgress = 0; analysis(); clearInterval(analysisTimer);
      analysisTimer = setInterval(function () { if (!state || state.step !== 'analysis' || !document.querySelector('.of-shell')) { clearInterval(analysisTimer); return; } state.analysisProgress = Math.min(100, state.analysisProgress + 5 + Math.floor(Math.random() * 7)); if (state.analysisProgress >= 100) { clearInterval(analysisTimer); results(); } else analysis(); }, 300);
    },
    skipAnalysis: function () { clearInterval(analysisTimer); state.analysisProgress = 100; results(); },
    go: function (step) { state.search = ''; if (step === 'upload') upload(); else if (step === 'results') results(); else if (step === 'review') review(); else if (['manager', 'developer', 'tester'].includes(step)) team(step); },
    search: function (value) { state.search = value; var pos = value.length; team(state.step); var input = document.querySelector('.of-search input'); if (input) { input.focus(); input.setSelectionRange(pos, pos); } },
    toggle: function (id, role) { var p = person(id); if (!p || p.available === false) return; var ids = state.selected[role], index = ids.map(String).indexOf(String(id)); if (index >= 0) ids.splice(index, 1); else if (role === 'manager') state.selected.manager = [p.id]; else ids.push(p.id); team(role); },
    nextTeam: function () { var role = state.step; if (!state.selected[role].length) return; state.search = ''; if (role === 'manager') team('developer'); else if (role === 'developer') team('tester'); else review(); },
    reassess: function () {
      state.step = 'reassess'; state.reassessor = null;
      shell(header('A second pair of eyes. Fast.', 'Send a priority review request to an available developer.', 'URGENT REQUEST') + '<div class="of-body"><div class="of-urgent-note">' + icon('zap', 20) + '<div><strong>A focused review before you assign the team</strong><p>The developer receives the archive details, sample analysis, and a 4-hour response target.</p></div></div><div class="of-people-list">' + people('developer').filter(function (p) { return p.available !== false; }).map(function (p) { return employeeCard(p, 'developer', false, true); }).join('') + '</div></div>', back('results') + '<button class="btn primary" id="of-reassess-send" disabled onclick="OwnerFlow.sendReassessment()">' + icon('send', 16) + ' Send urgent request</button>');
    },
    pickReassessor: function (id) { state.reassessor = id; document.querySelectorAll('.of-person').forEach(function (card) { var picked = card.getAttribute('onclick').includes("'" + id + "'"); card.classList.toggle('is-selected', picked); card.querySelector('.of-select-box').innerHTML = picked ? icon('check', 13) : ''; }); document.getElementById('of-reassess-send').disabled = false; },
    sendReassessment: function () { var p = person(state.reassessor); if (!p) return; a().state.notifications.unshift({id: 'reassess-' + Date.now(), employeeId: p.id, title: 'Urgent reassessment requested', text: state.name + ' needs a second review. Target response: 4 hours.', body: state.name + ' needs a second review. Target response: 4 hours.', page: 'projects', time: 'Just now', read: false, type: 'urgent'}); a().save(); a().toast('Urgent reassessment sent to ' + p.name + '.'); results(); },
    emailPerson: function (id) { state.selectedEmail = id; review(); },
    emailTab: function (tab) { state.emailTab = tab; review(); },
    draft: function (field, value) { state.drafts[state.selectedEmail][field] = value; },
    customerDraft: function (field, value) { state.customerEmail[field] = value; },
    copyCredentials: function () { var d = state.drafts[state.selectedEmail]; a().copy('Username: ' + d.username + '\nPassword: ' + d.password + '\nAssignment key: ' + d.key); },
    copyLink: function () { a().copy(customerLink()); },
    previewEmail: function () {
      var customer = state.emailTab === 'customer', d = customer ? state.customerEmail : state.drafts[state.selectedEmail];
      state.previewReturn = true;
      a().modal('<div class="of-email-full"><div class="of-header"><div><div class="eyebrow">INVITATION PREVIEW</div><h2>' + esc(d.subject) + '</h2><p class="muted">From: Alexander Morgan &lt;alexander.morgan@pfizer.demo&gt;</p></div><button class="of-close" onclick="OwnerFlow.go(\'review\')">' + icon('x', 20) + '</button></div><div class="of-body"><div class="of-email-letter"><div class="of-letter-brand"><i>pfizer</i><span>Pre-Shipment</span></div><span class="of-letter-tag">' + (customer ? 'YOUR EARLY ACCESS' : 'YOU’RE PART OF THE TEAM') + '</span><h3>' + (customer ? 'Help shape what comes next.' : 'Let’s ship something great, together.') + '</h3><p style="white-space:pre-wrap">' + esc(d.body) + '</p><div class="of-letter-footer">Pre-Shipment · By Pfizer<br>Demo email preview · No message has been sent.</div></div></div><footer class="of-footer"><span class="muted">Personalized for ' + esc(customer ? state.customerEmail.to : person(state.selectedEmail).name) + '</span><button class="btn primary" onclick="OwnerFlow.go(\'review\')">Back to invitations ' + icon('arrow-right', 16) + '</button></footer></div>', 'large');
    },
    launch: function () {
      if (state.sending || state.launched) return;
      if (!state.selected.manager.length || !state.selected.developer.length || !state.selected.tester.length) { a().toast('Choose at least one person for each role.', 'error'); return; }
      state.sending = true; review();
      sendingTimer = setTimeout(function () {
        var project = {id: state.projectId, name: state.name, description: state.description, version: state.version, readiness: 74, progress: 32, bugs: 12, critical: 3, deadline: state.deadline, status: 'In progress', team: selectedIds(), color: '#2463eb', abbr: state.name.split(' ').map(function (w) { return w[0]; }).slice(0, 2).join(''), customerLink: customerLink(), customerEmail: state.customerEmail, createdAt: new Date().toISOString(), feedbackWindow: 48, archive: state.filename};
        a().state.projects.unshift(project);
        if (Array.isArray(a().state.issues)) {
          var issueNumber = a().state.issues.reduce(function (highest, issue) { var numeric = Number(String(issue.id).replace(/^BUG-/, '')); return Number.isFinite(numeric) ? Math.max(highest, numeric) : highest; }, 1042) + 1;
          var issueDeadline = new Date(state.deadline + 'T17:00:00'); issueDeadline.setDate(issueDeadline.getDate() - 2);
          var issueDeadlineText = issueDeadline.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
          var initialFindings = [
            {title: 'Session expiry interrupts a saved workflow', severity: 'Critical', category: 'Authentication', estimate: '6 hours', description: 'The session refresh flow discards an in-progress document request. Preserve the draft while refreshing the access token and resume the request safely after authentication.', steps: '1. Sign in to the preview portal\n2. Create a new document request and add two sample files\n3. Simulate session expiry before selecting Save\n4. Sign in again and inspect the request', expected: 'The draft and attached file references remain available after the session is renewed.', actual: 'The portal returns to the dashboard and the unsaved request is lost.'},
            {title: 'Large report exports time out before download', severity: 'High', category: 'Reporting & performance', estimate: '4 hours', description: 'The report export action can exceed its request timeout when filters return more than 5,000 sample rows. Add a progress state and a reliable completion path so users can download a single complete export.', steps: '1. Open Reports in the preview portal\n2. Select the All partners date range\n3. Generate a report containing 5,000 sample records\n4. Select Export CSV and wait 30 seconds', expected: 'The export finishes, displays a confirmation, and downloads one complete CSV file.', actual: 'A generic timeout message appears and no file is downloaded.'},
            {title: 'Keyboard focus escapes the document dialog', severity: 'Medium', category: 'Accessibility', estimate: '3 hours', description: 'Keyboard focus can move behind the document preview dialog. Add a focus trap, preserve an accessible dialog name, and return focus to the opening control after the preview closes.', steps: '1. Navigate to Documents using the keyboard\n2. Press Enter on a document preview\n3. Press Tab repeatedly through the dialog controls\n4. Close the dialog with Escape', expected: 'Focus stays inside the dialog and returns to the selected document when the dialog closes.', actual: 'Focus moves to the page navigation behind the overlay and is lost after dismissal.'}
          ];
          initialFindings.forEach(function (finding, index) { a().state.issues.splice(index, 0, Object.assign({id: 'BUG-' + (issueNumber + index), projectId: state.projectId, status: 'Open', deadline: issueDeadlineText, assignee: state.selected.developer[index % state.selected.developer.length], source: 'Simulated initial analysis', environment: 'Preview sandbox · Chrome · Windows 11'}, finding)); });
        }
        selectedPeople().forEach(function (p, index) { var d = state.drafts[p.id]; a().state.assignments.push({id: 'assignment-' + state.projectId + '-' + index, employeeId: p.id, projectId: state.projectId, username: d.username, password: d.password, key: d.key, accepted: false, emailSent: true, subject: d.subject, body: d.body}); a().state.notifications.unshift({id: 'notice-' + state.projectId + '-' + index, employeeId: p.id, projectId: state.projectId, title: 'A new project has been assigned', text: 'You’ve been assigned as ' + p.role + ' for ' + state.name + '. Enter your email assignment key to accept.', body: 'You’ve been assigned as ' + p.role + ' for ' + state.name + '. Enter your email assignment key to accept.', page: 'projects', time: 'Just now', read: false, type: 'assignment'}); });
        state.sending = false; state.launched = true; a().save(); a().render(); complete(); a().toast('Project launched. Demo invitations sent to your team.', 'success');
      }, 950);
    },
    openCustomer: function () { window.open(customerLink(), '_blank'); },
    viewProject: function () { a().closeModal(); if (typeof a().openProject === 'function') a().openProject(state.projectId); else if (typeof a().navigate === 'function') a().navigate('projects'); else a().render(); },
    downloadInvitations: function () { var text = selectedPeople().map(function (p) { var d = state.drafts[p.id]; return 'TO: ' + p.name + ' <' + p.email + '>\nSUBJECT: ' + d.subject + '\n\n' + d.body; }).join('\n\n' + '—'.repeat(50) + '\n\n'); var blob = new Blob([text], {type: 'text/plain;charset=utf-8'}), link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'pre-shipment-' + state.projectId + '-invitations.txt'; link.click(); setTimeout(function () { URL.revokeObjectURL(link.href); }, 500); a().toast('Demo invitations exported.'); },
    getState: function () { return state; }
  };
  window.OwnerFlow = OwnerFlow;
}());
