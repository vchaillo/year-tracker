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
const change=(selector,value)=>{const node=find(selector);node.value=value;node.dispatchEvent(new w.Event('change',{bubbles:true}));};
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
assert.equal(find('#statsYear').value,'2026');
assert.equal(find('#statsYearLabel').textContent,'2026');
assert.equal(find('#statsYear').hidden,true);
find('#statsYearLabel').click();
assert.equal(find('#statsYear').hidden,false);
change('#statsYear','2026');
assert.equal(find('#statsYear').hidden,true);
assert.deepEqual([...d.querySelectorAll('.stats-kpi>strong')].map(node=>node.textContent),['7','15 km','1 h 15','7']);
assert.equal(find('.stats-kpi:last-child small').textContent,'2 en décembre 2025');
assert.match(find('.stats-goal-scores').textContent,/6 sur 20 périodes réussies \(30 %\)/);
assert.match(find('.stats-goal-scores').textContent,/3 en cours/);
assert.deepEqual([...find('[data-activity-id=run]').cells].slice(1).map(cell=>cell.textContent),['6','4','3','3']);

const heatmapDay=date=>find('.stats-heatmap-day[data-date="'+date+'"]');
assert.equal(d.querySelectorAll('.stats-heatmap-day').length,365);
assert.equal(find('#statsOverview').closest('section').nextElementSibling.getAttribute('aria-labelledby'),'statsHeatmap');
assert.equal(heatmapDay('2026-01-13').dataset.tone,'danger');
assert.equal(heatmapDay('2026-01-10').dataset.tone,'success');
assert.equal(heatmapDay('2026-01-12').dataset.tone,'exceeded');
assert.equal(heatmapDay('2026-01-18').dataset.tone,'warning');
assert.equal(heatmapDay('2026-01-26').dataset.tone,'future');
heatmapDay('2026-01-12').click();
assert.match(find('.stats-heatmap-info').textContent,/3 occurrences.*Running/);
heatmapDay('2026-01-12').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
assert.equal(heatmapDay('2026-01-19').getAttribute('aria-pressed'),'true');
const sportDetails=find('[data-category-id=sport] details');
sportDetails.open=true;
sportDetails.dispatchEvent(new w.Event('toggle'));
assert.deepEqual([...sportDetails.querySelectorAll('time')].map(time=>time.dateTime),['2026-01-19','2026-01-12','2026-01-10','2026-01-05']);
assert.match(sportDetails.textContent,/3 occurrences · 10 km · 45 min/);

find('[data-stats-metric=distance]').click();
assert.equal(find('.stats-month:first-child strong').textContent,'15 km');
assert.equal(find('.stats-month:nth-child(2) strong').textContent,'—');
find('#statsFilterToggle').click();
assert.equal(find('#statsFilters').open,true);
find('#statsActivityChoices [data-activity-filter=run]').click();
assert.equal(find('.stats-kpi>strong').textContent,'1','Activity filters work across categories');
find('#statsCategoryChoices [data-stats-category=sport]').click();
assert.equal(find('#statsFilterResults').textContent,'6 résultats');
find('#statsActivityChoices [data-activity-filter=run]').click();
assert.equal(find('.stats-kpi>strong').textContent,'0');
find('#statsActivityChoices [data-activity-filter=all]').click();
find('#statsFilters .filter-close').click();
assert.equal(find('#statsFilters').open,false);
assert.match(find('.stats-goal-scores').textContent,/4 sur 17/);
assert.deepEqual([...d.querySelectorAll('#statisticsView [data-activity-id]')].map(row=>row.dataset.activityId),['run']);
assert.equal(find('.stats-kpi>strong').textContent,'6');
find('#statsPrevious').click();
assert.equal(find('#statsYear').value,'2025');
assert.equal(find('#statsYearLabel').textContent,'2025');
assert.equal(find('.stats-kpi>strong').textContent,'2');
assert.match(find('[aria-labelledby=statsGoals]').textContent,/Aucun objectif pour cette année/);
find('#statsToday').click();
assert.equal(find('#statsYearLabel').textContent,'2026');
const updated=w.calendarApp.export();
updated.details['2026-01-12'].run.count=4;
w.calendarApp.load(updated,{live:true});
assert.equal(find('.stats-kpi>strong').textContent,'7');
w.close();
console.log('PASS: yearly and monthly activity totals, cross-year comparisons, streaks, goal completion and live category filters.');
