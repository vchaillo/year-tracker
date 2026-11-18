const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script[^>]*src=[^>]*><\/script>/g,'');
const w=new JSDOM(html,{runScripts:'outside-only',url:'https://example.test'}).window;
const d=w.document,NativeDate=w.Date;
w.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[2026,0,25,12]));}};
w.scrollTo=()=>{};
w.matchMedia=()=>({matches:true});
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
w.eval(fs.readFileSync(path.join(root,'script.js'),'utf8'));
w.calendarCloud={save(){}};
const find=selector=>{const node=d.querySelector(selector);assert(node,selector);return node;};
const rule=(id,period,mode,target,startDate)=>({id,period,mode,target,startDate,unit:'count',display:'bar'});
w.calendarApp.load({
  ...w.calendarApp.defaults(),
  categories:[{id:'sport',name:'Sport'},{id:'daily',name:'Quotidien',goals:[rule('cap','day','max',0,'2026-01-22')]}],
  activities:[
    {id:'run',name:'Running',categoryId:'sport',color:'#226688',goals:[
      rule('minimum','day','min',1,'2026-01-10'),rule('weekly','week','min',2,'2026-01-10')
    ]},
    {id:'rest',name:'Other',categoryId:'daily',color:'#884422'}
  ],
  entries:{
    '2025-12-31':['run'],'2026-01-05':['run'],'2026-01-10':['run'],'2026-01-12':['run'],
    '2026-01-19':['run'],'2026-01-23':['rest'],'2026-01-26':['run']
  },
  details:{
    '2025-12-31':{run:{count:2}},'2026-01-12':{run:{count:3,distance:10,durationMinutes:45}},
    '2026-01-19':{run:{count:1,distance:5,durationMinutes:30}},'2026-01-26':{run:{count:50}}
  }
});
assert.equal(d.querySelector('#trackerView #legend'),null);
find('#mainNavigation [data-page=statistics]').click();
assert.equal(find('#statisticsView').hidden,false);
assert.equal(find('#statsYear').value,'2026-01-01');
assert.equal(find('#statsYear').closest('.workspace-command-bar'),find('#workspaceFilterReset').closest('.workspace-command-bar'));
assert.equal(find('#statsYearLabel').getAttribute('aria-current'),'date');
find('#statsYearLabel').click();
const picker=find('#'+find('#statsYearLabel').getAttribute('aria-controls'));
const yearList=picker.querySelector('[data-picker-view=year]');
assert(yearList);
assert.equal(picker.querySelector('[data-picker-step="1"]').disabled,true);
assert.equal(yearList.querySelector('[tabindex="0"]').textContent,'2026');
picker.querySelector('[data-picker-step="-1"]').click();
const previousYears=picker.querySelector('[data-picker-view=year]');
assert.equal(previousYears.children.length,12);
assert.equal(previousYears.firstElementChild.textContent,'2008');
assert.equal(previousYears.lastElementChild.textContent,'2019');
picker.querySelector('[data-picker-step="1"]').click();
assert(!picker.querySelector('[data-pick-date^="2027-"]'));
picker.querySelector('[data-pick-date^="2025-"]').click();
assert.equal(find('#statsYearLabel').getAttribute('aria-current'),null);
assert.equal(find('.stats-kpi>strong').textContent,'2','Year changes apply immediately');
find('#statsToday').click();
assert.deepEqual([...d.querySelectorAll('#statisticsContent .stats-kpi>strong')].map(node=>node.textContent),['7','15 km','1 h 15','7']);
assert.equal(find('.stats-kpi:last-child small').textContent,'2 en décembre 2025');
assert.match(find('.stats-goal-scores').textContent,/6 sur 20 périodes réussies \(30 %\)/);
assert.equal(find('.stats-goal-counter[data-tone=pending] strong').textContent,'3');
assert.deepEqual([...find('[data-activity-id=run]').cells].slice(1).map(cell=>cell.textContent),['6','4','3','3']);

