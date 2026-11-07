/* A fresh, fictional release workspace. Dates move with the day the demo is loaded. */
(() => {
  'use strict';

  window.createDemoWorkspace = function () {
    const loadedAt = new Date();
    const at = (days, hours = 10) => {
      const date = new Date(loadedAt);
      date.setDate(date.getDate() + days);
      date.setHours(hours, 0, 0, 0);
      return date.toISOString();
    };
    const date = days => {
      const value = new Date(loadedAt);
      value.setDate(value.getDate() + days);
      return [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-');
    };
    const employees = [
      {id:'m1', name:'Olivia Bennett', role:'manager', title:'Release manager', email:'olivia.bennett@release-team.example', avatar:1, available:true, load:0, skills:['UAT planning','Release approval']},
      {id:'d1', name:'Ethan Brooks', role:'developer', title:'Frontend developer', email:'ethan.brooks@release-team.example', avatar:6, available:true, load:0, skills:['JavaScript','Desktop interfaces','Accessibility']},
      {id:'d2', name:'Maya Chen', role:'developer', title:'Full stack developer', email:'maya.chen@release-team.example', avatar:5, available:true, load:0, skills:['Data storage','APIs','Regression checks']},
      {id:'t1', name:'Emma Thompson', role:'tester', title:'QA engineer', email:'emma.thompson@release-team.example', avatar:9, available:true, load:0, skills:['User journeys','Keyboard testing']},
      {id:'t2', name:'Liam Walker', role:'tester', title:'QA engineer', email:'liam.walker@release-team.example', avatar:12, available:true, load:0, skills:['Exploratory testing','Retesting fixes']}
    ];
    const tasks = [
      'Call the driver about the late collection', 'Check the boiler service certificate',
      'Check the fire exits before opening', 'Order the replacement brake pads',
      'Call Morgan about the missed delivery', 'Prepare the Monday team agenda',
      'Follow up the refund promised to Jamie', 'Book the first aid refresher',
      'Label the monitors for the office move', 'Confirm the Saturday volunteer rota'
    ];
    const purposes = [
      'Dispatch desk task planner. Coordinators track calls and collections during the morning shift.',
      'Facilities work planner. The site team records repairs, due dates and follow-up checks.',
      'Store opening checklist. Shift leads prepare the shop and sign off the morning checks.',
      'Workshop job planner. Mechanics keep repair jobs and parts follow-ups in one task list.',
      'Delivery follow-up planner. The customer service desk tracks callbacks after missed deliveries.',
      'Weekly team planner. A small office uses list and board views to organise its weekly work.',
      'Support handover planner. Agents leave clear follow-up tasks for the next shift.',
      'Training task board. New starters track their induction tasks and booked courses.',
      'Office move checklist. The move coordinator tracks packing, equipment and handover dates.',
      'Volunteer shift planner. The organiser tracks the practical jobs needed before each event.'
    ];
    const versions = ['v1.3.0','v2.1.1','v1.0.2','v1.5.1','v1.2.0','v2.0.1','v1.4.0','v1.0.0','v1.1.0','v1.0.0'];
    const developers = ['d1','d2','d1','d2','d1','d2','d1','d2','d1','d2'];
    const projects = purposes.map((description, index) => ({
      id:'p'+(index+1), number:index+1, name:'Project '+(index+1), abbr:String(index+1), description,
      version:versions[index], category:'Desktop task planner', team:['m1',developers[index],'t1','t2'],
      deadline:date([1,2,3,3,5,6,2,8,10,12][index]), developmentComplete:true,
      createdAt:at(-14+index), updatedAt:at(-1), status:'In progress', progress:0, readiness:0, bugs:0, critical:0,
      uat:{stage:'testing', approvedAt:at(-5), approvedBy:'m1', gaps:[],
        requirements:{name:'project-'+(index+1)+'-acceptance-criteria.txt', text:'The team must be able to create, edit, complete, find and remove tasks. A title is required. Due dates, notes and priority must survive reopening. List and board views must show the same saved tasks.'}, cases:[]}
    }));
    function makeCases(project, statuses) {
      const sample = tasks[project.number-1];
      const templates = [
        ['Add a task with a due date', ['Choose New task.','Enter the sample task name, notes, due date and priority.','Choose Save and find the new task in the list.'], `Task name: ${sample}\nNotes: Confirm the details with the shift lead.\nDue date: ${date(1)}\nPriority: High`, 'One task appears with the entered name, notes, due date and High priority.', 'function addTask(input) {\n  const task = { ...input, id: newId() };\n  tasks.push(task);\n  saveTasks(tasks);\n}'],
        ['Stop an empty task from being saved', ['Choose New task.','Leave Task name empty; enter a short note.','Choose Save, then enter a task name and try again.'], 'Task name: leave blank for the first attempt.\nNotes: Check the required field message.', 'The empty task is not saved. The form explains that a task name is required and accepts a name on the next attempt.', 'function validateTask(input) {\n  return input.title.trim()\n    ? { valid: true }\n    : { valid: false, message: "Enter a task name." };\n}'],
        ['Edit a task without making a second copy', ['Open the sample task.','Add " — confirmed" to its name and change priority to Normal.','Save, then search for the original words in its name.'], `Existing task: ${sample}\nNew name: ${sample} — confirmed\nNew priority: Normal`, 'The existing task is updated. There is one copy, with the new name and Normal priority.', 'function editTask(id, changes) {\n  tasks = tasks.map(task => task.id === id\n    ? { ...task, ...changes } : task);\n  saveTasks(tasks);\n}'],
        ['Complete a task and bring it back', ['Mark the sample task complete.','Open Completed and find the task.','Mark it incomplete and return to the active list.'], `Task: ${sample}\nStarting status: not completed`, 'The task moves to Completed and can be restored to the active list without losing its details.', 'function setCompleted(id, completed) {\n  const task = tasks.find(task => task.id === id);\n  task.completed = completed;\n  saveTasks(tasks);\n}'],
        ['Find a task, then clear the search', ['Create the sample task and a task named "Book a team meeting".','Search for a distinctive word from the sample name.','Clear the search field.'], `Task A: ${sample}\nTask B: Book a team meeting\nSearch: ${sample.split(' ').find(word=>word.length>4) || sample.split(' ')[0]}`, 'The matching task is shown while searching. Clearing the field restores both tasks.', 'function visibleTasks(query) {\n  const text = query.trim().toLowerCase();\n  return tasks.filter(task =>\n    task.title.toLowerCase().includes(text));\n}'],
        ['Filter High priority tasks in both views', ['Create one High priority task and one Normal priority task.','Choose the High priority filter.','Switch to Board, then return to List and clear the filter.'], `High priority task: ${sample}\nNormal priority task: Book a team meeting`, 'Both views show only the High priority task while filtered. Clearing the filter restores both tasks.', 'function filterTasks(priority) {\n  return tasks.filter(task =>\n    priority === "All" || task.priority === priority);\n}'],
        ['Delete a task that is no longer needed', ['Add a task called "Delete this test task".','Delete it and confirm the choice.','Check List and Board views.'], 'Disposable task name: Delete this test task\nKeep the other tasks in place.', 'Only the disposable task is removed. It is absent from both views; the other tasks remain.', 'function deleteTask(id) {\n  tasks = tasks.filter(task => task.id !== id);\n  saveTasks(tasks);\n}'],
        ['Keep saved task details after reopening', ['Save the sample task with notes, due date and High priority.','Refresh the beta window and choose Open to return to the same session.','Open the saved task and compare its details.'], `Task name: ${sample}\nNotes: Confirm the details with the shift lead.\nDue date: ${date(1)}\nPriority: High`, 'The task is still present with the same name, notes, due date, priority and completion status.', 'function restoreTasks() {\n  const saved = storage.getItem("tasks");\n  return saved ? JSON.parse(saved) : [];\n}']
      ];
      const observations=[
        `Saved "${sample}" with tomorrow’s date and High priority. It appeared once, with the note intact.`,
        'Save was stopped while the name was blank. After entering a name, the form saved one task and cleared the message.',
        `Renamed "${sample}" and changed it to Normal priority. There was still one task after saving and reopening.`,
        'The task appeared in Completed after the checkmark was selected. Restoring it brought back the same due date, note and priority.',
        'Search showed the matching task and hid the meeting task. Clearing the field restored both.',
        'The High filter hid the Normal task in List and Board. Clearing it brought both tasks back.',
        'The disposable task disappeared from both views. The original task was still present with its saved details.',
        'Reopened the same beta session. The task, full note, due date and High priority were still saved.'
      ];
      return templates.map(([title,steps,testData,expected,code],index)=>({
        id:project.id+'-case-'+(index+1), title, steps, testData, expected, code,
        assigneeId:index%2===0?'t1':'t2', status:statuses[index], buildVersion:project.version,
        ...(statuses[index]==='pass'?{result:{description:observations[index],date:at(-1,9+index)}}:{})
      }));
    }
    const states = [
      ['pass','pass','pass','pass','pending','pending','blocked','fail'],
      ['pass','pass','pass','pass','pass','retest','pass','pending'],
      ['pass','pass','pass','pass','pass','pass','pass','pass'],
      ['pass','pass','pass','pass','pass','pass','pass','pass'],
      ['pass','pass','pass','pass','pass','pass','pass','pass'],
      ['pass','pass','pass','pass','pass','pass','pass','pass'],
      ['pass','pass','pass','pass','pass','pass','pass','pass'],
      ['pending','pending','pending','pending','pending','pending','pending','pending'],
      [], ['draft','draft','draft','draft','draft','draft','draft','draft']
    ];
    projects.forEach((project,index)=>{project.uat.cases=makeCases(project,states[index]).filter((_,i)=>i<states[index].length);});
    const issues=[];
    function report(id, number, caseNumber, details) {
      const project=projects[number-1], test=project.uat.cases[caseNumber-1];
      const reporter=employees.find(person=>person.id===(test?.assigneeId||'t1'));
      const item={id, projectId:project.id, assignee:developers[number-1], severity:'High', status:'Open',
        source:test?'UAT test case':'Exploratory testing', category:'Task planner', estimate:'2 hours', deadline:project.deadline,
        reportedBy:reporter.name, reportedById:reporter.id, createdAt:at(-2,11),
        ...(test?{uatCaseId:test.id,testData:test.testData,steps:test.steps.map((step,i)=>(i+1)+'. '+step).join('\n'),expected:test.expected}:{}),
        ...details};
      if(test)test.bugId=id;
      issues.push(item);
      return item;
    }
    const lostTask=report('BUG-2401',1,8,{
      title:'A saved dispatch task disappears after reopening', severity:'Critical', estimate:'4 hours',
      description:'The task is visible immediately after saving. After reopening the same beta session, the task is gone. A dispatcher could lose a promised callback without noticing.',
      actual:'The newly added callback task is missing after reopening. Older tasks are still present.',
      aiSummary:'The report describes lost saved work, rather than a search or filter problem. Older tasks remain, which makes the save step for a newly created task worth checking first. Keep this release on hold until the original steps pass after reopening.',
      potentialCauses:['The new task may be added to the on-screen list without being written to saved session data.','A later save may overwrite the task list with an older copy. Check the order of writes before choosing a fix.']
    });
    projects[0].uat.cases[7].result={description:lostTask.actual,date:at(-1,14)};
    projects[0].uat.cases[6].result={description:'Paused the delete-and-restore checks until the saved-task loss is fixed. Do not risk confusing missing saved work with an intentional deletion.',date:at(-1,15)};
    const duplicate=report('BUG-2402',1,0,{
      title:'New callback task is missing when the planner is reopened', severity:'Critical', estimate:'30 minutes to compare reports',
      reportedBy:'Emma Thompson', reportedById:'t1',
      description:'I found the same loss while checking the dispatch handover. I saved a new callback task, closed the task form, reopened the same session and could only see the older tasks.',
      steps:'1. Add a task named Call the driver about the late collection.\n2. Save it and confirm that it appears.\n3. Refresh and reopen the same beta session.\n4. Search for the callback task.',
      expected:'The saved callback task remains in the list after reopening.', actual:'The new callback task is missing; older tasks remain.',
      duplicateOf:lostTask.id, duplicateAnalysis:{duplicateOf:lostTask.id,confidence:91,originalTitle:lostTask.title,originalStatus:'Open',method:'Mock AI similarity analysis',summary:'Both testers describe a new task disappearing after reopening while older tasks remain. Treat these as a likely shared save problem. Keep Emma’s report separate until the developer compares the exact steps; both testers should repeat their own checks after the fix.'},
      aiSummary:'This is likely a second report of BUG-2401, not a separate dispatch feature. Compare the save and reopen steps before closing either report.',
      potentialCauses:['The same saved-task write path may be involved in both reports. The matching symptoms do not prove a shared cause.']
    });
    const priorityFix=report('BUG-2403',2,6,{
      title:'Board view ignores the High priority filter', status:'Awaiting retest', severity:'Medium',
      description:'The filter works in List view, but switching to Board shows Normal priority tasks as well. Facilities staff cannot rely on the board to find the urgent repairs.',
      actual:'Board shows both High and Normal priority tasks while the High filter is selected.',
      aiSummary:'The saved priorities are correct and List filters them correctly. Compare how Board obtains its visible tasks. Liam still needs to check the submitted build; a developer fix is not a verified result.',
      potentialCauses:['Board may read the full task collection instead of the filtered collection used by List.'],
      fix:{author:'Maya Chen',authorId:'d2',buildVersion:'v2.1.1',submittedAt:at(-1,15),notes:'Board now uses the same filtered collection as List. I checked High and Normal filters and switching views. Please also clear the filter after switching back to List.',code:'const visible = filterTasks(tasks, selectedPriority);\nrenderList(visible);\nrenderBoard(visible);',tests:true,validation:{passed:3,total:3,risk:'View filtering needs retesting',notes:'Recorded developer checks: High filter, Normal filter, and switching List to Board. The assigned tester has not verified this build.'}},
      retestHistory:[]
    });
    projects[1].uat.cases[5].result={description:'Original failure reproduced on v2.1.0. Maya submitted v2.1.1; retest has not started.',date:at(-1,15)};
    const reviewedFix=report('BUG-2404',3,3,{
      title:'Editing the opening checklist creates a second task', status:'In review', severity:'Medium', estimate:'90 minutes',
      description:'Saving an edit used to append a new task instead of replacing the existing one. Emma repeated the edit on the new build and found only one task. Olivia’s approval is the remaining step.',
      actual:'On v1.0.1, the old and edited task both appeared. On v1.0.2, only the edited task appears.',
      aiSummary:'The original duplicate-after-edit problem was reproduced and then checked again on v1.0.2. The tester found one task with the correct name and priority. The manager can review the fix; customer acceptance has not started.',
      potentialCauses:['The previous edit handler appears to have used the create path. The submitted change replaces the matching task ID instead.'],
      fix:{author:'Ethan Brooks',authorId:'d1',buildVersion:'v1.0.2',submittedAt:at(-2,14),notes:'The edit form now keeps the original task ID and updates that record. Added a check that editing does not change the number of tasks.',code:'tasks = tasks.map(task => task.id === edited.id\n  ? { ...task, ...edited }\n  : task);\nsaveTasks(tasks);',tests:true,validation:{passed:3,total:3,risk:'Task editing regression checks',notes:'Recorded checks: rename, change priority, and reopen the edited task. Emma repeated all three on v1.0.2.'}},
      verifiedBy:'t1',verifiedAt:at(-1,10),retestHistory:[{status:'pass',buildVersion:'v1.0.2',date:at(-1,10),description:'Renamed the task twice and changed priority. One task remained after reopening.'}]
    });
    const resolvedFix=report('BUG-2398',4,5,{
      title:'Search stays active after the field is cleared', status:'Resolved', severity:'Low', estimate:'1 hour',
      description:'Clearing the search field did not restore all workshop tasks. Maya corrected the empty-search branch. Emma verified it in both views and Olivia approved the fix.',
      actual:'Before the fix, the list kept the previous search result after clearing the field.',
      aiSummary:'The fix has been retested and approved. Search, clearing the field and switching views passed on v1.5.1. No open findings remain for this release.', potentialCauses:[],
      fix:{author:'Maya Chen',authorId:'d2',buildVersion:'v1.5.1',submittedAt:at(-4),notes:'An empty search now returns the full saved collection. Checked mixed-case searches and clearing with the keyboard.',code:'const text = query.trim().toLowerCase();\nreturn tasks.filter(task =>\n  task.title.toLowerCase().includes(text));',tests:true,validation:{passed:3,total:3,risk:'Search and view switching checked',notes:'Recorded checks: matching search, empty search, and switching List to Board. Emma verified these before manager approval.'}},
      verifiedBy:'t1',verifiedAt:at(-3),approvedBy:'m1',resolvedAt:at(-2),retestHistory:[{status:'pass',buildVersion:'v1.5.1',date:at(-3),description:'Clearing the search restored all three sample jobs in List and Board.'}]
    });
    // Customer feedback can return an otherwise tested release to internal UAT.
    const customerTest={id:'p7-case-9',title:'Keep a long handover note after editing the task',assigneeId:'t2',status:'fail',buildVersion:'v1.4.0',
      source:'bug-retest',steps:['Create a task with a note containing three paragraphs.','Save, reopen the task and change only its priority.','Save and compare the full note with the original.'],
      testData:'Task name: Follow up the refund promised to Jamie\nNotes: Three short paragraphs covering the refund amount, the promised callback and the next shift’s contact.\nNew priority: High',
      expected:'All three paragraphs remain unchanged after editing the priority.',code:'function editTask(task, changes) {\n  return { ...task, ...changes, notes: changes.notes ?? task.notes };\n}'};
    projects[6].uat.cases.push(customerTest);
    const customerBug=report('BUG-2405',7,9,{
      title:'Editing priority cuts off the customer handover note', severity:'High', status:'In progress', estimate:'3 hours',
      source:'Customer beta',betaFeedbackId:'beta-feedback-p7',betaNoteIndex:0,reportedBy:'Customer',reportedById:undefined,
      description:'Jordan reported that a three-paragraph handover note was shortened after changing the task priority. Liam reproduced the problem on v1.4.0. Customer acceptance is paused until a new build is retested.',
      actual:'Only the first paragraph remains after saving the priority change.',
      aiSummary:'This affects an existing customer handover, not just the appearance of a long note. Liam reproduced the customer’s steps. Check whether the edit form loads the entire saved note before writing it back.',
      potentialCauses:['The edit form may initialise notes from the shortened preview text rather than the full stored value.','Saving an unrelated field may write that shortened note back over the original.']
    });
    projects[6].uat.cases[8].result={description:customerBug.actual,date:at(-1,13)};
    projects[6].uat.customerSentAt=at(-4);
    projects[6].uat.returnedFromCustomerAt=at(-1,13);
    projects[6].status='In progress';
    for(const index of [4,5]){
      const project=projects[index];project.uat.stage='customer';project.uat.customerSentAt=at(-3);
      project.betaKey='BETA-DEMO-'+String(project.number).padStart(2,'0');
      const url=new URL(location.pathname,location.href);url.searchParams.set('customer','1');url.searchParams.set('project',project.id);
      project.customerLink=url.href;
      project.customerEmail={to:index===4?'jordan.lee@delivery-desk.example':'sarah.mitchell@office-team.example',sentAt:at(-3),subject:'Please review '+project.name+' — task planner beta',
        body:`Hi ${index===4?'Jordan':'Sarah'},\n\nWe have finished our internal checks for ${project.name} ${project.version}. Please try the task planner with a few examples from your normal day, especially saving a callback and reopening it later.\n\nOpen your beta: ${url.href}\nBeta access key: ${project.betaKey}\n\nAdd any problems or suggestions in the feedback panel and send them when you finish. Please tell us whether the build is ready for your team.\n\nThanks,\nOlivia`};
      project.invitationSentAt=at(-3);project.invitationSent=true;
    }
    projects[5].status='Completed';projects[5].completedAt=at(-1);
    for(const index of [8,9]){projects[index].uat.stage='awaiting';projects[index].status='Ready for UAT';delete projects[index].uat.approvedAt;delete projects[index].uat.approvedBy;}
    projects[8].team=['m1'];projects[9].team=['m1'];
    const betaFeedback=[
      {id:'beta-feedback-p5',projectId:'p5',sessionId:'demo-customer-p5',submittedAt:at(-1,11),managerId:'m1',status:'Needs review',acceptance:'Failed',notes:[
        {id:'customer-p5-note-1',type:'Bug',title:'The due date moves back one day after I reopen the task',body:'I entered Monday as the callback date. After reopening, the task showed Sunday. We make delivery calls from this list, so we cannot use it until the date stays as entered. I saw this in Edge on Windows 11.',createdAt:at(-1,11)},
        {id:'customer-p5-note-2',type:'Suggestion',title:'Show the callback name next to the due date',body:'The task list is easy enough to use. It would help to see the person we are calling without opening every task. That can wait; the date problem is the part that stops us accepting this build.',createdAt:at(-1,11)}
      ]},
      {id:'beta-feedback-p6',projectId:'p6',sessionId:'demo-customer-p6',submittedAt:at(-1,12),managerId:'m1',status:'Ignored',acceptance:'Passed',reviewedBy:'m1',reviewedAt:at(-1,14),notes:[
        {id:'customer-p6-note-1',type:'Suggestion',title:'Ready for our Monday planning session',body:'I added six real agenda tasks, moved them between the lists and reopened the planner after lunch. Everything was still there. The current build covers what we agreed; no changes are needed before our team starts using it.',createdAt:at(-1,12)}
      ]},
      {id:'beta-feedback-p7',projectId:'p7',sessionId:'demo-customer-p7',submittedAt:at(-2,14),managerId:'m1',status:'Under treatment by Devs',acceptance:'Failed',reviewedBy:'m1',reviewedAt:at(-1,13),issueIds:[customerBug.id],notes:[
        {id:'customer-p7-note-1',type:'Bug',title:customerBug.title,body:'I wrote three paragraphs for the evening shift. Changing the priority to High left only the first paragraph. The other agent would miss the promised callback and refund details. Please fix this before we hand the planner to the whole support team.',createdAt:at(-2,14)}
      ]}
    ];
    const assignments=[];
    for(const project of projects.filter(item=>item.uat.stage!=='awaiting')){
      for(const employeeId of project.team.filter(id=>id!=='m1')){
        const person=employees.find(item=>item.id===employeeId),accepted=project.id!=='p8'||person.role==='developer';
        assignments.push({id:'demo-assignment-'+project.id+'-'+employeeId,employeeId,projectId:project.id,username:person.email,password:'Welcome26!',
          key:'PS-DEMO-'+project.number+'-'+employeeId.toUpperCase(),accepted,emailSent:true,createdAt:at(project.id==='p8'?-1:-6),...(accepted?{acceptedAt:project.id==='p8'?at(-1,16):at(-5)}:{}),
          subject:project.name+' — '+(person.role==='tester'?'acceptance checks':'release support'),
          body:`Hi ${person.name.split(' ')[0]},\n\nPlease join ${project.name} (${project.version}). ${person.role==='tester'?'Your approved scenarios are in the project. Record what actually happens, and include enough detail for the developer to repeat any failure.':'Please investigate the assigned reports and include a new build number when you submit a fix. The tester will retest it before approval.'}\n\nAssignment key: PS-DEMO-${project.number}-${employeeId.toUpperCase()}\nTarget date: ${project.deadline}\n\nThanks,\nOlivia`});
      }
    }
    const notifications=[
      {id:'demo-notice-dispatch',title:'Dispatch task loss needs a fix',body:'Project 1 · Two testers reported saved callbacks disappearing. Compare BUG-2401 and BUG-2402 before splitting the work.',employeeId:'d1',role:'developer',projectId:'p1',page:'issues',type:'warning',read:false,time:'20 min ago',createdAt:at(0,9)},
      {id:'demo-notice-retest',title:'The board filter fix is ready to retest',body:'Project 2 · Maya submitted v2.1.1. Check the High filter in Board, switch views and clear it again.',employeeId:'t2',role:'tester',projectId:'p2',page:'dashboard',type:'check',read:false,time:'35 min ago',createdAt:at(0,9)},
      {id:'demo-notice-approval',title:'Emma verified the checklist edit fix',body:'Project 3 · Build v1.0.2 passed the original edit steps. Review BUG-2404 to finish internal UAT.',employeeId:'m1',role:'manager',projectId:'p3',page:'issues',type:'check',read:false,time:'50 min ago',createdAt:at(0,8)},
      {id:'demo-notice-ready',title:'The workshop planner has finished UAT',body:'Project 4 · All eight scenarios passed and the search fix is approved. The customer invitation is the next step.',employeeId:'m1',role:'manager',projectId:'p4',page:'dashboard',type:'check',read:false,time:'1 hour ago',createdAt:at(0,8)},
      {id:'demo-notice-customer',title:'Jordan could not accept the delivery planner',body:'Project 5 · A saved due date moves back one day. Review the customer notes and assign the date problem for investigation.',employeeId:'m1',role:'manager',projectId:'p5',page:'feedback',type:'message-square',read:false,time:'2 hours ago',createdAt:at(0,8)},
      {id:'demo-notice-handover',title:'Customer handover note loses text',body:'Project 7 · Liam reproduced the customer report. BUG-2405 is assigned to you; acceptance is paused.',employeeId:'d1',role:'developer',projectId:'p7',page:'issues',type:'warning',read:false,time:'Yesterday',createdAt:at(-1,13)},
      ...['t1','t2'].map(employeeId=>({id:'demo-notice-invite-'+employeeId,title:'Training planner is ready for your checks',body:'Project 8 · Accept the assignment to start your four approved scenarios.',employeeId,role:'tester',projectId:'p8',page:'dashboard',type:'message-square',read:false,time:'Yesterday',createdAt:at(-1,15)}))
    ];
    for(const notice of notifications){
      const minutes=notice.time==='20 min ago'?20:notice.time==='35 min ago'?35:notice.time==='50 min ago'?50:notice.time==='1 hour ago'?60:notice.time==='2 hours ago'?120:null;
      if(minutes!==null)notice.createdAt=new Date(loadedAt.getTime()-minutes*60000).toISOString();
    }
    // Portfolio fields use completed test and bug-approval milestones, never invented percentages.
    for(const project of projects){
      const approved=project.uat.cases.filter(test=>test.status!=='draft');
      const projectIssues=issues.filter(item=>item.projectId===project.id);
      const passed=approved.filter(test=>test.status==='pass').length;
      const resolved=projectIssues.filter(item=>item.status==='Resolved').length;
      const total=approved.length+projectIssues.length;
      project.progress=project.readiness=total?Math.round((passed+resolved)/total*100):0;
      project.bugs=projectIssues.filter(item=>item.status!=='Resolved').length;
      project.critical=projectIssues.filter(item=>item.status!=='Resolved'&&item.severity==='Critical').length;
      if(project.uat.stage==='testing'&&project.progress===100)project.status='Ready for review';
    }
    return {cleanWorkspace:true,dataRevision:'empty-1',demoMode:true,demoLoadedAt:loadedAt.toISOString(),
      employees,projects,issues,assignments,notifications,betaFeedback,feedback:[],messages:[],requests:[],
      accepted:Object.fromEntries(assignments.filter(item=>item.accepted).map(item=>[item.id,true]))};
  };
})();
