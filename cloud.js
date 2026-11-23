import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, collection, getDocFromServer, getDocsFromServer, writeBatch, runTransaction, onSnapshot, arrayUnion, arrayRemove, deleteField, FieldPath } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const $ = id => document.getElementById(id);
const gate = $('authGate'), content = $('authenticatedApp');
let auth, db, account, baseline, latest, writing = false, applying = false;
let unsubscribers = [], generation = 0, retryTimer, retryDelay = 1000, durable = true, recovery = [];
const clientId = crypto.randomUUID();
// Give the authentication loader one complete animation cycle.
const MIN_LOADER_MS = 1800;
let loaderShownAt;
async function waitForLoaderAnimation() {
  if (loaderShownAt === undefined || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const remaining = MIN_LOADER_MS - (performance.now() - loaderShownAt);
  if (remaining > 0) await new Promise(resolve => window.setTimeout(resolve, remaining));
}
const clone = value => JSON.parse(JSON.stringify(value));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const metadata = data => ({schemaVersion: 9, paletteVersion: 3, categories: data.categories, activities: data.activities});
const cacheKey = uid => 'year-tracker:account:' + uid;
const queuePrefix = uid => 'year-tracker:pending:' + uid;
const queueKey = uid => queuePrefix(uid) + ':' + clientId;
function pendingRecords(uid) {
  try { return Object.keys(localStorage).filter(key=>key===queuePrefix(uid)||key.startsWith(queuePrefix(uid)+':')).map(key=>({key,value:readLocal(key)})).filter(record=>record.value?.before && record.value?.after).sort((a,b)=>(a.value.at || 0)-(b.value.at || 0)); } catch { durable=false; return []; }
}
function mergePending(data, before, after) {
  const merged=clone(data);
  if(!same(metadata(before),metadata(after)))Object.assign(merged,metadata(after));
  applyPreferenceChanges(merged,preferenceChanges(before,after));
  const dates=new Set([...Object.keys(before.entries || {}),...Object.keys(after.entries || {}),...Object.keys(before.details || {}),...Object.keys(after.details || {})]);
  dates.forEach(date=>{
    const oldIds=before.entries[date] || [],newIds=after.entries[date] || [],removed=oldIds.filter(id=>!newIds.includes(id)),added=newIds.filter(id=>!oldIds.includes(id));
    const ids=[...new Set([...(merged.entries[date] || []).filter(id=>!removed.includes(id)),...added])];
    const details={...(merged.details[date] || {})};
    new Set([...Object.keys(before.details[date] || {}),...Object.keys(after.details[date] || {}),...removed]).forEach(id=>{
      if(!same(before.details[date]?.[id],after.details[date]?.[id])||removed.includes(id)){if(after.details[date]?.[id]&&!removed.includes(id))details[id]=clone(after.details[date][id]);else delete details[id];}
    });
    if(ids.length){merged.entries[date]=ids;merged.details[date]=details;}else{delete merged.entries[date];delete merged.details[date];}
  });
  return merged;
}
// Repair membership left inconsistent by the former explicit array-transform mask.
// A positive recorded count is completion evidence; notes alone are not enough.
function recoverMembership(data) {
  const recovered=clone(data),known=new Set((data.activities || []).map(activity=>activity.id));
  Object.entries(recovered.details || {}).forEach(([date,details])=>{
    const ids=new Set(recovered.entries[date] || []);
    Object.entries(details).forEach(([id,detail])=>{if(known.has(id) && Number(detail?.count)>0)ids.add(id);});
    if(ids.size)recovered.entries[date]=[...ids];
  });
  return recovered;
}
function readLocal(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } }
function storeLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); durable = true; return true; }
  catch { durable = false; $('syncStatus').textContent = 'Stockage local indisponible — gardez cette page ouverte'; return false; }
}
function removeLocal(key) { try { localStorage.removeItem(key); } catch {} }
function checkpoint(data) {
  if (!account) return;
  window.calendarApp.rememberFavicon(data);
  storeLocal(cacheKey(account.uid), {data, logins:readLocal(cacheKey(account.uid))?.logins || []});
}
function queue(data) {
  latest = clone(data);
  checkpoint(data);
  // Save before submitting any network write. Replaying this absolute delta is idempotent.
  return storeLocal(queueKey(account.uid), {before:baseline, after:latest, at:Date.now()});
}
function status() {
  if (!durable) { $('syncStatus').textContent='Stockage local indisponible — gardez cette page ouverte'; return; }
  $('syncStatus').title='';
  $('syncStatus').textContent = latest || writing || recovery.length
    ? (navigator.onLine ? 'Synchronisation…' : 'Hors ligne · à synchroniser')
    : navigator.onLine ? 'Enregistré' : 'Hors ligne · copie locale';
}
function lock(message,view='error') {
  if (view === 'loading' && (gate.hidden || $('authLoader').hidden)) loaderShownAt = performance.now();
  document.dispatchEvent(new Event('calendar-save-toast-dismiss'));
  content.hidden=true;content.inert=true;gate.hidden=false;
  $('authLoader').hidden=view!=='loading';
  $('authCard').hidden=view==='loading' || view==='pending';
  $('authLoadingStatus').textContent=view==='loading'?message:'';
  $('authStatus').textContent=view==='loading'?'':message;
  $('googleLogin').hidden=view!=='login';
  $('googleLogin').disabled=view!=='login';
  $('authRetry').hidden=view!=='error';
  content.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
}
function display(data,live=false) {
  applying=true;
  try { window.calendarApp.load(clone(data),{live}); } finally { applying=false; }
  content.hidden=false; content.inert=false; gate.hidden=true;
}
function preferences(data) {
  const activeCategory=data.activeCategory || data.categories[0]?.id || null;
  const selections=data.selections || Object.fromEntries(data.categories.map(category=>[category.id,data.activities.filter(activity=>activity.categoryId===category.id).map(activity=>activity.id)]));
  return {year:data.year || new Date().getFullYear(),activeCategory,selections,selectedActivities:data.selectedActivities || selections[activeCategory] || [],theme:data.theme || 'system',accent:data.accent || null,avatar:data.avatar || {useGoogle:true,initial:'first'},goalColors:data.goalColors || {},goalOrder:data.goalOrder || [],interface:data.interface || {}};
}
// Patch independent preferences without replacing the workspace of another device.
function preferenceChanges(before,after){
  const changes=[];
  function compare(previous,next,path){
    for(const key of new Set([...Object.keys(previous),...Object.keys(next)])){
      const oldValue=previous[key],value=next[key],field=[...path,key];
      if(same(oldValue,value))continue;
      if(['interface','interface.sectionLayout','interface.sectionLayout.orders','interface.sectionLayout.folds'].includes(field.join('.'))){
        compare(oldValue || {},value || {},field);
      }else changes.push([field,value]);
    }
  }
  compare(before?preferences(before):{},preferences(after),[]);
  return changes;
}
function applyPreferenceChanges(target,changes,deletion){
  for(const [path,value] of changes){
    const parent=path.slice(0,-1).reduce((object,key)=>object[key]??={},target);
    if(value===undefined && !deletion)delete parent[path.at(-1)];
    else parent[path.at(-1)]=value===undefined?deletion():clone(value);
  }
}
async function writeChanges(uid, before, after) {
  const operations=[];
  const changedPreferences=preferenceChanges(before,after);
  if(changedPreferences.length){
    const patch={};
    applyPreferenceChanges(patch,changedPreferences,deleteField);
    operations.push([doc(db,'users',uid,'settings','preferences'),patch,
      {mergeFields:changedPreferences.map(([path])=>new FieldPath(...path))}]);
  }
  if (!before || before.schemaVersion===0 || !same(metadata(before),metadata(after))) operations.push([doc(db,'users',uid,'settings','calendar'),metadata(after),false]);
  const dates=new Set([...Object.keys(before?.entries || {}),...Object.keys(after.entries),...Object.keys(before?.details || {}),...Object.keys(after.details || {})]);
  dates.forEach(date=>{
    const oldIds=before?.entries?.[date] || [], newIds=after.entries[date] || [];
    const oldDetails=before?.details?.[date] || {}, newDetails=after.details?.[date] || {};
    if (same(oldIds,newIds) && same(oldDetails,newDetails)) return;
    const removed=oldIds.filter(id=>!newIds.includes(id)), added=newIds.filter(id=>!oldIds.includes(id));
    const details={};
    new Set([...Object.keys(oldDetails),...Object.keys(newDetails),...removed]).forEach(id=>{
      if (!same(oldDetails[id],newDetails[id]) || removed.includes(id)) details[id]=newDetails[id] || deleteField();
    });
    const ref=doc(db,'users',uid,'days',date);
    // Atomic membership and per-activity detail patches preserve edits to other activities/devices.
    // Keep empty day documents so deletions reach subscribers and offline caches.
    if (removed.length) operations.push([ref,{activities:arrayRemove(...removed)},true]);
    // Let Firestore derive the mask for array transforms. Explicitly including
    // activities in mergeFields clears the existing array before arrayUnion.
    if (added.length) operations.push([ref,{activities:arrayUnion(...added)},true]);
    if (Object.keys(details).length) operations.push([ref,{details},{mergeFields:Object.keys(details).map(id=>new FieldPath('details',id))}]);
  });
  for (let offset=0;offset<operations.length;offset+=400) {
    const batch=writeBatch(db);
    operations.slice(offset,offset+400).forEach(([ref,value,merge])=>batch.set(ref,value,merge===true?{merge:true}:merge || {}));
    await batch.commit();
  }
}
function scheduleRetry() {
  clearTimeout(retryTimer);
  retryTimer=setTimeout(()=>void flush(),retryDelay);
  retryDelay=Math.min(retryDelay*2,30000);
}
async function flush() {
  if (writing || !account || (!latest && !recovery.length) || !baseline) return;
  if (!navigator.onLine) { status(); return; }
  writing=true; status();
  const token=generation,uid=account.uid;
  try {
    while(recovery.length && token===generation) {
      const record=recovery[0];
      await writeChanges(uid,record.value.before,record.value.after);
      if(token!==generation)return;
      recovery.shift();
      // Do not erase a journal that another still-open tab has updated meanwhile.
      if(same(readLocal(record.key),record.value))removeLocal(record.key);
    }
    while (latest && token===generation) {
      const next=latest; latest=null;
      await writeChanges(uid,baseline,next);
      if (token!==generation) return;
      baseline=clone(next);
      if (latest) storeLocal(queueKey(uid),{before:baseline,after:latest,at:Date.now()});
      else { removeLocal(queueKey(uid)); checkpoint(baseline); }
    }
    if (token===generation) {
      retryDelay=1000;
      unsubscribers.forEach(unsubscribe=>unsubscribe()); unsubscribers=[];
      watch(uid,token);
    }
  } catch (error) {
    if (token===generation) {
      queue(window.calendarApp.exportForStorage());
      $('syncStatus').textContent='Échec de sauvegarde — Réessayer'; $('syncStatus').title=error.code || 'Erreur réseau';
      if (!['permission-denied','unauthenticated','invalid-argument'].includes(error.code)) scheduleRetry();
    }
  } finally {
    if (token===generation) { writing=false; if (!latest && !recovery.length) status(); }
  }
}
window.calendarCloud={save(data) {
  if (applying || !account || !baseline) return;
  if (!latest && same(metadata(data),metadata(baseline)) && same(data.entries,baseline.entries) && same(data.details || {},baseline.details || {}) && same(preferences(data),preferences(baseline))) return;
  queue(data); status(); void flush();
}};
$('syncStatus').addEventListener('click',()=>void flush()); $('syncStatus').tabIndex=0;
$('syncStatus').addEventListener('keydown',event=>{if(event.key==='Enter' || event.key===' '){event.preventDefault();void flush();}});
window.addEventListener('online',()=>{status();void flush();});
window.addEventListener('offline',status);
let subscriptionGeneration=0;
function watch(uid,token) {
  const subscription=++subscriptionGeneration;
  const received={};
  const receive=(part,data,snapshot)=>{
    if (token!==generation || subscription!==subscriptionGeneration || writing || latest || recovery.length || snapshot.metadata?.hasPendingWrites) return;
    // Keep acknowledged local records until a server snapshot arrives. An older
    // cached subscription must never roll back edits made by this tab.
    if (navigator.onLine && snapshot.metadata?.fromCache) return;
    received[part]=data;
    // Publish a coherent workspace only after all three subscriptions have delivered.
    if (!received.calendar || !received.preferences || !received.days) return;
    baseline={...window.calendarApp.defaults(),...received.calendar,...received.preferences,...received.days};
    const recovered=recoverMembership(baseline);
    checkpoint(recovered); display(recovered,true); status();
    if(!same(recovered.entries,baseline.entries))window.calendarCloud.save(window.calendarApp.exportForStorage());
    if (snapshot.metadata?.fromCache && navigator.onLine) $('syncStatus').textContent='Connexion au cloud…';
  };
  const fail=error=>{
    if(token!==generation)return;
    if(error.code==='permission-denied' || error.code==='unauthenticated') {lock('Accès refusé. Reconnectez-vous ou vérifiez les règles Firebase.');return;}
    $('syncStatus').textContent='Connexion interrompue · copie locale';
  };
  unsubscribers.push(onSnapshot(doc(db,'users',uid,'settings','calendar'),{includeMetadataChanges:true},snapshot=>{
    if(snapshot.exists())receive('calendar',snapshot.data(),snapshot);
  },fail));
  unsubscribers.push(onSnapshot(doc(db,'users',uid,'settings','preferences'),{includeMetadataChanges:true},snapshot=>receive('preferences',snapshot.exists()?snapshot.data():{},snapshot),fail));
  unsubscribers.push(onSnapshot(collection(db,'users',uid,'days'),{includeMetadataChanges:true},snapshot=>{
    const entries={},details={};
    snapshot.forEach(day=>{const data=day.data();if(data.activities?.length || Object.keys(data.details || {}).length){entries[day.id]=data.activities || [];details[day.id]=data.details || {};}});
    receive('days',{entries,details},snapshot);
  },fail));
}
async function initializeUser(user,token) {
  const cached=readLocal(cacheKey(user.uid));
  lock('','pending');
  let loaderStarted=false, remoteAppearance;
  const showLoader=appearance=>{
    if(token!==generation || loaderStarted)return;
    loaderStarted=true;
    window.calendarApp.setLoadingAppearance(appearance);
    lock('Chargement de votre calendrier…','loading');
  };
  recovery=pendingRecords(user.uid);
  let data,usingCache=false,logins=cached?.logins || [];
  if (recovery.length) {
    data=clone(cached?.data || recovery[0].value.before);
    recovery.forEach(record=>{data=mergePending(data,record.value.before,record.value.after);});
    baseline=clone(data);
  } else {
    try {
      if(!navigator.onLine)throw Object.assign(new Error('Offline'),{code:'unavailable'});
      const savedSettings=Promise.all([
        getDocFromServer(doc(db,'users',user.uid,'settings','calendar')),
        getDocFromServer(doc(db,'users',user.uid,'settings','preferences'))
      ]).then(([settings,preferences])=>{
        const merged={...(settings.exists()?settings.data():{}),...(preferences.exists()?preferences.data():{})};
        remoteAppearance=Object.fromEntries(['theme','accent','goalColors'].filter(key=>Object.hasOwn(merged,key)).map(key=>[key,merged[key]]));
        showLoader(remoteAppearance);
        return [settings,preferences];
      });
      const [[settings,savedPreferences],days]=await Promise.all([
        savedSettings,getDocsFromServer(collection(db,'users',user.uid,'days'))
      ]);
      if(token!==generation)return;
      data={...window.calendarApp.defaults(),...(settings.exists()?settings.data():{}),
        ...(savedPreferences.exists()?savedPreferences.data():{})};
      let hasHistory=false;
      days.forEach(day=>{
        hasHistory=true;
        if(!settings.exists())return;
        const record=day.data();
        if(record.activities?.length || Object.keys(record.details || {}).length){
          data.entries[day.id]=record.activities || [];
          data.details[day.id]=record.details || {};
        }
      });
      if(!savedPreferences.exists()){
        if(cached?.data)data.interface={...data.interface,...cached.data.interface};
        const previousOnboarding=cached?.data?.interface?.onboarding;
        if(previousOnboarding)data.interface={...data.interface,onboarding:previousOnboarding};
        else if(!settings.exists() && !hasHistory && !cached?.data)data.interface={...data.interface,onboarding:'pending'};
      }
      if(settings.exists()) {
        baseline=clone(data);
        if(!savedPreferences.exists() && cached?.data)baseline.interface=settings.data().interface || {};
      } else {baseline={...window.calendarApp.defaults(),schemaVersion:0};queue(data);}
    } catch(error) {
      if(['permission-denied','unauthenticated'].includes(error.code) || !cached?.data){
        loaderStarted=true;
        throw error;
      }
      usingCache=true;data={...cached.data,...remoteAppearance};baseline=clone(data);
    }
  }
  if(token!==generation)return;
  showLoader(data);
  await waitForLoaderAnimation();
  if(token!==generation)return;
  window.calendarApp.setAccount({uid:user.uid,displayName:user.displayName,email:user.email,emailVerified:user.emailVerified,photoURL:user.photoURL,createdAt:user.metadata.creationTime,lastLoginAt:user.metadata.lastSignInTime},logins);
  data=recoverMembership(data);
  display(data);
  applying=true;
  try { window.calendarApp.start(); } finally { applying=false; }
  checkpoint(window.calendarApp.exportForStorage()); status();
  // Persist normalized/migrated settings as well as newly introduced interface preferences.
  if(!usingCache)window.calendarCloud.save(window.calendarApp.exportForStorage());
  watch(user.uid,token); void flush();
  // Login history is ancillary: a failed profile read must never block the calendar.
  if(navigator.onLine)void updateProfile(user,token).catch(()=>{});
}
function loginClient(agent) {
  const browser=/Edg(?:e|A|iOS)?\//.test(agent)?'Microsoft Edge'
    : /OPR\//.test(agent)?'Opera'
    : /(?:Firefox|FxiOS)\//.test(agent)?'Firefox'
    : /SamsungBrowser\//.test(agent)?'Samsung Internet'
    : /(?:Chrome|CriOS)\//.test(agent)?'Google Chrome'
    : /Version\/.*Safari\//.test(agent)?'Safari':'';
  const system=/Android/.test(agent)?'Android'
    : /iPad/.test(agent)?'iPadOS'
    : /iPhone|iPod/.test(agent)?'iOS'
    : /CrOS/.test(agent)?'ChromeOS'
    : /Windows/.test(agent)?'Windows'
    : /Macintosh/.test(agent)?'macOS'
    : /Linux/.test(agent)?'Linux':'';
  return {browser,system};
}
async function updateProfile(user,token) {
  const ref=doc(db,'users',user.uid,'settings','profile'),login=user.metadata.lastSignInTime;
  const logins=await runTransaction(db,async transaction=>{
    const snapshot=await transaction.get(ref);
    const entries=snapshot.data()?.logins;
    const history=Array.isArray(entries)?entries:[];
    if(token!==generation || !login || history.some(entry=>(typeof entry==='string'?entry:entry?.stamp)===login))return history;
    const stampTime=entry=>Date.parse(typeof entry==='string'?entry:entry?.stamp);
    const earliest=Date.now()-366*86400000;
    const next=[{stamp:login,...loginClient(navigator.userAgent)},...history]
      .filter(entry=>stampTime(entry)>=earliest).sort((a,b)=>stampTime(b)-stampTime(a)).slice(0,1000);
    transaction.set(ref,{logins:next},{merge:true});
    return next;
  });
  if(token!==generation)return;
  storeLocal(cacheKey(user.uid),{data:window.calendarApp.exportForStorage(),logins});
  window.calendarApp.setAccount({uid:user.uid,displayName:user.displayName,email:user.email,emailVerified:user.emailVerified,photoURL:user.photoURL,createdAt:user.metadata.creationTime,lastLoginAt:login},logins);
}
$('googleLogin').addEventListener('click',async()=>{
  if(!auth || account || $('googleLogin').hidden || $('googleLogin').disabled)return;
  if(!navigator.onLine){$('authStatus').textContent='La première connexion Google nécessite Internet.';return;}
  $('googleLogin').disabled=true; $('authStatus').textContent='Connexion à Google…';
  try {await signInWithPopup(auth,new GoogleAuthProvider());}
  catch(error){$('authStatus').textContent=error.code==='auth/popup-blocked'?'Autorisez la fenêtre de connexion puis réessayez.':'Connexion interrompue. Vous pouvez réessayer.';}
  finally{$('googleLogin').disabled=false;}
});
$('logout').addEventListener('click',async()=>{
  if(writing || latest || recovery.length){$('syncStatus').textContent='Synchronisez les modifications avant de vous déconnecter.';return;}
  const uid=account?.uid;lock('','pending');
  try {await signOut(auth);if(uid){removeLocal(cacheKey(uid));removeLocal(queueKey(uid));}}
  catch{lock('Déconnexion impossible. Rechargez la page.');}
});
window.addEventListener('beforeunload',event=>{
  if((writing || latest || recovery.length) && !durable){event.preventDefault();event.returnValue='';}
});
try {
  if(!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.authDomain || !firebaseConfig.appId)throw new Error('Firebase configuration missing');
  const app=initializeApp(firebaseConfig);auth=getAuth(app);
  db=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})});
  onAuthStateChanged(auth,user=>{
    const token=++generation;clearTimeout(retryTimer);
    unsubscribers.forEach(unsubscribe=>unsubscribe());unsubscribers=[];
    account=user;baseline=null;latest=null;writing=false;recovery=[];
    $('calendar').replaceChildren();$('statisticsContent').replaceChildren();
    if(!user){
      window.calendarApp.setLoadingAppearance();
      window.calendarApp.rememberFavicon();
      window.calendarApp.setAccount(null);
      lock('Vérification de la session…','loading');
      void waitForLoaderAnimation().then(()=>{if(token===generation)lock('','login');});
      return;
    }
    void initializeUser(user,token).catch(async error=>{
      await waitForLoaderAnimation();
      if(token!==generation)return;
      lock(!navigator.onLine?'Aucune copie de ce compte sur cet appareil. Rétablissez la connexion Internet, puis rechargez la page.':'Chargement impossible. Vérifiez la connexion et les règles Firebase.');
      console.error('Calendar initialization failed:',error.code);
    });
  },()=>{void waitForLoaderAnimation().then(()=>lock('Impossible de vérifier la session. Rechargez la page pour réessayer.'));});
} catch {void waitForLoaderAnimation().then(()=>lock('La connexion sera disponible après la configuration de Firebase.'));}

