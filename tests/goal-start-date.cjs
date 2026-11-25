const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<script[^>]*src=[^>]*><\/script>/g, '');
const w = new JSDOM(html, { runScripts: 'outside-only', url: 'https://example.test' }).window;
const d = w.document;
const NativeDate = w.Date;
let today = [2026, 10, 18, 12];
w.Date = class extends NativeDate {
  constructor(...args) { super(...(args.length ? args : today)); }
};
w.matchMedia = () => ({ matches: false });
w.scrollTo = () => {};
w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
w.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new w.Event('close')); };
w.eval(fs.readFileSync(path.join(root, 'script.js'), 'utf8'));
w.calendarCloud = { save() {} };

const daily = { id: 'run-daily', mode: 'min', target: 2, unit: 'count', period: 'day', startDate: '2026-11-17' };
const weekly = { ...daily, id: 'run-weekly', target: 4, period: 'week' };
const max = { ...daily, id: 'limit', mode: 'max', target: 0, display: 'ring', startDate: '2026-11-19' };
const goals = [daily, weekly, max];
w.calendarApp.load({
  ...w.calendarApp.defaults(),
  categories: [{ id: 'sport', name: 'Sport' }],
  activities: [
    { id: 'run', name: 'Running', categoryId: 'sport', color: '#226688', goals: [daily, weekly] },
    { id: 'other', name: 'Other', categoryId: 'sport', color: '#886622', goals: [max] }
  ],
  entries: { '2026-11-16': ['run'], '2026-11-17': ['run'], '2026-11-19': ['run', 'other'] },
  details: { '2026-11-16': { run: { count: 6 } }, '2026-11-19': { run: { count: 8 } } },
  interface: {navigationTabs:{activities:true,goals:true}, page: 'goals', goalReference: '2026-11-18', goalFormat: 'calendar', historyView: 'year' }
});
const find = selector => { const node = d.querySelector(selector); assert(node, selector); return node; };
const change = (selector, value, type = 'change') => {
  const input = find(selector);
  input.value = value;
  input.dispatchEvent(new w.Event(type, { bubbles: true }));
};
const progress = (goal, date) => w.goalProgress(goal === max ? ['other'] : ['run'], goal, date);
assert.equal(progress(daily, '2026-11-16').tone, 'empty');
assert.equal(progress(daily, '2026-11-17').tone, 'danger');
assert.equal(progress(daily, '2026-11-18').tone, 'pending');
assert.equal(progress(daily, '2026-11-19').tone, 'future');
assert.equal(progress(max, '2026-11-19').tone, 'future');
assert.equal(progress(weekly, '2026-11-18').count, 1, 'Exclude entries before the goal start and after today');
assert.equal(progress(weekly, '2026-11-18').tone, 'pending');

for (const [date, tone] of [['16', 'empty'], ['17', 'danger'], ['18', 'pending'], ['19', 'future']]) {
  assert.equal(find('#goalHistory [data-date="2026-11-' + date + '"]').dataset.tone, tone);
}
const before = find('#goalHistory [data-date="2026-11-16"]');
before.dispatchEvent(new w.MouseEvent('pointerover', { bubbles: true }));
assert.equal(d.querySelectorAll('#calendarDayPreview li').length, 0);
find('#goalHistory [data-date="2026-11-19"]').click();
assert.equal(d.querySelectorAll('#goalHistory .goal-card[data-tone=future]').length, 2);
find('#mainNavigation [data-page=goals]').click();
find('[data-goal-format=list]').click();
assert.equal(find('#globalGoalDate').value,'2026-11-18','The list keeps its own date');
assert.equal(find('#globalGoalCards [data-goal-id=run-daily] time').dateTime,'2026-11-17');
find('[data-goal-view=day]').click();
find('#goalDateLabel').click();
find('.date-picker:not([hidden]) [data-pick-date="2026-11-19"]').click();
assert.equal(find('#globalGoalCards [data-goal-id=limit] [role=progressbar]').getAttribute('aria-valuenow'), '0');

find('#mainNavigation [data-page=day]').click();
assert.equal(find('#agendaGoals [data-goal-id=run-daily]').dataset.tone, 'pending');
find('#agendaGoals [aria-label="Ajouter une occurrence de Running · objectif run-daily"]').click();
find('#agendaGoals [aria-label="Ajouter une occurrence de Running · objectif run-daily"]').click();
assert.equal(find('#agendaGoals [data-goal-id=run-daily]').dataset.tone, 'success');
change('#agendaDate', '2026-11-16');
assert.equal(d.querySelectorAll('#agendaGoals .goal-card').length, 0);
today = [2026, 10, 23, 12];
assert.equal(progress({ ...weekly, target: 12 }, '2026-11-18').tone, 'danger', 'An incomplete weekly goal turns red after Sunday');
assert.equal(progress(max, '2026-11-19').tone, 'danger', 'Future entries count once their day arrives');
assert.equal(progress(max, '2026-11-20').tone, 'success', 'A zero maximum is respected below the limit');

