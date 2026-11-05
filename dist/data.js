window.DEMO_DATA = {
 employees:[
  {id:'m1',name:'Olivia Bennett',role:'manager',title:'Engineering Manager',email:'olivia.bennett@pfizer.demo',avatar:1,available:true,load:64,skills:['Release management','Agile']},
  {id:'m2',name:'James Wilson',role:'manager',title:'Delivery Manager',email:'james.wilson@pfizer.demo',avatar:4,available:true,load:35,skills:['Quality operations','Delivery']},
  {id:'m3',name:'Sophia Martinez',role:'manager',title:'Technical Program Manager',email:'sophia.martinez@pfizer.demo',avatar:3,available:false,load:0,skills:['On holiday · returns Nov 12']},
  {id:'d1',name:'Ethan Brooks',role:'developer',title:'Senior Frontend Engineer',email:'ethan.brooks@pfizer.demo',avatar:6,available:true,load:72,skills:['React','TypeScript','Accessibility']},
  {id:'d2',name:'Amelia Chen',role:'developer',title:'Full Stack Engineer',email:'amelia.chen@pfizer.demo',avatar:5,available:true,load:45,skills:['Node.js','React','APIs']},
  {id:'d3',name:'Noah Patel',role:'developer',title:'Backend Engineer',email:'noah.patel@pfizer.demo',avatar:8,available:true,load:28,skills:['Python','Security','PostgreSQL']},
  {id:'d4',name:'Isabella Rossi',role:'developer',title:'Frontend Engineer',email:'isabella.rossi@pfizer.demo',avatar:7,available:true,load:15,skills:['Vue','Design systems']},
  {id:'d5',name:'Lucas Anderson',role:'developer',title:'Platform Engineer',email:'lucas.anderson@pfizer.demo',avatar:10,available:false,load:0,skills:['On holiday · returns Nov 9']},
  {id:'t1',name:'Emma Thompson',role:'tester',title:'Senior QA Engineer',email:'emma.thompson@pfizer.demo',avatar:9,available:true,load:58,skills:['Automation','Playwright','Accessibility']},
  {id:'t2',name:'Liam Walker',role:'tester',title:'Quality Assurance Engineer',email:'liam.walker@pfizer.demo',avatar:12,available:true,load:36,skills:['GUI testing','Regression']},
  {id:'t3',name:'Ava Robinson',role:'tester',title:'Test Automation Engineer',email:'ava.robinson@pfizer.demo',avatar:11,available:true,load:20,skills:['Selenium','Performance']},
  {id:'t4',name:'Oliver Davis',role:'tester',title:'QA Analyst',email:'oliver.davis@pfizer.demo',avatar:14,available:false,load:0,skills:['On holiday · returns Nov 10']}
 ],
 projects:[
  {id:'p1',name:'Project 1',description:'A connected patient support experience.',version:'v2.4.0',readiness:86,progress:86,bugs:8,critical:2,deadline:'2026-11-06',status:'In progress',team:['m1','d1','d2','t1'],color:'#2563eb',abbr:'PC',category:'Patient experience'},
  {id:'p2',name:'Project 2',description:'Study data, clearly connected.',version:'v1.8.2',readiness:68,progress:68,bugs:14,critical:3,deadline:'2026-11-08',status:'At risk',team:['m2','d2','d3','t2'],color:'#8b5cf6',abbr:'CI',category:'Clinical operations'},
  {id:'p3',name:'Project 3',description:'Visibility across the supply journey.',version:'v3.1.0',readiness:94,progress:94,bugs:3,critical:0,deadline:'2026-11-10',status:'Ready for review',team:['m1','d3','t1','t3'],color:'#0c9a7b',abbr:'SB',category:'Supply operations'},
  {id:'p4',name:'Project 4',description:'One home for collaborative research.',version:'v2.0.0',readiness:76,progress:76,bugs:6,critical:1,deadline:'2026-11-12',status:'In progress',team:['m2','d1','d4','t2'],color:'#e79836',abbr:'RH',category:'Research tools'},
  {id:'p5',name:'Project 5',description:'Making support easier to discover.',version:'v1.3.0',readiness:91,progress:91,bugs:2,critical:0,deadline:'2026-11-14',status:'Ready for review',team:['m1','d4','t3'],color:'#db6895',abbr:'CN',category:'Patient experience'},
  {id:'p6',name:'Project 6',description:'A better way to work together.',version:'v4.2.0',readiness:58,progress:58,bugs:11,critical:1,deadline:'2026-11-16',status:'In progress',team:['m2','d2','t2'],color:'#527387',abbr:'PP',category:'Enterprise platform'},
  {id:'p7',name:'Project 7',description:'Released successfully on October 28.',version:'v1.6.0',readiness:100,progress:100,bugs:0,critical:0,deadline:'2026-10-28',status:'Completed',team:['m1','d1','t1'],color:'#64748b',abbr:'TT'},
  {id:'p8',name:'Project 8',description:'Released successfully on October 21.',version:'v2.3.1',readiness:100,progress:100,bugs:0,critical:0,deadline:'2026-10-21',status:'Completed',team:['m2','d2','t2'],color:'#64748b',abbr:'RL'},
  {id:'p9',name:'Project 9',description:'Released successfully on October 15.',version:'v1.2.0',readiness:100,progress:100,bugs:0,critical:0,deadline:'2026-10-15',status:'Completed',team:['m1','d3','t3'],color:'#64748b',abbr:'TW'},
  {id:'p10',name:'Project 10',description:'A finished desktop planner build, ready for UAT preparation.',version:'v1.0.0',readiness:0,progress:0,bugs:0,critical:0,deadline:'2026-11-24',status:'Ready for UAT',team:['m1'],abbr:'10'}
 ],
 issues:[
  {id:'BUG-1042',title:'Session expires during document upload',projectId:'p1',severity:'Critical',status:'Open',category:'Authentication',estimate:'3 hours',deadline:'Nov 5',assignee:'d1',description:'A session refresh race condition interrupts uploads larger than 20 MB. Preserve upload state and retry after token renewal.',steps:'1. Sign in\n2. Upload a file larger than 20 MB\n3. Allow the session to refresh',expected:'Upload continues without interruption.',actual:'The user is redirected to sign in.'},
  {id:'BUG-1041',title:'Export includes duplicate study records',projectId:'p2',severity:'Critical',status:'Open',category:'Data integrity',estimate:'5 hours',deadline:'Nov 6',assignee:'d2',description:'The exported CSV can contain duplicate rows when two filters are combined. Deduplicate by record ID.'},
  {id:'BUG-1039',title:'Keyboard focus leaves the consent dialog',projectId:'p1',severity:'High',status:'In progress',category:'Accessibility',estimate:'2 hours',deadline:'Nov 5',assignee:'d1',description:'Trap keyboard focus inside the modal and restore focus to the trigger after dismissal.'},
  {id:'BUG-1036',title:'Dashboard chart loads slowly on large datasets',projectId:'p2',severity:'High',status:'Open',category:'Performance',estimate:'4 hours',deadline:'Nov 7',assignee:'d3',description:'Chart render time exceeds 2 seconds with more than 10,000 mock records. Add aggregation and memoization.'},
  {id:'BUG-1032',title:'Search filter resets after navigation',projectId:'p3',severity:'Medium',status:'In review',category:'User interface',estimate:'1 hour',deadline:'Nov 8',assignee:'d4',description:'Preserve search and active filters in route state when returning to the project list.',resilience:94},
  {id:'BUG-1028',title:'Empty state copy overlaps on mobile',projectId:'p3',severity:'Low',status:'Open',category:'Responsive layout',estimate:'45 minutes',deadline:'Nov 9',assignee:'d2',description:'Allow the empty state description to wrap at 320px viewport widths.'}
 ],
 feedback:[
  {id:'FB-201',name:'Sarah Mitchell',company:'Northstar Research',projectId:'p1',type:'Bug',title:'Uploaded documents disappear after refreshing',body:'I uploaded a sample PDF and refreshed the page. The document was no longer in my list.',status:'New',time:'18 min ago',avatar:13},
  {id:'FB-202',name:'Daniel Kim',company:'Meridian Health',projectId:'p2',type:'Suggestion',title:'Let us save a favorite set of filters',body:'We use the same filters every morning. A saved view would save our team several clicks.',status:'New',time:'42 min ago',avatar:16},
  {id:'FB-203',name:'Rachel Evans',company:'Northstar Research',projectId:'p1',type:'Bug',title:'Continue button is disabled after going back',body:'When I return to the first setup step, the continue button stays disabled even after all fields are filled.',status:'New',time:'1 hour ago',avatar:15}
 ],
 notifications:[
  {id:'n1',title:'Project 1 needs your attention',body:'Two critical findings need review before Friday’s shipment.',time:'5 min ago',read:false,type:'warning',page:'issues'},
  {id:'n2',title:'A fix is ready for approval',body:'Isabella submitted the search filter fix for Project 4.',time:'24 min ago',read:false,type:'check',page:'issues'},
  {id:'n3',title:'Customer feedback has arrived',body:'Sarah Mitchell shared feedback on Project 1.',time:'38 min ago',read:false,type:'message-square',page:'feedback'},
  {id:'n4',title:'Project 3 passed regression',body:'All 48 automated test cases passed.',time:'1 hour ago',read:true,type:'check',page:'projects'}
 ],assignments:[],accepted:{}
};

