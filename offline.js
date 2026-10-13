// Cache the application shell, not account data. Account data is scoped in cloud.js.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const label=document.getElementById('offlineReady');
    try {
      await navigator.serviceWorker.register('./sw.js');
      await navigator.serviceWorker.ready;
      if(label)label.textContent='Mode hors ligne prêt sur cet appareil. Les modifications seront synchronisées au retour du réseau.';
    } catch {
      if(label)label.textContent='Cache de l’application indisponible. Gardez la page ouverte pour travailler sans réseau.';
    }
  });
} else {
  const label=document.getElementById('offlineReady');
  if(label)label.textContent='Ce navigateur ne permet pas le rechargement hors ligne.';
}
