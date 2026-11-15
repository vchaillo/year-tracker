const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<script[^>]*src=[^>]*><\/script>/g, '');
const w = new JSDOM(html, { runScripts: 'outside-only', url: 'https://example.test' }).window;
const d = w.document;
w.scrollTo = () => {};
w.matchMedia = () => ({ matches: false });
w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
w.HTMLDialogElement.prototype.close = function () { this.open = false; };
w.eval(fs.readFileSync(path.join(root, 'script.js'), 'utf8'));
w.calendarCloud = { save() {} };

const date = '2025-10-13';
const goal = (id, mode, target, unit = 'count', display = 'bar') => ({ id, mode, target, unit, display, period: 'day' });
const seed = {
  schemaVersion: 9, paletteVersion: 3, year: 2025,
  categories: [{ id: 's', name: 'Sport' }, { id: 'm', name: 'Monitoring' }],
  activities: [
    { id: 'a', name: 'Running', categoryId: 's', color: '#865add', goals: [goal('running-min', 'min', 1), goal('distance-min', 'min', 10, 'distance', 'ring')] },
    { id: 'b', name: 'Reading', categoryId: 's', color: '#4477cc', goals: [goal('reading-min', 'min', 1)] },
    { id: 'x', name: 'Delivery', categoryId: 'm', color: '#ee4455', goals: [goal('delivery-max', 'max', 1)] }
  ],
  entries: { [date]: ['a', 'b', 'x'] },
  details: { [date]: { a: { count: 2, distance: 11 }, b: { count: 1 }, x: { count: 2 } } },
  activeCategory: 'overview', selectedActivities: ['a', 'b', 'x'],
  interface: { page: 'goals', goalReference: date, historyView: 'day', goalFormat: 'cards' }
};
const find = selector => { const node = d.querySelector(selector); assert(node, 'Missing element ' + selector); return node; };
const click = selector => find(selector).click();
const getGoal = id => seed.activities.flatMap(activity => activity.goals || []).find(item => item.id === id);
const result = (activity, id) => w.goalProgress([activity], getGoal(id), date);
const card = id => find('#globalGoalCards [data-goal-id="' + id + '"]');
const chooseStatus = label => {
  const button = [...d.querySelectorAll('#goalStatusChoices button')].find(node => node.textContent === label);
  assert(button, 'Missing filter ' + label);
  button.click();
};

w.calendarApp.load(seed);

// Positive overperformance is distinct from an exceeded maximum.
assert.equal(result('a', 'running-min').tone, 'exceeded');
assert.equal(result('a', 'running-min').status, 'Objectif dépassé');
assert.equal(result('a', 'distance-min').tone, 'exceeded');
assert.equal(result('b', 'reading-min').tone, 'success');
assert.equal(result('x', 'delivery-max').tone, 'danger');
assert.equal(result('x', 'delivery-max').status, 'Limite dépassée');
assert.equal(card('running-min').dataset.tone, 'exceeded');
assert.equal(card('distance-min').querySelector('.progress-ring').dataset.tone, 'exceeded');
assert.equal(card('reading-min').dataset.tone, 'success');
assert.equal(card('delivery-max').dataset.tone, 'danger');
assert.equal(find('#goalTileProgress strong').textContent, '3 / 4');
assert.equal(d.querySelectorAll('#goalTileProgress [data-tone=exceeded]').length, 2);
assert(find('#goalTileProgress [role=progressbar]').getAttribute('aria-valuetext').includes('2 minimums dépassés'));

// Both filter options and the stored preference support the new state.
chooseStatus('Minimum dépassé');
assert.deepEqual([...d.querySelectorAll('#globalGoalCards .goal-card')].map(node => node.dataset.goalId), ['running-min', 'distance-min']);
assert(find('#goalStatusChoices [aria-pressed=true]').textContent.includes('Minimum dépassé'));
w.calendarApp.load(w.calendarApp.export());
assert.equal(w.calendarApp.export().interface.goalStatusFilter, 'exceeded');
chooseStatus('Atteints / dans la limite');
assert.equal(d.querySelectorAll('#globalGoalCards .goal-card').length, 3);
chooseStatus('Limite dépassée');
assert.deepEqual([...d.querySelectorAll('#globalGoalCards .goal-card')].map(node => node.dataset.goalId), ['delivery-max']);
chooseStatus('Tous');

// List, calendar and daily views share the same status.
click('[data-goal-format=list]');
assert.equal(find('#globalGoalCards tr[data-goal-id="running-min"]').dataset.tone, 'exceeded');
assert.equal(find('#globalGoalCards tr[data-goal-id="distance-min"] .list-status').textContent, 'Objectif dépassé');
click('[data-goal-format=calendar]');
assert.equal(d.querySelectorAll('#goalHistory .calendar-day-row[data-tone=exceeded]').length, 2);
assert.equal(find('#goalHistory .goal-history-legend [data-tone=exceeded]').textContent, 'Minimum dépassé');
const positiveOnly = JSON.parse(JSON.stringify(seed));
positiveOnly.activities.find(activity => activity.id === 'x').goals = [];
positiveOnly.interface = { page: 'goals', goalReference: date, historyView: 'year', goalFormat: 'calendar' };
w.calendarApp.load(positiveOnly);
assert.equal(find('#goalHistory [data-date="' + date + '"]').dataset.tone, 'exceeded');
find('#goalHistory [data-date="' + date + '"]').dispatchEvent(new w.MouseEvent('pointerover', { bubbles: true }));
assert.equal(d.querySelectorAll('#calendarDayPreview li[data-tone=exceeded]').length, 2);
assert(find('#calendarDayPreview .calendar-preview-summary').textContent.includes('3 / 3'));
click('.page-nav [data-page=day]');
find('#agendaDate').value = date;
find('#agendaDate').dispatchEvent(new w.Event('change', { bubbles: true }));
assert.equal(d.querySelectorAll('#agendaContent .goal-card[data-tone=exceeded]').length, 2);
assert.equal(d.querySelectorAll('#agendaProgress [data-tone=exceeded]').length, 2);

// Every visual status surface has a corresponding purple rule.
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
for (const rule of [
  '.goal-card[data-tone=exceeded]', '.goal-track[data-tone=exceeded]',
  '.progress-ring[data-tone=exceeded]', '.list-status[data-tone=exceeded]',
  '.goal-history [data-tone=exceeded]', '.calendar-preview-list li[data-tone=exceeded]',
  '.day-total-progress>span[data-tone=exceeded]'
]) assert(css.includes(rule), 'Missing exceeded styling ' + rule);
w.close();
console.log('PASS: positive minimum overruns are purple throughout; maximum overruns remain red.');
