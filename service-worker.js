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

/* IANA V52.3.3 - fila inteligente */
(function(){
 if(window.__IANA5233__) return;
 window.__IANA5233__=true;

 const ignoreTerms=[
  /banco do vale/i,
  /tmb/i,
  /portal do mei/i,
  /solicita[cç][aã]o de cr[eé]dito/i
 ];

 function isNoise(t){
   return ignoreTerms.some(r=>r.test(t));
 }

 function findCard(el){
   let p=el;
   for(let i=0;i<8 && p;i++,p=p.parentElement){
     let txt=(p.innerText||"");
     if(txt.includes("Serviço") && txt.includes("Status")) return p;
   }
   return el.parentElement;
 }

 function apply(){
  document.querySelectorAll("button,a").forEach(btn=>{
   if(!/ver conversa/i.test(btn.textContent||"")) return;
   if(btn.dataset.v5233) return;
   btn.dataset.v5233="1";

   const card=findCard(btn);
   if(!card) return;

   const txt=card.innerText||"";

   if(isNoise(txt)){
      card.dataset.ianaNoise="true";
   }

   const box=document.createElement("div");
   box.className="iana-v5233-actions";

   const resolve=document.createElement("button");
   resolve.className="iana-v5233-btn";
   resolve.innerHTML="✓ Resolver";

   const ignore=document.createElement("button");
   ignore.className="iana-v5233-btn";
   ignore.innerHTML="Ignorar";

   resolve.onclick=()=>{
      card.style.opacity="0";
      setTimeout(()=>card.remove(),200);
   };

   ignore.onclick=()=>{
      const motivo=prompt("Motivo para ignorar esta pendência:");
      if(motivo===null) return;
      card.style.opacity="0";
      setTimeout(()=>card.remove(),200);
   };

   box.append(resolve,ignore);
   btn.insertAdjacentElement("afterend",box);
  });
 }

 new MutationObserver(apply).observe(document.body,{childList:true,subtree:true});
 window.addEventListener("load",apply);
})();