find('#mainNavigation [data-page=goals]').click();
find('#newGoalButton').click();
assert.equal(find('#newGoalFields input[type=date]').value, '2026-11-23');
assert(find('#newGoalFields input[type=date]').required);
find('#newGoalFields .goal-start-field .period-trigger').click();
assert(find('#newGoalFields .goal-start-field .period-trigger').textContent.includes('23'));
find('#newGoalFields .date-picker [data-pick-date="2026-11-21"]').click();
find('#newGoalForm').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
let saved = w.calendarApp.export();
assert.equal(saved.categories[0].goals[0].startDate, '2026-11-21');
w.calendarApp.load(saved);
w.openGoalEditor('sport', saved.categories[0].goals[0].id);
assert.equal(find('#goalEditorFields input[type=date]').value, '2026-11-21');
find('#goalEditorFields .goal-start-field .today-button').click();
assert.equal(find('#goalEditorFields input[type=date]').value, '2026-11-23');
find('#goalEditorFields .goal-start-field .period-trigger').click();
assert.equal(d.querySelector('#goalEditorFields .date-picker .text-button'),null);
change('#goalEditorFields input[type=date]', '', 'input');
assert(find('#saveGoalEditor').disabled);
find('#goalEditorForm').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
assert.equal(w.calendarApp.export().categories[0].goals[0].startDate, '2026-11-21');
change('#goalEditorFields input[type=date]', '2026-11-23');
assert(!find('#saveGoalEditor').disabled);
find('#goalEditorForm').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
assert.equal(w.calendarApp.exportForStorage().categories[0].goals[0].startDate, '2026-11-23');
const legacy = w.calendarApp.export();
delete legacy.categories[0].goals[0].startDate;
legacy.activities[0].goals[1].startDate = '';
w.calendarApp.load(legacy);
const migrated = w.calendarApp.exportForStorage();
assert.equal(migrated.categories[0].goals[0].startDate, '2025-01-01');
assert.equal(migrated.activities[0].goals[1].startDate, '2025-01-01');
assert.equal(migrated.activities[0].goals[0].startDate, '2026-11-17');

today = [2026, 10, 24, 12];
const scheduled = { ...daily, target: 1, startDate: '2026-11-20',
  weekdayHistory: [{ from: '2026-11-20', days: [0, 1, 2, 3, 4] }] };
w.calendarApp.load({
  ...w.calendarApp.defaults(),
  categories: [{ id: 'sport', name: 'Sport' }],
  activities: [{ id: 'run', name: 'Running', categoryId: 'sport', color: '#226688', goals: [scheduled] }],
  entries: { '2026-11-20': ['run'], '2026-11-21': ['run'], '2026-11-23': ['run'] },
  interface: { page: 'day', navigationTabs: {goals: true, activities: true} }
});
assert.equal(progress(scheduled, '2026-11-21').tone, 'empty');
assert.equal(progress({...scheduled,period:'week'}, '2026-11-20').count,1,'A weekly goal excludes weekend entries');
assert.equal(progress(scheduled, '2026-11-23').tone, 'success');
assert.equal(find('#agendaGoals [data-goal-id=run-daily] .streak-flame-number').textContent,'2');
const action=(selector,label)=>[...d.querySelectorAll(selector)].find(button=>button.textContent===label);
w.openGoalEditor('run','run-daily');
assert.equal(find('#goalEditorFields .goal-weekday-actions button').getAttribute('aria-pressed'),'true');
action('#goalEditorFields .goal-lifecycle button','Mettre en pause').click();
let rule=w.calendarApp.export().activities[0].goals[0];
assert.equal(progress(rule,'2026-11-24').status,'Objectif en pause');
assert.equal(d.querySelector('#agendaGoals [data-goal-id=run-daily]'),null);
assert.equal(progress(rule,'2026-11-23').tone,'success');
today = [2026, 10, 25, 12];
w.openGoalEditor('run','run-daily');
action('#goalEditorFields .goal-lifecycle button','Reprendre').click();
rule=w.calendarApp.export().activities[0].goals[0];
assert.equal(rule.inactivePeriods[0].until,'2026-11-25');
assert.equal(progress(rule,'2026-11-24').tone,'empty');
assert.equal(progress(rule,'2026-11-25').tone,'pending');
action('#goalEditorFields .goal-lifecycle button','Archiver').click();
assert.equal(progress(w.calendarApp.export().activities[0].goals[0],'2026-11-25').status,'Objectif archivé');
action('#goalEditorFields .goal-lifecycle button','Restaurer').click();
find('#closeGoalEditor').click();
change('#agendaDate','2026-11-25');
find('[data-page=catalog]').click();
find('#categoryEditorRows [aria-label="Déplier Sport"]').click();
find('#categoryEditorRows [aria-label="Archiver Running"]').click();
assert(find('#categoryEditorRows [aria-label="Restaurer Running"]'));
assert.equal(w.calendarApp.export().entries['2026-11-20'][0],'run');
find('#openDailyActivity').click();
assert.equal(find('#dailyActivityChoice').disabled,true);
find('#cancelDailyActivity').click();
find('#categoryEditorRows [aria-label="Restaurer Running"]').click();
find('#categoryEditorRows [aria-label="Archiver Sport"]').click();
assert(find('#categoryEditorRows [aria-label="Restaurer Sport"]'));
find('#openDailyActivity').click();
assert.equal(find('#dailyActivityChoice').disabled,true);
find('#cancelDailyActivity').click();
find('#categoryEditorRows [aria-label="Restaurer Sport"]').click();
find('#openDailyActivity').click();
assert.equal(find('#dailyActivityChoice').value,'run');
find('#cancelDailyActivity').click();

find('#mainNavigation [data-page=goals]').click();
find('#newGoalButton').click();
change('#newGoalFields select','day','input');
find('#newGoalFields .goal-weekday-actions button').click();
find('#newGoalForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
const newRule=w.calendarApp.export().categories[0].goals[0];
assert.equal(JSON.stringify(newRule.weekdayHistory),JSON.stringify([{from:'2026-11-25',days:[0,1,2,3,4]}]));

w.close();
console.log('PASS: goal start dates, open and closed periods, future limits, calendar/day/list consistency and form persistence.');
