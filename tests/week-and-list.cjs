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
 interface:{page:'goals',goalFormat:'calendar',goalReference:'2025-10-13',historyView:'week',calendarView:'week',focusDate:'2025-10-13'}
};
const find=s=>{const n=d.querySelector(s);assert(n,'Missing '+s);return n};
w.calendarApp.load(state);

// All four goal frequencies appear in each of the seven day columns.
assert.equal(d.querySelectorAll('#goalHistory .calendar-week-slot').length,7);
assert.equal(d.querySelectorAll('#goalHistory .calendar-week-slot>.week-heading').length,7);
assert.equal(d.querySelectorAll('#goalHistory .calendar-week-slot>.week-day').length,7);
assert.equal(d.querySelectorAll('#goalHistory .week-goal-item').length,28);
assert.deepEqual([...d.querySelectorAll('#goalHistory .calendar-week-slot:first-child .week-goal-item')].map(n=>n.dataset.goalId),['daily','weekly','monthly','yearly']);
assert(find('#goalHistory .week-goal-item[data-goal-id=weekly]').textContent.includes('Hebdomadaire'));
assert(find('#goalHistory .week-goal-item[data-goal-id=monthly]').textContent.includes('Mensuel'));
assert(find('#goalHistory .week-goal-item[data-goal-id=yearly]').textContent.includes('Annuel'));

// Activity week shares the same heading-outside-panel structure.
find('[data-calendar-scope=activities]').click();
assert.equal(d.querySelectorAll('#calendar .calendar-week-slot>.week-heading').length,7);
assert.equal(d.querySelectorAll('#calendar .calendar-week-slot>.week-day').length,7);
assert(find('#calendar .week-activity').textContent.includes('Running'));

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

// User profile preference takes priority over the system only while signed in.
w.calendarApp.setAccount({uid:'demo',displayName:'Demo'});
const selected=w.calendarApp.export();selected.theme='dark';
w.calendarApp.load(selected);
assert.equal(find('#authGate').dataset.theme,'dark');
d.querySelector('[name=appTheme][value=light]').click();
assert.equal(find('#authGate').dataset.theme,'light');
w.calendarApp.setAccount(null);
assert.equal(find('#authGate').dataset.theme,'system');
const css=fs.readFileSync(path.join(__dirname,'..','style.css'),'utf8');
assert(css.includes('.auth-gate[data-theme=light]'));
assert(css.includes('.auth-gate[data-theme=dark]'));
assert(css.includes('.auth-gate[data-theme=system]'));
w.close();
console.log('PASS: week headings, all goal frequencies, editable list rows, and signed-in theme preference.');