const plannerScenarios = [
  ['Create a new task', ['Open the task planner.', 'Add a task with a title, due date, and priority.', 'Save and find it in the task list.'], 'Task: Review release. Priority: High. Due: tomorrow.', 'The new task appears once with its selected details.', 'function createTask(input) {\n  const task = { ...input, id: newId(), completed: false };\n  return saveTask(task);\n}'],
  ['Edit an existing task', ['Open a task.', 'Change its title and priority.', 'Save the changes.'], 'Task: Review release. New title: Review UAT release.', 'The updated task appears without creating a duplicate.', 'function updateTask(id, change) {\n  const task = findTask(id);\n  return saveTask({ ...task, ...change });\n}'],
  ['Complete a task', ['Find an incomplete task.', 'Mark it complete.', 'Open the completed-task view.'], 'One incomplete sample task.', 'The task is marked complete and included in completed tasks.', 'function completeTask(id) {\n  return updateTask(id, { completed: true });\n}'],
  ['Search the task list', ['Create two tasks with different titles.', 'Search for a word from one title.', 'Clear the search.'], 'Tasks: Review release, Book team meeting.', 'Only matching tasks are shown. Clearing restores the full list.', 'function searchTasks(tasks, query) {\n  const term = query.trim().toLowerCase();\n  return tasks.filter(task => task.title.toLowerCase().includes(term));\n}'],
  ['Filter tasks by priority', ['Open the task list.', 'Select High priority.', 'Return to All priorities.'], 'Tasks with High, Medium, and Low priorities.', 'The priority filter shows only matching tasks and can be cleared.', 'function filterPriority(tasks, priority) {\n  return priority === "All" ? tasks : tasks.filter(task => task.priority === priority);\n}'],
  ['Keep task changes after reopening', ['Add or edit a task.', 'Refresh the beta window.', 'Find the updated task.'], 'Task: Persistence check.', 'The saved changes are restored in the same beta session.', 'function restorePlanner(session) {\n  return session.tasks ?? defaultTasks();\n}'],
  ['Use board view and remove a task', ['Switch from list to board view.', 'Open a task and delete it.', 'Return to list view.'], 'One disposable sample task.', 'The task is removed from both views.', 'function removeTask(tasks, id) {\n  return tasks.filter(task => task.id !== id);\n}']
];

