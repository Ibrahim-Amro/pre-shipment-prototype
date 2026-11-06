/* Interactive role workspaces. All analysis and delivery actions are local simulations. */
(function () {
  'use strict';
  const source = document.currentScript && document.currentScript.src;
  if (!document.querySelector('[data-workspace-style]')) {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = source ? new URL('workspaces.css', source).href : 'workspaces.css';
    stylesheet.dataset.workspaceStyle = 'true';
    document.head.appendChild(stylesheet);
  }
  const W = window.Workspaces = {};
  const ui = { projectFilter: 'active', issueFilter: 'all', feedbackFilter: 'all', teamFilter: 'all', capacity: [], runs: {}, fixes: {} };
  const app = () => window.A;
  const state = () => app().state;
  const esc = v => app().escape ? app().escape(String(v == null ? '' : v)) : String(v == null ? '' : v).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  const js = v => JSON.stringify(String(v == null ? '' : v)).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const ico = (name, size = 18) => app().icon(({'git-pull-request':'activity',crosshair:'target','log-in':'log-out'}[name] || name), size);
  const av = (p, size = 32) => app().avatar(p || {name:'Team member', avatar:1}, size);
  const btn = (label, method, arg, cls='secondary', icon='') => `<button class="btn ${cls}" onclick="Workspaces.${method}(${arg == null ? '' : js(arg)})">${icon ? ico(icon,16) : ''}${label}</button>`;
  const badge = (text, color = 'blue') => `<span class="ws-badge ws-${color}">${esc(text)}</span>`;
  const project = id => (state().projects || []).find(p => String(p.id) === String(id));
  const employee = id => (state().employees || []).find(p => String(p.id) === String(id));
  const issue = id => (state().issues || []).find(p => String(p.id) === String(id));
  const user = () => state().user || {id:'demo',name:'Alex Morgan',role:state().role};
  const role = () => state().role || 'developer';
  const roleName = r => ({developer:'Developer',tester:'QA engineer',manager:'Project manager'}[r] || r);
  const people = r => (state().employees || []).filter(e => !r || e.role === r);
  const projectDevelopers = id => people('developer').filter(person=>person.available!==false&&(project(id)?.team||[]).includes(person.id));
  function validateRequiredText(form) {
    for(const input of form.querySelectorAll('input[required],textarea[required]')) {
      input.setCustomValidity(input.value.trim() ? '' : 'Enter a value with visible text.');
      input.oninput = () => input.setCustomValidity('');
    }
    return form.reportValidity();
  }
  const isDone = p => ProjectPriority.of(p).key === 'completed';
  const allProjects = () => state().projects || [];
  W.hasAcceptedProject = function (projectId) {
    const p=project(projectId);
    if(!p)return false;
    if(role()==='manager')return true;
    if(UatWorkflow.stage(p)==='awaiting')return false;
    const personal=(state().assignments||[]).filter(assignment=>assignment.employeeId===user().id&&assignment.projectId===p.id);
    if(personal.length)return personal.every(assignment=>assignment.accepted||(state().accepted||{})[assignment.id]);
    return false;
  };
  const myProjects = () => allProjects().filter(p=>W.hasAcceptedProject(p.id));
  const myIssues = () => {
    const ids = myProjects().map(p => p.id);
    const all = (state().issues || []).filter(i =>
      ids.includes(i.projectId)
    );
    const mine = all.filter(i => i.assignee === user().id);
    return role() === 'developer' && mine.length ? mine : all;
  };
  const testCaseFor = i => project(i.projectId)?.uat?.cases?.find(test => test.id===i.uatCaseId);
  const canFix = i => role()==='developer' && i.assignee===user().id
    && W.hasAcceptedProject(i.projectId) && ['Open','In progress','Reopened'].includes(i.status)
    && (!i.uatCaseId || testCaseFor(i)?.status==='fail');
  const canAssignFinding = i => role()==='manager' && ['Open','In progress','Reopened'].includes(i.status);
  const openIssues = () => myIssues().filter(i => i.status !== 'Resolved');
  const severityColor = s => ({Critical:'red',High:'amber',Medium:'blue',Low:'slate'}[s] || 'slate');
  const severityOrder = s => ({Critical:0,High:1,Medium:2,Low:3}[s] ?? 4);
  const urgent = i => i.severity === 'Critical' ? 96 : i.severity === 'High' ? 84 : i.severity === 'Medium' ? 56 : 28;
  const percent = v => Math.max(0,Math.min(100,Number(v) || 0));
  const date = v => { if (!v) return 'Nov 12'; const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? v+'T12:00:00' : v); return Number.isNaN(d.valueOf()) ? esc(v) : d.toLocaleDateString('en-US',{month:'short',day:'numeric'}); };
  const projectMark = p => `<span class="ws-project-mark project-priority-mark" data-project-priority="${ProjectPriority.of(p).key}">${esc(p.abbr || p.name.split(' ').map(s=>s[0]).slice(0,2).join(''))}</span>`;
  const touchProject = id => {const p=project(id);if(p)p.updatedAt=new Date().toISOString();};
  const refresh = () => { app().save(); app().render(); };
  const notify = (title, text, target='manager', employeeId, projectId) => {
    const p=project(projectId);
    const recipient=employee(employeeId) || (target==='manager'
      ? (p?.team||[]).map(employee).find(person=>person?.role==='manager') || people('manager').find(person=>person.available!==false) || people('manager')[0]
      : null);
    if(!recipient||recipient.role!==target)return;
    state().notifications.unshift({id:'n-'+crypto.randomUUID(),title,text,body:text,message:text,employeeId:recipient.id,role:recipient.role,time:'Just now',createdAt:new Date().toISOString(),read:false,type:'info',page:'issues'});
  };
  const header = (eyebrow, title, subtitle, action='') => `<div class="ws-page-header"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p></div><div class="ws-header-actions">${action}</div></div>`;
  const section = (title, subtitle='', action='') => `<div class="ws-section-heading"><div><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div>${action}</div>`;
  const stat = (label, value, foot, icon, color='blue') => `<div class="ws-stat card"><div class="ws-stat-label">${label}<span class="ws-stat-icon ws-${color}">${ico(icon,18)}</span></div><div class="ws-stat-value">${value}</div><div class="ws-stat-foot">${foot}</div></div>`;
  const progress = (v, color='blue') => `<div class="ws-progress"><span class="ws-progress-fill ws-progress-${color}" style="width:${percent(v)}%"></span></div>`;
  const empty = (title, body, icon='check-circle') => `<div class="ws-empty"><span>${ico(icon,30)}</span><h3>${title}</h3><p>${body}</p></div>`;
  const assignments = () => (state().assignments || []).filter(a => a.employeeId === user().id);
  const pending = () => role()==='manager'?[]:assignments().filter(a => UatWorkflow.stage(project(a.projectId))!=='awaiting').filter(a => !a.accepted && !(state().accepted || {})[a.id]).sort((a,b)=>ProjectPriority.compare(project(a.projectId),project(b.projectId)));
  function assignmentBanner() {
    const a = pending()[0];
    if (!a) {
      const accepted=assignments().filter(x=>x.accepted||(state().accepted||{})[x.id]).slice(-1)[0];
      if(!accepted)return '';
      const p=project(accepted.projectId);
      return `<div class="ws-accepted-banner"><span class="ws-accepted-check">${ico('check',15)}</span><div><strong>Assignment accepted</strong><span>${esc(p?p.name:'Your project')} · Your ${roleName(role()).toLowerCase()} workspace is active.</span></div>${btn('View invitation','previewInvite',accepted.id,'ghost','mail')}</div>`;
    }
    const p = project(a.projectId) || myProjects()[0];
    return `<div class="ws-assignment-banner"><div class="ws-assignment-icon">${ico('mail',23)}</div><div class="ws-assignment-copy"><div class="ws-banner-eyebrow"><span class="ws-live-dot"></span>NEW ASSIGNMENT</div><h3>${esc(p ? p.name : 'A new project')} is ready for you</h3><p>Your ${roleName(role()).toLowerCase()} workspace is prepared. Enter the assignment key from your invitation to get started.</p></div><div class="ws-assignment-actions">${btn('Preview invitation','previewInvite',a.id,'ws-btn-onblue','mail')}${btn('Accept assignment','acceptAssignment',a.id,'ws-btn-white','arrow-right')}</div></div>`;
  }
  W.overviewData = () => ({projects:myProjects(),issues:myIssues(),pending:pending()});
  function issuesTable(items, mode=role(), limit=0) {
    const list = [...items].sort((a,b)=>
      ProjectPriority.compare(project(a.projectId) || {id:a.projectId}, project(b.projectId) || {id:b.projectId}) ||
      Number(a.status==='Resolved') - Number(b.status==='Resolved') ||
      severityOrder(a.severity) - severityOrder(b.severity) ||
      String(a.id).localeCompare(String(b.id), undefined, {numeric:true})
    ).slice(0,limit || 999);
    if (!list.length) return empty('All clear for now','New findings and tasks will appear here as the team reviews your projects.');
    return `<div class="ws-table-wrap"><table class="ws-table"><thead><tr><th>Issue / task</th><th>Priority</th><th>${mode === 'manager' ? 'Developer' : 'AI urgency'}</th><th>Estimate</th><th>Status</th><th></th></tr></thead><tbody>${list.map(i=>{ const p=project(i.projectId); const assignee=employee(i.assignee); return `<tr><td><button class="ws-finding-project" onclick="Workspaces.openProject(${js(i.projectId)})">${esc(p ? p.name : 'Project')}</button><button class="ws-table-title" onclick="Workspaces.issueDetails(${js(i.id)})">${esc(i.title)}</button><span class="ws-table-sub">${esc(i.id)}</span></td><td>${badge(i.severity,severityColor(i.severity))}</td><td>${mode === 'manager' ? app().person(assignee || {name:'Unassigned'}, assignee ? roleName(assignee.role) : 'Awaiting assignment') : `<span class="ws-urgency ${urgent(i)>80?'ws-text-red':''}"><i style="width:${urgent(i)/4}px"></i>${urgent(i)}%</span>`}</td><td><span class="ws-estimate">${ico('clock',13)}${esc(i.estimate || '2h')}</span></td><td><span class="ws-status-dot ws-dot-${i.status==='Resolved'?'green':i.status==='In review'?'purple':i.status==='In progress'?'blue':'amber'}"></span>${esc(i.status)}</td><td>${mode === 'manager' && UatWorkflow.canReview(i) ? btn('Review','reviewFix',i.id,'ghost','arrow-right') : mode === 'developer' && canFix(i) ? btn('Apply fix','fixIssue',i.id,'ghost','arrow-up-right') : btn('View','issueDetails',i.id,'ghost','arrow-up-right')}</td></tr>` }).join('')}</tbody></table></div>`;
  }
  function riskRow(p) {
    const risk=['urgent','high'].includes(ProjectPriority.of(p).key), val=risk?Math.max(72,98-Math.round(p.progress/3)):24;
    return `<div class="ws-risk-row"><div class="ws-risk-project">${projectMark(p)}<div><button class="ws-table-title" onclick="Workspaces.openProject(${js(p.id)})">${esc(p.name)}</button><span class="ws-table-sub">${p.team?p.team.length:5} teammates · Due ${date(p.deadline)}</span></div></div><div class="ws-risk-progress"><span>${percent(p.progress)}% complete</span>${progress(p.progress)}</div><div class="ws-risk-score">${ProjectPriority.badge(p)}<span>${val}% ${risk?'deadline risk':'risk'}</span></div><button class="ws-icon-button" title="View project" onclick="Workspaces.openProject(${js(p.id)})">${ico('arrow-up-right',18)}</button></div>`;
  }
  function projectsPage() {
    const active=myProjects().filter(p=>!isDone(p)), done=myProjects().filter(isDone).sort(ProjectPriority.compare);
    const visible=[...(ui.projectFilter==='completed'?done:ui.projectFilter==='all'?myProjects():active)].sort(ProjectPriority.compare);
    return header('PROJECT PORTFOLIO','Your projects','From first review to final shipment, all your work lives here.',role()==='tester'?btn('Report a finding','reportFinding',null,'primary','plus'):role()==='manager'?'<button class="btn primary" onclick="OwnerFlow.open()">New project</button>':'')+assignmentBanner()+`<div class="ws-toolbar"><div class="ws-filter-tabs">${[['active','Active projects',active.length],['completed','Completed',done.length],['all','All projects',myProjects().length]].map(([key,label,n])=>`<button class="${ui.projectFilter===key?'active':''}" onclick="Workspaces.filter('projectFilter','${key}')">${label}<span>${n}</span></button>`).join('')}</div><div class="ws-search-small">${ico('search',16)}<input placeholder="Search projects..." oninput="Workspaces.searchCards(this.value,'uat-project-row-entry')"></div></div>${visible.length ? UatOverview.projectRows(visible) : empty('No projects here yet','Projects matching this view will appear here.','folder')}${ui.projectFilter==='active'&&done.length?`<div class="ws-section-block">${section('Recently completed','Shipped, approved, and ready for what comes next.')}${UatOverview.projectRows(done)}</div>`:''}`;
  }
  function issuesPage() {
    const list=myIssues();
    const filtered=ui.issueFilter==='review'?list.filter(i=>i.status==='In review'):ui.issueFilter==='critical'?list.filter(i=>i.severity==='Critical'):ui.issueFilter==='resolved'?list.filter(i=>i.status==='Resolved'):list;
    return header(role()==='manager'?'REVIEW & APPROVALS':role()==='tester'?'QUALITY CONTROL':'YOUR TASKS',role()==='manager'?'The review queue':role()==='tester'?'Findings & issues':'Issues & fixes',role()==='manager'?'Give completed work a thoughtful final check.':'A focused view of the work between here and a confident release.',role()==='tester'?btn('Report a finding','reportFinding',null,'primary','plus'):'')+`<div class="ws-toolbar"><div class="ws-filter-tabs">${[['all','All issues'],['critical','Critical'],['review','In review'],['resolved','Resolved']].map(([k,l])=>`<button class="${ui.issueFilter===k?'active':''}" onclick="Workspaces.filter('issueFilter','${k}')">${l}<span>${k==='all'?list.length:k==='critical'?list.filter(i=>i.severity==='Critical').length:k==='review'?list.filter(i=>i.status==='In review').length:list.filter(i=>i.status==='Resolved').length}</span></button>`).join('')}</div><span class="ws-sorted-by">${ico('sparkles',14)}Grouped by project · Open findings first</span></div><div class="card ws-table-card">${issuesTable(filtered)}</div>`;
  }
  function feedbackList() {
    if (!state().feedback || !state().feedback.length) {
      const p = allProjects()[0];
      state().feedback=[{id:'FB-101',name:'Sarah Mitchell',email:'sarah.mitchell@northwell.example',avatar:47,projectId:p?p.id:'p1',type:'Bug',title:'Export button gets stuck on larger reports',description:'When I export a report with more than 100 shipments, the loading indicator keeps spinning and the download never starts. Smaller reports work correctly.',status:'New',createdAt:'2 hours ago',environment:'Chrome 130 · Windows 11'},{id:'FB-102',name:'David Chen',email:'david.chen@meridian.example',avatar:12,projectId:p?p.id:'p1',type:'Suggestion',title:'A saved filter would make daily checks faster',description:'I use the same region and date range every morning. Being able to save a filter and give it a name would save our team a lot of time.',status:'New',createdAt:'4 hours ago',environment:'Edge · Windows 11'},{id:'FB-103',name:'Emily Roberts',email:'emily.roberts@carebridge.example',avatar:44,projectId:p?p.id:'p1',type:'Bug',title:'Shipment notes disappear after going back',description:'If I add a note and go back to edit the delivery address, my notes are cleared. It would help if draft changes were preserved.',status:'Approved',createdAt:'Yesterday',environment:'Safari · macOS'}];
    }
    return state().feedback;
  }
  function feedbackCard(f,compact=false) {
    const p=project(f.projectId), name=f.name||f.customer||f.customerName||'Customer';
    const type=f.type||f.category||'Suggestion';
    const reviewed=/approved|sent|resolved|reviewed/i.test(f.status||'');
    return `<article class="card ws-feedback-card ${reviewed?'ws-feedback-reviewed':''}"><div class="ws-feedback-card-top"><div class="ws-feedback-person">${app().person({name,avatar:f.avatar>0&&f.avatar<=16?f.avatar:15},'Customer')}<p class="person-meta">${esc(p?p.name:'Customer preview')} · ${esc(f.time||(f.createdAt && !f.createdAt.includes('T')?f.createdAt:'Recently'))}</p></div>${badge(type,/bug/i.test(type)?'amber':'purple')}</div><button class="ws-feedback-title" onclick="Workspaces.feedbackDetails(${js(f.id)})">${esc(f.title||f.subject||'Customer feedback')}</button><p>${esc(f.description||f.body||f.message||f.content||'A customer has shared an idea for the next release.')}</p><div class="ws-feedback-bottom">${reviewed?badge(f.status,'green'):`<span class="ws-status-new"><i></i>Needs review</span>`}<div>${reviewed?btn('View details','feedbackDetails',f.id,'ghost','arrow-up-right'): /bug/i.test(type)?btn('Approve bug','triageFeedback',f.id,'secondary','check'):btn('Send to developers','triageFeedback',f.id,'secondary','arrow-right')}</div></div></article>`;
  }
  function managerBetaSessions() {
    return (state().betaFeedback || []).filter(session => session.managerId === user().id);
  }
  W.betaFeedbackCount = () => role()==='manager' ? managerBetaSessions().length : 0;

  function betaFeedbackInbox() {
    const sessions=managerBetaSessions().sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt));
    const cards=sessions.map(session=>{
      const p=project(session.projectId);
      const submitted=new Date(session.submittedAt).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
      const count=session.notes.length;
      const notes=session.notes.map(note=>`<li><div>${badge(note.type,note.type==='Bug'?'amber':'purple')}<strong>${esc(note.title)}</strong></div><p>${esc(note.body)}</p></li>`).join('');
      return `<details class="card ws-beta-session"><summary><span class="ws-beta-session-summary"><span><strong>${esc(p?.name || 'Beta project')}</strong><small>${esc(submitted)}</small></span>${badge(`${count} ${count===1?'note':'notes'}`)}</span></summary><ol>${notes}</ol></details>`;
    }).join('');
    return header('CUSTOMER BETA','Beta feedback','Review the notes customers sent at the end of their beta sessions.') +
      `<div class="ws-beta-inbox">${cards || `<div class="card">${empty('No beta sessions submitted yet','Customer notes for your projects will appear here after each session.','message-square')}</div>`}</div>`;
  }
  function feedbackPage() {
    const all=feedbackList();
    const filtered=all.filter(f=>ui.feedbackFilter==='all'||ui.feedbackFilter==='bugs'&&/bug/i.test(f.type||f.category)||ui.feedbackFilter==='suggestions'&&/suggestion|idea|enhancement/i.test(f.type||f.category)||ui.feedbackFilter==='reviewed'&&/approved|sent|resolved|reviewed/i.test(f.status||''));
    const preview=myProjects().some(p=>p.uat?.stage==='customer') ? btn('Preview customer experience','customerPreview',null,'secondary','external-link') : '';
    const heading=role()==='manager'
      ? betaFeedbackInbox()+section('Customer pre-feedback','Review and triage individual customer reports.',preview)
      : header('EARLY CUSTOMER INSIGHTS','Customers pre-feedback','Turn real first impressions into a better release. Review sample feedback from early customer testing.',preview);
    return heading+`<div class="ws-info-banner">${ico('message-square',20)}<div><strong>Every voice gets a thoughtful review.</strong><span>Approve confirmed bugs to create a finding. Pass useful suggestions directly to your development team.</span></div></div><div class="ws-toolbar"><div class="ws-filter-tabs">${[['all','All feedback'],['bugs','Bugs'],['suggestions','Suggestions'],['reviewed','Reviewed']].map(([k,l])=>`<button class="${ui.feedbackFilter===k?'active':''}" onclick="Workspaces.filter('feedbackFilter','${k}')">${l}</button>`).join('')}</div><span class="ws-sorted-by">${all.filter(f=>!(/approved|sent|resolved/i.test(f.status||''))).length} awaiting review</span></div><div class="ws-feedback-grid">${filtered.map(f=>feedbackCard(f)).join('')||empty('Nothing in this view','Choose another filter to explore customer feedback.','message-square')}</div>`;
  }
  function teamPage() {
    const list=people().filter(e=>['manager','developer','tester'].includes(e.role)).filter(e=>ui.teamFilter==='all'||e.role===ui.teamFilter);
    return header('PEOPLE & CAPACITY','The people behind the release','A shared view of your team, their availability, and current workload.',role()==='manager'?'<button class="btn primary" onclick="A.inviteEmployee()">Add team member</button>':btn('View project portfolio','go','projects','secondary','folder'))+`<div class="ws-toolbar"><div class="ws-filter-tabs">${[['all','Everyone'],['manager','Managers'],['developer','Developers'],['tester','QA engineers']].map(([k,l])=>`<button class="${ui.teamFilter===k?'active':''}" onclick="Workspaces.filter('teamFilter','${k}')">${l}</button>`).join('')}</div><span class="ws-sorted-by">${list.length} teammates</span></div><div class="ws-team-grid">${list.map(e=>`<article class="card ws-teammate ${e.available===false?'ws-unavailable':''}"><div class="ws-teammate-top">${av(e,52)}${badge(e.available===false?'On holiday':e.load>=85?'At capacity':'Available',e.available===false?'slate':e.load>=85?'amber':'green')}</div><h3>${esc(e.name)}</h3><p>${esc(e.title || roleName(e.role))}</p><a href="mailto:${esc(e.email)}" onclick="event.preventDefault();Workspaces.messagePerson(${js(e.id)})">${esc(e.email)}</a><div class="ws-workload"><span>Current workload<strong>${percent(e.load)}%</strong></span>${progress(e.load,e.load>=85?'amber':'blue')}</div><div class="ws-teammate-bottom"><span>${ico('folder',14)}${allProjects().filter(p=>(p.team||[]).includes(e.id)&&!isDone(p)).length} active projects</span>${role()==='manager'? `<button class="btn ghost" onclick="A.editEmployee(${js(e.id)})">Manage</button>`:btn('Message','messagePerson',e.id,'ghost','message-square')}</div></article>`).join('')}</div>`;
  }
  function reportsPage() {
    const resolved=myIssues().filter(i=>i.status==='Resolved').length, total=myIssues().length;
    return header('RELEASE INTELLIGENCE','A little perspective. A clearer plan.','Your team’s progress, quality signals, and release health in one place.',btn('Export report','exportReport',null,'primary','download'))+`<div class="ws-stats-grid">${stat('Release readiness',`${Math.round(myProjects().reduce((s,p)=>s+(p.readiness||p.progress||0),0)/Math.max(1,myProjects().length))}%`,'Average across your portfolio','shield-check','blue')}${stat('Issues resolved',String(resolved).padStart(2,'0'),`${total?Math.round(resolved/total*100):0}% of total findings resolved`,'check-circle','green')}${stat('Team velocity','+18%','Compared with the previous cycle','trending-up','purple')}</div><div class="ws-reports-grid"><div class="card ws-chart-card">${section('Quality is trending up','Issues resolved in the last seven days.',badge('This week','blue'))}<div class="ws-chart"><div class="ws-chart-labels"><span>24</span><span>18</span><span>12</span><span>6</span><span>0</span></div><div class="ws-chart-bars">${[['Thu',30],['Fri',48],['Sat',39],['Sun',55],['Mon',71],['Tue',68],['Wed',89]].map(([day,v],i)=>`<div class="ws-chart-column"><div class="ws-chart-bar ${i===6?'ws-chart-current':''}" style="height:${v}%"><span>${Math.round(v/4)}</span></div><small>${day}</small></div>`).join('')}</div></div><div class="ws-chart-note">${ico('trending-up',16)}Your team resolved 18% more findings this cycle.</div></div><div class="card ws-report-summary"><div class="ws-digest-heading">${ico('sparkles',18)}<span>AI RELEASE SUMMARY</span></div><h3>Momentum is building.</h3><p>Quality indicators improved throughout this cycle. Focus your next review on critical issues and customer feedback to maintain a confident shipment window.</p><div class="ws-report-highlight"><span class="ws-dot-green ws-status-dot"></span><div><strong>Working well</strong><p>Review turnaround and developer response times are improving.</p></div></div><div class="ws-report-highlight"><span class="ws-dot-amber ws-status-dot"></span><div><strong>Keep an eye on</strong><p>Critical findings and pending approvals near the release deadline.</p></div></div>${btn('Explore priority issues','go','issues','secondary','arrow-right')}</div></div><div class="ws-section-block">${section('Project readiness','A project-by-project view of shipment confidence.')}<div class="card ws-risk-panel">${myProjects().filter(p=>!isDone(p)).sort(ProjectPriority.compare).map(riskRow).join('')}</div></div><div class="ws-prototype-note">${ico('info',14)}Report metrics are illustrative. Export includes the current local prototype data.</div>`;
  }
  W.render = function (r, page) {
    let content;
    if (r==='manager' && ['dashboard','projects'].includes(page)) content=UatManager.render();
    else if (page==='projects') content=projectsPage();
    else if(page==='issues') content=issuesPage();
    else if(page==='feedback') content=feedbackPage();
    else if(page==='team') content=teamPage();
    else if(page==='reports') content=reportsPage();
    else content=UatOverview.render();
    return `<div class="ws-root ws-role-${r}">${content}</div>`;
  };
  W.go = page => app().navigate(page);
  W.filter = (key,value) => {ui[key]=value;app().render();};
  W.searchCards = (value,cls) => document.querySelectorAll('.'+cls).forEach(el=>el.style.display=el.innerText.toLowerCase().includes(value.toLowerCase())?'':'none');
  W.previewInvite = function(id) {
    const a=assignments().find(x=>x.id===id)||(state().assignments||[]).find(x=>x.id===id); if(!a)return;
    const p=project(a.projectId), e=employee(a.employeeId)||user();
    app().modal(`<div class="modal-header"><div><div class="eyebrow">ASSIGNMENT INVITATION</div><h2>Your next release starts here</h2></div><button class="ws-icon-button" onclick="A.closeModal()">${ico('x',20)}</button></div><div class="modal-body"><div class="ws-email-meta"><span>From</span><strong>Pre-Shipment · Project Office</strong><span>To</span><div>${app().person(e,roleName(e.role))}<p class="person-meta">${esc(e.email)}</p></div><span>Subject</span><strong>Job Assignment — ${esc(p?p.name:'New project')}</strong></div><div class="ws-email-body"><p>Hi ${esc(e.name.split(' ')[0])},</p><p>You've been assigned as ${/^[aeiou]/i.test(roleName(e.role))?'an':'a'} <strong>${esc(roleName(e.role))}</strong> on <strong>${esc(p?p.name:'our next release')}</strong>. Your expertise will help us make this a confident, reliable shipment.</p><div class="ws-email-assignment"><strong>Your focus</strong><p>${e.role==='developer'?'Review the priority queue, implement resilient fixes, and submit your work for manager approval.':e.role==='tester'?'Review customer feedback, run code and GUI analyses, and document reproducible findings for the development team.':'Keep the release on schedule, review proposed fixes, and coordinate the people needed for a successful shipment.'}</p><span>Target shipment · ${date(p&&p.deadline)}</span></div><p>Use the credentials below to sign in, then enter your assignment key to accept the project.</p><div class="ws-credential-grid"><div><span>USERNAME</span><strong>${esc(a.username||e.email)}</strong></div><div><span>TEMPORARY PASSWORD</span><strong>${esc(a.password||'Welcome2026!')}</strong></div></div><div class="ws-key-block"><div><span>YOUR ASSIGNMENT KEY</span><strong>${esc(a.key)}</strong></div><button class="btn secondary" onclick="A.copy(${js(a.key)})">${ico('copy',16)}Copy key</button></div><p>Thank you for helping us bring better releases to the people who depend on them.</p><p>Best,<br><strong>The Pre-Shipment team</strong></p></div><div class="ws-prototype-note">${ico('info',14)}This is a preview of a simulated email. No message has been sent.</div></div><div class="modal-footer">${btn('Close','close',null,'secondary')}${btn('Enter assignment key','acceptAssignment',a.id,'primary','key')}</div>`);
  };
  W.close = () => app().closeModal();
  W.acceptAssignment = function(id) {
    const a=assignments().find(x=>x.id===id);if(!a)return;
    const p=project(a.projectId);
    app().modal(`<div class="modal-header"><div><div class="eyebrow">A NEW CHAPTER</div><h2>Accept your assignment</h2></div><button class="ws-icon-button" onclick="A.closeModal()">${ico('x',20)}</button></div><div class="modal-body"><div class="ws-accept-project">${projectMark(p||{name:'New project'})}<div><h3>${esc(p?p.name:'Your next project')}</h3><p>${roleName(role())} · Due ${date(p&&p.deadline)}</p></div>${badge('Awaiting acceptance','amber')}</div><p class="ws-modal-intro">Your personal assignment key is in the invitation from the project manager. The demo key is ready. Confirm it to activate this project in your workspace.</p><label class="field"><span>Assignment key</span><input id="ws-assignment-key" class="input ws-key-input" placeholder="PS-XXXX-XXXX" value="${esc(a.key)}" autocomplete="off" onkeydown="if(event.key==='Enter')Workspaces.confirmAssignment(${js(id)})"></label><div id="ws-key-error" class="ws-form-error" hidden></div><button class="ws-inline-link" onclick="Workspaces.previewInvite(${js(id)})">${ico('mail',15)}Need the key? Preview your invitation</button><div class="ws-info-banner ws-compact-info">${ico('shield-check',18)}<span>Accepting confirms your role, responsibilities, and target shipment date.</span></div></div><div class="modal-footer">${btn('Maybe later','close',null,'secondary')}${btn('OK, accept project','confirmAssignment',id,'primary','check')}</div>`,'medium');
    setTimeout(()=>document.getElementById('ws-assignment-key')?.focus(),100);
  };
  W.confirmAssignment = function(id) {
    const a=assignments().find(x=>x.id===id), input=document.getElementById('ws-assignment-key');if(!a||!input)return;
    if(input.value.trim().toLowerCase()!==String(a.key).trim().toLowerCase()){const error=document.getElementById('ws-key-error');error.hidden=false;error.textContent='That key doesn’t match your invitation. Preview the email to find your personal key.';input.classList.add('ws-input-error');return;}
    a.accepted=true;touchProject(a.projectId);state().accepted=state().accepted||{};state().accepted[a.id]=true;state().accepted[a.projectId]=true;
    notify('Assignment accepted',`${user().name} accepted their ${roleName(role()).toLowerCase()} assignment for ${project(a.projectId)?.name||'the project'}.`,'manager',null,a.projectId);
    const next=ui.afterAcceptance?.assignmentId===a.id?ui.afterAcceptance.callback:null;ui.afterAcceptance=null;
    app().closeModal();refresh();app().toast('Assignment accepted. Your project is ready to work on.','success');if(next)setTimeout(next,180);
  };
  function canWork(projectId, callback) {
    const a=pending().find(a=>a.projectId===projectId);
    if(a){ui.afterAcceptance={assignmentId:a.id,callback};W.acceptAssignment(a.id);return false;}
    if(!W.hasAcceptedProject(projectId)){app().toast('Accept a project invitation before opening its workspace.','warning');return false;}
    return true;
  }
  W.projectTeam = function(id) {
    const p=project(id);
    if(!p)return '';
    const order={manager:0,developer:1,tester:2};
    const team=(p.team||[]).map(employee).filter(Boolean).sort((a,b)=>(order[a.role]??3)-(order[b.role]??3));
    return `<aside class="ws-project-roster" aria-label="${esc(p.name)} team">
      <header><span class="eyebrow">WORKING TOGETHER</span><h3>Release team</h3><p>${team.length} people assigned to ${esc(p.name)}</p></header>
      <ul>${team.map(person=>`<li data-role="${esc(person.role)}">
        ${av(person,34)}<div><strong>${esc(person.name)}${person.id===user().id?'<small>You</small>':''}</strong><span>${roleName(person.role)}</span></div>
        <i class="ws-roster-presence ${person.available===false?'is-away':''}" title="${person.available===false?'Away':'Available'}"></i>
      </li>`).join('')}</ul>
      ${role()==='manager'?`<div class="ws-roster-actions">${!isDone(p)?btn('Add teammates','requestCapacity',p.id,'secondary','user-plus'):''}<button class="btn ghost" onclick="A.inviteEmployee()">${ico('user-plus',14)}Create teammate</button></div>`:''}
      <footer>${ico('shield-check',14)}Project team · ${esc(p.name)}</footer>
    </aside>`;
  };
  W.openProject = function(id,caseId) {
    const p=project(id);if(!p||!canWork(id,()=>W.openProject(id,caseId)))return;
    if(role()==='tester')return UatTester.openProject(id,caseId);
    const items=(state().issues||[]).filter(i=>i.projectId===id);
    const actions=role()==='manager'
      ? `${p.uat?.stage==='customer'?btn('Customer beta invitation','customerPreview',id,'primary','external-link'):''}`
      : btn('View all issues','projectIssues',id,'primary','arrow-right');
    app().modal(`<div class="modal-header">
      <div class="ws-project-modal-title">${projectMark(p)}<div><div class="eyebrow">PROJECT WORKSPACE · ${esc(p.version||'v2.4.0')}</div><h2>${esc(p.name)}</h2></div>${ProjectPriority.badge(p)}</div>
      <button class="ws-icon-button" onclick="A.closeModal()" aria-label="Close project">${ico('x',20)}</button>
    </div>
    <div class="ws-project-workspace">
      <div class="modal-body ws-project-main">
        <p class="ws-modal-intro">${esc(p.description||'A coordinated release, from testing to customer acceptance.')}</p>
        <div class="ws-project-detail-stats">
          <div><span>Overall progress</span><strong>${percent(p.progress)}%</strong>${progress(p.progress)}</div>
          <div><span>Shipment deadline</span><strong>${date(p.deadline)}</strong><small>Target release date</small></div>
          <div><span>Open findings</span><strong>${items.filter(i=>i.status!=='Resolved').length}</strong><small>${items.filter(i=>i.severity==='Critical'&&i.status!=='Resolved').length} critical priority</small></div>
        </div>
        <div class="ws-ai-strip">${ico('sparkles',19)}<div><strong>AI project summary</strong><p>${items.some(i=>i.severity==='Critical'&&i.status!=='Resolved')?'Resolve the critical findings first. Their impact and the shipment deadline make these the highest priorities.':'Review remaining findings and customer feedback before the next acceptance stage.'}</p></div></div>
        ${section(role()==='manager'?'Release findings & reviews':'Priority findings','Bugs, fixes, and verification for this project.')}
        <div class="ws-modal-issues">${issuesTable(items,role(),7)}</div>
      </div>
      ${W.projectTeam(p.id)}
    </div>
    <div class="modal-footer">${btn('Close','close',null,'secondary')}<span class="spacer"></span>${actions}</div>`,'wide ws-project-dialog');
  };
  W.projectIssues = id => {app().closeModal();ui.issueFilter='all';app().navigate('issues');};
  function issueAiBrief(i) {
    const causes=Array.isArray(i.potentialCauses) ? i.potentialCauses : [];
    return `<div class="ws-ai-strip">${ico('sparkles',19)}<div><strong>AI bug summary</strong>
      <p>${esc(i.aiSummary || `The UAT scenario “${testCaseFor(i)?.title || i.title}” produced an unexpected result.`)}</p>
      ${causes.length?`<p><strong>Potential causes to investigate</strong></p>${causes.map(cause=>`<p>• ${esc(cause)}</p>`).join('')}`:''}
      <p class="muted">Simulated suggestions. Confirm the cause using the reproduction steps and evidence.</p>
    </div></div>`;
  }
  function issueEvidence(i) {
    if(!i.evidence&&!i.evidenceId)return '';
    const action=i.evidenceId
      ? `<button type="button" class="btn ghost" onclick="UatWorkflow.openEvidence(${js(i.evidenceId)})">${ico('external-link',14)}Open evidence</button>`
      : badge(i.uatCaseId?'Evidence filename':'Evidence attached','blue');
    return `<div class="ws-evidence-file">${ico('paperclip',17)}<span>${esc(i.evidence||'UAT evidence')}</span>${action}</div>`;
  }
  W.issueDetails = function(id) {
    const i=issue(id);if(!i)return;const p=project(i.projectId), e=employee(i.assignee);
    const footer=canFix(i)?btn('Apply a fix','fixIssue',i.id,'primary','code')
      :role()==='manager'&&UatWorkflow.canReview(i)?btn('Review proposed fix','reviewFix',i.id,'primary','check-circle')
      :canAssignFinding(i)?btn('Assign finding','assignFinding',i.id,'primary','users')
      :btn('Back to project','openProject',i.projectId,'primary','arrow-left');
    app().modal(`<div class="modal-header"><div><div class="ws-issue-project-name">${esc(p?p.name:'Project')}</div><div class="eyebrow">${esc(i.id)}</div><h2>${esc(i.title)}</h2></div><button class="ws-icon-button" onclick="A.closeModal()">${ico('x',20)}</button></div><div class="modal-body"><div class="ws-issue-badges">${badge(i.severity,severityColor(i.severity))}${badge(i.status,i.status==='Resolved'?'green':'blue')}${badge(i.category||'Functional','slate')}</div>${issueAiBrief(i)}<div class="ws-issue-detail-layout"><div><h4>Description</h4><p class="ws-pre-line">${esc(i.description||'This finding was identified during the pre-shipment review. The affected workflow needs to be corrected and verified before release.')}</p><h4>Steps to reproduce</h4><ol class="ws-repro-steps">${(i.steps?String(i.steps).split('\n'):['Sign in to the application with a standard account.','Navigate to the affected workflow and use the sample shipment data.','Complete the primary action and observe the behavior.']).filter(Boolean).map(s=>`<li>${esc(s.replace(/^\d+[.)]\s*/,''))}</li>`).join('')}</ol><div class="ws-expected-grid"><div><span>Expected behavior</span><p>${esc(i.expected||'The action completes successfully and preserves all submitted data.')}</p></div><div><span>Actual behavior</span><p>${esc(i.actual||'The workflow fails or returns an inconsistent result in the affected scenario.')}</p></div></div>${issueEvidence(i)}</div><aside class="ws-issue-aside">${i.uatCaseId?`<label>TEST CASE</label><strong>${esc(testCaseFor(i)?.title || i.uatCaseId)}</strong>${i.testData?`<label>TEST DATA</label><strong class="ws-pre-line">${esc(i.testData)}</strong>`:''}${i.fix?.buildVersion?`<label>LATEST FIX BUILD</label><strong>${esc(i.fix.buildVersion)}</strong>`:''}`:''}<label>ASSIGNEE</label>${app().person(e || {name:'Unassigned'},e ? roleName(e.role) : 'Awaiting assignment')}<label>ESTIMATED EFFORT</label><strong>${ico('clock',15)} ${esc(i.estimate||'2h')}</strong><label>DEADLINE</label><strong>${date(i.deadline||p?.deadline)}</strong><label>AI URGENCY</label><strong class="ws-urgency-big ${urgent(i)>80?'ws-text-red':''}">${urgent(i)}<small>%</small></strong><p>Based on complexity, impact, and the time until shipment.</p></aside></div></div><div class="modal-footer">${btn('Close','close',null,'secondary')}${footer}</div>`,'large');
  };
  W.assignFinding = function(id) {
    const finding=issue(id);
    if(!finding||!canAssignFinding(finding))return;
    const developers=projectDevelopers(finding.projectId);
    if(!developers.length){app().toast('Add an available developer to this project before assigning a finding.','warning');return;}
    app().modal(`<div class="modal-header"><h2>Assign finding</h2>${btn('Close','close',null,'ghost')}</div>
      <div class="modal-body"><p class="ws-modal-intro">${esc(finding.title)}</p>
      <label class="field"><span>Developer</span><select id="ws-assign-developer">${developers.map(person=>`<option value="${esc(person.id)}" ${finding.assignee===person.id?'selected':''}>${esc(person.name)}</option>`).join('')}</select></label>
      <label class="field"><span>Severity</span><select id="ws-assign-severity">${['Critical','High','Medium','Low'].map(severity=>`<option ${finding.severity===severity?'selected':''}>${severity}</option>`).join('')}</select></label></div>
      <div class="modal-footer">${btn('Assign','saveFindingAssignment',id,'primary','check')}</div>`,'medium');
  };
  W.saveFindingAssignment = function(id) {
    const finding=issue(id);
    if(!finding||!canAssignFinding(finding))return;
    const severity=document.getElementById('ws-assign-severity').value;
    const p=project(finding.projectId);
    const developerId=document.getElementById('ws-assign-developer').value;
    if(!projectDevelopers(finding.projectId).some(person=>person.id===developerId)){app().toast('Choose an available developer assigned to this project.','warning');return;}
    if(p&&severity!==finding.severity){
      p.critical=Math.max(0,(Number(p.critical)||0)+Number(severity==='Critical')-Number(finding.severity==='Critical'));
    }
    finding.assignee=developerId;
    finding.severity=severity;
    finding.status='In progress';
    touchProject(finding.projectId);
    notify('A finding is assigned to you',`${p?.name||'Project'} · ${finding.title}`,'developer',developerId,finding.projectId);
    app().closeModal();refresh();app().toast('Finding assigned to the developer.');
  };
  W.fixIssue = function(id) {
    const i=issue(id);if(!i||!canFix(i)||!canWork(i.projectId,()=>W.fixIssue(id)))return;
    if(!testCaseFor(i)&&!(project(i.projectId)?.team||[]).some(id=>employee(id)?.role==='tester')){
      app().toast('Add a tester to this project before submitting a fix.','warning');
      return;
    }
    const draft=ui.fixes[id];
    const lastBuild=testCaseFor(i)?.buildVersion || i.fix?.buildVersion || project(i.projectId)?.version;
    const sampleCode="// Validate the input before processing the shipment\nif (!shipment || !shipment.referenceId) {\n  return { success: false, error: 'A shipment reference is required.' };\n}\n\nreturn processShipment({ ...shipment, validated: true });";
    app().modal(`<div class="modal-header"><div><div class="eyebrow">FIX WORKSPACE · ${esc(i.id)}</div><h2>A thoughtful fix. A stronger release.</h2></div><button class="ws-icon-button" onclick="A.closeModal()">${ico('x',20)}</button></div><div class="modal-body"><div class="ws-fix-context">${ico('bug',20)}<div><strong>${esc(i.title)}</strong><span>${esc(project(i.projectId)?.name||'Project')} · ${esc(i.estimate||'2h')} estimated</span></div>${badge(i.severity,severityColor(i.severity))}</div>${issueAiBrief(i)}<form id="ws-fix-form"><label class="field"><span>New build version <b>*</b></span><input class="input" id="ws-fix-build" required maxlength="60" placeholder="e.g. v2.4.1" value="${esc(draft?.buildVersion || '')}" oninput="this.setCustomValidity('')">${lastBuild?`<small>Previous tested build: ${esc(lastBuild)}</small>`:''}</label><label class="field"><span>What did you change? <b>*</b></span><textarea class="input" id="ws-fix-notes" rows="3" required placeholder="Describe the root cause and how your fix addresses it...">${esc(draft?.notes || '')}</textarea></label><label class="field"><span>Proposed code / patch</span><textarea class="input ws-code-input" id="ws-fix-code" rows="7" spellcheck="false" placeholder="Paste a code snippet or diff for the simulated review...">${esc(draft?.code ?? (i.uatCaseId ? '' : sampleCode))}</textarea></label><label class="ws-upload-inline">${ico('upload',20)}<span><strong>Add a patch, build, or evidence</strong><small>ZIP, PATCH, JS, TS, or screenshots · Optional</small></span><input type="file" id="ws-fix-file" onchange="this.closest('label').querySelector('strong').textContent=this.files[0]?.name||'Add a patch, build, or evidence'"></label><label class="ws-checkbox-line"><input type="checkbox" id="ws-fix-tests" ${draft?.tests===false?'':'checked'}><span>I have checked the affected user flow and considered regression risks.</span></label></form><div class="ws-info-banner ws-compact-info">${ico('sparkles',18)}<span>AI will simulate a resilience check before this fix returns to testing. The tester verifies it before manager approval.</span></div></div><div class="modal-footer">${btn('Cancel','close',null,'secondary')}${btn('Analyze proposed fix','analyzeFix',id,'primary','sparkles')}</div>`,'large');
  };
  W.analyzeFix = function(id) {
    const form=document.getElementById('ws-fix-form');
    const i=issue(id);if(!form||!i||!canFix(i))return;
    const build=document.getElementById('ws-fix-build');
    const buildVersion=build?.value.trim() || '';
    if(build){
      const previous=(testCaseFor(i)?.buildVersion || i.fix?.buildVersion || project(i.projectId)?.version || '').trim();
      const buildError=!buildVersion?'Enter a new build version.':buildVersion.toLowerCase()===previous.toLowerCase()?'Use a build version different from the build under test.':'';
      build.setCustomValidity(buildError);
    }
    const notes=document.getElementById('ws-fix-notes');
    notes.setCustomValidity(notes.value.trim() ? '' : 'Describe the change before submitting a fix.');
    notes.oninput=()=>notes.setCustomValidity('');
    if(!form.reportValidity())return;
    ui.fixes[id]={
      notes:document.getElementById('ws-fix-notes').value.trim(),
      code:document.getElementById('ws-fix-code').value,
      file:document.getElementById('ws-fix-file').files[0]?.name||ui.fixes[id]?.file||'',
      tests:document.getElementById('ws-fix-tests').checked,
      buildVersion
    };
    app().modal(`<div class="modal-body ws-analysis-loading"><span class="ws-loading-orbit">${ico('sparkles',30)}</span><div class="eyebrow">A SECOND SET OF EYES</div><h2>Putting your fix through its paces.</h2><p>Reviewing the change, checking edge cases, and estimating resilience.</p><div class="ws-loading-progress"><i></i></div><div id="ws-fix-step">Reviewing the proposed code…</div><small>Simulated analysis · no code is executed</small></div>`,'medium');
    setTimeout(()=>{const el=document.getElementById('ws-fix-step');if(el)el.textContent='Checking regressions and edge cases…';},650);
    setTimeout(()=>{if(!document.getElementById('ws-fix-step'))return;showFixResult(id);},1900);
  };
  function showFixResult(id) {
    const i=issue(id);if(!i||!canFix(i))return;
    app().modal(`<div class="modal-header"><div><div class="eyebrow">AI FIX REVIEW</div><h2>Ready to return to the tester.</h2></div><button class="ws-icon-button" onclick="A.closeModal()">${ico('x',20)}</button></div><div class="modal-body"><div class="ws-resilience-result"><div class="ws-score-ring" style="--score:92"><div><strong>92<small>%</small></strong><span>RESILIENCE</span></div></div><div><span class="ws-positive-label">${ico('check-circle',17)}High confidence</span><h3>A resilient, focused fix.</h3><p>The proposed change addresses the root cause with a low risk of affecting adjacent workflows.</p>${badge('Ready for tester retest','green')}</div></div><div class="ws-fix-checks">${[['18 / 18','Scenario checks','check-circle'],['Low','Regression risk','shield-check'],['Passed','Input validation','check-circle']].map(([v,l,icon])=>`<div>${ico(icon,21)}<strong>${v}</strong><span>${l}</span></div>`).join('')}</div><div class="ws-ai-strip">${ico('sparkles',19)}<div><strong>One suggestion for extra confidence</strong><p>Add a regression test for an empty or missing reference ID. This protects the fix as the shipment workflow evolves.</p></div></div><div class="ws-fix-summary"><span>PROPOSED FIX FOR</span><strong>${esc(i.title)}</strong><p>Build ${esc(ui.fixes[id]?.buildVersion)}</p><p>${esc(ui.fixes[id]?.notes||'Code and validation updated.')}</p></div><div class="ws-prototype-note">${ico('info',14)}Resilience and scenario results are simulated. No real code analysis runs.</div></div><div class="modal-footer">${btn('Edit fix','fixIssue',id,'secondary','arrow-left')}${btn('Submit fix for retest','submitFix',id,'primary','send')}</div>`,'large');
  }
  W.submitFix = function(id) {
    const i=issue(id);
    if(!i||!canFix(i)||!ui.fixes[id])return;
    const fix={...ui.fixes[id],author:user().name,authorId:user().id,resilience:92,submittedAt:new Date().toISOString()};
    if(!UatWorkflow.submitFix(i.id,fix)){
      app().toast('This finding is no longer ready for a fix submission.','warning');
      return;
    }
    delete ui.fixes[id];
    app().closeModal();refresh();app().toast('Fix submitted. Its test is ready for retest.','success');
  };
  W.reviewFix = function(id) {
    const i=issue(id);if(!i||!UatWorkflow.canReview(i))return;const f=i.fix||{},e=employee(i.assignee);
    app().modal(`<div class="modal-header"><div><div class="eyebrow">MANAGER REVIEW · ${esc(i.id)}</div><h2>${esc(i.title)}</h2></div><button class="ws-icon-button" onclick="A.closeModal()">${ico('x',20)}</button></div><div class="modal-body"><div class="ws-review-author">${app().person({...e,name:f.author||e?.name||'Development team'},'Developer')}${badge('In review','purple')}</div><div class="ws-review-score"><span class="ws-positive-label">${ico('shield-check',20)}AI resilience estimate</span><strong>${f.resilience||92}%</strong><span>High confidence · Low regression risk</span></div><div class="ws-review-verification">${app().person(employee(i.verifiedBy) || {name:'Assigned tester'},'Tester')}<p class="person-meta">Verified build ${esc(f.buildVersion || 'submitted by development')} for manager approval.</p></div><h4>Developer notes</h4><p class="ws-pre-line">${esc(f.notes||'Added defensive validation and corrected the state handling in the affected workflow. The change is isolated to the reported scenario and includes coverage for the original reproduction steps.')}</p><h4>Proposed change</h4><pre class="ws-review-code">${esc(f.code||'// Preserve user input across shipment navigation\nconst draft = validateShipment(shipment);\nawait saveShipmentDraft(draft);\nreturn { success: true, shipment: draft };')}</pre><div class="ws-fix-checks"><div>${ico('check-circle',20)}<strong>18 / 18</strong><span>Scenario checks passed</span></div><div>${ico('shield-check',20)}<strong>Low</strong><span>Regression risk</span></div><div>${ico('check',20)}<strong>Ready</strong><span>For your decision</span></div></div><div class="ws-prototype-note">${ico('info',14)}This review uses simulated validation results and sample code.</div></div><div class="modal-footer">${btn('Close','close',null,'secondary')}<span class="spacer"></span>${btn('Request changes','requestChanges',id,'secondary','message-square')}${btn('Approve fix','approveFix',id,'primary','check')}</div>`,'large');
  };
  W.approveFix = function(id) {
    if(!UatWorkflow.approveFix(id))return;
    app().closeModal();refresh();app().toast('Fix approved after tester verification.','success');
  };
  W.requestChanges = function(id) {
    const i=issue(id);if(!i||!UatWorkflow.canReview(i))return;
    app().modal(`<div class="modal-header"><div><div class="eyebrow">CONSTRUCTIVE FEEDBACK</div><h2>Help the next revision land.</h2></div><button class="ws-icon-button" onclick="A.closeModal()">${ico('x',20)}</button></div><div class="modal-body"><p class="ws-modal-intro">Tell the developer what needs another look on <strong>${esc(i.title)}</strong>.</p><label class="field"><span>Requested changes <b>*</b></span><textarea id="ws-review-notes" class="input" rows="5" placeholder="Describe the change you need and how to verify it..." required></textarea></label></div><div class="modal-footer">${btn('Back to review','reviewFix',id,'secondary')}${btn('Send revision request','submitChanges',id,'primary','send')}</div>`,'medium');
  };
  W.submitChanges = function(id) {
    const input=document.getElementById('ws-review-notes');
    if(!input||!input.reportValidity()||!UatWorkflow.requestChanges(id,input.value))return;
    app().closeModal();refresh();app().toast('Revision request shared with the developer.','success');
  };
  W.runProjectCode = id => W.runAnalysis('code',id);
  W.runProjectGui = id => W.runAnalysis('gui',id);
  W.runAnalysis = function(type,projectId) {
    const active=myProjects().filter(p=>!isDone(p)).sort(ProjectPriority.compare);
    const p=project(projectId)||active[0];if(!p){app().toast('A project is needed to run this demo.');return;}if(!canWork(p.id,()=>W.runAnalysis(type,p.id)))return;
    app().modal(`<div class="modal-header"><div><div class="eyebrow">QUALITY TOOLKIT</div><h2>${type==='code'?'Automatic code analysis':'Run GUI test'}</h2></div><button class="ws-icon-button" onclick="A.closeModal()">${ico('x',20)}</button></div><div class="modal-body"><p class="ws-modal-intro">${type==='code'?'A simulated review of code quality, validation, and common release risks.':'A simulated walkthrough of the application’s core user journeys.'}</p><label class="field"><span>Project</span><select class="input" id="ws-analysis-project">${active.map(x=>`<option value="${esc(x.id)}" ${x.id===p.id?'selected':''}>${esc(x.name)} · ${esc(x.version||'v2.4.0')}</option>`).join('')}</select></label><div class="ws-analysis-scope">${(type==='code'?[['shield-check','Security & input validation'],['code','Code quality & error handling'],['layers','Dependencies & release readiness']]:[['log-in','Sign-in & navigation'],['monitor','Forms, layouts & interactions'],['check-circle','Core shipment workflows']]).map(([i,l])=>`<div>${ico(i,19)}${l}${ico('check',16)}</div>`).join('')}</div><div class="ws-info-banner ws-compact-info">${ico('info',18)}<span>This prototype uses sample results. No files are read and no tests are executed.</span></div></div><div class="modal-footer">${btn('Cancel','close',null,'secondary')}<button class="btn primary" onclick="Workspaces.startAnalysis('${type}')">${ico('sparkles',16)}${type==='code'?'Start analysis':'Run GUI test'}</button></div>`,'medium');
  };
  W.startAnalysis = function(type) {
    const id=document.getElementById('ws-analysis-project').value;if(!canWork(id,()=>W.runAnalysis(type,id)))return;
    const p=project(id), runId='run-'+Date.now();
    ui.runs[runId]={type,projectId:id,findings:type==='code'?[{title:'Missing validation on batch release date',severity:'High',category:'Functional',estimate:'2h',description:'The shipment release form accepts dates earlier than the batch manufacture date. Add validation and a clear inline error to prevent inconsistent records.'},{title:'Sensitive details exposed in an error response',severity:'Medium',category:'Security',estimate:'1.5h',description:'A simulated failed API request returns internal error information. Replace detailed errors with a safe message and a traceable reference ID.'},{title:'Retry path does not clear the previous error',severity:'Low',category:'Code quality',estimate:'45m',description:'After retrying a failed shipment action, the prior error remains visible even when the action succeeds. Reset error state on a successful retry.'}]:[{title:'Shipment form loses notes after back navigation',severity:'High',category:'UI / UX',estimate:'2h',description:'Notes entered in step two are cleared when a user returns to the delivery-address step. Persist the draft state across navigation.'},{title:'Confirmation dialog is clipped on smaller windows',severity:'Medium',category:'UI / UX',estimate:'1h',description:'At a compact desktop width, the confirmation dialog extends beyond the bottom edge and the primary action is difficult to reach. Constrain height and enable internal scrolling.'}]};
    const steps=type==='code'?['Preparing project snapshot','Checking validation and error handling','Reviewing security and dependencies','Prioritizing potential findings']:['Opening the application','Walking through core shipment journeys','Checking layouts and interactions','Preparing findings and evidence'];
    app().modal(`<div class="modal-body ws-analysis-loading"><span class="ws-loading-orbit">${ico(type==='code'?'code':'monitor',30)}</span><div class="eyebrow">${type==='code'?'AUTOMATIC CODE ANALYSIS':'GUI TEST RUN'}</div><h2>${type==='code'?'Looking beneath the surface.':'Following your customer’s footsteps.'}</h2><p>${esc(p?.name||'Project')} · Simulated quality review</p><div class="ws-analysis-step-list">${steps.map((s,i)=>`<div id="ws-run-step-${i}" class="${i===0?'active':''}"><span>${i===0?'<i class="ws-small-spinner"></i>':ico('circle',16)}</span>${s}</div>`).join('')}</div><small>No real code or application tests are executed.</small></div>`,'medium');
    steps.forEach((s,index)=>setTimeout(()=>{const el=document.getElementById('ws-run-step-'+index);if(!el)return;el.className='complete';el.querySelector('span').innerHTML=ico('check-circle',17);const next=document.getElementById('ws-run-step-'+(index+1));if(next){next.className='active';next.querySelector('span').innerHTML='<i class="ws-small-spinner"></i>';};if(index===steps.length-1)setTimeout(()=>{if(document.getElementById('ws-run-step-3'))W.analysisResults(runId);},280);},650*(index+1)));
  };
  W.analysisResults = function(runId) {
    const run=ui.runs[runId];if(!run)return;
    const sent=run.findings.filter(f=>f.sent).length;
    app().modal(`<div class="modal-header"><div><div class="eyebrow">${run.type==='code'?'CODE ANALYSIS':'GUI TEST'} · COMPLETE</div><h2>A clearer view of your next steps.</h2></div><button class="ws-icon-button" onclick="A.closeModal()">${ico('x',20)}</button></div><div class="modal-body"><div class="ws-run-summary"><span class="ws-run-complete">${ico('check',24)}</span><div><strong>${esc(project(run.projectId)?.name||'Project')}</strong><p>${run.type==='code'?'34 files reviewed · 3 potential findings':'12 checks completed · 10 passed · 2 findings'} · Simulated results</p></div>${badge(`${run.findings.length} findings`,'amber')}</div><div class="ws-findings-list">${run.findings.map((f,index)=>`<article class="ws-analysis-finding"><div class="ws-analysis-finding-top">${badge(f.severity,severityColor(f.severity))}<span>${ico('clock',13)}${f.estimate} estimated</span></div><h3>${esc(f.title)}</h3><p>${esc(f.description)}</p><div class="ws-analysis-finding-bottom"><span>${esc(f.category)}</span>${f.sent?badge('Sent to developer','green'):`<button class="btn secondary" onclick="Workspaces.sendAnalysisFinding(${js(runId)},${index})">${ico('send',15)}Send to dev</button>`}</div></article>`).join('')}</div><div class="ws-prototype-note">${ico('sparkles',14)}AI suggestions are sample findings for your demonstration. Confirm each finding before triage.</div></div><div class="modal-footer">${btn('Close results','close',null,'secondary')}<span class="ws-result-count">${sent} of ${run.findings.length} sent to developers</span></div>`,'large');
  };
  W.sendAnalysisFinding = function(runId,index) {
    const run=ui.runs[runId],f=run?.findings[index];if(!f||f.sent)return;
    ui.pendingFinding={runId,index};
    const devs=projectDevelopers(run.projectId);
    if(!devs.length){app().toast('Add an available developer to this project before sending a finding.','warning');return;}
    app().modal(`<div class="modal-header"><div><div class="eyebrow">TURN INSIGHT INTO ACTION</div><h2>Send this finding to a developer</h2></div><button class="ws-icon-button" onclick="A.closeModal()">${ico('x',20)}</button></div><div class="modal-body"><div class="ws-fix-context">${ico('bug',20)}<div><strong>${esc(f.title)}</strong><span>${esc(project(run.projectId)?.name||'Project')}</span></div>${badge(f.severity,severityColor(f.severity))}</div><label class="field"><span>Assign developer</span><select class="input" id="ws-finding-dev">${devs.map(d=>`<option value="${esc(d.id)}">${esc(d.name)} · ${percent(d.load)}% workload</option>`).join('')}</select></label><label class="field"><span>Additional context</span><textarea class="input" id="ws-finding-note" rows="3" placeholder="Add any useful context for the developer...">Please review the reproduction scenario and confirm this finding before implementing a fix.</textarea></label></div><div class="modal-footer">${btn('Back to results','analysisResults',runId,'secondary')}${btn('Send finding','confirmSendFinding',null,'primary','send')}</div>`,'medium');
  };
  function newIssue(data) {
    state().issues=state().issues||[];
    const n=Math.max(20,...state().issues.map(i=>Number(String(i.id).replace(/\D/g,''))||0))+1;
    const created={id:'PS-'+String(n).padStart(3,'0'),status:'Open',estimate:'2h',deadline:project(data.projectId)?.deadline,...(role()==='tester'?{reportedBy:user().name,reportedById:user().id}:{}),...data};
    state().issues.unshift(created);
    touchProject(data.projectId);
    const p=project(data.projectId);
    if(p){
      p.bugs=(Number(p.bugs)||0)+1;
      if(data.severity==='Critical')p.critical=(Number(p.critical)||0)+1;
      if(UatWorkflow.stage(p)==='customer'){
        p.uat.stage='testing';
        p.status='In progress';
        p.progress=Math.min(99,Number(p.progress)||0);
        notify('Customer acceptance paused',`${p.name} returned to UAT because a new finding needs testing and approval.`,'manager',null,p.id);
      }
    }
    return created;
  }
  W.confirmSendFinding = function() {
    const {runId,index}=ui.pendingFinding||{}, run=ui.runs[runId],f=run?.findings[index];if(!f||f.sent)return;
    const dev=document.getElementById('ws-finding-dev').value,note=document.getElementById('ws-finding-note').value;
    if(!projectDevelopers(run.projectId).some(person=>person.id===dev)){app().toast('Choose an available developer assigned to this project.','warning');return;}
    const created=newIssue({...f,projectId:run.projectId,assignee:dev,description:f.description+(note?'\n\nTester notes: '+note:''),source:'AI '+(run.type==='code'?'code analysis':'GUI test')});
    f.sent=true;f.issueId=created.id;notify('A new finding is assigned to you',`${user().name} sent “${f.title}” for review.`,'developer',dev,run.projectId);app().save();app().render();W.analysisResults(runId);app().toast(`${created.id} created and sent to ${employee(dev)?.name||'the development team'}.`,'success');
  };
  W.reportFinding = function(projectId) {
    const active=myProjects().filter(p=>!isDone(p)).sort(ProjectPriority.compare);
    const selected=project(projectId)||active[0];if(selected&&!canWork(selected.id,()=>W.reportFinding(selected.id)))return;
    app().modal(`<div class="modal-header"><div><div class="eyebrow">MAKE THE NEXT RELEASE BETTER</div><h2>Report a finding</h2><p>A useful report helps the team move from “what happened?” to “fixed.”</p></div><button class="ws-icon-button" onclick="A.closeModal()">${ico('x',20)}</button></div><div class="modal-body"><form id="ws-report-form"><div class="ws-form-grid"><label class="field ws-span-2"><span>Finding title <b>*</b></span><input class="input" id="ws-report-title" placeholder="A clear, specific description of the problem" required></label><label class="field"><span>Project <b>*</b></span><select class="input" id="ws-report-project" onchange="Workspaces.checkReportProject(this.value)">${active.map(p=>`<option value="${esc(p.id)}" ${p.id===selected?.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label><label class="field"><span>Category</span><select class="input" id="ws-report-category"><option>Functional</option><option>UI / UX</option><option>Performance</option><option>Security</option><option>Accessibility</option><option>Data integrity</option><option>Compatibility</option></select></label><label class="field"><span>Severity</span><select class="input" id="ws-report-severity"><option>Medium</option><option>Critical</option><option>High</option><option>Low</option></select></label><label class="field"><span>Environment <b>*</b></span><input class="input" id="ws-report-env" placeholder="e.g. Windows 11 · Chrome 130 · v2.4.0" value="Windows 11 · Chrome 130" required></label><label class="field ws-span-2"><span>Steps to reproduce <b>*</b></span><textarea class="input" id="ws-report-steps" rows="4" placeholder="1. Open the shipment form&#10;2. Enter...&#10;3. Click..." required></textarea></label><label class="field"><span>Expected behavior <b>*</b></span><textarea class="input" id="ws-report-expected" rows="3" placeholder="What should happen?" required></textarea></label><label class="field"><span>Actual behavior <b>*</b></span><textarea class="input" id="ws-report-actual" rows="3" placeholder="What happened instead?" required></textarea></label><label class="field"><span>Reproducibility</span><select class="input" id="ws-report-frequency"><option>Every time</option><option>Intermittent</option><option>Once</option></select></label><label class="field"><span>Assign to developer</span><select class="input" id="ws-report-dev"><option value="">Let the manager assign</option>${projectDevelopers(selected?.id).map(e=>`<option value="${esc(e.id)}">${esc(e.name)}</option>`).join('')}</select></label><label class="ws-upload-inline ws-span-2">${ico('paperclip',22)}<span><strong>Attach evidence</strong><small>Screenshots, screen recordings, logs, or a sample file</small></span><input id="ws-report-evidence" type="file" multiple onchange="this.closest('label').querySelector('strong').textContent=Array.from(this.files).map(f=>f.name).join(', ')||'Attach evidence'"></label></div></form><div class="ws-prototype-note">${ico('info',14)}Attachments are represented by filename only and stay in this local demo.</div></div><div class="modal-footer">${btn('Cancel','close',null,'secondary')}${btn('Submit finding','submitFinding',null,'primary','send')}</div>`,'large');
  };
  W.submitFinding = function() {
    const form=document.getElementById('ws-report-form');if(!form||!validateRequiredText(form))return;
    const get=id=>document.getElementById('ws-report-'+id).value;
    const selectedProjectId=get('project');if(!canWork(selectedProjectId,()=>W.reportFinding(selectedProjectId)))return;
    if(get('dev')&&!projectDevelopers(selectedProjectId).some(person=>person.id===get('dev'))){app().toast('Choose an available developer assigned to this project.','warning');return;}
    const created=newIssue({title:get('title'),projectId:get('project'),category:get('category'),severity:get('severity'),environment:get('env'),steps:get('steps'),expected:get('expected'),actual:get('actual'),description:get('actual'),reproducibility:get('frequency'),assignee:get('dev'),evidence:Array.from(document.getElementById('ws-report-evidence').files).map(f=>f.name).join(', '),reportedBy:user().name,reportedById:user().id,source:'Tester report'});
    notify('A new finding needs review',`${user().name} reported ${created.id}: ${created.title}.`,created.assignee?'developer':'manager',created.assignee,created.projectId);app().closeModal();refresh();app().toast(`${created.id} reported. Your team has been notified.`,'success');
  };
  W.checkReportProject = id => {
    if(!canWork(id,()=>W.reportFinding(id)))return false;
    const select=document.getElementById('ws-report-dev');
    if(select){const previous=select.value;select.innerHTML='<option value="">Let the manager assign</option>'+projectDevelopers(id).map(person=>`<option value="${esc(person.id)}"${person.id===previous?' selected':''}>${esc(person.name)}</option>`).join('');}
    return true;
  };
  W.feedbackDetails = function(id) {
    const f=feedbackList().find(x=>x.id===id);if(!f)return;
    const name=f.name||f.customer||f.customerName||'Customer', reviewed=/approved|sent|resolved|reviewed/i.test(f.status||'');
    app().modal(`<div class="modal-header"><div><div class="eyebrow">CUSTOMER PRE-FEEDBACK · ${esc(f.id)}</div><h2>${esc(f.title||f.subject||'Customer feedback')}</h2></div><button class="ws-icon-button" onclick="A.closeModal()">${ico('x',20)}</button></div><div class="modal-body"><div class="ws-review-author"><div class="ws-feedback-person">${app().person({name,avatar:f.avatar>0&&f.avatar<=16?f.avatar:15},'Customer')}${f.email?`<p class="person-meta">${esc(f.email)}</p>`:''}</div>${badge(f.type||f.category||'Suggestion',/bug/i.test(f.type||f.category)?'amber':'purple')}</div><div class="ws-feedback-full"><p>${esc(f.description||f.body||f.message||f.content||'A customer has shared early feedback.')}</p></div><div class="ws-feedback-context"><div><span>Project</span><strong>${esc(project(f.projectId)?.name||'Customer preview')}</strong></div><div><span>Environment</span><strong>${esc(f.environment||'Chrome · Windows 11')}</strong></div><div><span>Review status</span>${badge(f.status||'New',reviewed?'green':'amber')}</div></div><div class="ws-ai-strip">${ico('sparkles',20)}<div><strong>AI triage suggestion</strong><p>${/bug/i.test(f.type||f.category)?'This describes a repeatable workflow problem. Confirm the scenario and approve it as a bug so a developer can investigate.':'This is a useful enhancement idea. Pass it to the development team with the customer context preserved.'}</p></div></div></div><div class="modal-footer">${btn('Close','close',null,'secondary')}${reviewed?'':btn(/bug/i.test(f.type||f.category)?'Approve as bug':'Send to developers','triageFeedback',id,'primary',/bug/i.test(f.type||f.category)?'check':'send')}</div>`,'large');
  };
  W.triageFeedback = function(id) {
    const f=feedbackList().find(x=>x.id===id);if(!f||/approved|sent|resolved|reviewed/i.test(f.status||''))return;const isBug=/bug/i.test(f.type||f.category);
    const developers=projectDevelopers(f.projectId);
    if(!developers.length){app().toast('Add an available developer to this project before forwarding feedback.','warning');return;}
    app().modal(`<div class="modal-header"><div><div class="eyebrow">CUSTOMER INSIGHT → TEAM ACTION</div><h2>${isBug?'Approve this as a bug':'Share a useful suggestion'}</h2></div><button class="ws-icon-button" onclick="A.closeModal()">${ico('x',20)}</button></div><div class="modal-body"><div class="ws-fix-context">${ico(isBug?'bug':'lightbulb',21)}<div><strong>${esc(f.title||f.subject)}</strong><span>Submitted by ${esc(f.name||f.customer||'a customer')}</span></div>${badge(isBug?'Bug':'Suggestion',isBug?'amber':'purple')}</div><p class="ws-modal-intro">${isBug?'Approving creates a trackable issue with the customer’s original context.':'The development team will receive the customer’s idea as an enhancement for review.'}</p><label class="field"><span>Assign developer</span><select class="input" id="ws-feedback-dev">${developers.map(e=>`<option value="${esc(e.id)}">${esc(e.name)} · ${percent(e.load)}% workload</option>`).join('')}</select></label><label class="field"><span>Reviewer notes</span><textarea class="input" id="ws-feedback-notes" rows="3" placeholder="Add reproduction details, impact, or why this suggestion matters..."></textarea></label></div><div class="modal-footer">${btn('Cancel','close',null,'secondary')}<button class="btn primary" onclick="Workspaces.confirmTriage(${js(id)})">${ico(isBug?'check':'send',16)}${isBug?'Approve & create issue':'Send to development'}</button></div>`,'medium');
  };
  W.confirmTriage = function(id) {
    const f=feedbackList().find(x=>x.id===id);if(!f||/approved|sent|resolved|reviewed/i.test(f.status||''))return;const isBug=/bug/i.test(f.type||f.category),dev=document.getElementById('ws-feedback-dev').value,notes=document.getElementById('ws-feedback-notes').value;
    if(!projectDevelopers(f.projectId).some(person=>person.id===dev)){app().toast('Choose an available developer assigned to this project.','warning');return;}
    f.status=isBug?'Approved':'Sent to developers';f.reviewedBy=user().name;
    const created=newIssue({title:f.title||f.subject,projectId:f.projectId,severity:isBug?'High':'Low',category:isBug?'Customer bug':'Enhancement',description:(f.description||f.body||f.message||f.content||'')+(notes?'\n\nReviewer notes: '+notes:''),assignee:dev,source:'Customer pre-feedback',customer:f.name||f.customer,estimate:isBug?'2h':'3h'});
    f.issueId=created.id;notify(isBug?'A customer bug is ready to investigate':'A customer suggestion is ready to review',`${user().name} sent “${f.title||f.subject}” to the development team.`,'developer',dev,f.projectId);app().closeModal();refresh();app().toast(isBug?`${created.id} created. Customer bug approved.`:'Suggestion sent to the development team.','success');
  };
  W.customerPreview = function(id) {
    const p = id ? project(id) : myProjects().filter(item=>item.uat?.stage==='customer').sort(ProjectPriority.compare)[0];
    if(p?.uat?.stage==='customer')Beta.previewInvitation(p.id);
    else app().toast('Customer invitations are available after UAT sign-off.','warning');
  };
  W.requestCapacity = function(projectId) {
    if(role()!=='manager')return;
    ui.capacity=[];
    const active=myProjects().filter(p=>!isDone(p)).sort(ProjectPriority.compare);
    if(!active.length){app().toast('Create an active project before adding teammates.','warning');return;}
    const selectedProject=active.find(p=>p.id===projectId)||active[0];
    const candidates=people().filter(e=>['developer','tester'].includes(e.role)&&!selectedProject.team.includes(e.id)).sort((a,b)=>(a.available===false)-(b.available===false)||(a.load||0)-(b.load||0));
    app().modal(`<div class="modal-header"><div><div class="eyebrow">THE RIGHT PEOPLE, AT THE RIGHT TIME</div><h2>Add project teammates</h2><p>Choose available developers or testers to join the release.</p></div><button class="ws-icon-button" onclick="A.closeModal()">${ico('x',20)}</button></div><div class="modal-body"><div class="ws-form-grid"><label class="field"><span>Project</span><select class="input" id="ws-capacity-project" onchange="Workspaces.requestCapacity(this.value)">${active.map(p=>`<option value="${esc(p.id)}" ${p.id===selectedProject.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label></div><div class="ws-ai-strip ws-capacity-tip">${ico('sparkles',19)}<div><strong>AI recommendation</strong><p>One developer and one QA engineer can reduce the estimated delivery risk by 24%.</p></div></div><div class="ws-capacity-label"><strong>Available developers & QA engineers</strong><span>Live demo capacity</span></div><div class="ws-capacity-list">${candidates.map(e=>`<button class="ws-capacity-person ${e.available===false?'ws-unavailable':''}" id="ws-capacity-${esc(e.id)}" onclick="Workspaces.toggleCapacity(${js(e.id)})" ${e.available===false?'disabled':''}><span class="ws-select-check">${ico('check',13)}</span>${av(e,36)}<div class="ws-capacity-name"><strong>${esc(e.name)}</strong><span>${esc(e.title||roleName(e.role))}</span></div><div class="ws-capacity-load"><span>${percent(e.load)}% assigned</span>${progress(e.load,e.load>=85?'amber':'blue')}</div>${badge(e.available===false?'On holiday':e.load>=85?'Limited capacity':'Available',e.available===false?'slate':e.load>=85?'amber':'green')}</button>`).join('')}</div></div><div class="modal-footer"><span id="ws-capacity-count" class="ws-selection-count">No teammates selected</span><span class="spacer"></span>${btn('Cancel','close',null,'secondary')}${btn('Add teammates','submitCapacity',null,'primary','user-plus')}</div>`,'large');
  };
  W.toggleCapacity = function(id) {
    const e=employee(id);if(!e||e.available===false)return;
    if(ui.capacity.includes(id))ui.capacity=ui.capacity.filter(x=>x!==id);else ui.capacity.push(id);
    document.getElementById('ws-capacity-'+id)?.classList.toggle('selected',ui.capacity.includes(id));
    document.getElementById('ws-capacity-count').textContent=ui.capacity.length?`${ui.capacity.length} teammate${ui.capacity.length===1?'':'s'} selected`:'No teammates selected';
  };
  W.submitCapacity = function() {
    if(role()!=='manager')return;
    if(!ui.capacity.length){app().toast('Choose at least one teammate.','warning');return;}
    const p=project(document.getElementById('ws-capacity-project').value);
    const selected=ui.capacity.filter(id=>!p?.team.includes(id)&&employee(id)?.available!==false);
    if(!p||!selected.length){app().toast('Choose teammates who are not already on this project.','warning');return;}
    app().assignSupport(p,selected);
    app().closeModal();refresh();app().toast('Teammates added. Assignment invitations are ready.');
  };
  W.messagePerson = function(id) {
    const e=employee(id);if(!e)return;
    app().modal(`<div class="modal-header"><div><div class="eyebrow">A QUICK CONVERSATION</div><h2>Message ${esc(e.name.split(' ')[0])}</h2></div><button class="ws-icon-button" onclick="A.closeModal()">${ico('x',20)}</button></div><div class="modal-body"><div class="ws-message-recipient">${app().person(e,roleName(e.role))}${badge(e.available===false?'Away':'Available',e.available===false?'slate':'green')}</div><label class="field"><span>Your message <b>*</b></span><textarea id="ws-team-message" class="input" rows="5" required placeholder="Share an update, ask a question, or offer a hand..."></textarea></label><div class="ws-prototype-note">${ico('info',14)}Messages are saved locally for this demonstration.</div></div><div class="modal-footer">${btn('Cancel','close',null,'secondary')}${btn('Send message','sendTeamMessage',id,'primary','send')}</div>`,'medium');
  };
  W.sendTeamMessage = function(id) {
    const e=employee(id),input=document.getElementById('ws-team-message');if(!input.reportValidity())return;
    state().messages=state().messages||[];state().messages.unshift({id:'MSG-'+Date.now(),from:user().id,to:id,text:input.value,createdAt:new Date().toISOString()});notify(`Message from ${user().name}`,input.value,e?.role||'developer',id);app().closeModal();app().save();app().toast(`Message delivered to ${e?.name||'your teammate'}.`,'success');
  };
  W.exportReport = function() {
    const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
    const lines=[['Pre-Shipment — Release Readiness Report'],['Generated for',user().name],['Prototype','All metrics and analysis are simulated'],[],['Project','Version','Progress','Readiness','Open issues','Shipment deadline','Status'],...myProjects().map(p=>[p.name,p.version,percent(p.progress)+'%',percent(p.readiness||p.progress)+'%',(state().issues||[]).filter(i=>i.projectId===p.id&&i.status!=='Resolved').length,p.deadline,p.status]),[],['Issue','Title','Severity','Status','Estimated effort'],...myIssues().map(i=>[i.id,i.title,i.severity,i.status,i.estimate])];
    const blob=new Blob(['\ufeff'+lines.map(line=>line.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8;'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Pre-Shipment-readiness-report.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);app().toast('Readiness report exported with your current demo data.','success');
  };
})();
