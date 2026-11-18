const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<script[^>]*src=[^>]*><\/script>/g,'');
const w=new JSDOM(html,{url:'https://example.test',runScripts:'outside-only'}).window,d=w.document;
w.scrollTo=()=>{};w.matchMedia=()=>({matches:false});
w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
w.eval(fs.readFileSync(path.join(__dirname,'..','script.js'),'utf8'));
w.calendarCloud={save(){}};
const goal=(id,period,target=1)=>({id,mode:'min',target,unit:'count',display:'bar',period});
const state={
 schemaVersion:9,paletteVersion:3,year:2025,
 categories:[{id:'sport',name:'Sport'}],
 activities:[{id:'run',name:'Running',categoryId:'sport',color:'#aa33ff',goals:[
 goal('daily','day'),goal('weekly','week'),goal('monthly','month'),goal('yearly','year')]}],
 entries:{'2025-10-13':['run']},details:{'2025-10-13':{run:{count:2,note:'Morning run'}}},
 activeCategory:'sport',selections:{sport:['run']},selectedActivities:['run'],
 interface:{navigationTabs:{activities:true,goals:true},page:'goals',goalFormat:'calendar',goalReference:'2025-10-13',historyView:'week',calendarView:'week',focusDate:'2025-10-13'}
};
const find=s=>{const n=d.querySelector(s);assert(n,'Missing '+s);return n};
w.calendarApp.load(state);

// Daily goals are listed under each date, with longer periods summarized once.
assert.equal(d.querySelectorAll('#goalHistory .calendar-week-slot>.week-heading').length,7);
assert.equal(d.querySelectorAll('#goalHistory .calendar-week-slot>.week-day').length,7);
assert.equal(d.querySelectorAll('#goalHistory .week-goal-item').length,10);
assert.equal(d.querySelectorAll('#goalHistory .goal-week-day-progress').length,7);
assert(find('#goalHistory .goal-week-day-progress .goal-period-track [data-tone]'));
assert.equal(find('#goalHistory .goal-period-summary[data-period=week] .goal-period-track').children.length,1);
assert(find('#goalHistory .goal-period-summary[data-period=week]').textContent.includes('Semaine'));
assert.deepEqual([...d.querySelectorAll('#goalHistory .calendar-week-slot:first-child .week-goal-item')].map(n=>n.dataset.goalId),['daily']);
for(const [period,id] of [['week','weekly'],['month','monthly'],['year','yearly']]){
  assert(find('#goalHistory [data-calendar-goal-period='+period+'] [data-goal-id='+id+']'));
}
assert.equal(d.querySelector('#goalHistory .week-heading[data-preview-date]'),null);
find('#goalHistory button.week-goal-item[data-goal-id=weekly]').click();
assert(find('#goalEditorDialog').open);
assert(find('#goalEditorFields [data-goal-id=weekly]'));
find('#cancelGoalEditor').click();
find('[data-goal-view=month]').click();
assert.equal(d.querySelectorAll('#goalHistory .month-cell').length,31);
assert.equal(d.querySelectorAll('#goalHistory .goal-period-summary[data-period=week]').length,5);
assert.equal(find('#goalHistory .goal-period-summary[data-period=month]').dataset.tone,'exceeded');
assert.equal(find('#goalHistory .goal-period-summary[data-period=month] strong').textContent,'Octobre 2025');
assert.equal(find('#goalHistory .goal-period-summary[data-period=week]:nth-last-child(1)').dataset.tone,'danger');
find('#goalHistory .month-cell[data-date="2025-10-13"]').click();
assert.deepEqual([...d.querySelectorAll('#goalHistory .goal-card')].map(n=>n.dataset.goalId),['daily','weekly','monthly','yearly']);
const summaries=()=>[...d.querySelectorAll('#goalHistory .calendar-goal-progress')];
assert.deepEqual(summaries().map(item=>item.closest('section').dataset.calendarGoalPeriod),['day','week','month','year']);
assert(summaries().every(item=>item.previousElementSibling.matches('h3') && item.querySelector('.day-total-progress').getAttribute('aria-valuenow')==='1'));
find('#calendarToolbarMount .multi-select:nth-child(3) .multi-select-trigger').click();
find('#calendarToolbarMount .multi-select:nth-child(3) [data-choice=week]').click();
assert.deepEqual([...d.querySelectorAll('#goalHistory .goal-card')].map(n=>n.dataset.goalId),['weekly']);
assert.equal(w.calendarApp.export().interface.sharedFilters.frequencies.join(','),'week');
assert.deepEqual(summaries().map(item=>item.closest('section').dataset.calendarGoalPeriod),['week']);
find('#workspaceFilterReset').click();
assert.equal(d.querySelectorAll('#goalHistory .goal-card').length,4);
const dayFormat=(panel,format)=>find('#calendarToolbarMount [data-calendar-day-format='+format+']');
dayFormat('#goalHistory','list').click();
assert.equal(summaries().length,4);
assert.deepEqual([...d.querySelectorAll('#goalHistory tbody tr')].map(n=>n.dataset.goalId),['daily','weekly','monthly','yearly']);
assert.equal(find('#goalHistory [data-goal-id=daily] .list-progress-value').textContent,'2 / 1');
find('#goalHistory [data-goal-id=daily] .list-action').click();
assert(find('#goalEditorDialog').open);
find('#cancelGoalEditor').click();
find('[data-goal-view=week]').click();
assert(find('#calendarDayFormats').hidden);

