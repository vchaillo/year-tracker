const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script[^>]*src=[^>]*><\/script>/g,'');
const w=new JSDOM(html,{runScripts:'outside-only',url:'https://example.test'}).window;
const d=w.document,animations=[];
const NativeDate=w.Date;
w.Date=class extends NativeDate {
  constructor(...args){super(...(args.length?args:[2025,9,13,12]));}
};
w.scrollTo=()=>{};
w.matchMedia=()=>({matches:false});
w.Element.prototype.animate=function(frames,options){
  animations.push({node:this,frames,options});
  return {cancel(){}};
};
w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
w.eval(fs.readFileSync(path.join(root,'script.js'),'utf8'));
w.calendarCloud={save(){}};
const goal=(id,mode,target,display='bar')=>({id,mode,target,period:'day',unit:'count',display});
const seed={
  schemaVersion:9,paletteVersion:3,year:2025,
  categories:[{id:'cat',name:'Tracker'}],
  activities:[
    {id:'red',name:'Red',categoryId:'cat',color:'#ff4444',goals:[goal('g-red','max',1)]},
    {id:'orange',name:'Orange',categoryId:'cat',color:'#ff8844',goals:[goal('g-orange','max',2)]},
    {id:'green',name:'Green',categoryId:'cat',color:'#44cc55',goals:[goal('g-green','min',1)]},
    {id:'purple',name:'Purple',categoryId:'cat',color:'#9944ff',goals:[goal('g-purple','min',1)]},
    {id:'grey',name:'Grey',categoryId:'cat',color:'#888888',goals:[goal('g-grey','min',5)]},
    {id:'circle',name:'Circle',categoryId:'cat',color:'#44aaff',goals:[goal('g-circle','min',3,'ring')]}
  ],
  entries:{'2025-10-13':['red','orange','green','purple','circle']},
  details:{'2025-10-13':{red:{count:2},orange:{count:2},green:{count:1},purple:{count:2},circle:{count:1}}},
  activeCategory:'cat',selectedActivities:['red','orange','green','purple','grey','circle'],
  interface:{page:'goals',goalReference:'2025-10-13',historyView:'day',goalFormat:'cards'}
};
const current=()=>w.calendarApp.export();
w.calendarApp.load(seed);
const order=()=>[...d.querySelectorAll('#goalTileProgress .day-total-progress>span')].map(item=>item.dataset.tone);
assert.deepEqual(order(),['danger','warning','success','exceeded','pending','pending']);
assert.equal(animations.length,0,'Initial view must not animate from a made-up previous value');

const increased=JSON.parse(JSON.stringify(current()));
increased.details['2025-10-13'].circle.count=3;
increased.details['2025-10-13'].grey={count:2};
increased.entries['2025-10-13'].push('grey');
w.calendarApp.load(increased);
const circleIncrease=animations.find(a=>a.node.classList.contains('ring-fill'));
const barIncrease=animations.find(a=>a.node.tagName==='SPAN'&&a.frames?.[0]?.width==='0%');
assert(circleIncrease,'Circle must animate its stroke when filling');
assert(barIncrease,'Bar must animate its width when filling');
assert.equal(circleIncrease.options.duration,540);
assert.equal(circleIncrease.frames[0].strokeDashoffset!==circleIncrease.frames[1].strokeDashoffset,true);
assert.equal(barIncrease.frames[1].width,'40%');

animations.length=0;
const decreased=JSON.parse(JSON.stringify(current()));
decreased.details['2025-10-13'].circle.count=1;
decreased.details['2025-10-13'].grey.count=1;
w.calendarApp.load(decreased);
const circleDecrease=animations.find(a=>a.node.classList.contains('ring-fill'));
const barDecrease=animations.find(a=>a.node.tagName==='SPAN'&&a.frames?.[0]?.width==='40%');
assert(circleDecrease,'Circle must animate its stroke when emptying');
assert(barDecrease,'Bar must animate its width when emptying');
assert.equal(barDecrease.frames[1].width,'20%');
assert(Number(circleDecrease.frames[0].strokeDashoffset)<Number(circleDecrease.frames[1].strokeDashoffset));

// The same behavior also applies to the daily view.
w.calendarApp.load({...decreased,interface:{...decreased.interface,page:'day',agendaDate:'2025-10-13'}});
const updated=JSON.parse(JSON.stringify(current()));
updated.details['2025-10-13'].circle.count=2;
animations.length=0;
w.calendarApp.load(updated);
assert(animations.some(a=>a.node.classList.contains('ring-fill')),'Agenda progress must animate');

// Reduced motion makes updates immediate without visual animation.
w.matchMedia=()=>({matches:true});
animations.length=0;
const reduced=JSON.parse(JSON.stringify(current()));
reduced.details['2025-10-13'].circle.count=1;
w.calendarApp.load(reduced);
assert.equal(animations.length,0,'Respect reduced motion preferences');
w.close();
console.log('PASS: fixed red/orange/green/purple/grey order and reversible card/list/agenda animations.');
