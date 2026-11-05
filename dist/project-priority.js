(() => {
  'use strict';

  const urgent = {key:'urgent', label:'Urgent', rank:0};
  const high = {key:'high', label:'High priority', rank:1};
  const normal = {key:'normal', label:'Normal priority', rank:2};
  const low = {key:'low', label:'Low priority', rank:3};
  const completed = {key:'completed', label:'Completed', rank:4};

  function priorityOf(project) {
    if (/complete|finished|shipped|archived/i.test(project.status || '') || Number(project.progress) >= 100) return completed;
    if (project.status === 'At risk' || project.critical >= 2) return urgent;
    if (project.critical > 0) return high;
    if (project.status === 'Ready for review') return low;
    return normal;
  }

  function lastActivity(project) {
    return Date.parse(project.updatedAt) || Date.parse(project.createdAt) || 0;
  }

  function deadlineOrder(project) {
    const deadline = Date.parse(project.deadline);
    if (!Number.isFinite(deadline)) return Infinity;
    return priorityOf(project) === completed ? -deadline : deadline;
  }

  function compare(a, b) {
    return priorityOf(a).rank - priorityOf(b).rank ||
      lastActivity(b) - lastActivity(a) ||
      deadlineOrder(a) - deadlineOrder(b) ||
      a.name.localeCompare(b.name);
  }

  function badge(project) {
    const {key, label} = priorityOf(project);
    return `<span class="project-priority-badge" data-project-priority="${key}">${label}</span>`;
  }

  window.ProjectPriority = {of: priorityOf, compare, badge};
})();