const heatmapDay=date=>find('.stats-heatmap-day[data-date="'+date+'"]');
assert.equal(d.querySelectorAll('.stats-heatmap-day').length,365);
assert.equal(find('#statsOverview').closest('section').nextElementSibling.id,'statsHeatmap');
assert.equal(find('#statsHeatmap').classList.contains('stats-section'),false);
assert.equal(find('.stats-legend').open,false);
find('.stats-legend summary').click();
assert.equal(find('.stats-legend').open,true);
assert.equal(heatmapDay('2026-01-13').dataset.tone,'danger');
assert.equal(heatmapDay('2026-01-10').dataset.tone,'success');
assert.equal(heatmapDay('2026-01-12').dataset.tone,'exceeded');
assert.equal(heatmapDay('2026-01-18').dataset.tone,'warning');
assert.equal(heatmapDay('2026-01-26').dataset.tone,'future');
const preview=find('#calendarDayPreview');
heatmapDay('2026-01-12').dispatchEvent(new w.MouseEvent('pointerover',{bubbles:true}));
assert.equal(preview.hidden,false);
assert.equal(preview.classList.contains('stats-day-preview'),true);
assert.match(preview.textContent,/3 occurrences.*Running/);
assert.equal(preview.querySelector('li').dataset.tone,'exceeded');
d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
assert.equal(preview.hidden,true);
heatmapDay('2026-01-12').click();
assert.equal(preview.hidden,false);
heatmapDay('2026-01-12').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
assert.equal(heatmapDay('2026-01-19').getAttribute('aria-pressed'),'true');
const sportDetails=find('[data-category-id=sport] details');
sportDetails.open=true;
sportDetails.dispatchEvent(new w.Event('toggle'));
assert.deepEqual([...sportDetails.querySelectorAll('time')].map(time=>time.dateTime),['2026-01-19','2026-01-12','2026-01-10','2026-01-05']);
const detailedOccurrence=sportDetails.querySelector('time[datetime="2026-01-12"]').closest('tr');
assert.deepEqual([...detailedOccurrence.cells].slice(2).map(cell=>cell.textContent),['3','10 km','45 min']);

find('[data-stats-metric=distance]').click();
assert.equal(find('.stats-month:first-child strong').textContent,'15 km');
assert.equal(find('.stats-month:nth-child(2) strong').textContent,'—');
const statFilter=index=>'#statisticsView .multi-select:nth-child('+index+')';
const openFilter=index=>find(statFilter(index)+' .multi-select-trigger').click();
const choose=(index,id)=>find(statFilter(index)+' [data-choice="'+id+'"]').click();
openFilter(2);choose(2,'run');
assert.equal(find('.stats-kpi>strong').textContent,'6','Activities can be selected before choosing a category');
assert(!find('#workspaceFilterReset').disabled);
find('#workspaceFilterReset').click();
assert.equal(find('#workspaceFilterReset').disabled,true);
openFilter(1);choose(1,'sport');
assert.equal(find('.stats-kpi>strong').textContent,'6');
assert.match(find('.stats-goal-scores').textContent,/4 sur 17/);
assert.deepEqual([...d.querySelectorAll('#statisticsView [data-activity-id]')].map(row=>row.dataset.activityId),['run']);
assert.equal(find('.stats-kpi>strong').textContent,'6');
find('#statsPrevious').click();
assert.equal(find('#statsYear').value,'2025-01-01');
assert.equal(find('.stats-kpi>strong').textContent,'2');
assert.match(find('[aria-labelledby=statsGoals]').textContent,/Aucun objectif pour cette année/);
find('#statsToday').click();
assert.equal(find('#statsYear').value,'2026-01-01');
const updated=w.calendarApp.export();
updated.details['2026-01-12'].run.count=4;
w.calendarApp.load(updated,{live:true});
assert.equal(find('.stats-kpi>strong').textContent,'7');
w.close();
console.log('PASS: yearly and monthly activity totals, cross-year comparisons, streaks, goal completion and live category filters.');
