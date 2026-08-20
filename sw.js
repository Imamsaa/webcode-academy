const CACHE='webcode-academy-v1';
const ASSETS=['./','./index.html','./style.css','./app.js','./data.js','./manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(u.origin!==location.origin)return;
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
