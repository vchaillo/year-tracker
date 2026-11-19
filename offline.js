// Cache the application shell. Account data is scoped in cloud.js.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(error=>{
      console.warn('Year Tracker could not register its offline cache.',error);
    });
  });
}
