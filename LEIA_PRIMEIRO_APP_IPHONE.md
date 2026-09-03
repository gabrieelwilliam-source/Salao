# Iana Gestão — aplicativo gratuito para iPhone

Esta versão transforma o painel V53 em um aplicativo web instalável, sem App Store e sem conta Apple Developer. Ela preserva a API V53, o n8n, o Supabase, a Evolution, as assinaturas de Iana/Nayara e as proteções existentes.

## Publicar no GitHub Pages

1. Faça uma cópia dos arquivos que estão atualmente publicados.
2. Envie **todo o conteúdo desta pasta** para a raiz do mesmo repositório do painel, mantendo a pasta `icons`.
3. Não altere a URL do GitHub Pages. A conexão já salva no navegador tende a permanecer porque o endereço continua o mesmo.
4. Abra o painel no Safari e atualize a página. A primeira abertura após a troca precisa de internet para preparar o aplicativo.
5. Em **Iana / Sistema**, use **Instalar no iPhone** para ver o passo a passo.

Se a tela de conexão aparecer no aplicativo instalado, informe a mesma Production URL do webhook `iana-web-live-v242-api` e a mesma `access_key` já usadas no painel. Não coloque a chave diretamente em nenhum arquivo do site.

## Instalar no iPhone

1. Abra o endereço do painel no **Safari**.
2. Toque em **Compartilhar**.
3. Escolha **Adicionar à Tela de Início**.
4. Ative **Abrir como App da Web** e toque em **Adicionar**.

O ícone **Iana Gestão** será criado na Tela de Início. Ao abrir por ele, o painel funciona em tela cheia.

## O que foi corrigido para celular

- ícones próprios para iPhone e Android;
- manifesto completo e modo de tela cheia;
- atualização segura da interface instalada;
- suporte às áreas da câmera e da barra inferior do iPhone;
- lista de conversas separada da tela de atendimento no celular;
- botão **Voltar para conversas**;
- área de resposta adaptada ao teclado e ao toque;
- cache limitado aos arquivos visuais: API, mensagens e credenciais não são gravadas pelo service worker.

## Limite desta entrega

O painel continua consultando novas informações enquanto estiver aberto. Avisos push com o aplicativo totalmente fechado ainda não estão ativados, porque exigem um emissor seguro no servidor e cadastro do aparelho. Esta versão não finge que há notificação em segundo plano.

## Não é necessário alterar

- SQL do Supabase;
- IANA PRINCIPAL;
- fluxo de relacionamento;
- API de eventos;
- API do painel V53;
- configuração que mantém o Instagram sem respostas automáticas.

Versão: **Iana Gestão V53.3 PWA 1.0**
