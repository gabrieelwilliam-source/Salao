window.IANA_WEB_BUILD='2.4.1-verified';
(() => {
const LS_URL='iana_n8n_api_url',LS_KEY='iana_n8n_access_key';
let currentPage='dashboard',currentContact=null,financeScope='today';
let loading=false,syncTimer=null,fullTimer=null,lastEventId=0,syncBusy=false;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const money=c=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(c||0)/100);
const dt=v=>v?new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(v)):'—';
const time=v=>v?new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date(v)):'—';
const dateOnly=v=>v?new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(v)):'—';
const ago=v=>{if(!v)return '—';const s=Math.floor((Date.now()-new Date(v).getTime())/1000);if(s<60)return 'agora';if(s<3600)return `há ${Math.floor(s/60)} min`;if(s<86400)return `há ${Math.floor(s/3600)} h`;return `há ${Math.floor(s/86400)} dias`};
const initials=n=>String(n||'Cliente').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(window.__t);window.__t=setTimeout(()=>t.classList.remove('show'),2500)}
function gateMsg(m,type=''){const e=$('gateMessage');e.textContent=m;e.className='gate-message '+type}
function config(){return {url:localStorage.getItem(LS_URL)||'',key:localStorage.getItem(LS_KEY)||''}}
function maskedUrl(u){if(!u)return 'Não configurado';try{const x=new URL(u);return `${x.origin}${x.pathname}`;}catch(e){return u}}
function updateConnectionUi(){
 const c=config();
 const urlEl=$('currentApiUrl');if(urlEl)urlEl.textContent=maskedUrl(c.url);
 const status=$('apiConnectionStatus');
 if(status){status.textContent=c.url&&c.key?'configurada':'não configurada';status.className='secure-pill';}
}
function openConnectionSettings(){
 const c=config();
 $('apiUrl').value=c.url||'';
 $('apiKey').value=c.key||'';
 gateMsg(c.url?'Você pode testar a conexão atual ou substituir os dados.':'Informe os dados do webhook do n8n.');
 $('setupScreen').classList.remove('hidden');
}
function closeConnectionSettings(){
 if(config().url&&config().key)$('setupScreen').classList.add('hidden');
}

