self.addEventListener('install',event=>{
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    try{
      const keys=await caches.keys();
      await Promise.all(keys.map(k=>caches.delete(k)));
    }catch(e){}
    try{await self.registration.unregister();}catch(e){}
    try{
      const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
      for(const c of clients){
        try{
          const u=new URL(c.url);
          u.searchParams.set('_iana_refresh','213');
          await c.navigate(u.toString());
        }catch(e){}
      }
    }catch(e){}
  })());
});
// Deliberately no fetch handler: this worker exists only to remove old cached demo versions.
