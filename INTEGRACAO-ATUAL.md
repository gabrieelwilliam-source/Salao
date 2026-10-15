# Integração atual do Salão Nayara

Versão do frontend: `53.3-zion-20261014.2`.

- API: `https://n8n.vps12198.panel.icontainer.cloud/webhook/zion-salao-nayara-painel`.
- n8n: workflow `fF2EQUIWQGPQbdGP`.
- Contrato: `salao_nayara_web_v53_api(text,text,jsonb)`.
- Principal do atendimento: `yjqvzfxU217Zsf7X`, instância `Nay`.
- Autenticação: a chave do painel já existente no banco, enviada via HTTPS. Não colocar chaves neste repositório.
- Endereços anteriores conhecidos nesse mesmo servidor são migrados automaticamente, preservando a chave que já existe no navegador. A migração só é salva após o ping autenticado confirmar a integração atual.
- Ações de escrita exigem uma ação explícita da dona e usam `request_id` para idempotência. Um envio com entrega desconhecida exige conferência antes de repetir.
- A agenda altera o CRM; não cria eventos no Google Calendar nem confirma horários automaticamente.
- Campanhas, relacionamento e follow-ups continuam desabilitados.
- O service worker armazena somente a interface; nenhuma chamada de dados ou autenticação da API entra no cache.

O backup anterior à integração está no branch `backup/painel-antes-integracao-20261014`.

A migração também reconhece o servidor anterior `app.vps7376.panel.icontainer.cloud`, inclusive ao colar novamente a URL antiga na conexão. A chave só é persistida depois de confirmar a API nova.


## Contexto e operação — 20261015.1

- Catálogo em leitura, sem restaurar preços ou durações de JSONs recuperados.
- Interpretações recentes com intenção, evidência, valor previsto e revisão humana na ficha.
- Pix declarado pela cliente separado de recebimento confirmado.
- Agenda exige duração; sobreposição ou duração anterior desconhecida impede confirmação sem conferência.
- Correção financeira por registro exato, motivo obrigatório e histórico preservado.
- Filtro de pendências no banco antes da paginação; rascunhos no mesmo navegador, separados por conexão e removidos ao desconectar.
- Conexões do painel e do WhatsApp verificadas separadamente, com credenciais apenas no servidor.
- Migração incremental: `sql/20261015_context_and_panel.sql`. Testar antes; não reaplicar os instaladores antigos.

As versões anteriores permanecem preservadas e inativas: principal `aOXCObEbi54AC3hz` e painel `KNB6dJYZXzlRZXul`.
