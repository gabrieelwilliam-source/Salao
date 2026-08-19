# Iana Gestão LIVE 2.1.2 — GitHub Pages

Esta versão deixa a conexão com o n8n visível permanentemente.

## Como saber que publicou a versão correta
No menu lateral deve aparecer:
`Salão Nayara · LIVE 2.1.2`

Não pode aparecer:
`MODO DEMONSTRAÇÃO`

## Onde conectar
Há dois lugares:
1. menu lateral: `Conectar / trocar API`
2. `Iana / Sistema` → `Conexão do painel` → `Conectar / trocar webhook`

Preencha:
- Production URL do node n8n `API WEB: POST`
- access_key retornada pelo instalador V2.1

## Arquivos que vão na raiz do GitHub
- index.html
- app-live.js
- styles.css
- manifest.json
- 404.html
- .nojekyll

README é opcional.

## GitHub Pages
Settings → Pages:
- Deploy from a branch
- main
- / (root)

Após o deploy, faça Ctrl+Shift+R.

## Dados
Não existem dados de exemplo nesta versão. Sem conexão, o painel não entra.
Conectado, tudo é consultado através do webhook n8n.
