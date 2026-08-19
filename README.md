# Iana Gestão Web — MVP

Painel web responsivo para acompanhar a operação da Iana e do Salão Nayara.

## O que já existe no protótipo
- Dashboard geral
- Conversas e detalhe do contexto
- Tela "Precisa da Nayara"
- Agenda com estados separados
- CRM de clientes
- Financeiro (orçamento / cobrado / pago)
- Resumos da Iana
- Saúde do sistema e controles
- Layout mobile
- Estrutura PWA

## Como abrir agora
A maneira mais simples:
1. Extraia o ZIP.
2. Abra `index.html` no navegador.

Para visualizar como PWA/local server:
```bash
python -m http.server 8080
```
e abra `http://localhost:8080`.

## Estado atual
Esta entrega está em **modo demonstração**. Ela não altera o banco nem o n8n.

A próxima etapa é conectar as telas ao PostgreSQL/Supabase que já alimenta a Iana.

## Arquitetura recomendada
WhatsApp -> Evolution -> n8n/Iana -> PostgreSQL/Supabase -> Iana Gestão Web

O site deve preferencialmente ler **views próprias do dashboard** em vez de consultar as tabelas operacionais do n8n diretamente.

Ações de escrita (confirmar atendimento, assumir conversa, marcar pagamento, ativar automação) devem usar RPC segura ou endpoint autenticado do n8n.

## Segurança
- Não colocar `service_role` no frontend.
- Usar Supabase Auth.
- Ativar RLS.
- Separar leitura do painel das tabelas internas.
- Registrar auditoria para ações humanas.
