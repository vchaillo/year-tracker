import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getFirestore, doc, collection, getDocFromServer, getDocsFromServer, writeBatch, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const $ = id => document.getElementById(id);
const gate = $('authGate');
const content = $('authenticatedApp');
let auth, db, account, baseline, latest, writing = false, applying = false;
let unsubscribers = [], generation = 0;
const clone = value => JSON.parse(JSON.stringify(value));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const metadata = data => ({schemaVersion: 6, paletteVersion: 3, categories: data.categories, activities: data.activities});

function lock(message) {
  content.hidden = true;
  content.inert = true;
  gate.hidden = false;
  $('authStatus').textContent = message;
  content.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  $('modalBackdrop').classList.remove('open');
}

function display(data) {
  applying = true;
  try { window.calendarApp.load(data); } finally { applying = false; }
  content.hidden = false;
  content.inert = false;
  gate.hidden = true;
}

async function writeChanges(uid, before, after) {
  const operations = [];
  if (!before || !same(metadata(before), metadata(after))) {
    operations.push([doc(db, 'users', uid, 'settings', 'calendar'), metadata(after)]);
  }
  const dates = new Set([...Object.keys(before?.entries || {}), ...Object.keys(after.entries)]);
  dates.forEach(date => {
    if (!same(before?.entries?.[date] || [], after.entries[date] || [])) {
      // Keep empty documents as tombstones so deletions also reach other devices.
      operations.push([doc(db, 'users', uid, 'days', date), {activities: after.entries[date] || []}]);
    }
  });
  for (let offset = 0; offset < operations.length; offset += 400) {
    const batch = writeBatch(db);
    operations.slice(offset, offset + 400).forEach(([ref, value]) => batch.set(ref, value));
    await batch.commit();
  }
}

async function flush() {
  if (writing || !account || !latest || !baseline) return;
  writing = true;
  const token = generation, uid = account.uid;
  try {
    while (latest && token === generation) {
      const next = latest;
      latest = null;
      $('syncStatus').textContent = 'Synchronisation…';
      await writeChanges(uid, baseline, next);
      baseline = clone(next);
    }
    if (token === generation) {
      $('syncStatus').textContent = 'Enregistré';
      // Re-read current snapshots after writes to include concurrent remote changes.
      unsubscribers.forEach(unsubscribe => unsubscribe());
      unsubscribers = [];
      watch(uid, token);
    }
  } catch (error) {
    if (token === generation) {
      latest = window.calendarApp.export();
      $('syncStatus').textContent = 'Échec de sauvegarde — Réessayer';
      $('syncStatus').title = error.code || 'Erreur réseau';
    }
  } finally {
    if (token === generation) writing = false;
  }
}

window.calendarCloud = {
  save(data) {
    if (applying || !account || !baseline) return;
    if (!latest && same(metadata(data), metadata(baseline)) && same(data.entries, baseline.entries)) return;
    latest = clone(data);
    void flush();
  }
};
$('syncStatus').addEventListener('click', () => void flush());
$('syncStatus').tabIndex = 0;
$('syncStatus').addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); void flush(); }
});

function watch(uid, token) {
  const receive = update => {
    if (token !== generation || writing || latest) return;
    update();
    const preferences = window.calendarApp.export();
    display({...preferences, ...metadata(baseline), entries: baseline.entries});
  };
  const fail = error => {
    if (token !== generation) return;
    lock('Impossible de charger le calendrier. Rechargez la page pour réessayer.');
    console.error('Calendar subscription failed:', error.code);
  };
  unsubscribers.push(onSnapshot(doc(db, 'users', uid, 'settings', 'calendar'), snapshot => {
    if (snapshot.exists()) receive(() => Object.assign(baseline, snapshot.data()));
  }, fail));
  unsubscribers.push(onSnapshot(collection(db, 'users', uid, 'days'), snapshot => {
    receive(() => {
      snapshot.docChanges().forEach(change => {
        const ids = change.type === 'removed' ? [] : change.doc.data().activities;
        if (ids?.length) baseline.entries[change.doc.id] = ids;
        else delete baseline.entries[change.doc.id];
      });
    });
  }, fail));
}

