# Iana Gestão LIVE 2.1.3 — CACHE KILLER

Esta versão existe para remover o cache da versão antiga "MODO DEMONSTRAÇÃO".

## SUBA TODOS estes arquivos para a RAIZ do repositório

- index.html
- 404.html
- app-live-2.1.3.js
- styles-2.1.3.css
- manifest.json
- service-worker.js
- version.txt
- .nojekyll

Pode apagar da raiz os antigos:
- app.js
- app-live.js
- styles.css

## Depois do commit
Espere o GitHub Pages concluir o deploy.

Abra PRIMEIRO usando um parâmetro novo:

`https://SEU-SITE.github.io/SEU-REPO/?v=213`

Esse endereço não corresponde à entrada antiga que o Service Worker cacheou.

A nova página:
1. apaga caches antigos;
2. desregistra Service Workers antigos;
3. instala temporariamente um Service Worker "cache killer";
4. o cache killer também se desregistra sozinho.

## Como confirmar
Você DEVE ver:
- `Salão Nayara · LIVE 2.1.3` no menu lateral;
- um selo escuro `LIVE 2.1.3` no canto inferior direito.

A URL:
`.../version.txt?v=213`

deve mostrar:
`IANA GESTAO LIVE 2.1.3 CACHE KILLER`

Se `version.txt` mostrar 2.1.3 mas a página continuar demo, é cache local.
Se `version.txt` der 404 ou conteúdo antigo, o GitHub Pages está publicando branch/pasta diferente da que você atualizou.
