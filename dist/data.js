window.DEMO_DATA = {
 employees:[
  {id:'owner',name:'Alexander Morgan',role:'owner',title:'Workspace owner',email:'alexander.morgan@pfizer.demo',avatar:2,available:true,load:42},
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
  {id:'p1',name:'Patient Connect',description:'A connected patient support experience.',version:'v2.4.0',readiness:86,progress:86,bugs:8,critical:2,deadline:'2026-11-06',status:'In progress',team:['m1','d1','d2','t1'],color:'#2563eb',abbr:'PC',category:'Patient experience'},
  {id:'p2',name:'Clinical Insights',description:'Study data, clearly connected.',version:'v1.8.2',readiness:68,progress:68,bugs:14,critical:3,deadline:'2026-11-08',status:'At risk',team:['m2','d2','d3','t2'],color:'#8b5cf6',abbr:'CI',category:'Clinical operations'},
  {id:'p3',name:'Supply Bridge',description:'Visibility across the supply journey.',version:'v3.1.0',readiness:94,progress:94,bugs:3,critical:0,deadline:'2026-11-10',status:'Ready for review',team:['m1','d3','t1','t3'],color:'#0c9a7b',abbr:'SB',category:'Supply operations'},
  {id:'p4',name:'Research Hub',description:'One home for collaborative research.',version:'v2.0.0',readiness:76,progress:76,bugs:6,critical:1,deadline:'2026-11-12',status:'In progress',team:['m2','d1','d4','t2'],color:'#e79836',abbr:'RH',category:'Research tools'},
  {id:'p5',name:'Care Navigator',description:'Making support easier to discover.',version:'v1.3.0',readiness:91,progress:91,bugs:2,critical:0,deadline:'2026-11-14',status:'Ready for review',team:['m1','d4','t3'],color:'#db6895',abbr:'CN',category:'Patient experience'},
  {id:'p6',name:'Partner Portal',description:'A better way to work together.',version:'v4.2.0',readiness:58,progress:58,bugs:11,critical:1,deadline:'2026-11-16',status:'In progress',team:['m2','d2','t2'],color:'#527387',abbr:'PP',category:'Enterprise platform'},
  {id:'p7',name:'Trial Tracker',description:'Released successfully on October 28.',version:'v1.6.0',readiness:100,progress:100,bugs:0,critical:0,deadline:'2026-10-28',status:'Completed',team:['m1','d1','t1'],color:'#64748b',abbr:'TT'},
  {id:'p8',name:'Resource Library',description:'Released successfully on October 21.',version:'v2.3.1',readiness:100,progress:100,bugs:0,critical:0,deadline:'2026-10-21',status:'Completed',team:['m2','d2','t2'],color:'#64748b',abbr:'RL'},
  {id:'p9',name:'Team Workspace',description:'Released successfully on October 15.',version:'v1.2.0',readiness:100,progress:100,bugs:0,critical:0,deadline:'2026-10-15',status:'Completed',team:['m1','d3','t3'],color:'#64748b',abbr:'TW'}
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
  {id:'n1',title:'Patient Connect needs your attention',body:'Two critical findings need review before Friday’s shipment.',time:'5 min ago',read:false,type:'warning',page:'issues'},
  {id:'n2',title:'A fix is ready for approval',body:'Isabella submitted the search filter fix for Research Hub.',time:'24 min ago',read:false,type:'check',page:'issues'},
  {id:'n3',title:'Customer feedback has arrived',body:'Sarah Mitchell shared feedback on Patient Connect.',time:'38 min ago',read:false,type:'message-square',page:'feedback'},
  {id:'n4',title:'Supply Bridge passed regression',body:'All 48 automated test cases passed.',time:'1 hour ago',read:true,type:'check',page:'projects'}
 ],assignments:[],accepted:{}
};
