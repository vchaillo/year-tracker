const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script[^>]*src=[^>]*><\/script>/g,'');
const w=new JSDOM(html,{runScripts:'outside-only',url:'https://example.test'}).window,d=w.document;
w.scrollTo=()=>{};
w.matchMedia=()=>({matches:false});
w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
w.eval(fs.readFileSync(path.join(root,'script.js'),'utf8'));
w.calendarCloud={save(){}};
const goal=(id,period)=>({id,period,mode:'min',unit:'count',target:1,display:'bar'});
const seed={
 schemaVersion:9,paletteVersion:3,year:2025,
 categories:[{id:'s',name:'Sport'},{id:'m',name:'Maison'}],
 activities:[
  {id:'run',name:'Running',categoryId:'s',color:'#12aabb',goals:[goal('daily','day'),goal('weekly','week')]},
  {id:'ride',name:'Cycling',categoryId:'s',color:'#13aa66',goals:[goal('monthly','month')]},
  {id:'cook',name:'Cooking',categoryId:'m',color:'#ee5566',goals:[goal('annual','year')]}
 ],
 entries:{'2025-10-13':['run','ride'],'2025-10-14':['run'],'2025-10-20':['cook']},
 details:{},activeCategory:'overview',selectedActivities:['run','ride','cook'],
 interface:{page:'calendar',focusDate:'2025-10-13',calendarView:'week',activityFormat:'calendar'}
};
w.calendarApp.load(seed);
const find=id=>{const node=d.getElementById(id);assert(node,id);return node};
const click=selector=>{const node=d.querySelector(selector);assert(node,selector);node.click()};
const value=id=>find(id).textContent.trim();
assert.equal(find('calendarGoalLink'),null,'Remove objective shortcut in the activity filter sidebar');
assert.equal(value('calendarFilterResults'),'3 résultats');
click('[data-category-drop=s]');
assert.equal(value('calendarFilterResults'),'3 résultats');
click('[data-activity-filter=run]');
assert.equal(value('calendarFilterResults'),'1 résultat');
click('[data-activity-filter=all]');
assert.equal(value('calendarFilterResults'),'3 résultats');
click('#resetCalendarFilters');
assert.equal(value('calendarFilterResults'),'3 résultats');
click('[data-calendar-view=day]');
assert.equal(value('calendarFilterResults'),'2 résultats');

click('.page-nav [data-page=goals]');
assert.equal(value('goalFilterResults'),'4 résultats');
click('#goalCategoryChoices button:nth-child(2)');
assert.equal(value('goalFilterResults'),'3 résultats');
click('#goalActivityChoices button:nth-child(2)');
assert.equal(value('goalFilterResults'),'1 résultat');
click('#goalStatusChoices button:nth-child(2)');
assert.equal(value('goalFilterResults'),'0 résultat');
click('#resetGoalFilters');
assert.equal(value('goalFilterResults'),'4 résultats');
click('[data-goal-format=list]');
assert.equal(value('goalFilterResults'),'1 résultat','List counts only selected frequency');
click('[data-goal-format=calendar]');
assert.equal(value('goalFilterResults'),'4 résultats','Calendar counts all matching frequencies');
assert(find('calendarFilterResults').getAttribute('aria-live')==='polite');
assert(find('goalFilterResults').getAttribute('aria-live')==='polite');
w.close();
console.log('PASS: live result counters match filters, periods and formats; removed objective shortcut.');