function readLegacy() {
  try {
    const data = JSON.parse(localStorage.getItem('year-tracker-v2') || 'null');
    if (data && Array.isArray(data.activities) && data.entries && !Array.isArray(data.entries)) return data;
  } catch { /* A corrupt local calendar is never uploaded automatically. */ }
  return null;
}

async function initializeUser(user, token) {
  lock('Chargement de votre calendrier…');
  const settings = await getDocFromServer(doc(db, 'users', user.uid, 'settings', 'calendar'));
  const days = await getDocsFromServer(collection(db, 'users', user.uid, 'days'));
  if (token !== generation) return;
  let data = window.calendarApp.defaults();
  if (settings.exists()) {
    Object.assign(data, settings.data());
    days.forEach(day => { if (day.data().activities?.length) data.entries[day.id] = day.data().activities; });
  } else {
    const legacy = readLegacy();
    if (legacy) {
      $('importChoice').hidden = false;
      $('authStatus').textContent = 'Vous êtes connecté. Choisissez votre calendrier de départ.';
      data = await new Promise(resolve => {
        $('importLegacy').onclick = () => resolve(legacy);
        $('startEmpty').onclick = () => resolve(data);
      });
      $('importChoice').hidden = true;
      if (token !== generation) return;
      // Run existing migrations before uploading the legacy calendar.
      applying = true;
      window.calendarApp.load(data);
      applying = false;
      data = window.calendarApp.export();
    }
    await writeChanges(user.uid, null, data);
    if (token !== generation) return;
    // The original local data stays untouched as an import backup.
  }
  baseline = clone(data);
  display(data);
  $('syncStatus').textContent = 'Enregistré';
  watch(user.uid, token);
}

$('googleLogin').addEventListener('click', async () => {
  if (!auth) return;
  $('googleLogin').disabled = true;
  $('authStatus').textContent = 'Connexion à Google…';
  try { await signInWithPopup(auth, new GoogleAuthProvider()); }
  catch (error) {
    $('authStatus').textContent = error.code === 'auth/popup-blocked'
      ? 'Autorisez la fenêtre de connexion puis réessayez.' : 'Connexion interrompue. Vous pouvez réessayer.';
  } finally { $('googleLogin').disabled = false; }
});
$('logout').addEventListener('click', async () => {
  if (writing || latest) { $('syncStatus').textContent = 'Attendez la sauvegarde avant de vous déconnecter.'; return; }
  lock('Déconnexion…');
  try { await signOut(auth); } catch { lock('Déconnexion impossible. Rechargez la page.'); }
});
window.addEventListener('beforeunload', event => {
  if (writing || latest) { event.preventDefault(); event.returnValue = ''; }
});

try {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.authDomain || !firebaseConfig.appId) {
    throw new Error('Firebase configuration missing');
  }
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  onAuthStateChanged(auth, user => {
    const token = ++generation;
    unsubscribers.forEach(unsubscribe => unsubscribe());
    unsubscribers = [];
    account = user; baseline = null; latest = null; writing = false;
    $('importChoice').hidden = true;
    // Clear the rendered account data immediately when the identity changes.
    $('calendar').replaceChildren(); $('legend').replaceChildren(); $('toolbar').replaceChildren();
    if (!user) { lock(''); $('googleLogin').disabled = false; return; }
    $('googleLogin').hidden = true;
    void initializeUser(user, token).catch(error => {
      if (token !== generation) return;
      lock('Chargement impossible. Vérifiez votre connexion et rechargez la page.');
      console.error('Calendar initialization failed:', error.code);
    });
  });
  onAuthStateChanged(auth, user => { $('googleLogin').hidden = Boolean(user); });
} catch {
  lock('La connexion sera disponible après la configuration de Firebase.');
}