// Activity week shares the same heading-outside-panel structure.
find('[data-calendar-scope=activities]').click();
assert.equal(d.querySelectorAll('#calendar .calendar-week-slot>.week-heading').length,7);
assert.equal(d.querySelectorAll('#calendar .calendar-week-slot>.week-day').length,7);
assert(find('#calendar .week-activity').textContent.includes('Running'));
assert.equal(d.querySelector('#calendar .week-day .text-button'),null);
find('#calendar .week-heading').click();
assert(find('#calendarDayDialog').open);
assert.equal(find('#calendar').dataset.view,'week');
find('#doneCalendarDayDialog').click();
assert.equal(d.querySelectorAll('#calendar .week-day-add').length,7);
assert(!find('#calendar').textContent.includes('Aucune activité'));
find('#calendar .week-day-add').click();
assert.equal(find('#dailyActivityDate').value,'2025-10-13');
find('#cancelDailyActivity').click();
find('#calendar .week-day').click();
assert(find('#dailyActivityDialog').open);
find('#cancelDailyActivity').click();
find('#calendar .week-activity').click();
assert(find('#dayPicker').open && !find('#dailyActivityDialog').open);
find('#cancelDayPicker').click();
find('[data-calendar-view=day]').click();
const calendarActivity=find('#calendar .list-table tbody tr');
calendarActivity.querySelector('th').click();
assert.equal(find('#dayPickerTitle').textContent,'Modifier l’activité');
find('#cancelDayPicker').click();
assert.equal(d.querySelector('#calendar .calendar-day > .text-button'),null);
dayFormat('#calendar','cards').click();
find('#calendar .calendar-day-activity-cards .activity-record').click();
assert(find('#dayPicker').open);
find('#cancelDayPicker').click();
assert.equal(w.calendarApp.exportForStorage().interface.calendar.dayFormats.activities,'cards');
find('[data-calendar-scope=goals]').click();
assert.equal(dayFormat('#goalHistory','list').getAttribute('aria-pressed'),'true');

// A row opens its editor, including clicks on plain text and keyboard activation.
find('.page-nav [data-page=activities]').click();
find('[data-activity-format=list]').click();
const activityRow=find('#activityRecords tbody tr.editable-list-row');
activityRow.querySelector('time').click();
assert(find('#dayPicker').open,'A click on the activity date opens editing');
find('#cancelDayPicker').click();
assert(!find('#dayPicker').open);
activityRow.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
assert(find('#dayPicker').open,'Keyboard Enter opens editing');
find('#cancelDayPicker').click();
activityRow.querySelector('.list-action').click();
assert(find('#dayPicker').open,'The existing pencil still works');
find('#cancelDayPicker').click();

// The objective row opens its editor without swallowing nested action buttons.
d.querySelector('.page-nav [data-page=goals]').click();
d.querySelector('[data-goal-format=list]').click();
const goalRow=find('#globalGoalCards tr.editable-list-row');
goalRow.querySelector('th').click();
assert(find('#goalEditorDialog').open,'Clicking the objective label opens its editor');
find('#cancelGoalEditor').click();
goalRow.dispatchEvent(new w.KeyboardEvent('keydown',{key:' ',bubbles:true}));
assert(find('#goalEditorDialog').open,'Space opens objective editing');
find('#cancelGoalEditor').click();
goalRow.querySelector('.list-action').click();
assert(find('#goalEditorDialog').open,'The pencil action remains independent');
find('#cancelGoalEditor').click();

// Appearance choices apply to the workspace and survive a storage round trip.
const app=find('#app');
assert.equal(app.dataset.goalTileStyle,'top');
assert.equal(app.dataset.goalCalendarStyle,'fill');
find('[name=goalAppearance-tile][value=right]').click();
find('[name=goalAppearance-calendar][value=number]').click();
assert.equal(app.dataset.goalTileStyle,'right');
assert.equal(app.dataset.goalCalendarStyle,'number');
w.calendarApp.load(w.calendarApp.exportForStorage());
assert.equal(app.dataset.goalTileStyle,'right');
assert.equal(app.dataset.goalCalendarStyle,'number');
assert(find('[name=goalAppearance-tile][value=right]').checked);
assert(find('[name=goalAppearance-calendar][value=number]').checked);

// User profile preference takes priority over the system only while signed in.
w.calendarApp.setAccount({uid:'demo',displayName:'Demo'});
const selected=w.calendarApp.export();selected.theme='dark';
w.calendarApp.load(selected);
assert.equal(find('#authGate').dataset.theme,'dark');
d.querySelector('[name=profileTheme][value=light]').click();
assert.equal(find('#authGate').dataset.theme,'light');
w.calendarApp.setAccount(null);
assert.equal(find('#authGate').dataset.theme,'system');
const mixed=JSON.parse(JSON.stringify(state));
mixed.activities[0].goals.push(goal('weekly-missed','week',10),goal('monthly-missed','month',10));
w.calendarApp.load(mixed);
for(const [view,period] of [['week','week'],['month','month']]){
  find('[data-goal-view='+view+']').click();
  const segments=find('#goalHistory .goal-period-summary[data-period='+period+'] .goal-period-track').children;
  assert.deepEqual([...segments].map(segment=>segment.dataset.tone),['danger','exceeded']);
}
const css=fs.readFileSync(path.join(__dirname,'..','style.css'),'utf8');
assert(css.includes('.auth-gate[data-theme=light]'));
assert(css.includes('.auth-gate[data-theme=dark]'));
assert(css.includes('.auth-gate[data-theme=system]'));
w.close();
console.log('PASS: week headings, all goal frequencies, editable list rows, and signed-in theme preference.');
