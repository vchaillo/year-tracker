const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const handlers={},values=new Map();let online=true,networkCalls=0,claimed=false;
const response=(body)=>({ok:true,body,clone(){return response(body)}});
const origin='https://example.test/year-tracker/';
const cache={addAll:async urls=>{for(const url of urls)values.set(new URL(url,origin).href,response(url));},match:async request=>values.get(typeof request==='string'?new URL(request,origin).href:request.url||request.href),put:async(request,value)=>values.set(request.url||request.href,value)};
const context={URL,Response:{error:()=>({error:true})},caches:{open:async()=>cache,keys:async()=>['year-tracker-shell-10','unrelated'],delete:async key=>{assert.equal(key,'year-tracker-shell-10')}},fetch:async request=>{networkCalls++;if(!online)throw new Error('Offline');return response(request.url)},self:{location:{href:origin+'sw.js',origin:'https://example.test'},addEventListener:(type,fn)=>handlers[type]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{claimed=true}}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8'),context);
async function request(url,mode='cors',method='GET'){let promise;handlers.fetch({request:{url,mode,method},respondWith:value=>promise=value});return promise?await promise:null;}
(async()=>{
  let installation;handlers.install({waitUntil:value=>installation=value});await installation;
  assert(values.has(origin+'index.html'));assert(values.has('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'));
  let activation;handlers.activate({waitUntil:value=>activation=value});await activation;assert(claimed);
  online=false;assert.equal((await request(origin+'','navigate')).body,'./');assert.equal((await request(origin+'?launch=home','navigate')).body,'./index.html');assert.equal((await request(origin+'script.js?v=workspace-20')).body,'./script.js?v=workspace-20');assert.equal((await request(origin+'emoji-data.json')).body,'./emoji-data.json');
  const before=networkCalls;await request('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js');assert.equal(networkCalls,before);
  assert.equal(await request('https://firestore.googleapis.com/v1/users/demo'),null);assert.equal(await request('https://accounts.google.com/o/oauth2/auth'),null);assert.equal(await request(origin+'index.html','cors','POST'),null);
  online=true;const updated=await request(origin+'style.css?v=workspace-20');assert.equal(updated.body,origin+'style.css?v=workspace-20');
  console.log('PASS: app shell and SDK precache, offline reload/fallback, fresh online assets, and no account/OAuth response caching.');
})().catch(error=>{console.error(error);process.exitCode=1});
