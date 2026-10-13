// Version the entire shell so a new release cannot mix incompatible scripts.
const CACHE='year-tracker-shell-12';
const SDK='https://www.gstatic.com/firebasejs/12.19.0/';
const SHELL=['./','./index.html','./style.css?v=workspace-12','./script.js?v=workspace-12','./cloud.js?v=workspace-12','./offline.js?v=workspace-12','./firebase-config.js','./emoji-data.json',SDK+'firebase-app.js',SDK+'firebase-auth.js',SDK+'firebase-firestore.js'];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(SHELL);await self.skipWaiting();})());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('year-tracker-shell-')&&key!==CACHE).map(key=>caches.delete(key)));await self.clients.claim();})());
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET')return;
  // Never cache Firebase network responses, OAuth requests, or Google profile photos.
  const sdk=url.href.startsWith(SDK),local=url.origin===self.location.origin&&url.pathname.startsWith(new URL('./',self.location.href).pathname);
  if(!sdk&&!local)return;
  if(local&&!(event.request.mode==='navigate'||/\.(js|css|json|html)$/.test(url.pathname)))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE),cached=await cache.match(event.request);
    if(sdk&&cached)return cached;
    try {
      const response=await fetch(event.request);
      if(response.ok)await cache.put(event.request,response.clone());
      return response;
    } catch(error) {
      if(cached)return cached;
      if(event.request.mode==='navigate'&&!url.pathname.endsWith('preview.html'))return (await cache.match(new URL('./index.html',self.location.href))) || Response.error();
      throw error;
    }
  })());
});
