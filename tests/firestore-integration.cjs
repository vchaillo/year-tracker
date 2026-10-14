const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const host=process.env.FIRESTORE_EMULATOR_HOST;
test('real Firestore preserves same-day membership, annotations and repairs legacy records',{skip:!host,timeout:45000},async()=>{
  assert.match(host,/^(127\.0\.0\.1|localhost):\d+$/,'Only a local emulator is allowed');
  const {JSDOM}=require('jsdom'),{initializeApp,deleteApp}=require('firebase/app'),sdk=require('firebase/firestore');
  const app=initializeApp({projectId:'demo-year-tracker',apiKey:'demo-only'},'integration-'+Date.now());
  const db=sdk.initializeFirestore(app,{experimentalForceLongPolling:true});const [address,port]=host.split(':');sdk.connectFirestoreEmulator(db,address,Number(port));
  const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script[^>]*src=[^>]*><\/script>/g,'');
  const w=new JSDOM(html,{runScripts:'outside-only',url:'https://example.test'}).window;
  w.scrollTo=()=>{};w.matchMedia=()=>({matches:false});w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
  w.eval(fs.readFileSync(path.join(root,'script.js'),'utf8'));Object.assign(w,sdk);w.testFirestore=db;
  // Convert only plain cross-realm containers. Native Firebase transforms and
  // FieldPath instances remain untouched and are processed by the real SDK.
  function plain(value){if(Array.isArray(value))return Array.from(value,plain);if(value&&Object.getPrototypeOf(value)?.constructor?.name==='Object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,plain(item)]));return value;}
  w.writeBatch=database=>{const batch=sdk.writeBatch(database);return{set:(ref,value,options)=>batch.set(ref,plain(value),plain(options)),commit:()=>batch.commit()};};
  let source=fs.readFileSync(path.join(root,'cloud.js'),'utf8').replace(/^import .*;\n/gm,'');source=source.slice(0,source.indexOf("$('googleLogin').addEventListener"));
  w.eval(source+`;db=window.testFirestore;window.testSet=data=>{account={uid:'integration'};display(data);baseline=clone(window.calendarApp.export());};window.testPending=()=>writing||latest;window.testEdit=updateSession;window.testClose=()=>{unsubscribers.forEach(fn=>fn());clearTimeout(retryTimer);};window.testRecover=()=>initializeUser({uid:'integration',metadata:{}},generation);`);
  const date='2026-10-13',ref=sdk.doc(db,'users','integration','days',date);
  const seed={schemaVersion:9,paletteVersion:3,year:2026,categories:[{id:'s',name:'Sport'},{id:'m',name:'Monitoring'}],activities:[{id:'a',name:'Running',categoryId:'s',color:'#9769d5'},{id:'b',name:'Musculation',categoryId:'s',color:'#eeaa22'},{id:'x',name:'Deliveroo',categoryId:'m',color:'#3579a5'}],entries:{[date]:['x']},details:{[date]:{x:{count:1,note:'Preserve another category'}}},activeCategory:'s',selections:{s:['a','b'],m:['x']},selectedActivities:['a','b'],interface:{page:'calendar',focusDate:date}};
  async function settle(){const deadline=Date.now()+10000;while(w.testPending()){assert(Date.now()<deadline,'Writes must finish: '+w.document.getElementById('syncStatus').textContent);await new Promise(resolve=>setTimeout(resolve,25));}await sdk.waitForPendingWrites(db);}
  const read=async()=> (await sdk.getDocFromServer(ref)).data();
  const ids=async expected=>assert.deepEqual(new Set((await read()).activities),new Set(expected));
  try{
    await sdk.setDoc(ref,{activities:['x'],details:seed.details[date]});w.testSet(seed);
    w.toggleEntry(date,true);const click=name=>w.document.querySelector('[aria-label="'+name+' · sélectionner pour 13 oct. 2026"]').click();
    click('Running');click('Musculation');await settle();await ids(['a','b','x']);assert.equal((await read()).details.x.note,'Preserve another category');
    w.testEdit(date,'a',{distance:10,note:'10 km',durationMinutes:45});await settle();await ids(['a','b','x']);
    click('Musculation');await settle();await ids(['a','x']);assert.equal((await read()).details.a.distance,10);assert.equal((await read()).details.b,undefined);
    click('Musculation');await settle();await ids(['a','b','x']);
    // Switching to a single activity toggles only that activity.
    const selected=JSON.parse(JSON.stringify(w.calendarApp.export()));selected.selectedActivities=['a'];selected.selections.s=['a'];w.calendarApp.load(selected);await settle();w.toggleEntry(date);await settle();await ids(['b','x']);w.toggleEntry(date);await settle();await ids(['a','b','x']);
    w.testClose();
    // Reproduce a record damaged by the former explicit transform mask.
    const record=await read();await sdk.setDoc(ref,{...record,activities:['b'],details:{...record.details,a:{count:1,distance:10},uncompleted:{count:0,note:'Do not infer completion'},deletedActivity:{count:1}}});
    const current=JSON.parse(JSON.stringify(w.calendarApp.export()));await sdk.setDoc(sdk.doc(db,'users','integration','settings','calendar'),{schemaVersion:9,paletteVersion:3,categories:current.categories,activities:current.activities});await sdk.setDoc(sdk.doc(db,'users','integration','settings','preferences'),{year:2026,activeCategory:'s',selections:current.selections,interface:current.interface});
    await w.testRecover();await settle();await ids(['a','b','x']);assert(!w.calendarApp.export().entries[date].includes('uncompleted'));assert(!w.calendarApp.export().entries[date].includes('deletedActivity'));
  }finally{w.testClose();w.close();await sdk.terminate(db);await deleteApp(app);}
});
