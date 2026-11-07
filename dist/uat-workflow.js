(() => {
  'use strict';

  const workflow = window.UatWorkflow = {};
  const evidenceDatabase = 'pre-shipment-uat';
  const evidenceStore = 'evidence';
  const maxEvidenceBytes = 25 * 1024 * 1024;
  const workspace = () => A.state;
  const projectById = id => workspace().projects.find(project => project.id === id);
  const caseById = (project, id) => project?.uat?.cases?.find(test => test.id === id);
  const linkedBug = test => workspace().issues.find(issue => issue.id === test.bugId);
  const clean = value => String(value ?? '').trim();
  const employeeForRole = (id, role) => workspace().employees.find(person => person.id === id && person.role === role);
  const projectManager = project => (project?.team || []).find(id => employeeForRole(id, 'manager')) ||
    workspace().employees.find(person => person.role === 'manager' && person.available !== false)?.id ||
    workspace().employees.find(person => person.role === 'manager')?.id;

  function notify(title, body, employeeId, role, page) {
    const recipient = employeeForRole(employeeId, role);
    if (!recipient) return false;
    workspace().notifications.unshift({
      id: 'uat-notice-' + newId(), title, body, employeeId:recipient.id, role:recipient.role, page,
      time: 'Just now', read: false, type: 'message-square'
    });
    return true;
  }

  function newId() {
    return Array.from(crypto.getRandomValues(new Uint32Array(2)), value => value.toString(36)).join('-');
  }

  function evidenceTransaction(mode, operation) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(evidenceDatabase, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(evidenceStore);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(evidenceStore, mode);
        const action = operation(transaction.objectStore(evidenceStore));
        transaction.oncomplete = () => {db.close();resolve(action.result);};
        transaction.onabort = () => {db.close();reject(transaction.error || action.error);};
      };
    });
  }

  workflow.storeEvidence = async function (file) {
    if (!/^(image|video)\//.test(file.type) || file.size > maxEvidenceBytes) {
      throw new Error('Choose an image or video attachment up to 25 MB.');
    }
    const id = newId();
    await evidenceTransaction('readwrite', store => store.add(file, id));
    return id;
  };

  workflow.openEvidence = async function (id) {
    const popup = window.open('', '_blank', 'popup,width=900,height=680,resizable,scrollbars');
    if (!popup) {A.toast('Allow pop-ups to open the evidence attachment.','error');return;}
    popup.opener = null;
    try {
      const file = await evidenceTransaction('readonly', store => store.get(id));
      if (!file) throw new Error('Attachment unavailable.');
      if (popup.closed) return;
      const url = URL.createObjectURL(file);
      const doc = popup.document;
      doc.title = file.name || 'UAT evidence';
      doc.body.style.cssText = 'margin:0;min-height:100vh;background:#172135;display:grid;place-items:center';
      const media = doc.createElement(file.type.startsWith('video/') ? 'video' : 'img');
      media.src = url;
      media.alt = file.name || 'UAT evidence';
      media.controls = true;
      media.style.cssText = 'max-width:100%;max-height:100vh';
      doc.body.appendChild(media);
      popup.addEventListener('pagehide', () => URL.revokeObjectURL(url), {once:true});
    } catch {
      popup.close();
      A.toast('This evidence attachment is unavailable in this browser.','error');
    }
  };

  workflow.clearEvidence = () => indexedDB.deleteDatabase(evidenceDatabase);

  workflow.stage = project => {
    const stage=project?.uat?.stage;
    if(stage==='customer'||stage==='testing')return stage;
    return 'awaiting';
  };

  workflow.nextProjectNumber = () => Math.max(0,...workspace().projects.map(project => project.number || Number(project.name.match(/^Project (\d+)$/)?.[1]) || 0)) + 1;

  workflow.createAwaitingProject = function (details) {
    if(workspace().role!=='manager'||!clean(details?.version))return null;
    const number=workflow.nextProjectNumber();
    const project={
      id:'project-'+newId(),number,name:'Project '+number,abbr:String(number),
      description:clean(details.description)||'Development complete. Prepare the release for UAT.',
      version:clean(details.version),archive:clean(details.archive),team:[workspace().user.id],
      status:'Ready for UAT',progress:0,readiness:0,bugs:0,critical:0,developmentComplete:true,
      uat:{stage:'awaiting',cases:[]},createdAt:new Date().toISOString()
    };
    workspace().projects.push(project);
    A.save();
    return project;
  };

  workflow.startTesting = function (projectId, plan) {
    const project=projectById(projectId);
    if(workspace().role!=='manager'||!['awaiting','testing'].includes(workflow.stage(project))||!Array.isArray(plan?.cases)||!plan.cases.length)return false;
    const developerIds=[...new Set(plan.developerIds||[])];
    const testerIds=[...new Set(plan.testerIds||[])];
    const available=(ids,role)=>ids.length&&ids.every(id=>workspace().employees.some(employee=>employee.id===id&&employee.role===role&&employee.available!==false));
    if(!available(developerIds,'developer')||!available(testerIds,'tester'))return false;
    const existing=project.uat?.cases||[];
    const drafts=existing.filter(test=>test.status==='draft');
    const retained=existing.filter(test=>test.status!=='draft');
    const existingIds=new Set(existing.map(test=>test.id));
    if(!drafts.length||plan.cases.length!==existing.length||new Set(plan.cases.map(test=>test.id)).size!==existing.length)return false;
    if(plan.cases.some(test=>!existingIds.has(test.id)))return false;
    const submitted=new Map(plan.cases.map(test=>[test.id,test]));
    if(drafts.some(original=>{
      const test=submitted.get(original.id);
      return !clean(test.title)||!Array.isArray(test.steps)||!test.steps.some(clean)||!clean(test.testData)||!clean(test.expected)||!testerIds.includes(test.assigneeId);
    }))return false;
    if(retained.some(test=>!testerIds.includes(test.assigneeId)))return false;
    const retainedBugIds=new Set(retained.map(test=>test.bugId).filter(Boolean));
    if(workspace().issues.some(issue=>retainedBugIds.has(issue.id)&&issue.status!=='Resolved'&&issue.assignee&&!developerIds.includes(issue.assignee)))return false;
    const starting=workflow.stage(project)==='awaiting';
    const now=new Date().toISOString();
    project.team=[workspace().user.id,...developerIds,...testerIds];
    project.uat.cases=existing.map(test=>test.status==='draft'?{...submitted.get(test.id),status:'pending'}:test);
    for(const issue of workspace().issues.filter(item=>item.projectId===project.id&&item.status!=='Resolved')){
      if(!developerIds.includes(issue.assignee))issue.assignee=developerIds[0];
    }
    project.uat.stage='testing';
    project.uat.approvedAt=now;
    project.updatedAt=now;
    project.status='In progress';
    if(starting)project.progress=0;
    for(const employeeId of [...developerIds,...testerIds]){
      const employee=workspace().employees.find(person=>person.id===employeeId);
      let assignment=workspace().assignments.find(item=>item.employeeId===employeeId&&item.projectId===project.id);
      if(!assignment){
        const key='PS-'+newId().slice(0,8).toUpperCase();
        assignment={id:'assignment-'+newId(),employeeId,projectId:project.id,username:employee.email,password:'Welcome26!',key,accepted:false,emailSent:true,
          subject:'UAT assignment · '+project.name,body:`You are assigned to ${project.name}. Your assignment key is ${key}. Sign in with ${employee.email} / Welcome26!.`};
        workspace().assignments.push(assignment);
      }
      notify('UAT project ready to accept',`${project.name} · ${employee.role==='tester'?'Approved test scenarios are ready.':'The release is ready for testing and fixes.'}`,employeeId,employee.role,'dashboard');
    }
    A.save();
    return true;
  };

  workflow.canSend = project => {
    if (!project || workflow.stage(project) !== 'testing') return false;
    const cases = project.uat?.cases;
    return Boolean(cases?.length && cases.every(test => test.status === 'pass' &&
      (!test.bugId || workspace().issues.find(issue => issue.id === test.bugId)?.status === 'Resolved')) &&
      !workspace().issues.some(issue => issue.projectId === project.id && issue.status !== 'Resolved'));
  };

  workflow.customerAvailable = project => Boolean(project && (workflow.stage(project)==='customer' || project.uat?.earlyBeta?.enabled));

  workflow.insights = function (project, employeeId = workspace().role==='developer' ? workspace().user.id : undefined) {
    const cases=(project?.uat?.cases||[]).filter(test=>test.status!=='draft');
    const issues=workspace().issues.filter(issue=>issue.projectId===project?.id && (!employeeId || issue.assignee===employeeId));
    const actionable=issues.filter(issue=>['Open','In progress','Reopened'].includes(issue.status));
    const submitted=issues.filter(issue=>['Awaiting retest','In review','Resolved'].includes(issue.status));
    const passed=cases.filter(test=>test.status==='pass').length;
    const label=actionable.length ? `${actionable.length} ${actionable.length===1?'bug is':'bugs are'} waiting to be fixed`
      : issues.some(issue=>issue.status==='Awaiting retest') ? 'Waiting for retest'
      : issues.some(issue=>issue.status==='In review') ? 'Waiting for manager approval'
      : issues.length ? 'All reported bugs fixed' : 'Waiting for testers to identify bugs';
    return {developerPercent:issues.length?Math.round(submitted.length/issues.length*100):0,
      testingPercent:cases.length?Math.round(passed/cases.length*100):0,developerLabel:label,
      developerActionable:actionable.length,developerTotal:issues.length,developerSubmitted:submitted.length,
      testingPassed:passed,testingTotal:cases.length};
  };

  workflow.sendToCustomer = function (projectId, options = {}) {
    const project = projectById(projectId);
    if (workspace().role !== 'manager') return false;
    const early=options.early===true && options.acknowledged===true && workflow.stage(project)==='testing' && project.uat?.cases?.some(test=>test.status!=='draft');
    if (!workflow.canSend(project) && !early) {
      A.toast('Pass every approved test and resolve all project findings before customer acceptance.','error');
      return false;
    }
    project.uat ||= {cases: []};
    if(early){
      project.uat.earlyBeta={enabled:true,unfinished:true,acknowledgedAt:new Date().toISOString(),managerId:workspace().user.id};
    }else{
      project.uat.stage = 'customer';
      if(project.uat.earlyBeta)project.uat.earlyBeta={...project.uat.earlyBeta,enabled:false,unfinished:false};
    }
    project.uat.customerSentAt = new Date().toISOString();
    project.updatedAt = project.uat.customerSentAt;
    Beta.prepareInvitation(project);
    A.save();
    A.render();
    Beta.previewInvitation(projectId);
    return true;
  };

  workflow.casesForProject = function (projectId) {
    const {role, user} = workspace();
    if (role !== 'tester' || !Workspaces.hasAcceptedProject(projectId)) return [];
    return (projectById(projectId)?.uat?.cases || [])
      .filter(test => test.status !== 'draft' && test.assigneeId === user.id);
  };

  workflow.draftFailure = function (projectId, caseId, details) {
    const test = caseById(projectById(projectId), caseId);
    if (!test) return null;
    const actual = clean(details?.description);
    const auth = /sign.in|session|password|permission|account/i.test(test.title);
    const records = /data|document|export|upload|search|filter/i.test(test.title);
    const potentialCauses = auth
      ? ['The session or permissions check may run after navigation.', 'Error handling may discard the user’s current state.']
      : records
        ? ['Validation or filtering may reject a supported input.', 'The UI may render before the latest data is available.']
        : ['The UI may not handle the scenario’s starting state.', 'A recent change may have altered the expected response.'];
    return {
      title: test.title + ' — UAT failure',
      description: actual,
      steps: test.steps.map((step, index) => `${index + 1}. ${step}`).join('\n'),
      expected: test.expected,
      actual,
      evidence: clean(details?.evidence),
      evidenceId: details?.evidenceId || '',
      potentialCauses
    };
  };

  // Deterministic mock AI similarity check. Reports remain independent for retesting.
  workflow.checkDuplicate = function (report, excludeId) {
    const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
    const tokens = value => new Set(normalize(value).split(' ').filter(word => word.length > 2));
    const similarity = (a,b) => {const first=tokens(a), second=tokens(b);return first.size&&second.size?[...first].filter(word=>second.has(word)).length/new Set([...first,...second]).size:0;};
    let best;
    for(const existing of workspace().issues.filter(item=>item.projectId===report.projectId&&item.id!==excludeId&&!item.duplicateOf)) {
      const title=similarity(report.title,existing.title);
      const actual=similarity(report.actual||report.description,existing.actual||existing.description);
      const exact=normalize(report.title)===normalize(existing.title)&&normalize(report.title).length>5;
      const score=exact?Math.max(.85,actual):title*.45+actual*.55;
      if((exact||title>=.45&&actual>=.65)&&score>=.65&&(!best||score>best.score))best={existing,score};
    }
    return best?{duplicateOf:best.existing.id,confidence:Math.round(best.score*100),summary:'Similar title and observed behavior match an existing report in this project. Compare the reproduction steps and evidence before confirming the duplicate.',originalTitle:best.existing.title,originalStatus:best.existing.status,method:'Mock AI similarity analysis'}:null;
  };
  workflow.tagDuplicate = function (report) {
    const analysis=workflow.checkDuplicate(report,report.id);
    if(analysis){report.duplicateOf=analysis.duplicateOf;report.duplicateAnalysis=analysis;}
    return analysis;
  };
  workflow.duplicateSummary = function (report) {
    const analysis=report.duplicateAnalysis;
    if(!analysis)return '';
    return `<section class="info-box" aria-label="AI duplicate analysis"><div><strong>Potential duplicate · ${A.escape(analysis.confidence)}% similarity</strong><p>${A.escape(analysis.summary)}</p><p>Original report: <button class="btn small" onclick="Workspaces.issueDetails(${A.escape(JSON.stringify(analysis.duplicateOf))})">${A.escape(analysis.duplicateOf)} · ${A.escape(analysis.originalTitle)}</button></p><small>Mock AI analysis · Review required. Both reports retain their own evidence, test results and approvals.</small></div></section>`;
  };

  workflow.recordOutcome = function (projectId, caseId, status, details = {}) {
    A.refreshWorkspace?.();
    const project = projectById(projectId);
    const test = workflow.casesForProject(projectId).find(item => item.id === caseId);
    if (!test || workflow.stage(project) !== 'testing' ||
        !['pending', 'blocked', 'retest'].includes(test.status) ||
        !['pass', 'fail', 'blocked'].includes(status)) return false;
    const description = clean(details.description);
    if (status === 'fail' && !description) return false;

    const now = new Date().toISOString();
    let issue = linkedBug(test);
    if (status === 'fail') {
      const draft = workflow.draftFailure(projectId, caseId, details);
      const edit = details.report || {};
      const report = {
        ...draft,
        title: clean(edit.title) || draft.title,
        description: clean(edit.description) || draft.description,
        actual: clean(edit.actual) || draft.actual
      };
      if (issue) {
        issue.retestHistory ||= [];
        issue.retestHistory.push({status:'fail', buildVersion:test.buildVersion, description, evidence:draft.evidence, evidenceId:draft.evidenceId, date:now});
        Object.assign(issue, report, {status:'Reopened', reopenedAt:now});
        delete issue.verifiedBy;
        delete issue.verifiedAt;
      } else {
        const developer = project.team.find(id =>
          workspace().employees.some(person => person.id === id && person.role === 'developer' && person.available !== false));
        issue = {
          ...report, id:'UAT-' + newId(), projectId, uatCaseId:caseId, assignee:developer,
          severity:'High', status:'Open', category:'User acceptance testing',
          deadline:project.deadline, source:'UAT test case', testData:test.testData, createdAt:now
        };
        issue.reportedById=workspace().user.id;
        issue.reportedBy=workspace().user.name;
        workflow.tagDuplicate(issue);
        workspace().issues.unshift(issue);
        test.bugId = issue.id;
        project.bugs = (Number(project.bugs) || 0) + 1;
      }
      const developer = employeeForRole(issue.assignee, 'developer');
      notify(issue.duplicateOf ? 'Potential duplicate UAT bug reported' : issue.status === 'Reopened' ? 'UAT bug reopened' : 'UAT bug reported',
        `${project.name} · ${issue.title}`, developer?.id || projectManager(project),
        developer ? 'developer' : 'manager', 'issues');
    } else if (status === 'pass' && issue?.status === 'Awaiting retest') {
      issue.status = 'In review';
      issue.verifiedAt = now;
      issue.verifiedBy = workspace().user.id;
      issue.retestHistory ||= [];
      issue.retestHistory.push({status:'pass', buildVersion:test.buildVersion, date:now});
      notify('Tester verified a fix for approval', `${project.name} · ${test.title} · Build ${test.buildVersion}`,
        projectManager(project), 'manager', 'issues');
    }
    test.status = status;
    test.result = {description, evidence:clean(details.evidence), evidenceId:details.evidenceId || '', date:now};
    project.updatedAt = now;
    if (status === 'pass' && workflow.canSend(project)) {
      notify('UAT is ready for customer acceptance', `${project.name} · All approved test cases passed.`,
        projectManager(project), 'manager', 'projects');
    }
    A.save();
    return true;
  };

  function retestCase(project, issue, fix) {
    const existing = caseById(project, issue.uatCaseId);
    if (existing) return existing;
    const testers = workspace().employees.filter(person => person.role === 'tester' && project.team.includes(person.id));
    const reporter = testers.find(person => person.id === issue.reportedById || person.name === issue.reportedBy);
    const tester = reporter || testers.find(person => person.available !== false) || testers[0];
    if (!tester) return null;
    project.uat ||= {stage:'testing', cases:[]};
    project.uat.cases ||= [];
    const steps = Array.isArray(issue.steps) ? issue.steps : clean(issue.steps).split('\n').filter(Boolean);
    const test = {
      id:'retest-' + issue.id, title:'Retest · ' + issue.title, bugId:issue.id,
      steps:steps.length ? steps : ['Open the affected workflow.', issue.description || 'Reproduce the reported issue.', 'Check the expected result.'],
      testData:issue.testData || issue.environment || 'Use the original report’s sample data.',
      expected:issue.expected || 'The reported issue is corrected and the workflow completes successfully.',
      code:clean(fix?.code).split('\n').slice(0,5).join('\n'),
      assigneeId:tester.id, status:'fail', source:'bug-retest'
    };
    issue.uatCaseId = test.id;
    project.uat.cases.push(test);
    return test;
  }

  function queueRetest(project, issue, test, fix) {
    const submittedAt = new Date().toISOString();
    issue.status = 'Awaiting retest';
    issue.fix = {...fix, submittedAt};
    delete issue.verifiedBy;
    delete issue.verifiedAt;
    test.status = 'retest';
    test.buildVersion = fix.buildVersion;
    project.version = fix.buildVersion;
    project.uat.stage = 'testing';
    if (project.status === 'Completed' || Number(project.progress) >= 100) {
      project.status = 'In progress';
      project.progress = Math.min(99, Number(project.progress) || 0);
    }
    project.updatedAt = submittedAt;
    notify('Fix ready to retest', `${project.name} · ${test.title} · Build ${fix.buildVersion}`,
      test.assigneeId, 'tester', 'dashboard');
  }

  workflow.submitFix = function (issueId, fix) {
    const issue = workspace().issues.find(item => item.id === issueId);
    const project = projectById(issue?.projectId);
    const existing = caseById(project, issue?.uatCaseId);
    const buildVersion = clean(fix?.buildVersion);
    if (workspace().role !== 'developer' || !issue || !project || issue.assignee !== workspace().user.id ||
        !Workspaces.hasAcceptedProject(project.id) || !['Open','In progress','Reopened'].includes(issue.status) ||
        (issue.uatCaseId && (!existing || existing.bugId !== issueId || existing.status !== 'fail')) ||
        !clean(fix?.notes) || !buildVersion || buildVersion.toLowerCase() === clean(existing?.buildVersion || project.version).toLowerCase()) return false;
    const test = retestCase(project, issue, fix);
    if (!test || !employeeForRole(test.assigneeId, 'tester')) return false;
    queueRetest(project, issue, test, {...fix, buildVersion, author:workspace().user.name, authorId:workspace().user.id});
    return true;
  };

  workflow.canReview = issue => {
    const project = projectById(issue?.projectId);
    const test = caseById(project, issue?.uatCaseId);
    return workspace().role === 'manager' && workflow.stage(project) === 'testing' && issue?.status === 'In review' &&
      Boolean(issue.verifiedAt && issue.fix?.buildVersion && employeeForRole(issue.verifiedBy, 'tester')) &&
      test?.status === 'pass' && test.bugId === issue.id && test.assigneeId === issue.verifiedBy &&
      test.buildVersion === issue.fix.buildVersion;
  };

  workflow.approveFix = function (issueId) {
    const issue = workspace().issues.find(item => item.id === issueId);
    if (!workflow.canReview(issue)) return false;
    const project = projectById(issue.projectId);
    issue.status = 'Resolved';
    issue.resolvedAt = new Date().toISOString();
    issue.approvedBy = workspace().user.id;
    project.bugs = Math.max(0, (Number(project.bugs) || 0) - 1);
    if (issue.severity === 'Critical') project.critical = Math.max(0, (Number(project.critical) || 0) - 1);
    project.updatedAt = issue.resolvedAt;
    notify('Verified fix approved', `${project.name} · ${issue.title}`, issue.assignee, 'developer', 'issues');
    if (workflow.canSend(project)) {
      notify('UAT is ready for customer acceptance', `${project.name} · All approved cases and fixes are complete.`,
        projectManager(project), 'manager', 'projects');
    }
    return true;
  };

  workflow.requestChanges = function (issueId, notes) {
    const issue = workspace().issues.find(item => item.id === issueId);
    if (!workflow.canReview(issue) || !clean(notes)) return false;
    const project = projectById(issue.projectId);
    const test = caseById(project, issue.uatCaseId);
    issue.status = 'In progress';
    issue.reviewNotes = clean(notes);
    delete issue.verifiedBy;
    delete issue.verifiedAt;
    test.status = 'fail';
    project.updatedAt = new Date().toISOString();
    notify('Manager requested another revision', `${project.name} · ${issue.title} · ${clean(notes)}`,
      issue.assignee, 'developer', 'issues');
    return true;
  };

  workflow.restoreReviewQueues = function () {
    let changed = false;
    for (const issue of workspace().issues) {
      if (issue.status !== 'In review' || (issue.verifiedBy && issue.verifiedAt)) continue;
      const project = projectById(issue.projectId);
      if (!project) continue;
      const fix = {...issue.fix, buildVersion:issue.fix?.buildVersion || project.version, author:issue.fix?.author || 'Development team'};
      const test = retestCase(project, issue, fix);
      if (!test) continue;
      queueRetest(project, issue, test, fix);
      changed = true;
    }
    return changed;
  };
})();
