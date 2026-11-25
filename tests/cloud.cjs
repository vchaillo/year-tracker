const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script[^>]*src=[^>]*><\/script>/g,'');
const seed={schemaVersion:9,paletteVersion:3,year:2026,categories:[{id:'s',name:'Sport'},{id:'m',name:'Monitoring'}],activities:[{id:'a',name:'Running',categoryId:'s',color:'#9769d5'},{id:'x',name:'Deliveroo',categoryId:'m',color:'#35b9a5'}],entries:{'2026-10-13':['a','x']},details:{'2026-10-13':{a:{count:1,distance:10,durationMinutes:30,note:'Original'},x:{count:1,distance:null,note:'Keep'}}},activeCategory:'s',selections:{s:['a'],m:['x']},selectedActivities:['a'],theme:'system'};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const copy=value=>JSON.parse(JSON.stringify(value));
function setup(storage={},useAuthObserver=false,sharedRemote) {
  const w=new JSDOM(html,{runScripts:'outside-only',url:'https://example.test'}).window,d=w.document;
  w.scrollTo=()=>{};w.matchMedia=query=>({matches:query.includes('prefers-reduced-motion')});w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
  for(const [key,value] of Object.entries(storage))w.localStorage.setItem(key,value);
  let online=true;Object.defineProperty(w.navigator,'onLine',{get:()=>online});
  w.eval(d.getElementById('faviconStartup').textContent);
  w.eval(fs.readFileSync(path.join(root,'script.js'),'utf8'));
  const commits=[],pending=[],remote=sharedRemote || new Map(),listeners=[];
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
    if(ref.endsWith('/settings/preferences')){
      for(const field of options.mergeFields){
        const path=field.parts, key=path.at(-1);
        const parent=path.slice(0,-1).reduce((object,part)=>object[part]??={},data);
        const incoming=path.reduce((object,part)=>object[part],value);
        if(incoming?.op==='delete')delete parent[key];
        else parent[key]=copy(incoming);
      }
    }
    remote.set(ref,data);
  }
  w.writeBatch=()=>{const changes=[];return {set:(ref,value,options)=>{if(options?.mergeFields)assert(options.mergeFields.length>0,'No empty Firestore patch');changes.push([ref,copy(value),options]);},commit:()=>{commits.push(changes);return new Promise((resolve,reject)=>pending.push({resolve:()=>{changes.forEach(args=>apply(...args));resolve()},reject}))}}};
  w.runTransaction=async (db,perform)=>{
    const batch=w.writeBatch(db);
    let changed=false;
    const result=await perform({get:w.getDocFromServer,set:(...args)=>{changed=true;batch.set(...args);}});
    if(changed)await batch.commit();
    return result;
  };
  w.onSnapshot=(ref,options,next)=>{listeners.push({ref,next});return()=>{}};
  w.getDocFromServer=async ref=>({exists:()=>remote.has(ref),data:()=>remote.has(ref)?copy(remote.get(ref)):undefined});
  w.getDocsFromServer=async ref=>({forEach:callback=>{for(const [key,value] of remote)if(key.startsWith(ref+'/'))callback({id:key.split('/').at(-1),data:()=>copy(value)})}});
  let popupCalls=0;
  w.firebaseConfig={apiKey:'test',projectId:'test',authDomain:'test',appId:'test'};
  w.initializeApp=w.getAuth=w.initializeFirestore=()=>({});
  w.persistentLocalCache=w.persistentMultipleTabManager=()=>({});
  w.GoogleAuthProvider=class {};
  w.signInWithPopup=async()=>{popupCalls++;};
  w.onAuthStateChanged=(auth,next)=>{w.emitAuth=next;};
  let src=fs.readFileSync(path.join(root,'cloud.js'),'utf8').replace(/^import .*;\n/gm,'');
  if(!useAuthObserver)src=src.slice(0,src.indexOf("$('googleLogin').addEventListener"));
  w.eval(src+`;window.pendingValue=()=>readLocal(queueKey('demo'));window.pendingCount=()=>pendingRecords('demo').length;window.setCloudBaseline=data=>{account={uid:'demo'};display(data);baseline=clone(window.calendarApp.exportForStorage());checkpoint(baseline);};window.getCloudBaseline=()=>clone(baseline);window.editSession=updateSession;window.restoreCloud=()=>{account={uid:'demo'};return initializeUser({uid:'demo',metadata:{}},generation);};window.cancelRetry=()=>clearTimeout(retryTimer);`);
  const day='users/demo/days/2026-10-13';if(!sharedRemote)remote.set(day,{activities:['a','x'],details:copy(seed.details['2026-10-13'])});
  return {w,d,commits,pending,remote,listeners,popupCount:()=>popupCalls,offline:()=>{online=false;w.dispatchEvent(new w.Event('offline'));},online:()=>{online=true;w.dispatchEvent(new w.Event('online'));},storage:()=>Object.fromEntries(Object.keys(w.localStorage).map(key=>[key,w.localStorage.getItem(key)]))};
}
(async()=>{
  const returning=setup({},true);
  const visible=id=>!returning.d.getElementById(id).hidden;
  assert(!visible('authLoader'));assert(!visible('authCard'));assert(!visible('googleLogin'));
  returning.w.emitAuth(null);
  await tick();
  assert(!visible('authLoader'));assert(visible('authCard'));assert(visible('googleLogin'));
  returning.w.emitAuth({uid:'demo',metadata:{}});
  assert(!visible('authLoader'));assert(!visible('authCard'));assert(!visible('googleLogin'));
  await tick();
  assert(!visible('authGate'));assert(visible('authenticatedApp'));assert.equal(returning.popupCount(),0);
  assert.equal(returning.d.querySelector('#onboardingDialog').open,false,'A returning account with history does not see onboarding');
  returning.w.close();
  const firstRun=setup({},true);
  const firstUser={uid:'fresh',displayName:'Camille Exemple',metadata:{}};
  const first=id=>firstRun.d.getElementById(id);
  const submit=id=>first(id).dispatchEvent(new firstRun.w.Event('submit',{bubbles:true,cancelable:true}));
  firstRun.w.emitAuth(firstUser);
  await tick();
  assert.equal(first('onboardingDialog').open,true);
  assert.equal(first('onboardingTitle').textContent,'Bienvenue, Camille !');
  assert.equal(firstRun.w.calendarApp.export().interface.onboarding,'pending');
  first('onboardingNext').click();
  assert.equal(first('onboardingTitle').textContent,'Ta date de naissance');
  assert.equal(first('onboardingNext').textContent,'Passer');
  first('onboardingBirthDate').value='1991-06-24';
  first('onboardingBirthDate').dispatchEvent(new firstRun.w.Event('change',{bubbles:true}));
  first('onboardingNext').click();
  assert.equal(first('onboardingNext').disabled,true);
  first('onboardingCategoryName').value='Sport';
  submit('onboardingCategoryForm');
  assert.equal(first('onboardingTitle').textContent,'Ton catalogue');
  assert.equal(first('onboardingNext').disabled,true);
  first('onboardingActivityName').value='Course';
  submit('onboardingActivityForm');
  first('onboardingNext').click();
  assert.equal(first('onboardingTitle').textContent,'Ton premier objectif');
  first('onboardingOpenGoal').click();
  assert(first('newGoalDialog').open);
  submit('newGoalForm');
  assert.equal(firstRun.w.calendarApp.export().activities[0].goals.length,1);
  for(const title of ['Les calendriers','Les objectifs','Le tableau de bord','Les statistiques']){
    first('onboardingNext').click();
    assert.equal(first('onboardingTitle').textContent,title);
    const option=first('onboardingDialog').querySelector('section:not([hidden]) [data-onboarding-page]');
    option?.click();
  }
  first('onboardingNext').click();
  assert.equal(first('onboardingTitle').textContent,'Bravo, à toi de jouer !');
  first('onboardingNext').click();
  const onboardingPreferences=firstRun.w.calendarApp.export().interface;
  assert.equal(onboardingPreferences.onboarding,'complete');
  assert.equal(onboardingPreferences.navigationTabs.goals,false);
  assert.equal(onboardingPreferences.navigationTabs.dashboard,false);
  assert.equal(onboardingPreferences.navigationTabs.statistics,false);
  assert.equal(onboardingPreferences.page,'activities');
  assert.equal(first('onboardingDialog').open,false);
  assert.equal(firstRun.w.calendarApp.export().activities[0].name,'Course');
  for(let i=0;i<12&&firstRun.pending.length;i++){firstRun.pending.shift().resolve();await tick();}
  assert.equal(firstRun.remote.get('users/fresh/settings/preferences').interface.onboarding,'complete');
  assert.equal(firstRun.remote.get('users/fresh/settings/preferences').interface.birthDate,'1991-06-24');
  firstRun.w.emitAuth(firstUser);
  await tick();
  assert.equal(first('onboardingDialog').open,false);
  first('openProfile').click();first('openOnboarding').click();
  assert.equal(first('onboardingDialog').open,true);
  first('onboardingLater').click();
  assert.equal(first('onboardingDialog').open,false);
  assert.equal(firstRun.w.calendarApp.export().interface.onboarding,'complete');
  firstRun.w.close();
  // With normal motion, signing out and signing in both wait for the full loader cycle.
  const delayed=setup({},true);
  delayed.w.matchMedia=()=>({matches:false});
  const actualTimeout=delayed.w.setTimeout.bind(delayed.w);
  let finishAnimation;
  delayed.w.setTimeout=(callback,delay,...args)=>{
    if(delay>1000){finishAnimation=callback;return 1;}
    return actualTimeout(callback,delay,...args);
  };
  delayed.w.emitAuth(null);
  assert.equal(delayed.d.getElementById('authLoader').hidden,false);
  assert.equal(typeof finishAnimation,'function');
  finishAnimation();await tick();
  assert.equal(delayed.d.getElementById('authCard').hidden,false);
  delayed.w.emitAuth({uid:'demo',metadata:{}});
  assert.equal(delayed.d.getElementById('authLoader').hidden,true);
  await tick();
  assert.equal(delayed.d.getElementById('authGate').hidden,false);
  assert.equal(typeof finishAnimation,'function');
  finishAnimation();await tick();
  assert.equal(delayed.d.getElementById('authGate').hidden,true);
  delayed.w.close();
  const themed=setup({'year-tracker:account:demo':JSON.stringify({data:{...seed,theme:'dark',accent:'#8256a0'}})},true);
  assert.match(themed.d.querySelector('link[rel=icon]').href,/%238256a0/,'The older account cache supplies the first favicon after upgrading');
  const gate=themed.d.getElementById('authGate'),loader=themed.d.getElementById('authLoader');
  const read=themed.w.getDocFromServer,readDays=themed.w.getDocsFromServer;
  let revealPreferences,revealDays;
  themed.remote.set('users/demo/settings/calendar',seed);
  themed.w.getDocFromServer=ref=>ref.endsWith('/preferences')
    ? new Promise(resolve=>{revealPreferences=()=>resolve({exists:()=>true,data:()=>({theme:'light',accent:'#a048db',goalColors:{danger:'#c12045',warning:'#c47214',success:'#268953'}})});})
    : read(ref);
  themed.w.getDocsFromServer=ref=>new Promise(resolve=>{revealDays=()=>resolve(readDays(ref));});
  assert(loader.hidden);
  themed.w.emitAuth({uid:'demo',metadata:{}});
  assert(loader.hidden);
  revealPreferences();await tick();
  assert(!loader.hidden);
  assert.equal(gate.dataset.theme,'light','The first visible loader uses the account preference, including when the cache is stale');
  assert.equal(gate.style.getPropertyValue('--accent'),'#a048db');
  assert.deepEqual(['danger','warning','success'].map(tone=>gate.style.getPropertyValue('--loader-'+tone)),['#c12045','#c47214','#268953']);
  assert.match(themed.d.querySelector('link[rel=icon]').href,/%23a048db/);
  revealDays();await tick();
  assert(gate.hidden);
  assert.equal(themed.d.getElementById('app').dataset.theme,'light');
  const savedIcon=themed.d.querySelector('link[rel=icon]').href;
  assert.equal(themed.w.localStorage.getItem('year-tracker:favicon'),savedIcon);
  const reloaded=setup(themed.storage(),true);
  assert.equal(reloaded.d.querySelector('link[rel=icon]').href,savedIcon,'The favicon is restored before authentication');
  reloaded.w.emitAuth({uid:'demo',metadata:{}});
  assert.equal(reloaded.d.querySelector('link[rel=icon]').href,savedIcon,'Waiting for preferences does not reset the favicon');
  reloaded.w.emitAuth(null);
  assert.equal(reloaded.w.localStorage.getItem('year-tracker:favicon'),null);
  await tick();reloaded.w.close();
  themed.w.close();
  const signedOut=setup({'year-tracker:account:demo':JSON.stringify({data:{...seed,theme:'dark'}})},true);
  signedOut.w.emitAuth(null);
  assert.equal(signedOut.d.getElementById('authGate').dataset.theme,'system');
  assert(!signedOut.d.getElementById('authLoader').hidden);
  await tick();signedOut.w.close();
  const offlineTheme=setup({'year-tracker:account:demo':JSON.stringify({data:{...seed,theme:'dark'}})},true);
  offlineTheme.offline();
  offlineTheme.w.emitAuth({uid:'demo',metadata:{}});
  assert.equal(offlineTheme.d.getElementById('authGate').dataset.theme,'dark');
  assert(!offlineTheme.d.getElementById('authLoader').hidden);
  await tick();offlineTheme.w.close();
  const fresh=setup();await fresh.w.restoreCloud();await tick();assert.equal(fresh.w.calendarApp.export().categories.length,0);assert.equal(fresh.commits.length,1);fresh.pending.shift().resolve();await tick();assert.deepEqual(fresh.remote.get('users/demo/settings/calendar').categories,[]);assert.equal(fresh.w.pendingCount(),0);fresh.w.close();
  const missing=setup();missing.offline();await assert.rejects(missing.w.restoreCloud());missing.w.close();
  // Several category activities persist together across delayed Firebase acknowledgements.
  const multi=setup();const multiSeed=copy(seed);multiSeed.activities.push({id:'b',name:'Musculation',categoryId:'s',color:'#eeaa22'});multiSeed.selections.s=['a','b'];multiSeed.selectedActivities=['a','b'];multiSeed.entries['2026-10-13']=['x'];delete multiSeed.details['2026-10-13'].a;multi.w.setCloudBaseline(multiSeed);multi.w.openDayOverview('2026-10-13');
  assert.equal(multi.d.querySelectorAll('#calendarDayActivities .calendar-day-activity').length,1);
  multi.w.editSession('2026-10-13','a',{count:1});multi.w.editSession('2026-10-13','b',{count:1});
  assert.deepEqual(new Set(multi.w.calendarApp.export().entries['2026-10-13']),new Set(['a','b','x']));
  for(let i=0;i<6 && multi.pending.length;i++){multi.pending.shift().resolve();await tick();}
  assert.deepEqual(new Set(multi.remote.get('users/demo/days/2026-10-13').activities),new Set(['a','b','x']));
  assert.equal(multi.remote.get('users/demo/days/2026-10-13').details.x.note,'Keep');
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
  const reorder=setup();reorder.w.setCloudBaseline(seed);const reordered=copy(reorder.w.calendarApp.exportForStorage());reordered.entries['2026-10-13']=['x','a'];reorder.w.calendarCloud.save(reordered);await tick();assert.equal(reorder.commits.length,0);assert.equal(reorder.w.pendingCount(),0);reorder.w.close();
  const navigation=setup();navigation.w.setCloudBaseline(seed);
  const existingPin={kind:'evolution',period:'year',metric:'count'};
  navigation.remote.set('users/demo/settings/preferences',{interface:{dashboardPins:[existingPin]}});
  let navConfirmations=0;
  navigation.d.addEventListener('calendar-save-confirmed',()=>navConfirmations++);
  const navClick=id=>navigation.d.querySelector(id).click();
  async function ackNavigation(){
    while(navigation.pending.length){navigation.pending.shift().resolve();await tick();}
  }
  navigation.w.setPage('calendar');
  navClick('#activityViews [data-calendar-view=week]');
  navClick('#nextPeriod');
  navClick('.workspace-quick-choices .multi-select:nth-child(1) .multi-select-trigger');
  navClick('.workspace-quick-choices .multi-select:nth-child(1) [data-choice="category:m"]');
  assert.equal(navigation.w.calendarApp.export().interface.sharedFilters.categoryId,'m');
  await ackNavigation();
  const navigationPrefs=navigation.remote.get('users/demo/settings/preferences').interface;
  assert.equal(navigationPrefs.page,'calendar');
  assert.deepEqual(navigationPrefs.dashboardPins,[existingPin]);
  assert.equal(navigationPrefs.calendar.period,'week');
  assert.equal(navigationPrefs.sharedFilters??null,null,'Session filters stay out of cloud storage by default');
  assert.equal(navConfirmations,0,'Navigation state persists quietly');
  navClick('#openPreferences');
  navClick('[name=profileTheme][value=dark]');
  await ackNavigation();
  assert.equal(navigation.remote.get('users/demo/settings/preferences').theme,'dark');
  assert.equal(navConfirmations,0,'Settings writes also remain quiet');
  navigation.w.close();
  const a=setup();a.w.setCloudBaseline({...seed,interface:{navigationTabs:{goals:true}}});
  const toast=a.d.getElementById('saveToast');
  assert.equal(toast.dataset.visible,undefined);
  a.w.editSession('2026-10-13','a',{note:'First'});assert.equal(a.commits.length,1);
  assert.equal(a.w.pendingValue().after.details['2026-10-13'].a.note,'First');
  // Simulate a concurrent device editing another activity on the same day.
  a.remote.get('users/demo/days/2026-10-13').details.x.note='Remote edit';
  a.w.editSession('2026-10-13','a',{note:'Latest',distance:12});a.pending.shift().resolve();await tick();assert.equal(a.commits.length,2);assert.equal(toast.dataset.visible,undefined);a.pending.shift().resolve();await tick();
  assert.equal(toast.dataset.visible,undefined);
  assert.equal(a.remote.get('users/demo/days/2026-10-13').details.x.note,'Remote edit');assert.equal(a.remote.get('users/demo/days/2026-10-13').details.a.note,'Latest');assert.equal(a.w.getCloudBaseline().details['2026-10-13'].a.distance,12);assert.equal(a.w.pendingCount(),0);
  a.w.editSession('2026-10-13','a',{durationMinutes:null});a.pending.shift().resolve();await tick();assert.equal(a.remote.get('users/demo/days/2026-10-13').details.a.durationMinutes,null);
  a.w.editSession('2026-10-13','a',{count:0});a.pending.shift().resolve();await tick();assert.deepEqual(a.remote.get('users/demo/days/2026-10-13').activities,['x']);assert.equal(a.remote.get('users/demo/days/2026-10-13').details.a,undefined);
  a.w.editSession('2026-10-13','x',{count:0});a.pending.shift().resolve();await tick();assert.deepEqual(a.remote.get('users/demo/days/2026-10-13').activities,[]);
  a.w.editSession('2026-10-14','a',{count:1,note:'Retry me'});a.pending.shift().reject(new Error('Network failure'));await tick();assert(a.d.getElementById('syncStatus').textContent.includes('Échec'));a.d.getElementById('syncStatus').click();a.pending.shift().resolve();await tick();assert.equal(a.w.getCloudBaseline().details['2026-10-14'].a.note,'Retry me');a.w.cancelRetry();
  // All preferences, objective metadata, and daily annotations survive offline reload.
  a.offline();a.w.editSession('2026-10-15','a',{count:2,distance:7,durationMinutes:45,note:'Offline run'});
  a.d.querySelector('#openPreferences').click();
  a.d.querySelector('#preferencesNavigationTab').click();a.d.querySelector('#rememberWorkspaceFilters').click();
  a.d.querySelector('#closePreferences').click();
  a.d.querySelector('[data-page="goals"]').click();a.d.querySelector('.workspace-quick-choices .multi-select:nth-child(2) .multi-select-trigger').click();a.d.querySelector('.workspace-quick-choices .multi-select:nth-child(2) [data-choice=week]').click();
  a.d.querySelector('[name="profileTheme"][value="dark"]').click();
  const goalColor=a.d.querySelector('#goalColor-warning');goalColor.value='#bc8231';goalColor.dispatchEvent(new a.w.Event('change',{bubbles:true}));
  const picker=a.d.getElementById("profileAccent");picker.value="#7357bc";picker.dispatchEvent(new a.w.Event("change"));
  const exported=a.w.calendarApp.export();exported.avatar={useGoogle:false,initial:'last'};exported.categories[0].emoji='🚀';exported.activities[0].goals=[{id:'g',mode:'min',target:20,period:'week',unit:'distance',display:'ring',startDate:'2026-10-15'}];exported.goalOrder=['g'];exported.interface.calendar={...exported.interface.calendar,period:'day',date:'2026-10-15'};exported.interface.defaultViews={activities:{period:'week',format:'list'},goals:{period:'month',format:'calendar'}};exported.interface.dashboardPins=[{kind:'evolution',period:'month',metric:'distance'}];exported.interface.sectionLayout={folds:{'goals-section-2':false},orders:{'dashboardSlots-indicators-4':['','evolution'],goals:['goals-section-2','goals-section-0','goals-section-1','goals-section-3']}};a.w.calendarApp.load(exported);
  assert(a.d.getElementById('syncStatus').textContent.includes('Hors ligne'));
  const b=setup(a.storage());b.offline();await b.w.restoreCloud();assert.equal(b.commits.length,0);let restored=b.w.calendarApp.export();assert.equal(restored.details['2026-10-15'].a.note,'Offline run');assert.equal(restored.theme,'dark');assert.deepEqual(copy(restored.avatar),{useGoogle:false,initial:'last'});assert.equal(restored.goalColors.warning,'#bc8231');assert.equal(restored.design,undefined);assert.equal(restored.accent,"#7357bc");assert.equal(restored.categories[0].emoji,'🚀');assert.equal(restored.activities[0].goals[0].display,'ring');assert.equal(restored.activities[0].goals[0].startDate,'2026-10-15');assert.deepEqual(Array.from(restored.goalOrder),['g']);assert.equal(restored.interface.dashboardPins[0].metric,'distance');assert.equal(restored.interface.sectionLayout.orders['dashboardSlots-indicators-4'][1],'evolution');assert.deepEqual(copy(restored.interface.sharedFilters.frequencies),['week']);assert.equal(restored.interface.navigationTabs.goals,true);assert.equal(restored.interface.calendar.period,'day');assert.equal(restored.interface.calendar.date,'2026-10-15');assert.equal(restored.interface.calendarView,'week');assert.equal(restored.interface.activityFormat,'list');assert.equal(restored.interface.sectionLayout.folds['goals-section-2'],false);assert.equal(restored.interface.sectionLayout.orders.goals[0],'goals-section-2');assert.equal(b.d.getElementById('dashboardView').hidden,false);
  b.online();await tick();assert.equal(b.commits.length,1);for(let i=0;i<6&&b.pending.length;i++){b.pending.shift().resolve();await tick();}assert.equal(b.remote.get('users/demo/days/2026-10-15').details.a.durationMinutes,45);assert.equal(b.remote.get('users/demo/settings/preferences').interface.dashboardPins[0].metric,'distance');assert.equal(b.remote.get('users/demo/settings/preferences').interface.defaultViews.activities.format,'list');assert.equal(b.remote.get('users/demo/settings/preferences').accent,'#7357bc');assert.deepEqual(b.remote.get('users/demo/settings/preferences').avatar,{useGoogle:false,initial:'last'});assert.equal(b.remote.get('users/demo/settings/preferences').goalColors.warning,'#bc8231');assert.equal(b.remote.get('users/demo/settings/calendar').activities[0].goals[0].unit,'distance');assert.equal(b.remote.get('users/demo/settings/calendar').activities[0].goals[0].startDate,'2026-10-15');assert.equal(b.w.pendingCount(),0);assert.equal(b.d.getElementById('syncStatus').textContent,'Enregistré');
  // Replaying a previously submitted delta does not duplicate activity membership.
  b.w.editSession('2026-10-15','a',{note:'Replay'});b.pending.shift().resolve();await tick();assert.deepEqual(b.remote.get('users/demo/days/2026-10-15').activities,['a']);
  // Independent browser tabs keep separate journals; recovering one never loses the other.
  const c=setup();c.w.setCloudBaseline(seed);c.offline();c.w.editSession('2026-10-16','x',{count:1,note:'Second tab'});
  const e=setup({...a.storage(),...c.storage()});e.offline();await e.w.restoreCloud();const merged=e.w.calendarApp.export();assert.equal(merged.details['2026-10-15'].a.note,'Offline run');assert.equal(merged.details['2026-10-16'].x.note,'Second tab');
  e.online();await tick();for(let i=0;i<6&&e.pending.length;i++){e.pending.shift().resolve();await tick();}assert.equal(e.w.pendingCount(),0);assert.equal(e.remote.get('users/demo/days/2026-10-15').details.a.note,'Offline run');assert.equal(e.remote.get('users/demo/days/2026-10-16').details.x.note,'Second tab');
  const sharedServer=new Map(),left=setup({},false,sharedServer),right=setup({},false,sharedServer);
  const sharedPrefs='users/demo/settings/preferences',sharedCatalog='users/demo/settings/calendar';
  sharedServer.set(sharedCatalog,{schemaVersion:9,paletteVersion:3,categories:seed.categories,activities:seed.activities});
  left.w.setCloudBaseline(seed);right.w.setCloudBaseline(seed);
  function editDashboard(device,id,name,extra){
    const data=device.w.calendarApp.export();
    data.interface.dashboardTabs=[{id,name}];
    data.interface.dashboardTabSettings={['tab-'+id]:{hidden:false,sections:['limits'],order:['indicators','shortcuts','minimums','limits']}};
    data.interface.dashboardPins=[{kind:'evolution',period:'month',metric:'distance',tabId:id}];
    extra(data);
    device.w.calendarApp.load(data);
  }
  async function acknowledge(device){
    await tick();
    while(device.pending.length){device.pending.shift().resolve();await tick();}
  }
  editDashboard(left,'sport','Sport',data=>{
    data.theme='dark';
    data.interface.customAccents={'#7357bc':['Indigo Bloom','#7357bc','#5d4698','#927cc9']};
    data.activities[0].goals=[{id:'running-week',mode:'min',target:20,period:'week',unit:'distance',display:'ring'}];
  });
  await acknowledge(left);
  editDashboard(right,'health','Santé',data=>{data.activities[1].name='Livraison';});
  await acknowledge(right);
  assert.deepEqual(sharedServer.get(sharedPrefs).interface.dashboardTabs.map(tab=>tab.id),['sport','health']);
  assert.equal(sharedServer.get(sharedPrefs).interface.dashboardPins.length,2);
  assert(sharedServer.get(sharedPrefs).interface.dashboardTabSettings['tab-sport']);
  assert.equal(sharedServer.get(sharedCatalog).activities[0].goals[0].id,'running-week');
  assert.equal(sharedServer.get(sharedCatalog).activities[1].name,'Livraison');
  const cleanDevice=setup({},false,sharedServer);
  await cleanDevice.w.restoreCloud();
  const freshState=cleanDevice.w.calendarApp.export();
  assert.equal(freshState.theme,'dark');
  assert.equal(freshState.interface.dashboardPins.length,2);
  assert.equal(freshState.interface.dashboardTabs.length,2);
  assert.equal(freshState.interface.customAccents['#7357bc'][0],'Indigo Bloom');
  for(const listener of right.listeners.slice(-3)){
    const value=sharedServer.get(listener.ref);
    listener.next(listener.ref.endsWith('/days')?{forEach(){}}:{exists:()=>Boolean(value),data:()=>copy(value)});
  }
  assert.equal(right.w.calendarApp.export().theme,'dark');
  assert.equal(right.w.calendarApp.export().interface.dashboardTabs.length,2);
  left.w.close();right.w.close();cleanDevice.w.close();
  a.w.close();b.w.close();c.w.close();e.w.close();console.log('PASS: durable offline queue/reload/automatic reconnect, all preferences and goal settings, rapid edits, per-activity concurrent merges, cleared duration, tombstones and retry.');
})().catch(error=>{console.error(error);process.exitCode=1});


