const pages = {
  dashboard: ["Dashboard","Visão geral do salão e da operação da Iana."],
  conversas: ["Conversas","Acompanhe atendimento, contexto e resumo de cada cliente."],
  pendencias: ["Precisa da Nayara","Decisões que a Iana não pode tomar sozinha."],
  agenda: ["Agenda","Solicitações, confirmações e histórico de atendimento."],
  clientes: ["Clientes","CRM completo com preferências e relacionamento."],
  financeiro: ["Financeiro","Orçamentos, cobranças e pagamentos sem misturar conceitos."],
  resumos: ["Resumos da Iana","Análises e oportunidades extraídas das conversas."],
  iana: ["Iana / Sistema","Saúde do agente e controles operacionais."]
};

const urgent = [
  {name:"Ana Souza", reason:"Confirmar disponibilidade", detail:"Mechas · sexta-feira à tarde", priority:"normal", ago:"há 12 min"},
  {name:"Juliana Martins", reason:"Orçamento personalizado", detail:"Coloração · foto e objetivo recebidos", priority:"normal", ago:"há 18 min"},
  {name:"Carla Ribeiro", reason:"Reclamação", detail:"Relatou insatisfação com o resultado", priority:"high", ago:"há 7 min"}
];

const agenda = [
  {time:"09:00", name:"Amanda Lima", service:"Corte", status:"realizado"},
  {time:"10:30", name:"Bruna Alves", service:"Tratamento capilar", status:"confirmado"},
  {time:"14:00", name:"Ana Souza", service:"Mechas", status:"aguardando"},
  {time:"16:00", name:"Fernanda Reis", service:"Corte", status:"solicitacao"},
  {time:"17:30", name:"Mariana Luz", service:"Cronograma capilar", status:"confirmado"}
];

const conversations = [
  {id:1,name:"Ana Souza", initials:"AS", state:"iana", time:"16:08", last:"Queria saber se tem horário sexta à tarde.", service:"Mechas", value:"R$ 450 informado", status:"Aguardando Nayara"},
  {id:2,name:"Carla Ribeiro", initials:"CR", state:"nayara", time:"15:42", last:"Queria falar com a Nayara sobre meu cabelo.", service:"Coloração", value:"—", status:"Nayara assumiu"},
  {id:3,name:"Amanda Lima", initials:"AL", state:"iana", time:"15:18", last:"Obrigada, ficou ótimo!", service:"Corte", value:"R$ 80 pago", status:"Encerrado"},
  {id:4,name:"Juliana Martins", initials:"JM", state:"iana", time:"14:51", last:"Mandei a foto que você pediu.", service:"Coloração", value:"Avaliação", status:"Aguardando Nayara"},
  {id:5,name:"Fernanda Reis", initials:"FR", state:"iana", time:"14:22", last:"Sexta de tarde seria melhor.", service:"Corte", value:"R$ 80", status:"Coletando preferência"},
  {id:6,name:"Patrícia Moraes", initials:"PM", state:"iana", time:"13:49", last:"Quanto fica o tratamento?", service:"Tratamento", value:"R$ 200", status:"Iana atendendo"},
  {id:7,name:"Luana Costa", initials:"LC", state:"nayara", time:"12:31", last:"Fiz o pix, caiu aí?", service:"Mechas", value:"R$ 480", status:"Nayara assumiu"},
  {id:8,name:"Débora Alves", initials:"DA", state:"iana", time:"11:54", last:"Pode ser amanhã de manhã.", service:"Cronograma", value:"R$ 450", status:"Aguardando Nayara"}
];

