(() => {
  'use strict';

  const urgent = {key:'urgent', label:'Urgent', rank:0};
  const high = {key:'high', label:'High priority', rank:1};
  const normal = {key:'normal', label:'Normal priority', rank:2};
  const low = {key:'low', label:'Low priority', rank:3};
  const completed = {key:'completed', label:'Completed', rank:4};
  const testingComplete = {key:'low', label:'UAT complete', rank:3};
  const customerAcceptance = {key:'low', label:'Customer acceptance', rank:3};

  function projectIssues(project) {
    return (window.A?.state?.issues || []).filter(issue => issue.projectId === project.id);
  }

  function priorityOf(project) {
    if (/complete|finished|shipped|archived/i.test(project.status || '')) return completed;
    if (window.UatWorkflow?.canSend(project)) return testingComplete;
    if (project.uat?.stage === 'customer') return customerAcceptance;
    if (!project.uat && Number(project.progress) >= 100) return completed;
    const tracked = projectIssues(project);
    const open = tracked.filter(issue => issue.status !== 'Resolved');
    const unfinishedCases = (project.uat?.cases || []).filter(test => !['draft','pass'].includes(test.status));
    if (tracked.length) {
      if (open.some(issue => issue.severity === 'Critical')) return urgent;
      if (open.some(issue => issue.severity === 'High') || unfinishedCases.some(test => ['fail','blocked','retest'].includes(test.status))) return high;
      return open.length || unfinishedCases.length ? normal : low;
    }
    if (unfinishedCases.some(test => ['fail','blocked','retest'].includes(test.status))) return high;
    if (project.status === 'At risk' || project.critical >= 2) return urgent;
    if (project.critical > 0) return high;
    if (project.status === 'Ready for review') return low;
    return normal;
  }

  function number(project) {
    return Number(project.number) || Number(String(project.name || '').match(/^Project\s+(\d+)$/i)?.[1]) ||
      Number(String(project.id || '').match(/^p(\d+)$/)?.[1]) || Infinity;
  }

  function compare(a, b) {
    return number(a) - number(b) || String(a.name || '').localeCompare(String(b.name || ''), undefined, {numeric:true});
  }

  function compareUrgency(a, b) {
    return priorityOf(a).rank - priorityOf(b).rank || compare(a, b);
  }

  function developerPriority(project, employeeId = window.A?.state?.user?.id) {
    const assigned = projectIssues(project).filter(issue => issue.assignee === employeeId);
    const actionable = assigned.filter(issue => ['Open', 'In progress', 'Reopened'].includes(issue.status));
    if (actionable.some(issue => issue.severity === 'Critical')) return urgent;
    if (actionable.some(issue => issue.severity === 'High')) return high;
    if (actionable.length) return normal;
    if (priorityOf(project).key === 'completed') return completed;
    return {key:'low', label:'No developer action pending', rank:3};
  }

  function compareForRole(a, b, role = window.A?.state?.role, employeeId = window.A?.state?.user?.id) {
    const priority = project => role === 'developer' ? developerPriority(project, employeeId) : priorityOf(project);
    return priority(a).rank - priority(b).rank || compare(a, b);
  }

  function badge(project, priority = priorityOf(project)) {
    const {key, label} = priority;
    return `<span class="project-priority-badge" data-project-priority="${key}">${label}</span>`;
  }

  window.ProjectPriority = {of: priorityOf, forDeveloper:developerPriority, compare, compareUrgency, compareForRole, badge};
})();
