const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');

const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script[^>]*src=[^>]*><\/script>/g,'');
const w=new JSDOM(html,{runScripts:'outside-only',url:'https://example.test'}).window;
const d=w.document;
const NativeDate=w.Date;
w.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[2026,10,25,12]));}};
w.matchMedia=()=>({matches:false});
w.scrollTo=()=>{};
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
w.eval(fs.readFileSync(path.join(root,'script.js'),'utf8'));
w.calendarCloud={save(){}};
const find=selector=>{const element=d.querySelector(selector);assert(element,selector);return element;};
const click=selector=>find(selector).click();
const page=name=>click('#mainNavigation [data-page='+name+']');
const state=()=>w.calendarApp.export().interface;
const date='2026-11-25';
const seed={...w.calendarApp.defaults(),categories:[{id:'sport',name:'Sport'}],activities:[
  {id:'run',name:'Course',categoryId:'sport',color:'#a83bd1',goals:[{id:'run-week',period:'week',mode:'min',target:2,startDate:'2025-01-01'}]},
  {id:'bike',name:'Vélo',categoryId:'sport',color:'#04608e'}
],entries:{[date]:['run','bike']},interface:{shareWorkspaceFilters:false,birthDate:'2000-01-01'}};
w.calendarApp.load(seed);
w.calendarApp.start();
assert.deepEqual([...d.querySelectorAll('#mainNavigation button')].map(button=>button.dataset.page),['dashboard','activities','goals','statistics']);
assert.deepEqual([...d.querySelectorAll('[data-navigation-tab]')].map(input=>input.dataset.navigationTab),['dashboard','activities','goals','statistics']);
assert.equal(state().page,'dashboard');

page('activities');
click('[data-activity-format=cards]');
click('#activityRecords .activity-record');
assert.equal(state().page,'activities');
assert.equal(state().activityFormat,'calendar');
assert.equal(state().calendarView,'year');
assert.equal(w.calendarApp.export().selectedActivities[0],'run');
assert(!find('#activityCalendarMount #activityCalendarPanel').hidden);
assert(find('#calendarView').hidden);
click('[data-calendar-view=life]');
assert(!find('#activityCalendarMount #lifeCalendarPanel').hidden);
assert.equal(d.querySelectorAll('#lifeCalendarGrid [data-life-year]').length,100);
click('#lifeCalendarGrid .life-calendar-week[data-date="2026-11-23"]');
assert.equal(state().calendarView,'week');

page('goals');
assert.equal(d.querySelectorAll('#objectivesView .workspace-quick-choices .multi-select').length,2);
click('#globalGoalCards .goal-card');
assert.equal(state().page,'goals');
assert.equal(state().goalFormat,'calendar');
assert.equal(state().goalDatePeriod,'year');
assert.match(find('#goalCalendarMount .calendar-goal-focus h2').textContent,/Course/);
assert.equal(find('#goalCalendarMount .goal-period-summary').dataset.period,'week');
click('#goalCalendarMount .calendar-goal-focus button');
assert.equal(d.querySelector('#goalCalendarMount .calendar-goal-focus'),null);
click('[data-goal-view=life]');
assert(!find('#goalCalendarMount #lifeCalendarPanel').hidden);
click('[data-goal-format=graph]');
assert.equal(state().goalDatePeriod,'year');

const legacy={...seed,interface:{...seed.interface,page:'calendar',calendarScope:'goals',
  calendar:{date:'2026-05-10',period:'month',dayFormats:{goals:'list'},status:'missed',frequencies:['week']},
  dashboardPins:[{kind:'shortcut',id:'saved',page:'calendar',scope:'goals',date:'2026-01-12',period:'week',format:'list',
    filter:{status:'missed',frequencies:['week']}}]
}};
w.calendarApp.load(legacy);
assert.equal(state().page,'goals');
assert.equal(state().goalReference,'2026-05-10');
assert.equal(state().goalDatePeriod,'month');
assert.equal(state().goalStatusFilter,'all');
assert.deepEqual(Array.from(state().goalFrequencyFilter),['week']);
const saved=state().dashboardPins[0];
assert.equal(saved.page,'goals');
assert.equal(saved.format,'calendar');
assert.equal(saved.dayFormat,'list');
assert.equal(saved.filter.status,'all');
page('dashboard');
click('#dashboardContent .dashboard-shortcut-open');
assert.equal(state().page,'goals');
assert.equal(state().goalDatePeriod,'week');
assert.equal(state().calendar.dayFormats.goals,'list');
w.close();
