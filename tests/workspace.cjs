const fs=require('fs'),assert=require('node:assert/strict');const {JSDOM}=require('jsdom');
const html=fs.readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8').replace(/<script[^>]*src=[^>]*><\/script>/g,'');
function setup(mobile=false){const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.test'}),w=dom.window;const NativeDate=w.Date;w.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:["2026-10-13T10:00:00Z"]));}static now(){return NativeDate.parse("2026-10-13T10:00:00Z");}};w.scrollTo=()=>{};w.matchMedia=()=>({matches:mobile});w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};w.eval(fs.readFileSync(require('node:path').join(__dirname,'..','script.js'),'utf8'));w.calendarCloud={save(data){w.saved=data;w.document.getElementById('syncStatus').textContent='Enregistré'}};return w;}
const seed={schemaVersion:7,paletteVersion:3,year:2026,categories:[{id:'s',name:'Sport',goal:{mode:'min',target:1,period:'day'}},{id:'m',name:'Monitoring'}],activities:[{id:'a',name:'Running',categoryId:'s',color:'#9769d5',goal:{mode:'min',target:3,period:'week'}},{id:'b',name:'Musculation',categoryId:'s',color:'#ed9b44'},{id:'x',name:'Deliveroo',categoryId:'m',color:'#35b9a5',goal:{mode:'max',target:2,period:'month'}}],entries:{'2026-10-13':['a','x'],'2025-12-02':['x']},details:{'2026-10-13':{a:{count:1,distance:10,note:'Initial note'},x:{count:1,distance:null,note:'Delivery'}}},activeCategory:'s',selections:{s:['a'],m:['x']},selectedActivities:['a'],theme:'system'};
const w=setup(),d=w.document,click=s=>{const e=d.querySelector(s);if(!e){console.log('MISSING',s,d.querySelector('#categoryEditorRows').innerHTML.slice(0,1500));throw Error(s)}e.click()},input=(s,value,event='input')=>{const el=d.querySelector(s);assert(el,s);el.value=value;el.dispatchEvent(new w.Event(event,{bubbles:true}));},out=()=>JSON.parse(JSON.stringify(w.calendarApp.export()));
w.calendarApp.load(seed);assert.equal(d.querySelector('#dailyView').hidden,false);click('.page-nav [data-page="calendar"]');assert.equal(d.querySelector('#calendar').dataset.view,'year');assert.equal(d.querySelector('#todayFold'),null);assert.equal(d.querySelector('#goalsFold'),null);assert.equal(d.querySelector('.studio-intro'),null);assert.equal(d.querySelector('#quickMode'),null);
// The mobile navigation and account menus are mutually exclusive and dismissible.
click('#mobileNavToggle');assert.equal(d.querySelector('#mobileNavToggle').getAttribute('aria-expanded'),'true');
click('#accountToggle');assert.equal(d.querySelector('#mobileNavToggle').getAttribute('aria-expanded'),'false');
click('#mobileNavToggle');assert.equal(d.querySelector('#accountMenu').hidden,true);
d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(d.querySelector('#mobileNavToggle').getAttribute('aria-expanded'),'false');
click('#mobileNavToggle');click('#mainNavigation [data-page="calendar"]');assert.equal(d.querySelector('#mainNavigation').hasAttribute('data-open'),false);
// Single-activity direct toggles preserve other categories and remove annotations.
click('[aria-label="13 Octobre 2026"]');assert.equal(d.querySelector('#dayPicker').open,false);assert.deepEqual(out().entries['2026-10-13'],['x']);assert.equal(out().details['2026-10-13'].a,undefined);click('[aria-label="13 Octobre 2026"]');assert(out().entries['2026-10-13'].includes('a'));assert.equal(seed.details['2026-10-13'].a.note,'Initial note');
// Multiple selection opens a compact auto-save editor.
click('#toolbar .activity-choice:nth-of-type(3)');click('[aria-label="13 Octobre 2026"]');assert(d.querySelector('#dayPicker').open);assert.equal(d.querySelector('#saveDayPicker'),null);input('[aria-label="Nombre de séances · Running"]','2');input('[aria-label="Distance en kilomètres · Running"]','12');input('[aria-label="Note · Running"]','Immediately saved');assert.equal(out().details['2026-10-13'].a.note,'Immediately saved');assert.equal(out().details['2026-10-13'].a.count,2);click('#closeDayPicker');assert.equal(out().details['2026-10-13'].a.distance,12);
// Invalid numeric input never replaces valid data.
click('[aria-label="13 Octobre 2026"]');input('[aria-label="Nombre de séances · Running"]','-1');assert.equal(out().details['2026-10-13'].a.count,2);assert(d.querySelector('#dayPicker [data-save-status]').dataset.invalid);input('[aria-label="Nombre de séances · Running"]','0');assert.equal(out().details['2026-10-13'].a,undefined);assert.deepEqual(out().entries['2026-10-13'],['x']);click('#closeDayPicker');
// Global journal includes another category and another year. Editing preserves filters.
click('#accountToggle');assert.equal(d.querySelector('#accountToggle').getAttribute('aria-expanded'),'true');click('#openJournal');assert.equal(d.querySelector('#journalView').hidden,false);assert.equal(d.querySelector('#profileView').hidden,true);assert.equal(d.querySelector('#accountMenu').hidden,true);assert(d.querySelector('#journalRows').textContent.includes('Deliveroo'));assert(d.querySelector('#journalRows').textContent.includes('2025'));const filterBefore=out().selectedActivities;click('[aria-label="Modifier Deliveroo du 13 oct. 2026"]');input('[aria-label="Note · Deliveroo"]','Edited from journal');click('#closeDayPicker');assert.deepEqual(out().selectedActivities,filterBefore);assert.equal(out().details['2026-10-13'].x.note,'Edited from journal');
input('#journalSearch','Edited');assert.equal(d.querySelectorAll('#journalRows .journal-row').length,1);input('#journalSearch','');
click('.page-nav [data-page="goals"]');[...d.querySelectorAll('#historyViews button')].find(button=>button.textContent==='Mois').click();assert(d.querySelector('#globalGoalCards').textContent.includes('Deliveroo'));[...d.querySelectorAll('#historyViews button')].find(button=>button.textContent==='Jour').click();assert(d.querySelector('#globalGoalCards').textContent.includes('Sport'));
// Ma journée writes the displayed date, including repeated occurrences.
click('.page-nav [data-page="day"]');input('#agendaDate','2026-10-14','change');
const categoryPlus='#agendaContent [aria-label="Ajouter une occurrence de Sport · objectif legacy-s"]';
const categoryMinus='#agendaContent [aria-label="Retirer une occurrence de Sport · objectif legacy-s"]';
click(categoryPlus);assert(d.querySelector('#dailyActivityDialog').open);
assert.equal(d.querySelector('#dailyActivityCategory').value,'s');
assert.deepEqual([...d.querySelector('#dailyActivityChoice').options].map(option=>option.value),['','a','b']);
click('#cancelDailyActivity');assert.equal(d.querySelector(categoryMinus).disabled,true);
click(categoryPlus);input('#dailyActivityChoice','a','change');click('#saveDailyActivity');
assert.deepEqual(out().entries['2026-10-14'],['a']);
assert.equal(d.querySelector(categoryMinus).disabled,false);
click('#agendaContent [aria-label="Ajouter une occurrence de Sport · objectif legacy-s"]');
input('#dailyActivityChoice','a','change');input('#dailyActivityDistance','2');click('#saveDailyActivity');
assert.equal(out().details['2026-10-14'].a.count,2);
click('#agendaContent [aria-label="Retirer une occurrence de Sport · objectif legacy-s"]');
assert.deepEqual([...d.querySelector('#dailyActivityChoice').options].map(option=>option.value),['','a']);
input('#dailyActivityDistance','1');click('#saveDailyActivity');
assert.equal(out().details['2026-10-14'].a.count,1);assert.equal(out().details['2026-10-14'].a.distance,1);
click(categoryMinus);assert.equal(d.querySelector('#dailyActivityTitle').textContent,'Retirer une activité');click('#saveDailyActivity');
assert.equal(out().entries['2026-10-14'],undefined);assert.equal(d.querySelector(categoryMinus).disabled,true);
assert.equal(d.querySelector('[data-agenda-view]'),null);assert.equal(d.querySelectorAll('#agendaDate').length,1);
// Quick logging writes only on submit, adds to existing totals and keeps unrelated activities.
input('#agendaDate','2026-10-15','change');click('#openDailyActivity');
assert.equal(d.querySelector('#dailyActivityDate').value,'2026-10-15');
assert.equal(d.querySelector('#saveDailyActivity').disabled,false);click('#saveDailyActivity');assert(d.querySelector('#dailyActivityDialog').open);assert.equal(out().entries['2026-10-15'],undefined);
input('#dailyActivityCategory','m','change');
assert.deepEqual([...d.querySelector('#dailyActivityChoice').options].map(option=>option.value),['','x']);
click('#saveDailyActivity');assert.deepEqual(out().entries['2026-10-15'],['x']);assert.equal(d.querySelector('#dailyActivityDialog').open,false);
click('#openDailyActivity');input('#dailyActivityChoice','a','change');input('#dailyActivityDistance','5');input('#dailyActivityNote','First run');click('#cancelDailyActivity');
assert.deepEqual(out().entries['2026-10-15'],['x']);
click('#openDailyActivity');input('#dailyActivityChoice','a','change');input('#dailyActivityDistance','5');input('#dailyActivityDuration','30');input('#dailyActivityNote','First run');click('#saveDailyActivity');
assert.deepEqual(out().details['2026-10-15'].a,{count:1,distance:5,note:'First run',durationMinutes:30});
assert.equal(d.querySelector('.daily-focus-summary>strong').textContent,'1 / 1');
click('#openDailyActivity');input('#dailyActivityChoice','a','change');assert.equal(d.querySelector('#dailyActivityExisting').hidden,false);
input('#dailyActivityCount','1000');click('#saveDailyActivity');assert.equal(d.querySelector('#dailyActivityError').hidden,false);
input('#dailyActivityCount','1');input('#dailyActivityDuration','25');input('#dailyActivityNote','Second run');click('#saveDailyActivity');
assert.deepEqual(out().details['2026-10-15'].a,{count:2,distance:5,note:'First run\nSecond run',durationMinutes:55});
assert.deepEqual(out().entries['2026-10-15'],['x','a']);
assert.equal(w.saved.details['2026-10-15'].a.durationMinutes,55);
// Changing the modal date records the new day without moving the agenda.
click('#openDailyActivity');input('#dailyActivityChoice','a','change');click('#activityDateNext');
assert.equal(d.querySelector('#dailyActivityDate').value,'2026-10-16');
assert.equal(d.querySelector('#dailyActivityChoice').value,'a');click('#saveDailyActivity');
assert.equal(d.querySelector('#agendaDate').value,'2026-10-15');
assert.deepEqual(out().entries['2026-10-16'],['a']);
// Week calendar shows all categories. Month navigation respects leap years.
click('.page-nav [data-page="calendar"]');click('[data-calendar-view="week"]');assert(!d.querySelector('#calendar').textContent.includes('Deliveroo'));assert.equal(d.querySelector('#toolbar').hidden,false);click('[data-category-drop="m"]');assert(d.querySelector('#calendar').textContent.includes('Deliveroo'));click('[data-category-drop="s"]');click('[data-calendar-view="day"]');assert(d.querySelector('#calendar .calendar-day'));assert.equal(d.querySelector('#calendar .checklist'),null);click('[data-calendar-view="month"]');w.calendarApp.load({...out(),year:2024,interface:{...out().interface,focusDate:'2024-03-31',calendarView:'month',page:'calendar'}});click('#previousPeriod');assert(d.querySelector('#periodLabel').textContent.includes('Février 2024'));assert.equal(d.querySelectorAll('#calendar .month-cell:not(.empty)').length,29);
// Managers commit valid edits automatically, including nested goals and emojis.
click('#openTrackingSettings');click('#manageActivities');input('#activityRows .name-field input','Jogging');assert.equal(out().activities[0].name,'Jogging');click('#activityRows .goal-editor button');input('[aria-label="Quantité visée · Jogging"]','4');assert.equal(out().activities[0].goals[0].target,3);click('#saveGoalEditor');click('#activityRows .goal-editor button');input('[aria-label="Quantité visée · Jogging"]','0');assert.equal(out().activities[0].goals[0].target,4);d.querySelector('#goalEditorDialog').dispatchEvent(new w.Event('cancel',{cancelable:true}));assert(d.querySelector('#discardGoalDialog').open);click('#keepGoalEditing');assert(d.querySelector('#goalEditorDialog').open);click('#closeGoalEditor');click('#discardGoalEdits');assert.equal(out().activities[0].goals[0].target,4);click('#closeTrackingSettings');
click('#openTrackingSettings');click('#manageCategories');click('[aria-label="Emoji de Sport"]');[...d.querySelectorAll('.emoji-grid button')].find(b=>b.getAttribute('aria-label')==='Choisir 🏃 pour Sport').click();assert.equal(out().categories[0].emoji,'🏃');assert(d.querySelector('#categoryBar').textContent.includes('🏃'));input('[aria-label="Nom de Sport"]','Sport quotidien');assert.equal(out().categories[0].name,'Sport quotidien');click('#closeTrackingSettings');
// Theme tiles are native radios and persist account preferences.
click('[name="appTheme"][value="dark"]');assert.equal(out().theme,'dark');assert.equal(d.querySelector('#app').dataset.theme,'dark');
w.calendarApp.setAccount({uid:'profile-test',displayName:'Camille',email:'camille@example.test',emailVerified:true},['2026-10-13T10:00:00Z']);
click('#openProfile');assert.equal(d.querySelector('#profileName').textContent,'Camille');
assert.equal(d.querySelector('#profileEmailVerified').textContent,'Vérifié');
assert.equal(d.querySelectorAll('#profileDevices button').length,3);
click('#profileDevices button');assert.equal(d.querySelectorAll('#profileDevices button').length,2);
click('#disconnectAllDevices');assert.equal(d.querySelectorAll('#profileDevices button').length,0);
click('[name="profileTheme"][value="light"]');assert(d.querySelector('[name="appTheme"][value="light"]').checked);
input('#profileAccent','#7357bc','change');assert.equal(out().accent,'#7357bc');
click('#resetProfileAccent');assert.equal(out().accent,null);
// A new account can create its first category and activity with no Save step.
w.calendarApp.load(w.calendarApp.defaults());click('#openTrackingSettings');click('#manageCategories');input('#newCategoryName','New category');d.querySelector('#categoryNewForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(out().categories.length,1);click('#closeTrackingSettings');click('#openTrackingSettings');click('#manageActivities');input('#managerNewName','New activity');click('#managerAddActivity');assert.equal(out().activities.length,1);click('#closeTrackingSettings');
const mobile=setup(true);mobile.calendarApp.load(seed);assert.equal(mobile.document.querySelector('#calendar').dataset.view,'month');assert.equal(mobile.document.querySelectorAll('#calendar .month-cell:not(.empty)').length,31);
const compliance=setup();const complianceSeed=JSON.parse(JSON.stringify(seed));complianceSeed.details['2026-10-13'].a.count=2;compliance.calendarApp.load(complianceSeed);const report=compliance.document.createElement('div');compliance.renderScopeReport(report,'2026-10-13','week');assert(report.querySelector('.scope-score').textContent.includes('1 / 2 jours'));
console.log('PASS: year/month defaults, folded sections, quick toggle, live annotations/validation, global journal/goals, daily checklist, week/year views, leap-month navigation, auto-save managers, emoji, theme and empty-account setup.');

