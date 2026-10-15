const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script[^>]*src=[^>]*><\/script>/g,'');
const seed={schemaVersion:9,paletteVersion:3,year:2026,categories:[{id:'s',name:'Sport'},{id:'m',name:'Monitoring'}],activities:[{id:'a',name:'Running',categoryId:'s',color:'#9769d5'},{id:'x',name:'Deliveroo',categoryId:'m',color:'#35b9a5'}],entries:{'2026-10-13':['a','x']},details:{'2026-10-13':{a:{count:1,distance:10,durationMinutes:30,note:'Original'},x:{count:1,distance:null,note:'Keep'}}},activeCategory:'s',selections:{s:['a'],m:['x']},selectedActivities:['a'],theme:'system'};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const copy=value=>JSON.parse(JSON.stringify(value));
function setup(storage={}) {
  const w=new JSDOM(html,{runScripts:'outside-only',url:'https://example.test'}).window,d=w.document;
  w.scrollTo=()=>{};w.matchMedia=()=>({matches:false});w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
  for(const [key,value] of Object.entries(storage))w.localStorage.setItem(key,value);
  let online=true;Object.defineProperty(w.navigator,'onLine',{get:()=>online});
  w.eval(fs.readFileSync(path.join(root,'script.js'),'utf8'));
  const commits=[],pending=[],remote=new Map(),listeners=[];
  w.doc=(db,...parts)=>parts.join('/');w.collection=w.doc;
  w.arrayUnion=(...values)=>({op:'union',values});w.arrayRemove=(...values)=>({op:'remove',values});w.deleteField=()=>({op:'delete'});w.FieldPath=class{constructor(...parts){this.parts=parts}};
  function apply(ref,value,options={}) {
    if(!options.merge&&!options.mergeFields){remote.set(ref,copy(value));return;}
    const data=remote.get(ref)||{};
    // Match the real SDK: an explicitly masked transform field is cleared first.
    if(options.mergeFields?.includes('activities') && value.activities?.op)delete data.activities;
    if(value.activities?.op==='union')data.activities=[...new Set([...(data.activities||[]),...value.activities.values])];
    if(value.activities?.op==='remove')data.activities=(data.activities||[]).filter(id=>!value.activities.values.includes(id));
    for(const [id,detail] of Object.entries(value.details||{})){data.details||={};if(detail.op==='delete')delete data.details[id];else data.details[id]=copy(detail);}
    remote.set(ref,data);
  }
  w.writeBatch=()=>{const changes=[];return {set:(ref,value,options)=>{if(options?.mergeFields)assert(options.mergeFields.length>0,'No empty Firestore patch');changes.push([ref,copy(value),options]);},commit:()=>{commits.push(changes);return new Promise((resolve,reject)=>pending.push({resolve:()=>{changes.forEach(args=>apply(...args));resolve()},reject}))}}};
  w.onSnapshot=(ref,options,next)=>{listeners.push({ref,next});return()=>{}};
  w.getDocFromServer=async ref=>({exists:()=>remote.has(ref),data:()=>copy(remote.get(ref))});
  w.getDocsFromServer=async ref=>({forEach:callback=>{for(const [key,value] of remote)if(key.startsWith(ref+'/'))callback({id:key.split('/').at(-1),data:()=>copy(value)})}});
  let src=fs.readFileSync(path.join(root,'cloud.js'),'utf8').replace(/^import .*;\n/gm,'');src=src.slice(0,src.indexOf("$('googleLogin').addEventListener"));
  w.eval(src+`;window.pendingValue=()=>readLocal(queueKey('demo'));window.pendingCount=()=>pendingRecords('demo').length;window.setCloudBaseline=data=>{account={uid:'demo'};display(data);baseline=clone(window.calendarApp.export());checkpoint(baseline);};window.getCloudBaseline=()=>clone(baseline);window.editSession=updateSession;window.restoreCloud=()=>{account={uid:'demo'};return initializeUser({uid:'demo',metadata:{}},generation);};window.cancelRetry=()=>clearTimeout(retryTimer);`);
  const day='users/demo/days/2026-10-13';remote.set(day,{activities:['a','x'],details:copy(seed.details['2026-10-13'])});
  return {w,d,commits,pending,remote,listeners,offline:()=>{online=false;w.dispatchEvent(new w.Event('offline'));},online:()=>{online=true;w.dispatchEvent(new w.Event('online'));},storage:()=>Object.fromEntries(Object.keys(w.localStorage).map(key=>[key,w.localStorage.getItem(key)]))};
}
(async()=>{
  const fresh=setup();await fresh.w.restoreCloud();assert.equal(fresh.w.calendarApp.export().categories.length,0);assert.equal(fresh.commits.length,1);fresh.pending.shift().resolve();await tick();assert.deepEqual(fresh.remote.get('users/demo/settings/calendar').categories,[]);assert.equal(fresh.w.pendingCount(),0);fresh.w.close();
  const missing=setup();missing.offline();await assert.rejects(missing.w.restoreCloud());missing.w.close();
  // Several category activities persist together across delayed Firebase acknowledgements.
  const multi=setup();const multiSeed=copy(seed);multiSeed.activities.push({id:'b',name:'Musculation',categoryId:'s',color:'#eeaa22'});multiSeed.selections.s=['a','b'];multiSeed.selectedActivities=['a','b'];multiSeed.entries['2026-10-13']=['x'];delete multiSeed.details['2026-10-13'].a;multi.w.setCloudBaseline(multiSeed);multi.w.toggleEntry('2026-10-13',true);
  assert.equal(multi.d.querySelectorAll('#dayPickerChoices .session-editor').length,2);
  multi.d.querySelector('[aria-label="Running · sélectionner pour 13 oct. 2026"]').click();multi.d.querySelector('[aria-label="Musculation · sélectionner pour 13 oct. 2026"]').click();assert.deepEqual(new Set(multi.w.calendarApp.export().entries['2026-10-13']),new Set(['a','b','x']));multi.pending.shift().resolve();await tick();multi.pending.shift().resolve();await tick();assert.deepEqual(new Set(multi.remote.get('users/demo/days/2026-10-13').activities),new Set(['a','b','x']));assert.equal(multi.remote.get('users/demo/days/2026-10-13').details.x.note,'Keep');
  // A stale cached subscription must not replace acknowledged same-day membership.
  const current=copy(multi.w.calendarApp.export()),subscriptions=multi.listeners.slice(-3),cached={fromCache:true,hasPendingWrites:false};
  subscriptions[0].next({exists:()=>true,data:()=>({schemaVersion:9,paletteVersion:3,categories:current.categories,activities:current.activities}),metadata:cached});
  subscriptions[1].next({exists:()=>true,data:()=>({year:current.year,activeCategory:current.activeCategory,selections:current.selections,selectedActivities:current.selectedActivities,interface:current.interface}),metadata:cached});
  subscriptions[2].next({forEach:callback=>callback({id:'2026-10-13',data:()=>({activities:['b'],details:{b:{count:1}}})}),metadata:cached});
  assert.deepEqual(new Set(multi.w.calendarApp.export().entries['2026-10-13']),new Set(['a','b','x']),'Cached snapshots cannot roll back acknowledged activities');
  // The server's complete result is still accepted, including another device's changes.
  const server={fromCache:false,hasPendingWrites:false};
  subscriptions[0].next({exists:()=>true,data:()=>({schemaVersion:9,paletteVersion:3,categories:current.categories,activities:current.activities}),metadata:server});
  subscriptions[1].next({exists:()=>true,data:()=>({year:current.year,activeCategory:current.activeCategory,selections:current.selections,selectedActivities:current.selectedActivities,interface:current.interface}),metadata:server});
  subscriptions[2].next({forEach:callback=>callback({id:'2026-10-13',data:()=>multi.remote.get('users/demo/days/2026-10-13')}),metadata:server});
  assert.deepEqual(new Set(multi.w.calendarApp.export().entries['2026-10-13']),new Set(['a','b','x']));multi.w.close();
  const reorder=setup();reorder.w.setCloudBaseline(seed);const reordered=copy(reorder.w.calendarApp.export());reordered.entries['2026-10-13']=['x','a'];reorder.w.calendarCloud.save(reordered);await tick();assert.equal(reorder.commits.length,0);assert.equal(reorder.w.pendingCount(),0);reorder.w.close();
  const a=setup();a.w.setCloudBaseline(seed);
  a.w.editSession('2026-10-13','a',{note:'First'});assert.equal(a.commits.length,1);
  assert.equal(a.w.pendingValue().after.details['2026-10-13'].a.note,'First');
  // Simulate a concurrent device editing another activity on the same day.
  a.remote.get('users/demo/days/2026-10-13').details.x.note='Remote edit';
  a.w.editSession('2026-10-13','a',{note:'Latest',distance:12});a.pending.shift().resolve();await tick();assert.equal(a.commits.length,2);a.pending.shift().resolve();await tick();
  assert.equal(a.remote.get('users/demo/days/2026-10-13').details.x.note,'Remote edit');assert.equal(a.remote.get('users/demo/days/2026-10-13').details.a.note,'Latest');assert.equal(a.w.getCloudBaseline().details['2026-10-13'].a.distance,12);assert.equal(a.w.pendingCount(),0);
  a.w.editSession('2026-10-13','a',{durationMinutes:null});a.pending.shift().resolve();await tick();assert.equal(a.remote.get('users/demo/days/2026-10-13').details.a.durationMinutes,null);
  a.w.editSession('2026-10-13','a',{count:0});a.pending.shift().resolve();await tick();assert.deepEqual(a.remote.get('users/demo/days/2026-10-13').activities,['x']);assert.equal(a.remote.get('users/demo/days/2026-10-13').details.a,undefined);
  a.w.editSession('2026-10-13','x',{count:0});a.pending.shift().resolve();await tick();assert.deepEqual(a.remote.get('users/demo/days/2026-10-13').activities,[]);
  a.w.editSession('2026-10-14','a',{count:1,note:'Retry me'});a.pending.shift().reject(new Error('Network failure'));await tick();assert(a.d.getElementById('syncStatus').textContent.includes('Échec'));a.d.getElementById('syncStatus').click();a.pending.shift().resolve();await tick();assert.equal(a.w.getCloudBaseline().details['2026-10-14'].a.note,'Retry me');a.w.cancelRetry();
  // All preferences, objective metadata, and daily annotations survive offline reload.
  a.offline();a.w.editSession('2026-10-15','a',{count:2,distance:7,durationMinutes:45,note:'Offline run'});
  a.d.querySelector('[data-page="goals"]').click();a.d.querySelector('#goalStatusChoices button:nth-child(2)').click();a.d.querySelector('[data-page="journal"]').click();const search=a.d.getElementById('journalSearch');search.value='Offline';search.dispatchEvent(new a.w.Event('input'));
  a.d.querySelector('[name="appTheme"][value="dark"]').click();a.d.querySelector('[name="appDesign"][value="material"]').click();a.d.querySelector('#accentChoices button[aria-label="Bleu"]').click();
  const exported=a.w.calendarApp.export();exported.categories[0].emoji='🚀';exported.activities[0].goals=[{id:'g',mode:'min',target:20,period:'week',unit:'distance',display:'ring'}];exported.goalOrder=['g'];a.w.calendarApp.load(exported);
  assert(a.d.getElementById('syncStatus').textContent.includes('Hors ligne'));
  const b=setup(a.storage());b.offline();await b.w.restoreCloud();assert.equal(b.commits.length,0);let restored=b.w.calendarApp.export();assert.equal(restored.details['2026-10-15'].a.note,'Offline run');assert.equal(restored.theme,'dark');assert.equal(restored.design,'material');assert.equal(b.d.getElementById('app').dataset.design,'material');assert.equal(restored.accent,'#75a7fa');assert.equal(restored.categories[0].emoji,'🚀');assert.equal(restored.activities[0].goals[0].display,'ring');assert.deepEqual(Array.from(restored.goalOrder),['g']);assert.equal(restored.interface.journalSearch,'Offline');assert.equal(restored.interface.goalStatusFilter,'pending');assert.equal(b.d.getElementById('dailyView').hidden,false);
  b.online();assert.equal(b.commits.length,1);for(let i=0;i<6&&b.pending.length;i++){b.pending.shift().resolve();await tick();}assert.equal(b.remote.get('users/demo/days/2026-10-15').details.a.durationMinutes,45);assert.equal(b.remote.get('users/demo/settings/preferences').interface.journalSearch,'Offline');assert.equal(b.remote.get('users/demo/settings/calendar').activities[0].goals[0].unit,'distance');assert.equal(b.w.pendingCount(),0);assert.equal(b.d.getElementById('syncStatus').textContent,'Enregistré');
  // Replaying a previously submitted delta does not duplicate activity membership.
  b.w.editSession('2026-10-15','a',{note:'Replay'});b.pending.shift().resolve();await tick();assert.deepEqual(b.remote.get('users/demo/days/2026-10-15').activities,['a']);
  // Independent browser tabs keep separate journals; recovering one never loses the other.
  const c=setup();c.w.setCloudBaseline(seed);c.offline();c.w.editSession('2026-10-16','x',{count:1,note:'Second tab'});
  const e=setup({...a.storage(),...c.storage()});e.offline();await e.w.restoreCloud();const merged=e.w.calendarApp.export();assert.equal(merged.details['2026-10-15'].a.note,'Offline run');assert.equal(merged.details['2026-10-16'].x.note,'Second tab');
  e.online();for(let i=0;i<6&&e.pending.length;i++){e.pending.shift().resolve();await tick();}assert.equal(e.w.pendingCount(),0);assert.equal(e.remote.get('users/demo/days/2026-10-15').details.a.note,'Offline run');assert.equal(e.remote.get('users/demo/days/2026-10-16').details.x.note,'Second tab');
  a.w.close();b.w.close();c.w.close();e.w.close();console.log('PASS: durable offline queue/reload/automatic reconnect, all preferences and goal settings, rapid edits, per-activity concurrent merges, cleared duration, tombstones and retry.');
})().catch(error=>{console.error(error);process.exitCode=1});