function plannerPlan(projectId, assigneeId, passed=false) {
 return {
  stage:'testing',requirements:{name:projectId+'-requirements.txt',text:'Users can create, update, complete, search, filter, and delete tasks in a desktop planner.'},gaps:[],
  cases:plannerScenarios.map(([title,steps,testData,expected,code],index)=>({
   id:'demo-'+projectId+'-case-'+(index+1),title,steps,testData,expected,code,assigneeId,status:passed?'pass':'pending'
  }))
 };
}
window.UAT_DEMO_PLANS = {
 p1:plannerPlan('p1','t1'),
 p2:{stage:'awaiting',cases:[]},
 p3:plannerPlan('p3','t1',true),
 p4:{stage:'awaiting',cases:[]},
 p5:{stage:'awaiting',cases:[]},
 p6:plannerPlan('p6','t2'),
 p7:{...plannerPlan('p7','t1',true),stage:'customer'},
 p8:{...plannerPlan('p8','t2',true),stage:'customer'},
 p9:{stage:'awaiting',cases:[]},
 p10:{stage:'awaiting',cases:[]}
};

window.prepareDemoWorkspace = function (state) {
 const previous=JSON.stringify(state);
 const added = !state.projects.some(project=>project.id==='p10');
 if(added)state.projects.push(structuredClone(window.DEMO_DATA.projects.find(project=>project.id==='p10')));
 const reserved=new Set(state.projects.map(project=>Number(project.id.match(/^p(\d+)$/)?.[1])).filter(Boolean));
 const replacements=[["Patient Connect", "Project 1"], ["Clinical Insights", "Project 2"], ["Supply Bridge", "Project 3"], ["Research Hub", "Project 4"], ["Care Navigator", "Project 5"], ["Partner Portal", "Project 6"], ["Trial Tracker", "Project 7"], ["Resource Library", "Project 8"], ["Team Workspace", "Project 9"]];
 let next=11;
 for(const project of state.projects){
  let number=Number(project.id.match(/^p(\d+)$/)?.[1]) || project.number;
  if(!number||(!project.id.match(/^p\d+$/)&&reserved.has(number))){
   while(reserved.has(next))next++;
   number=next++;
  }
  reserved.add(number);
  const name='Project '+number;
  if(project.name!==name&&!/^Project(?: \d+)?$/i.test(project.name))replacements.push([project.name,name]);
  project.number=number;project.name=name;project.abbr=String(number);
  const seed=window.UAT_DEMO_PLANS[project.id];
  if(!project.uat)project.uat=structuredClone(seed||{stage:'awaiting',cases:[]});
  else if(project.uat.stage!=='customer'&&!project.uat.cases?.some(test=>!['draft'].includes(test.status))){
   project.uat.stage=seed?.stage==='customer'&&!project.uat.cases?.length?'customer':'awaiting';
  }
  if(project.uat.stage==='awaiting'){
   project.developmentComplete=true;project.status='Ready for UAT';project.progress=0;
  }
 }
 function rename(value){
  if(typeof value==='string'){
   if(/^Project \d+$/.test(value))return value;
   for(const [before,after] of replacements)if(before&&before!==after)value=value.split(before).join(after);
   return value;
  }
  if(Array.isArray(value))return value.map(rename);
  if(value&&typeof value==='object')for(const key of Object.keys(value))value[key]=rename(value[key]);
  return value;
 }
 rename(state);
 return previous!==JSON.stringify(state);
};
