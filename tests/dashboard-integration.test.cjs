const fs=require('fs'),assert=require('assert'),vm=require('vm'),crypto=require('crypto');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8'),app=fs.readFileSync('app.js','utf8');
const ENDPOINT='https://n8n.vps12198.panel.icontainer.cloud/webhook/zion-salao-nayara-painel',OLD='https://n8n.vps12198.panel.icontainer.cloud/webhook/iana-web-live-v242-api';
const key='fixture-key-not-a-real-secret',contact='whatsapp:5547000000001',results=[];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function check(name,f){try{await f();results.push({test:name,passed:true})}catch(e){results.push({test:name,passed:false,error:e.message})}}
function setup(stored={},mode='ok'){
 const dom=new JSDOM(html,{url:'https://gabrieelwilliam-source.github.io/Salao/',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window,calls=[],errors=[];
 w.matchMedia=()=>({matches:false,addEventListener(){}});Object.defineProperty(w.crypto,'randomUUID',{value:()=>crypto.randomUUID()});w.AbortController=AbortController;
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};
 w.addEventListener('error',e=>errors.push(e.message));
 for(const [k,v]of Object.entries(stored))w.localStorage.setItem(k,v);
 const profile={customer_name:'Cliente Fictícia',contact_id:'5547000000001',whatsapp_phone:'5547000000001',lifetime_paid_cents:0};
 w.fetch=async(url,opt)=>{const body=JSON.parse(opt.body);calls.push({url,action:body.action,params:body.params,cache:opt.cache});if(mode==='unauthorized')return new Response(JSON.stringify({ok:false,error:'unauthorized'}),{status:401});
 const ping={ok:true,version:'53.0',latest_event_id:1,integration:{id:mode==='mismatch'?'other-system':'zion-salao-nayara-v53'}};
 const data={dashboard:{metrics:{conversations:1,pending_nayara:1,appointments_today:0,received_cents:0},funnel:{},agenda_today:[]},pending:{rows:[{id:1,contact_key:contact,display_name:'Cliente Fictícia',summary:'Avaliação fictícia',status:'aguardando_nayara',created_at:new Date().toISOString()}],total:1},conversations:{rows:[{contact_key:contact,customer_name:'Cliente Fictícia',last_message:'Teste fictício',last_message_at:new Date().toISOString(),author:'Cliente',responsible:'iana'}],total:1},conversation:{profile,control:{responsible:'iana'},messages:[{id:'m:1',role:'client',author:'Cliente',content:'<img src=x onerror=alert(1)>',created_at:new Date().toISOString()}],total_messages:1,note:{},financial:[],services:[],history:[],facts:[],deliveries:[]},agenda:{appointments:[],requests:[]},clients:{rows:[{contact_key:contact,...profile}],total:1},finance:{summary:{paid_cents:0,charged_cents:12000,refund_cents:0,quote_cents:0},rows:[],total:0},insights:{totals:{reactivation:0,opportunities:0,attention:0},opportunities:[],attention:[],reactivation:[]},health:{metrics:[],settings:[]},sync:{latest_event_id:1,changed_sources:[]},takeover:{success:true},release:{success:true},save_note:{success:true},financial:{success:true},appointment:{success:true},send_message:{success:true,delivery_status:'sent'}};
 const r=body.action==='ping'?ping:{ok:true,data:data[body.action]||{success:true}};return new Response(JSON.stringify(r),{status:200});};
 w.eval(app);return {dom,w,calls,errors};
}
(async()=>{
 const x=setup();await delay(30);
 await check('connection_prefilled_without_secret',()=>{assert.equal(x.w.document.getElementById('apiUrl').value,ENDPOINT);assert.equal(x.w.document.getElementById('apiKey').value,'');assert.equal(x.calls.length,0)});
 x.w.document.getElementById('apiKey').value=key;x.w.document.getElementById('saveConnectionBtn').click();await delay(80);
 await check('connect_and_dashboard_render',()=>{assert(x.w.document.getElementById('setupScreen').classList.contains('hidden'));assert.equal(x.w.document.getElementById('mPending').textContent,'1');assert.equal(x.w.localStorage.getItem('iana_n8n_access_key'),key)});
 for(const page of ['conversas','pendencias','agenda','clientes','financeiro','resumos','inteligencia','iana'])await check('navigation_'+page,async()=>{x.w.document.querySelector('[data-page="'+page+'"]').click();await delay(30);assert(x.w.document.getElementById('page-'+page).classList.contains('active'));});
 x.w.document.querySelector('[data-page="conversas"]').click();await delay(30);x.w.document.querySelector('#conversationList [data-contact]').click();await delay(50);
 await check('conversation_message_escaped',()=>{assert(x.w.document.getElementById('chatMessages').textContent.includes('<img'));assert.equal(x.w.document.querySelector('#chatMessages img'),null)});
 await check('takeover_is_explicit_and_idempotent',async()=>{const n=x.calls.length;x.w.document.querySelector('[data-action="takeover"]').click();await delay(60);const call=x.calls.slice(n).find(c=>c.action==='takeover');assert(call);assert(call.params.request_id.length>=16);assert(!x.calls.slice(n).some(c=>c.action==='send_message'))});
 await check('manual_send_fixture_only',async()=>{x.w.document.getElementById('messageDraft').value='Mensagem exclusivamente fictícia';x.w.document.getElementById('composeForm').dispatchEvent(new x.w.Event('submit',{cancelable:true,bubbles:true}));await delay(60);assert(x.calls.some(c=>c.action==='send_message'&&c.params.text==='Mensagem exclusivamente fictícia'&&c.params.request_id));assert.equal(x.w.document.getElementById('messageDraft').value,'')});
 await check('all_data_calls_post_no_store_current_endpoint',()=>assert(x.calls.every(c=>c.url===ENDPOINT&&c.cache==='no-store')));
 await check('no_uncaught_dom_errors',()=>assert.deepEqual(x.errors,[]));x.dom.window.close();
 const m=setup({iana_n8n_api_url:OLD,iana_n8n_access_key:key});await delay(80);
 await check('legacy_url_migrates_after_valid_ping',()=>{assert.equal(m.w.localStorage.getItem('iana_n8n_api_url'),ENDPOINT);assert.equal(m.w.localStorage.getItem('iana_n8n_access_key'),key);assert(m.calls.every(c=>c.url===ENDPOINT))});m.dom.window.close();
 for(const mode of ['unauthorized','mismatch']){const t=setup({},mode);t.w.document.getElementById('apiKey').value=key;t.w.document.getElementById('saveConnectionBtn').click();await delay(40);await check('reject_'+mode+'_without_saving_key',()=>{assert(!t.w.document.getElementById('setupScreen').classList.contains('hidden'));assert.equal(t.w.localStorage.getItem('iana_n8n_access_key'),null);assert(t.w.document.getElementById('gateMessage').textContent.length>0)});t.dom.window.close();}
 const listeners={},cached=[],deleted=[];let intercepted=0,installed=false;const scope='https://gabrieelwilliam-source.github.io/Salao/';const self={registration:{scope},location:{origin:'https://gabrieelwilliam-source.github.io'},addEventListener:(n,f)=>listeners[n]=f,skipWaiting:async()=>{installed=true},clients:{claim:async()=>{}}};
 const caches={open:async()=>({addAll:async paths=>{for(const path of paths){const p=path==='./'?'index.html':path.replace(/^\.\//,'').split('?')[0];assert(fs.existsSync(''+p),'Missing shell asset '+p);cached.push(path)}},put:async()=>{}}),keys:async()=>['iana-gestao-pwa-v1','iana-gestao-zion-20261014-1','unrelated'],delete:async k=>deleted.push(k),match:async()=>({})};
 vm.runInNewContext(fs.readFileSync('service-worker.js','utf8'),{self,caches,URL,fetch:async()=>({ok:true,clone(){return this}})});
 await check('pwa_shell_all_assets_exist',async()=>{let p;listeners.install({waitUntil:x=>p=x});await p;assert(installed&&cached.length===10)});
 await check('pwa_removes_only_old_app_caches',async()=>{let p;listeners.activate({waitUntil:x=>p=x});await p;assert.deepEqual(deleted,['iana-gestao-pwa-v1'])});
 await check('pwa_never_caches_api_or_post',()=>{for(const request of [{method:'POST',url:ENDPOINT,mode:'cors'},{method:'GET',url:ENDPOINT,mode:'cors'}])listeners.fetch({request,respondWith:()=>intercepted++});assert.equal(intercepted,0)});
 const summary={test_type:'DOM and service worker tests with fictitious API responses; no browser rendering or real client operations',total:results.length,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,tests:results};console.log(JSON.stringify(summary));if(summary.failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
