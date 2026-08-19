# Mapa de integração com a Iana atual

## Fontes já existentes no backend
O fluxo atual já trabalha com estruturas equivalentes a:
- `salao_nayara_crm_leads`
- `salao_nayara_crm_events`
- `salao_nayara_crm_financial`
- `salao_nayara_crm_facts`
- `salao_nayara_handoffs`
- `salao_nayara_messages`
- `salao_nayara_system_health`
- `salao_nayara_settings`
- `salao_nayara_copilot_context`

## Views recomendadas para o painel
Criar uma camada estável para o frontend:
- `salao_nayara_dashboard_today`
- `salao_nayara_pending_handoffs`
- `salao_nayara_customer_profiles`
- `salao_nayara_financial_dashboard`
- `salao_nayara_agenda_dashboard`
- `salao_nayara_iana_health`

## Ações futuras do painel
- assumir conversa
- liberar conversa para Iana
- confirmar / cancelar / remarcar atendimento
- registrar pagamento manual
- corrigir fato financeiro
- ativar/desativar follow-up
- ativar/desativar pós-atendimento
- ativar/desativar reativação
- abrir histórico de auditoria

Essas ações não devem escrever diretamente em várias tabelas; use uma função/RPC ou um endpoint n8n por ação.