const chatByConversation = {
  1:[
    ["client","Oi Nay, quanto fica a mecha?","15:52"],
    ["nayara","Para você fica 450.","15:57"],
    ["client","Entendi. E tem horário sexta à tarde?","16:08"],
    ["iana","Anotei mechas para sexta-feira à tarde como preferência. Vou passar para a Nayara confirmar a disponibilidade.","16:08"]
  ],
  2:[
    ["client","Oi, queria falar com a Nayara sobre o resultado.","15:37"],
    ["iana","Claro. Vou encaminhar sua mensagem para a Nayara dar continuidade ao atendimento.","15:37"],
    ["nayara","Oi Carla, me conta o que aconteceu.","15:42"]
  ],
  3:[
    ["client","Obrigada, ficou ótimo!","15:18"],
    ["iana","Que bom saber! 😊","15:18"]
  ]
};

const clients = [
  ["Ana Souza","Mechas","12 dias","R$ 1.350","Recorrente"],
  ["Amanda Lima","Corte","Hoje","R$ 2.470","VIP / recorrente"],
  ["Carla Ribeiro","Coloração","21 dias","R$ 520","Atenção"],
  ["Juliana Martins","Tratamento","36 dias","R$ 840","Ativa"],
  ["Fernanda Reis","Corte","62 dias","R$ 640","Reativar"],
  ["Bruna Alves","Tratamento","Hoje","R$ 1.120","2 faltas"],
  ["Patrícia Moraes","Cronograma","44 dias","R$ 900","Ativa"]
];

const finance = [
  ["Amanda Lima","Corte","Pago","R$ 80","Pix","Conversa / Nayara"],
  ["Bruna Alves","Tratamento","Pago","R$ 200","Cartão","Registro Nayara"],
  ["Luana Costa","Mechas","Pago","R$ 480","Pix","Conversa / Nayara"],
  ["Mariana Luz","Cronograma","Pago","R$ 450","Pix","Registro Nayara"],
  ["Ana Souza","Mechas","Orçamento","R$ 450","—","Conversa / Nayara"],
  ["Fernanda Reis","Corte","Cobrado","R$ 80","—","Catálogo"]
];

const weekAgenda = [
  {day:"Segunda",date:"17 AGO",items:[["09:30","Amanda","Corte","realizado"],["14:00","Luana","Mechas","realizado"]]},
  {day:"Terça",date:"18 AGO",items:[["09:00","Amanda","Corte","realizado"],["10:30","Bruna","Tratamento","confirmado"],["14:00","Ana","Mechas","aguardando"]]},
  {day:"Quarta",date:"19 AGO",items:[["10:00","Patrícia","Tratamento","confirmado"],["15:30","Mariana","Cronograma","confirmado"]]},
  {day:"Quinta",date:"20 AGO",items:[["09:30","Juliana","Coloração","aguardando"],["16:00","Débora","Corte","solicitacao"]]},
  {day:"Sexta",date:"21 AGO",items:[["13:00","Fernanda","Corte","solicitacao"],["14:30","Ana","Mechas","aguardando"],["17:00","Camila","Tratamento","confirmado"]]}
];

function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}
function statusLabel(s){return ({confirmado:"Confirmado",aguardando:"Aguardando Nayara",solicitacao:"Solicitação",realizado:"Realizado",reclamacao:"Reclamação"})[s]||s}
function initials(name){return name.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()}

