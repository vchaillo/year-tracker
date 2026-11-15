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
  interface: { page: 'goals', goalReference: '2026-11-18', goalFormat: 'calendar', historyView: 'year' }
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
assert.equal(d.querySelectorAll('#goalHistory .history-goal-result[data-tone=future]').length, 2);
find('#mainNavigation [data-page=goals]').click();
find('[data-goal-format=list]').click();
assert.equal(find('#globalGoalDate').value,'2026-11-18','The list keeps its own date');
find('#goalDateLabel').click();
change('#globalGoalDate','2026-11-19');
find('#globalGoalDatePicker button[type=submit]').click();
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
find('#newGoalFields .goal-start-field .period-trigger').click();
change('#newGoalFields input[type=date]', '2026-11-21', 'input');
assert(find('#newGoalFields .goal-start-field .period-trigger').textContent.includes('23'));
find('#newGoalFields .workspace-date-picker button').click();
find('#newGoalForm').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
let saved = w.calendarApp.export();
assert.equal(saved.categories[0].goals[0].startDate, '2026-11-21');
w.calendarApp.load(saved);
w.openGoalEditor('sport', saved.categories[0].goals[0].id);
assert.equal(find('#goalEditorFields input[type=date]').value, '2026-11-21');
find('#goalEditorFields .goal-start-field .today-button').click();
assert.equal(find('#goalEditorFields input[type=date]').value, '2026-11-23');
find('#goalEditorFields .goal-start-field .period-trigger').click();
change('#goalEditorFields input[type=date]', '', 'input');
find('#goalEditorFields .workspace-date-picker button').click();
assert.equal(find('#saveGoalEditor').disabled, false);
find('#goalEditorForm').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
assert.equal(w.calendarApp.export().categories[0].goals[0].startDate, undefined);
w.close();
console.log('PASS: goal start dates, open and closed periods, future limits, calendar/day/list consistency and form persistence.');