function humanError(e){const m=String(e?.message||e||'Erro');if(m.includes('unauthorized'))return 'Access key inválida.';if(m.includes('Failed to fetch'))return 'Não consegui acessar o webhook. Confirme a Production URL, workflow ativo e HTTPS/CORS.';return m}
function setRealtime(ok,label){$('realtimeDot').className='status-dot '+(ok?'online':'offline');$('realtimeLabel').textContent=label;$('realtimeDetail').textContent=label}
async function api(action,params={}){
 const c=config();if(!c.url||!c.key)throw new Error('connection_not_configured');
 const r=await fetch(c.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({access_key:c.key,action,params}),cache:'no-store'});
 if(!r.ok)throw new Error(`HTTP ${r.status}`);
 const j=await r.json();if(!j?.ok)throw new Error(j?.detail||j?.error||'API error');
 return Object.prototype.hasOwnProperty.call(j,'data')?j.data:j;
}
async function boot(){
 const c=config();if(!c.url||!c.key){$('setupScreen').classList.remove('hidden');$('app').classList.add('hidden');return}
 try{const p=await api('ping');lastEventId=Number(p.latest_event_id||0);$('setupScreen').classList.add('hidden');$('app').classList.remove('hidden');$('userLabel').textContent='Nayara';setRealtime(true,'Live · até 3s');updateConnectionUi();await refreshAll(false);startSync()}
 catch(e){$('setupScreen').classList.remove('hidden');$('app').classList.add('hidden');gateMsg(humanError(e),'error')}
}
async function pollChanges(){
 if(syncBusy)return;syncBusy=true;
 try{const s=await api('sync',{since_event_id:lastEventId});const next=Number(s.latest_event_id||lastEventId);const sources=Array.isArray(s.changed_sources)?s.changed_sources:[];lastEventId=Math.max(lastEventId,next);setRealtime(true,'Live · até 3s');for(const src of sources)await refreshForSource(src)}
 catch(e){setRealtime(false,'Reconectando…')}finally{syncBusy=false}
}
function startSync(){clearInterval(syncTimer);clearInterval(fullTimer);syncTimer=setInterval(pollChanges,3000);fullTimer=setInterval(()=>refreshCurrent(true).catch(()=>{}),30000)}
async function refreshAll(showToast=false){if(loading)return;loading=true;try{await Promise.all([loadDashboard(),loadPending()]);await refreshCurrent(false);syncStamp();if(showToast)toast('Painel conectado aos dados reais.')}catch(e){console.error(e);toast('Falha ao carregar dados: '+humanError(e))}finally{loading=false}}
async function refreshCurrent(withDashboard=true){if(withDashboard){await loadDashboard();await loadPending()}if(currentPage==='conversas')await loadConversations();if(currentPage==='pendencias')await loadPending();if(currentPage==='agenda')await loadAgenda();if(currentPage==='clientes')await loadClients();if(currentPage==='financeiro')await loadFinance();if(currentPage==='resumos')await loadInsights();if(currentPage==='iana')await loadHealth();syncStamp()}
async function refreshForSource(src){const map={salao_nayara_messages:['dashboard','conversas'],salao_nayara_handoffs:['dashboard','pendencias','agenda','conversas'],salao_nayara_crm_leads:['dashboard','clientes','agenda','conversas','resumos'],salao_nayara_crm_financial:['dashboard','financeiro','conversas','resumos'],salao_nayara_crm_facts:['conversas','resumos'],salao_nayara_system_health:['iana'],salao_nayara_crm_events:['agenda','clientes'],salao_nayara_settings:['iana']};const targets=map[src]||[currentPage,'dashboard'];if(targets.includes('dashboard'))await loadDashboard();if(targets.includes('pendencias')||src==='salao_nayara_handoffs')await loadPending();if(targets.includes(currentPage))await refreshCurrent(false);syncStamp()}
function syncStamp(){$('lastSyncLabel').textContent='sincronizado '+new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date())}
function empty(text){return `<div class="empty-state">${esc(text)}</div>`}
function statClass(s){s=String(s||'').toLowerCase();if(/confirm|realiz|pago/.test(s))return 'confirmado';if(/aguard|pend/.test(s))return 'aguardando';if(/solicit/.test(s))return 'solicitacao';if(/reclam|alta/.test(s))return 'reclamacao';return 'solicitacao'}
async function loadDashboard(){const d=await api('dashboard');const m=d?.metrics||{},f=d?.funnel||{};$('mConversations').textContent=m.conversations??0;$('mPending').textContent=m.pending_nayara??0;$('navPending').textContent=m.pending_nayara??0;$('mAppointments').textContent=m.appointments_today??0;$('mReceived').textContent=money(m.received_cents);$('mPaidCount').textContent=`${m.paid_count||0} pagamentos válidos`;
 const max=Math.max(1,f.conversations||0);$('funnel').innerHTML=[['Conversas',f.conversations],['Interesse em serviço',f.service_interest],['Pedidos de horário',f.schedule_requests],['Confirmados',f.confirmed]].map(([n,v])=>`<div class="funnel-row"><span>${n}</span><b>${v||0}</b></div><div class="bar"><i style="width:${Math.min(100,(Number(v||0)/max)*100)}%"></i></div>`).join('');
 const ag=d?.agenda_today||[];$('todayAgenda').innerHTML=ag.length?ag.map(a=>`<div class="timeline-item"><div class="timeline-time">${time(a.appointment_at)}</div><div class="timeline-dot"></div><div class="timeline-main"><strong>${esc(a.customer_name)}</strong><small>${esc(a.service_name||'Atendimento')}</small></div><span class="status ${statClass(a.appointment_status)}">${esc(a.appointment_status||'registrado')}</span></div>`).join(''):empty('Nenhum atendimento com horário registrado para hoje.');
 $('quickSummary').innerHTML=`<p><strong>${m.conversations||0}</strong> conversas de clientes hoje e <strong>${m.pending_nayara||0}</strong> pendências que exigem Nayara.</p><p>Recebido registrado: <strong>${money(m.received_cents)}</strong> em ${m.paid_count||0} pagamentos válidos.</p>`}
