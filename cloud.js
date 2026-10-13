import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, collection, getDocFromServer, getDocsFromServer, writeBatch, onSnapshot, arrayUnion, arrayRemove, deleteField, FieldPath } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const $ = id => document.getElementById(id);
const gate = $('authGate'), content = $('authenticatedApp');
let auth, db, account, baseline, latest, writing = false, applying = false;
let unsubscribers = [], generation = 0, retryTimer, retryDelay = 1000, durable = true, recovery = [];
const clientId = crypto.randomUUID();
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
  if(!same(preferences(before),preferences(after)))Object.assign(merged,preferences(after));
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
function readLocal(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } }
function storeLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); durable = true; return true; }
  catch { durable = false; $('syncStatus').textContent = 'Stockage local indisponible — gardez cette page ouverte'; return false; }
}
function removeLocal(key) { try { localStorage.removeItem(key); } catch {} }
function checkpoint(data) {
  if (account) storeLocal(cacheKey(account.uid), {data, logins:readLocal(cacheKey(account.uid))?.logins || []});
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
function lock(message) {
  content.hidden=true; content.inert=true; gate.hidden=false; $('authStatus').textContent=message;
  content.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
  $('modalBackdrop').classList.remove('open');
}
function display(data) {
  applying=true;
  try { window.calendarApp.load(clone(data)); } finally { applying=false; }
  content.hidden=false; content.inert=false; gate.hidden=true;
}
function preferences(data) {
  const activeCategory=data.activeCategory || data.categories[0]?.id || null;
  const selections=data.selections || Object.fromEntries(data.categories.map(category=>[category.id,data.activities.filter(activity=>activity.categoryId===category.id).map(activity=>activity.id)]));
  return {year:data.year || new Date().getFullYear(),activeCategory,selections,selectedActivities:data.selectedActivities || selections[activeCategory] || [],theme:data.theme || 'system',accent:data.accent || '#d9f34a',goalOrder:data.goalOrder || [],interface:data.interface || {}};
}
async function writeChanges(uid, before, after) {
  const operations=[];
  if (!before || !same(preferences(before),preferences(after))) operations.push([doc(db,'users',uid,'settings','preferences'),preferences(after),false]);
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
    operations.push([ref,{...(added.length?{activities:arrayUnion(...added)}:{}),...(Object.keys(details).length?{details}:{})},{mergeFields:[...(added.length?['activities']:[]),...Object.keys(details).map(id=>new FieldPath('details',id))]}]);
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
      queue(window.calendarApp.export());
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
function watch(uid,token) {
  const received={};
  const receive=(part,data,snapshot)=>{
    if (token!==generation || writing || latest || recovery.length || snapshot.metadata?.hasPendingWrites) return;
    received[part]=data;
    // Publish a coherent workspace only after all three subscriptions have delivered.
    if (!received.calendar || !received.preferences || !received.days) return;
    baseline={...window.calendarApp.defaults(),...received.calendar,...received.preferences,...received.days};
    checkpoint(baseline); display(baseline); status();
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
    snapshot.forEach(day=>{const data=day.data();if(data.activities?.length){entries[day.id]=data.activities;details[day.id]=data.details || {};}});
    receive('days',{entries,details},snapshot);
  },fail));
}
async function initializeUser(user,token) {
  lock('Chargement de votre calendrier…');
  const cached=readLocal(cacheKey(user.uid));
  recovery=pendingRecords(user.uid);
  let data,logins=cached?.logins || [];
  if (recovery.length) {
    data=clone(cached?.data || recovery[0].value.before);
    recovery.forEach(record=>{data=mergePending(data,record.value.before,record.value.after);});
    baseline=clone(data);
  } else {
    try {
      if(!navigator.onLine)throw Object.assign(new Error('Offline'),{code:'unavailable'});
      const [settings,savedPreferences,days]=await Promise.all([
        getDocFromServer(doc(db,'users',user.uid,'settings','calendar')),
        getDocFromServer(doc(db,'users',user.uid,'settings','preferences')),
        getDocsFromServer(collection(db,'users',user.uid,'days'))
      ]);
      if(token!==generation)return;
      data=window.calendarApp.defaults();
      if(settings.exists()) {
        Object.assign(data,settings.data(),savedPreferences.exists()?savedPreferences.data():{});
        days.forEach(day=>{if(day.data().activities?.length){data.entries[day.id]=day.data().activities;data.details[day.id]=day.data().details || {};}});
        baseline=clone(data);
      } else {baseline={...window.calendarApp.defaults(),schemaVersion:0};queue(data);}
    } catch(error) {
      if(['permission-denied','unauthenticated'].includes(error.code) || !cached?.data)throw error;
      data=cached.data;baseline=clone(data);
    }
  }
  if(token!==generation)return;
  window.calendarApp.setAccount({displayName:user.displayName,email:user.email,photoURL:user.photoURL,createdAt:user.metadata.creationTime,lastLoginAt:user.metadata.lastSignInTime},logins);
  display(data); checkpoint(data); status();
  // Persist normalized/migrated settings as well as newly introduced interface preferences.
  window.calendarCloud.save(window.calendarApp.export());
  watch(user.uid,token); void flush();
  // Login history is ancillary: a failed profile read must never block the calendar.
  if(navigator.onLine)void updateProfile(user,token).catch(()=>{});
}
async function updateProfile(user,token) {
  const ref=doc(db,'users',user.uid,'settings','profile'),snapshot=await getDocFromServer(ref);
  if(token!==generation)return;
  const logins=snapshot.exists()?snapshot.data().logins || []:[],login=user.metadata.lastSignInTime;
  if(login && !logins.includes(login)){logins.unshift(login);logins.splice(10);const batch=writeBatch(db);batch.set(ref,{logins});await batch.commit();}
  if(token!==generation)return;
  storeLocal(cacheKey(user.uid),{data:window.calendarApp.export(),logins});
  window.calendarApp.setAccount({displayName:user.displayName,email:user.email,photoURL:user.photoURL,createdAt:user.metadata.creationTime,lastLoginAt:login},logins);
}
$('googleLogin').addEventListener('click',async()=>{
  if(!auth)return;
  if(!navigator.onLine){$('authStatus').textContent='La première connexion Google nécessite Internet.';return;}
  $('googleLogin').disabled=true; $('authStatus').textContent='Connexion à Google…';
  try {await signInWithPopup(auth,new GoogleAuthProvider());}
  catch(error){$('authStatus').textContent=error.code==='auth/popup-blocked'?'Autorisez la fenêtre de connexion puis réessayez.':'Connexion interrompue. Vous pouvez réessayer.';}
  finally{$('googleLogin').disabled=false;}
});
$('logout').addEventListener('click',async()=>{
  if(writing || latest || recovery.length){$('syncStatus').textContent='Synchronisez les modifications avant de vous déconnecter.';return;}
  const uid=account?.uid;lock('Déconnexion…');
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
    $('calendar').replaceChildren();$('legend').replaceChildren();$('toolbar').replaceChildren();
    if(!user){window.calendarApp.setAccount(null);lock('');$('googleLogin').hidden=false;$('googleLogin').disabled=false;return;}
    $('googleLogin').hidden=true;
    void initializeUser(user,token).catch(error=>{
      if(token!==generation)return;
      lock(!navigator.onLine?'Aucune copie de ce compte sur cet appareil. Connectez-vous une première fois avec Internet.':'Chargement impossible. Vérifiez la connexion et les règles Firebase.');
      console.error('Calendar initialization failed:',error.code);
    });
  });
} catch {lock('La connexion sera disponible après la configuration de Firebase.');}
