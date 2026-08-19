# Iana Gestão LIVE 2.1.1 — arquivos para GitHub Pages

## Coloque estes arquivos na RAIZ do repositório

```text
/
├── index.html
├── app-live.js
├── styles.css
├── manifest.json
├── 404.html
└── .nojekyll
```

Não coloque a pasta `backend` no GitHub.
Não coloque senha do PostgreSQL.
Não coloque a `access_key` dentro do código.

A URL do n8n e a access_key são informadas na primeira abertura do painel e ficam salvas localmente no navegador.

## GitHub Pages

No GitHub:

1. Abra `Settings`.
2. Abra `Pages`.
3. Em `Build and deployment`:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/ (root)`
4. Clique `Save`.
5. Aguarde o deploy terminar.

## Primeira abertura

O painel pedirá:

- Production URL do webhook `API WEB: POST`
- `access_key` gerada pelo workflow n8n

Exemplo de Production URL:

```text
https://SEU-N8N/webhook/iana-web-live-v21-api
```

Use a URL de PRODUÇÃO, não `/webhook-test/`.

## Atualização dos dados

Depois de conectado, não é preciso fazer commit para atualizar clientes ou números.

O fluxo é:

```text
WhatsApp -> Iana/n8n -> PostgreSQL -> API n8n -> site
```

O painel verifica mudanças aproximadamente a cada 3 segundos.

## Quando atualizar o código do site

Apenas quando houver uma nova versão da interface.

Substitua os arquivos na raiz e faça commit/push.

Esta entrega usa `?v=2.1.1` nos arquivos CSS/JS para reduzir problemas de cache.

## Como saber se o GitHub publicou esta versão

No site deve aparecer no menu lateral:

`Salão Nayara · LIVE 2.1.1`

E no console do navegador:

```js
window.IANA_WEB_BUILD
```

deve retornar:

```text
2.1.1-github-pages
```