let pendingCache=[];
let pendingFilter='all';
function pendingReasonLabel(p){
 const r=String(p.reason||p.intent||'outros').toLowerCase();
 const map={agendamento:'Agendamento',reclamacao:'Reclamação',urgencia:'Urgência',avaliacao:'Avaliação',orcamento:'Orçamento',decisao_nao_autorizada:'Decisão da Nayara',assunto_fora_escopo:'Fora do escopo'};
 return map[r]||String(p.reason||p.intent||'Ação humana').replace(/_/g,' ');
}
function phoneBR(v){
 const n=String(v||'').replace(/\D/g,'');
 if(!n)return '';
 const x=n.startsWith('55')?n.slice(2):n;
 if(x.length===11)return `(${x.slice(0,2)}) ${x.slice(2,7)}-${x.slice(7)}`;
 if(x.length===10)return `(${x.slice(0,2)}) ${x.slice(2,6)}-${x.slice(6)}`;
 return n;
}
function pendingVisible(){
 return pendingCache.filter(p=>{
   if(pendingFilter==='all')return true;
   if(pendingFilter==='noise')return p.likely_noise===true;
   return String(p.reason||p.intent||'').toLowerCase()===pendingFilter;
 });
}
function renderPendingCards(){
 const rows=pendingVisible();
 const count=$('pendingFilterCount');if(count)count.textContent=`${rows.length} de ${pendingCache.length} pendência(s)`;
 $('pendingCards').innerHTML=rows.length?rows.map(p=>{
   const id=String(p.id||'');
   const contact=String(p.contact_key||'');
   const phone=phoneBR(p.whatsapp_phone||p.contact_id);
   const name=String(p.customer_name||'Cliente sem identificação');
   const reason=pendingReasonLabel(p);
   const action=String(p.action_required||'Revisar a conversa e decidir o próximo passo.');
   const service=p.primary_service_name||p.metadata?.collected?.servico||'—';
   const noise=p.likely_noise===true;
   return `<article class="pending-card ${noise?'pending-noise':''}" data-handoff-id="${esc(id)}"><div class="pending-top"><div class="pending-badges"><span class="priority ${String(p.priority).toLowerCase()==='alta'?'high':'normal'}">${esc(p.priority||'normal')}</span><span class="category-pill">${esc(reason)}</span>${noise?'<span class="noise-pill">provável ruído</span>':''}</div><small>${ago(p.created_at)}</small></div><div class="pending-client"><div class="avatar">${initials(name)}</div><div><h3>${esc(name)}</h3>${phone?`<p>WhatsApp · ${esc(phone)}</p>`:''}</div></div><div class="pending-summary-box"><span>Resumo</span><p>${esc(p.summary||'Sem resumo registrado.')}</p></div><div class="pending-action-box"><span>Ação necessária</span><strong>${esc(action)}</strong></div><div class="pending-info"><div><span>Serviço</span><strong>${esc(service)}</strong></div><div><span>Status</span><strong>${esc(p.status||'aguardando_nayara')}</strong></div></div><div class="pending-actions pending-actions-v5241"><button class="btn secondary" data-open-contact="${esc(contact)}">Ver conversa</button><button class="btn resolve-action" data-resolve-handoff="${esc(id)}">✓ Resolver</button><button class="btn ignore-action" data-ignore-handoff="${esc(id)}">Ignorar</button></div></article>`;
 }).join(''):empty(pendingCache.length?'Nenhuma pendência neste filtro.':'A Iana não tem nenhum handoff pendente para Nayara.');
 document.querySelectorAll('[data-open-contact]').forEach(b=>b.onclick=async()=>{gotoPage('conversas');await loadConversations('',b.dataset.openContact)});
 document.querySelectorAll('[data-resolve-handoff]').forEach(b=>b.onclick=()=>resolveHandoff(b.dataset.resolveHandoff,b));
 document.querySelectorAll('[data-ignore-handoff]').forEach(b=>b.onclick=()=>ignoreHandoff(b.dataset.ignoreHandoff,b));
}
async function resolveHandoff(id,button){
 if(!id)return toast('Pendência sem ID válido.');
 const old=button.textContent;button.disabled=true;button.textContent='Resolvendo…';
 try{
   await api('resolve_handoff',{p_handoff_id:id,p_user:'nayara_web'});
   pendingCache=pendingCache.filter(x=>String(x.id)!==String(id));
   renderPendingCards();await loadDashboard();toast('Pendência resolvida e removida da fila.');
 }catch(e){button.disabled=false;button.textContent=old;toast('Não foi possível resolver: '+humanError(e));}
}
async function ignoreHandoff(id,button){
 if(!id)return toast('Pendência sem ID válido.');
 const reason=prompt('Por que deseja ignorar esta pendência?\n\nEx.: spam, automático, duplicado, sem necessidade','sem necessidade');
 if(reason===null)return;
 const old=button.textContent;button.disabled=true;button.textContent='Removendo…';
 try{
   await api('ignore_handoff',{p_handoff_id:id,p_reason:reason,p_user:'nayara_web'});
   pendingCache=pendingCache.filter(x=>String(x.id)!==String(id));
   renderPendingCards();await loadDashboard();toast('Pendência ignorada e removida da fila.');
 }catch(e){button.disabled=false;button.textContent=old;toast('Não foi possível ignorar: '+humanError(e));}
}
async function loadPending(){
 pendingCache=await api('pending')||[];
 $('navPending').textContent=pendingCache.length;
 const short=pendingCache.slice(0,5);
 $('urgentList').innerHTML=short.length?short.map(p=>`<div class="urgent-item"><div class="urgent-avatar">${initials(p.customer_name)}</div><div><h4>${esc(p.customer_name)} · ${esc(pendingReasonLabel(p))}</h4><p>${esc(p.summary||p.primary_service_name||'Sem resumo')} · ${ago(p.created_at)}</p></div><span class="priority ${String(p.priority).toLowerCase()==='alta'?'high':'normal'}">${esc(p.priority||'normal')}</span></div>`).join(''):empty('Nenhuma pendência aberta.');
 renderPendingCards();
}
async function loadConversations(search=$('conversationSearch')?.value||'',selectKey=null){const rows=await api('conversations',{p_limit:100,p_search:search||null})||[];$('conversationCount').textContent=`${rows.length} conversas carregadas`;$('conversationList').innerHTML=rows.length?rows.map(c=>`<div class="conv-item ${c.contact_key===currentContact?'active':''}" data-conv="${esc(c.contact_key)}"><div class="avatar">${initials(c.customer_name)}</div><div><h4>${esc(c.customer_name)}</h4><p>${esc(c.last_message||'Sem mensagem')}</p></div><div class="conv-meta"><small>${ago(c.last_message_at)}</small><span class="channel-state ${c.responsible==='nayara'?'nayara':'iana'}">${c.responsible==='nayara'?'Nayara':'Iana'}</span></div></div>`).join(''):empty('Nenhuma conversa encontrada.');document.querySelectorAll('[data-conv]').forEach(x=>x.onclick=()=>loadConversation(x.dataset.conv));const target=selectKey||currentContact||(rows[0]?.contact_key);if(target)await loadConversation(target)}
async function loadConversation(key){currentContact=key;document.querySelectorAll('[data-conv]').forEach(x=>x.classList.toggle('active',x.dataset.conv===key));const d=await api('conversation',{p_contact_key:key});const p=d?.profile||{},msgs=d?.messages||[],fin=d?.financial||[],facts=d?.facts||[],h=d?.handoff||{};const name=p.customer_name||p.contact_id||'Cliente';const lastQuote=fin.find(x=>x.financial_type==='quote'&&x.record_status==='active');const lastPaid=fin.find(x=>x.financial_type==='paid'&&x.record_status==='active');$('conversationDetail').innerHTML=`<div class="conv-detail-head"><div class="conv-person"><div class="avatar">${initials(name)}</div><div><h3>${esc(name)}</h3><p>${esc(p.whatsapp_phone||p.contact_id||key)}</p></div></div><div class="conv-tags"><span class="mini-tag">${esc(p.primary_service_name||'Sem serviço')}</span>${h.id?'<span class="mini-tag">Handoff aberto</span>':''}</div></div><div class="client-summary-strip"><div><span>Relacionamento</span><strong>${esc(p.relationship_status||'—')}</strong></div><div><span>Orçamento recente</span><strong>${lastQuote?money(lastQuote.amount_cents):'—'}</strong></div><div><span>Pagamento recente</span><strong>${lastPaid?money(lastPaid.amount_cents):'—'}</strong></div><div><span>Total pago</span><strong>${money(p.lifetime_paid_cents)}</strong></div></div><div class="chat">${msgs.length?msgs.map(m=>{const o=String(m.message_origin||'').toLowerCase();const cls=o==='user'?'client':(/manual|human|nayara/.test(o)||String(m.sender_name||'').toLowerCase()==='nayara'?'nayara':'iana');return `<div class="message ${cls}">${esc(m.content||'[mídia]')}<div class="time">${dt(m.created_at)} · ${esc(m.message_origin)}</div></div>`}).join(''):empty('Sem mensagens armazenadas.')}</div><div class="observer-box"><strong>✦ Memória operacional:</strong> ${facts.length?`${facts.length} fatos recentes registrados. Último: ${esc(facts[0].fact_type)} (${Math.round(Number(facts[0].confidence||0)*100)}% confiança).`:'Nenhum fato estruturado recente.'}</div>`}
async function loadClients(){const rows=await api('clients',{p_search:$('clientSearch')?.value||null,p_limit:300})||[];$('clientTable').innerHTML=rows.length?rows.map(c=>`<tr><td><div class="client-cell"><div class="avatar">${initials(c.customer_name||c.contact_id)}</div><strong>${esc(c.customer_name||c.contact_id||'Cliente')}</strong></div></td><td>${esc(c.primary_service_name||c.last_service_name||'—')}</td><td>${ago(c.last_activity_at)}</td><td><strong>${money(c.lifetime_paid_cents)}</strong></td><td>${esc(c.relationship_status||'—')}</td><td><span class="status ${String(c.attention_priority).toLowerCase()==='alta'?'reclamacao':'solicitacao'}">${esc(c.attention_priority||'baixa')}</span></td></tr>`).join(''):`<tr><td colspan="6">Nenhum cliente encontrado.</td></tr>`}
async function loadFinance(){const d=await api('finance',{p_scope:financeScope});const s=d?.summary||{},rows=d?.rows||[];$('fPaid').textContent=money(s.paid_cents);$('fPaidCount').textContent=`${s.paid_count||0} pagamentos`;$('fCharged').textContent=money(s.charged_cents);$('fChargedCount').textContent=`${s.charged_count||0} cobranças`;$('fOpen').textContent=money(Math.max(0,Number(s.charged_cents||0)-Number(s.paid_cents||0)));$('fQuotes').textContent=money(s.quote_cents);$('fQuoteCount').textContent=`${s.quote_count||0} orçamentos`;$('financeTable').innerHTML=rows.length?rows.map(f=>`<tr><td>${dt(f.event_at)}</td><td><strong>${esc(f.customer_name)}</strong></td><td>${esc(f.service_name||'—')}</td><td><span class="status ${f.financial_type==='paid'?'confirmado':f.financial_type==='quote'?'solicitacao':'aguardando'}">${esc(f.financial_type)}</span></td><td><strong>${money(f.amount_cents)}</strong></td><td>${esc(f.payment_method||'—')}</td><td><span class="origin-pill">${esc(f.source_role||f.source_type||'—')}</span></td></tr>`).join(''):`<tr><td colspan="7">Nenhuma movimentação válida no período.</td></tr>`}
function startOfWeek(){const d=new Date(),day=(d.getDay()+6)%7;d.setHours(0,0,0,0);d.setDate(d.getDate()-day);return d}async function loadAgenda(){const st=startOfWeek(),en=new Date(st);en.setDate(en.getDate()+7);const iso=x=>x.toISOString().slice(0,10);const d=await api('agenda',{p_start:iso(st),p_end:iso(en)});const apps=d?.appointments||[],req=d?.requests||[];let days=[];for(let i=0;i<7;i++){let x=new Date(st);x.setDate(x.getDate()+i);days.push(x)}$('agendaBoard').innerHTML=days.map(day=>{const ymd=day.toLocaleDateString('en-CA');const items=apps.filter(a=>new Date(a.appointment_at).toLocaleDateString('en-CA')===ymd);return `<section class="live-day"><div class="live-day-head"><strong>${new Intl.DateTimeFormat('pt-BR',{weekday:'short'}).format(day)}</strong><span>${new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit'}).format(day)}</span></div>${items.length?items.map(a=>`<div class="live-appointment"><strong>${time(a.appointment_at)} · ${esc(a.customer_name)}</strong><small>${esc(a.service_name)} · ${esc(a.appointment_status||'registrado')}</small></div>`).join(''):empty('Livre / sem registro')}</section>`}).join('');$('agendaRequests').innerHTML=req.length?req.map(r=>`<article class="pending-card"><span class="priority normal">Solicitação</span><h3>${esc(r.customer_name)}</h3><p>${esc(r.service_name||'Serviço não definido')} · ${esc(r.preferred_day||'dia não definido')} · ${esc(r.preferred_period||'período não definido')}</p><small>${ago(r.created_at)}</small></article>`).join(''):empty('Nenhuma solicitação de agendamento aguardando Nayara.')}
async function loadInsights(){const d=await api('insights');const services=d?.top_services||[],ops=d?.opportunities||[],att=d?.attention||[],rea=d?.reactivation||[];$('insightsGrid').innerHTML=`<article class="insight hero-insight"><div class="ai-pill">✦ Dados de hoje</div><h3>${services[0]?`${esc(services[0].service_name)} lidera o interesse hoje.`:'Ainda não há serviço predominante hoje.'}</h3><p>${services.length?services.map(x=>`${esc(x.service_name)}: ${x.qty}`).join(' · '):'A Iana ainda não registrou volume suficiente para comparar serviços.'}</p></article><article class="insight"><div class="insight-icon">↗</div><h3>Orçamentos sem pagamento equivalente</h3>${ops.length?ops.slice(0,5).map(x=>`<p><strong>${esc(x.customer_name)}</strong> · ${esc(x.service_name||'serviço')} · ${money(x.amount_cents)} · ${ago(x.last_quote_at)}</p>`).join(''):'<p>Nenhuma oportunidade encontrada.</p>'}</article><article class="insight"><div class="insight-icon">!</div><h3>Atenção</h3>${att.length?att.slice(0,5).map(x=>`<p><strong>${esc(x.customer_name)}</strong> · ${esc(x.attention_reason||x.attention_priority)}</p>`).join(''):'<p>Nenhum cliente sinalizado.</p>'}</article><article class="insight"><div class="insight-icon">◎</div><h3>Reativação elegível</h3><p><strong>${rea.length}</strong> clientes estão com data de reativação vencida segundo o CRM.</p></article>`}
async function loadHealth(){const d=await api('health');const ms=d?.metrics||[],st=d?.settings||{};const errors=ms.filter(x=>String(x.severity).toLowerCase()==='error');$('healthList').innerHTML=`<div><span>Eventos de saúde (24h)</span><b>${ms.length}</b></div><div><span>Erros registrados</span><b class="${errors.length?'':'good'}">${errors.length}</b></div><div><span>Última checagem</span><b>${ms[0]?ago(ms[0].checked_at):'sem registro'}</b></div>`;$('settingsList').innerHTML=Object.keys(st).length?Object.entries(st).map(([k,v])=>`<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join(''):empty('Nenhuma configuração retornada.')}
const pages={dashboard:['Dashboard','Dados reais do salão.'],conversas:['Conversas','Histórico e contexto em tempo real.'],pendencias:['Precisa da Nayara','Decisões humanas pendentes.'],agenda:['Agenda','Agenda e solicitações registradas.'],clientes:['Clientes','CRM alimentado pela Iana.'],financeiro:['Financeiro','Orçamentos, cobranças e pagamentos.'],resumos:['Resumos','Oportunidades derivadas do CRM.'],iana:['Iana / Sistema','Saúde e configuração.']};async function gotoPage(p){currentPage=p;document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));$(`page-${p}`).classList.add('active');document.querySelector(`.nav-item[data-page="${p}"]`)?.classList.add('active');$('pageTitle').textContent=pages[p][0];$('pageSubtitle').textContent=pages[p][1];$('sidebar').classList.remove('open');$('drawerOverlay').classList.remove('open');await refreshCurrent(false)}

$('saveConnectionBtn').onclick=async()=>{
 const u=$('apiUrl').value.trim().replace(/\/$/,'');const k=$('apiKey').value.trim();
 if(!/^https?:\/\//.test(u)||k.length<20)return gateMsg('Informe a Production URL completa e a access key do instalador.','error');
 localStorage.setItem(LS_URL,u);localStorage.setItem(LS_KEY,k);gateMsg('Testando conexão…');
 try{const p=await api('ping');lastEventId=Number(p.latest_event_id||0);gateMsg('Conectado com sucesso.','good');$('setupScreen').classList.add('hidden');$('app').classList.remove('hidden');$('userLabel').textContent='Nayara';setRealtime(true,'Live · até 3s');updateConnectionUi();await refreshAll(false);startSync();toast('Painel conectado aos dados reais.')}
 catch(e){localStorage.removeItem(LS_URL);localStorage.removeItem(LS_KEY);gateMsg(humanError(e),'error')}
};
function logout(){if(!confirm('Desconectar este navegador do painel da Iana?'))return;localStorage.removeItem(LS_URL);localStorage.removeItem(LS_KEY);location.reload()}
$('logoutBtn').onclick=logout;
$('connectionBtn').onclick=openConnectionSettings;
$('connectionBtnSystem').onclick=openConnectionSettings;
$('testConnectionBtn').onclick=async()=>{try{const p=await api('ping');lastEventId=Number(p.latest_event_id||lastEventId);setRealtime(true,'Live · até 3s');updateConnectionUi();toast('Conexão com o n8n está funcionando.')}catch(e){setRealtime(false,'Falha de conexão');toast('Falha: '+humanError(e))}};

document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>gotoPage(b.dataset.page));
document.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>gotoPage(b.dataset.goto));
$('refreshBtn').onclick=()=>refreshAll(true);
$('menuBtn').onclick=()=>{$('sidebar').classList.toggle('open');$('drawerOverlay').classList.toggle('open')};
$('drawerOverlay').onclick=()=>{$('sidebar').classList.remove('open');$('drawerOverlay').classList.remove('open')};
let qTimer;$('conversationSearch').oninput=()=>{clearTimeout(qTimer);qTimer=setTimeout(()=>loadConversations(),350)};
$('clientSearch').oninput=()=>{clearTimeout(qTimer);qTimer=setTimeout(()=>loadClients(),350)};
document.querySelectorAll('[data-finance]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-finance]').forEach(x=>x.classList.remove('active'));b.classList.add('active');financeScope=b.dataset.finance;loadFinance()});

document.querySelectorAll('[data-pending-filter]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-pending-filter]').forEach(x=>x.classList.remove('active'));b.classList.add('active');pendingFilter=b.dataset.pendingFilter;renderPendingCards()});
$('todayLabel').textContent=new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'2-digit',month:'long'}).format(new Date()).toUpperCase();
updateConnectionUi();
boot();
})();