function renderUrgent(){
  const el=document.getElementById("urgentList");
  el.innerHTML=urgent.map(u=>`<div class="urgent-item">
    <div class="urgent-avatar">${initials(u.name)}</div>
    <div><h4>${escapeHtml(u.name)} · ${escapeHtml(u.reason)}</h4><p>${escapeHtml(u.detail)} · ${u.ago}</p></div>
    <span class="priority ${u.priority}">${u.priority==="high"?"Alta":"Normal"}</span>
  </div>`).join("");
}
function renderTodayAgenda(){
  document.getElementById("todayAgenda").innerHTML=agenda.map(a=>`<div class="timeline-item">
    <div class="timeline-time">${a.time}</div><div class="timeline-dot"></div>
    <div class="timeline-main"><strong>${a.name}</strong><small>${a.service}</small></div>
    <span class="status ${a.status}">${statusLabel(a.status)}</span>
  </div>`).join("");
}
function renderConversationList(filter="all"){
  const rows=conversations.filter(c=>filter==="all"||c.state===filter);
  document.getElementById("conversationList").innerHTML=rows.map(c=>`<div class="conv-item" data-conv="${c.id}">
    <div class="avatar">${c.initials}</div>
    <div><h4>${c.name}</h4><p>${c.last}</p></div>
    <div class="conv-meta"><small>${c.time}</small><span class="channel-state ${c.state}">${c.state==="iana"?"Iana":"Nayara"}</span></div>
  </div>`).join("");
  document.querySelectorAll("[data-conv]").forEach(x=>x.onclick=()=>showConversation(Number(x.dataset.conv)));
  if(rows[0]) showConversation(rows[0].id);
}
function showConversation(id){
  document.querySelectorAll("[data-conv]").forEach(x=>x.classList.toggle("active",Number(x.dataset.conv)===id));
  const c=conversations.find(x=>x.id===id); if(!c)return;
  const messages=chatByConversation[id]||[["client",c.last,c.time],["iana","Conversa resumida pela Iana. O histórico completo aparecerá aqui quando o painel estiver conectado ao banco.",c.time]];
  document.getElementById("conversationDetail").innerHTML=`<div class="conv-detail-head">
    <div class="conv-person"><div class="avatar">${c.initials}</div><div><h3>${c.name}</h3><p>WhatsApp · contato cadastrado</p></div></div>
    <div class="conv-tags"><span class="mini-tag">${c.service}</span><span class="mini-tag">${c.status}</span></div>
  </div>
  <div class="client-summary-strip">
    <div><span>Serviço</span><strong>${c.service}</strong></div>
    <div><span>Valor</span><strong>${c.value}</strong></div>
    <div><span>Responsável</span><strong>${c.state==="iana"?"Iana":"Nayara"}</strong></div>
    <div><span>Prioridade</span><strong>${id===2?"Alta":"Normal"}</strong></div>
  </div>
  <div class="chat">${messages.map(m=>`<div class="message ${m[0]}">${escapeHtml(m[1])}<div class="time">${m[2]}</div></div>`).join("")}</div>
  <div class="observer-box"><strong>✦ Observador da Iana:</strong> ${id===1?"Nayara informou R$ 450 para mechas. Cliente prefere sexta à tarde. Valor registrado como orçamento, não como pagamento.":id===2?"Handoff humano detectado. Iana permanece em silêncio e continua observando a conversa.":"Contexto e fatos relevantes desta conversa ficam registrados no CRM."}</div>`;
}
function renderPending(){
  document.getElementById("pendingCards").innerHTML=urgent.map(u=>`<article class="pending-card">
    <div class="pending-top"><span class="priority ${u.priority}">${u.priority==="high"?"Alta prioridade":"Ação humana"}</span><small>${u.ago}</small></div>
    <h3>${u.name}</h3><p>${u.reason}. ${u.detail}.</p>
    <div class="pending-info"><div><span>Origem</span><strong>WhatsApp</strong></div><div><span>Status</span><strong>Aguardando você</strong></div></div>
    <div class="pending-actions"><button class="btn secondary" onclick="toast('Conversa aberta em modo demonstração.')">Ver conversa</button><button class="btn primary" onclick="toast('Ação registrada localmente. A integração com n8n será conectada depois.')">Assumir</button></div>
  </article>`).join("");
}
function renderAgenda(){
  document.getElementById("agendaBoard").innerHTML=weekAgenda.map(d=>`<section class="day-col"><div class="day-head"><strong>${d.day}</strong><span>${d.date}</span></div>
    ${d.items.map(a=>`<div class="appointment"><strong>${a[0]} · ${a[1]}</strong><span>${a[2]}</span><span class="status ${a[3]}">${statusLabel(a[3])}</span></div>`).join("")}
  </section>`).join("");
}
function renderClients(rows=clients){
  document.getElementById("clientTable").innerHTML=rows.map(c=>`<tr><td><div class="client-cell"><div class="avatar">${initials(c[0])}</div><strong>${c[0]}</strong></div></td><td>${c[1]}</td><td>${c[2]}</td><td><strong>${c[3]}</strong></td><td>${c[4]}</td><td><button class="table-link" onclick="toast('Perfil de ${c[0]} abrirá aqui na versão conectada.')">Abrir →</button></td></tr>`).join("");
}
function renderFinance(){
  document.getElementById("financeTable").innerHTML=finance.map(f=>`<tr><td><strong>${f[0]}</strong></td><td>${f[1]}</td><td><span class="status ${f[2]==="Pago"?"confirmado":f[2]==="Orçamento"?"solicitacao":"aguardando"}">${f[2]}</span></td><td><strong>${f[3]}</strong></td><td>${f[4]}</td><td>${f[5]}</td></tr>`).join("");
}
function gotoPage(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.remove("active"));
  document.getElementById(`page-${page}`).classList.add("active");
  document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add("active");
  document.getElementById("pageTitle").textContent=pages[page][0];
  document.getElementById("pageSubtitle").textContent=pages[page][1];
  window.scrollTo({top:0,behavior:"smooth"});
  closeDrawer();
}
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");clearTimeout(window._toast);window._toast=setTimeout(()=>t.classList.remove("show"),2600)}
function closeDrawer(){document.getElementById("sidebar").classList.remove("open");document.getElementById("drawerOverlay").classList.remove("open")}

