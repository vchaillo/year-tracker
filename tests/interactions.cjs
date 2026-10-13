const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script[^>]*src=[^>]*><\/script>/g,'');
const w=new JSDOM(html,{runScripts:'outside-only',url:'https://example.test'}).window,d=w.document;
w.scrollTo=()=>{};w.matchMedia=()=>({matches:false});w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
w.eval(fs.readFileSync(path.join(root,'script.js'),'utf8'));let saved;w.calendarCloud={save(data){saved=JSON.parse(JSON.stringify(data))}};
const date='2026-10-13',seed={schemaVersion:9,paletteVersion:3,year:2026,categories:[{id:'s',name:'Sport'},{id:'m',name:'Monitoring'}],activities:[{id:'a',name:'Running',categoryId:'s',color:'#9769d5',goals:[{id:'g',mode:'min',target:3,period:'day',unit:'count',display:'ring'}]},{id:'x',name:'Deliveroo',categoryId:'m',color:'#35b9a5'}],entries:{[date]:['a','x'],'2025-10-01':['a']},details:{[date]:{a:{count:1,distance:10,note:'Retain',durationMinutes:40}}},activeCategory:'s',selections:{s:['a'],m:['x']},selectedActivities:['a']};
const click=selector=>{assert(d.querySelector(selector),selector);d.querySelector(selector).click()},out=()=>JSON.parse(JSON.stringify(w.calendarApp.export()));
w.calendarApp.load(seed);assert.equal(d.querySelector('#dailyView').hidden,false);assert.equal(d.querySelector('#todayFold'),null);assert.equal(d.querySelectorAll('[data-agenda-view]').length,0);assert.deepEqual([...d.querySelectorAll('.page-nav button')].map(b=>b.dataset.page),['day','calendar','goals','journal']);
click('.page-nav [data-page=calendar]');
// Exercise the pointer path itself, including a cross-container category drop.
w.getComputedStyle=()=>Object.assign([],{getPropertyValue:()=>''});w.Element.prototype.getAnimations=()=>[];w.Element.prototype.animate=()=>({finished:Promise.resolve(),cancel(){}});w.Element.prototype.setPointerCapture=()=>{};
const source=d.querySelector('#toolbar [data-sort-id=a]'),destination=d.querySelector('[data-category-drop=m]');w.document.elementFromPoint=()=>destination;
function pointer(node,type,x,y){const event=new w.MouseEvent(type,{bubbles:true,button:0,clientX:x,clientY:y});Object.defineProperties(event,{pointerId:{value:1},pointerType:{value:'mouse'}});node.dispatchEvent(event);}
pointer(source,'pointerdown',0,0);pointer(d.querySelector('#toolbar'),'pointermove',40,30);assert(destination.classList.contains('drop-target'));pointer(d.querySelector('#toolbar'),'pointerup',40,30);
assert.equal(out().activities.find(a=>a.id==='a').categoryId,'m');assert.deepEqual(out().entries,seed.entries);assert.deepEqual(out().details,seed.details);assert.equal(out().activities.find(a=>a.id==='a').goals[0].id,'g');assert(saved.activities.find(a=>a.id==='a').categoryId==='m');
// Calendar day records activities; goal controls stay in Ma journée and goal cards.
click('[data-calendar-view=day]');assert(d.querySelector('.calendar-day'));assert.equal(d.querySelector('#calendar .checklist'),null);assert.equal(d.querySelector('#toolbar').hidden,false);
click('.page-nav [data-page=goals]');const card=d.querySelector('#globalGoalCards .goal-card');assert.equal(card.querySelector('.progress-ring strong').textContent,'1');assert.equal(card.querySelector('.progress-ring small').textContent,'/ 3');
// A quick + updates an occurrence without opening the objective editor.
const input=d.querySelector('#globalGoalDate');input.value=date;input.dispatchEvent(new w.Event('change'));click('#globalGoalCards .goal-add');assert.equal(out().details[date].a.count,2);assert.equal(d.querySelector('#goalEditorDialog').open,false);
click('#globalGoalCards .goal-edit');assert.deepEqual([...d.querySelector('.goal-fields-grid').children].map(node=>node.tagName==='FIELDSET'?node.querySelector('legend').textContent:node.firstChild.textContent),['Règle','Quantité','Unité','Fréquence','Affichage']);
const quantity=d.querySelector('[aria-label="Quantité visée · Running"]');quantity.value='4';quantity.dispatchEvent(new w.Event('input'));d.querySelector('#goalEditorDialog').dispatchEvent(new w.Event('cancel',{cancelable:true}));assert.equal(d.querySelector('#goalEditorDialog').open,false);assert.equal(out().activities.find(a=>a.id==='a').goals[0].target,4);
click('#globalGoalCards .goal-edit');const dialog=d.querySelector('#goalEditorDialog');dialog.getBoundingClientRect=()=>({left:10,top:10,right:100,bottom:100});pointer(dialog,'pointerdown',0,0);dialog.dispatchEvent(new w.MouseEvent('click',{bubbles:true,clientX:0,clientY:0}));assert.equal(dialog.open,false);
// Goal surface can start a drag; controls are excluded from dragging.
const surface=d.querySelector('#globalGoalCards .goal-card');pointer(surface,'pointerdown',0,0);pointer(d.querySelector('#globalGoalCards'),'pointermove',30,30);assert(surface.classList.contains('is-dragging'));pointer(d.querySelector('#globalGoalCards'),'pointerup',30,30);
assert(d.querySelector('link[rel=icon]').href.includes(encodeURIComponent(out().accent)));
w.close();console.log('PASS: pointer transfer retains history, daily/calendar separation, quick objective logging, goal chip order, Escape/outside dismissal, full-card dragging and accent favicon.');
