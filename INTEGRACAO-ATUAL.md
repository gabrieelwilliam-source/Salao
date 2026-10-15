# Integração atual do Salão Nayara

Versão do frontend: `53.3-zion-20261014.1`.

- API: `https://n8n.vps12198.panel.icontainer.cloud/webhook/zion-salao-nayara-painel`.
- n8n: workflow `KNB6dJYZXzlRZXul`.
- Contrato: `salao_nayara_web_v53_api(text,text,jsonb)`.
- Principal do atendimento: `aOXCObEbi54AC3hz`, instância `Nay`.
- Autenticação: a chave do painel já existente no banco, enviada via HTTPS. Não colocar chaves neste repositório.
- Endereços anteriores conhecidos nesse mesmo servidor são migrados automaticamente, preservando a chave que já existe no navegador. A migração só é salva após o ping autenticado confirmar a integração atual.
- Ações de escrita exigem uma ação explícita da dona e usam `request_id` para idempotência. Um envio com entrega desconhecida exige conferência antes de repetir.
- A agenda altera o CRM; não cria eventos no Google Calendar nem confirma horários automaticamente.
- Campanhas, relacionamento e follow-ups continuam desabilitados.
- O service worker armazena somente a interface; nenhuma chamada de dados ou autenticação da API entra no cache.

O backup anterior à integração está no branch `backup/painel-antes-integracao-20261014`.