document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>gotoPage(b.dataset.page));
document.querySelectorAll("[data-goto]").forEach(b=>b.onclick=()=>gotoPage(b.dataset.goto));
document.getElementById("menuBtn").onclick=()=>{document.getElementById("sidebar").classList.toggle("open");document.getElementById("drawerOverlay").classList.toggle("open")};
document.getElementById("drawerOverlay").onclick=closeDrawer;
document.getElementById("refreshBtn").onclick=()=>toast("Dados atualizados — modo demonstração.");
document.getElementById("clientSearch").oninput=e=>{const q=e.target.value.toLowerCase();renderClients(clients.filter(c=>c.join(" ").toLowerCase().includes(q)))};
document.getElementById("globalSearch").oninput=e=>{if(e.target.value.length>2) toast(`Busca preparada para: "${e.target.value}"`)};
document.querySelectorAll("[data-conv-filter]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-conv-filter]").forEach(x=>x.classList.remove("active"));b.classList.add("active");renderConversationList(b.dataset.convFilter)});
document.getElementById("newAppointmentBtn").onclick=()=>document.getElementById("appointmentModal").classList.add("open");
document.querySelectorAll(".close-modal").forEach(x=>x.onclick=()=>document.getElementById("appointmentModal").classList.remove("open"));
document.getElementById("appointmentForm").onsubmit=e=>{e.preventDefault();document.getElementById("appointmentModal").classList.remove("open");toast("Registro salvo em modo demonstração.")};
document.getElementById("appointmentModal").onclick=e=>{if(e.target.id==="appointmentModal")e.currentTarget.classList.remove("open")};
document.querySelectorAll("[data-setting]").forEach(input=>{
  const k=`iana_setting_${input.dataset.setting}`;
  if(localStorage.getItem(k)!==null) input.checked=localStorage.getItem(k)==="true";
  input.onchange=()=>{localStorage.setItem(k,input.checked);toast(`${input.closest("label").querySelector("strong").textContent}: ${input.checked?"ativado":"desativado"} (demo)`)};
});
const fmt=new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"2-digit",month:"long"});
document.getElementById("todayLabel").textContent=fmt.format(new Date()).toUpperCase();

renderUrgent();renderTodayAgenda();renderConversationList();renderPending();renderAgenda();renderClients();renderFinance();

if("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("service-worker.js").catch(()=>{});
