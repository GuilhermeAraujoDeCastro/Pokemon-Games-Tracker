# Pokémon Games Tracker

Site pra acompanhar quais jogos da franquia Pokémon você já jogou, dar nota de 1 a 5 estrelas pra cada um e ver seu progresso. Os dados dos jogos (nome, ano, capa, plataformas) vêm da IGDB (Internet Game Database) via API.

Dá pra usar de dois jeitos: só digitando um nome (modo visitante, progresso salvo no navegador) ou entrando com a conta Google (progresso salvo na nuvem via Firebase, sincroniza entre aparelhos). Isso é idêntico ao Barbie Movies Tracker, o outro projeto do portfólio que segue essa mesma arquitetura, só que esse aqui pega jogos em vez de filmes.

## A diferença importante em relação ao Barbie Movies Tracker: por que esse projeto tem um "backend"

O Barbie Movies Tracker busca filme direto do navegador do visitante pra API da TMDB, usando só uma API key simples. Isso funciona porque a TMDB foi feita pra esse tipo de uso: a chave pública dela é segura o suficiente pra aparecer no código de um site estático.

A IGDB é diferente. Ela pertence à Twitch, e pra usar a API dela você precisa de duas coisas: um "Client ID" (público, sem problema) e um "Client Secret" (uma senha, literalmente). O Client Secret é usado num fluxo de autenticação (OAuth "client credentials") que gera um token de acesso. O problema: se eu colocasse o Client Secret dentro do `js/config.js` como fiz com a chave da TMDB, qualquer pessoa que abrisse o "Ver código-fonte" do site conseguiria copiar ele e usar sua conta Twitch/IGDB como quisesse.

Por isso esse projeto tem uma peça a mais que o Barbie Movies Tracker não tem: `netlify/functions/igdb-search.mjs`, uma function que roda no servidor da Netlify (não no navegador de quem visita o site). Ela guarda o Client ID e o Client Secret como variável de ambiente, pede o token pra Twitch, busca os jogos na IGDB, e devolve pro navegador só o resultado da busca. O segredo nunca sai do servidor. O `js/igdb.js` (que roda no navegador) só conversa com essa function, nunca com a IGDB direto.

Isso significa que, pra rodar esse projeto de verdade (mesmo local), você precisa de um jeito de rodar a function, não só abrir o `index.html`. Veja a próxima seção.

## Como rodar localmente

Diferente do Barbie Movies Tracker (que roda com qualquer servidor estático simples), esse projeto precisa da Netlify CLI, porque ela é quem sabe rodar a function localmente:

1. Instale a Netlify CLI (não precisa de conta paga, só de uma conta gratuita na Netlify):
   ```
   npm install -g netlify-cli
   ```

2. Copie `js/config.example.js` pra `js/config.js` se quiser testar o login com Google (veja a seção de Firebase abaixo). Sem isso o modo visitante funciona normalmente.

   (Isso já está feito localmente: o `js/config.js` já existe com o Firebase config real, criado em 10/09/2026.)

3. Crie um arquivo `.env` na raiz do projeto (ele já está no `.gitignore`, não vai pro git) com suas credenciais da IGDB:
   ```
   IGDB_CLIENT_ID=sua-client-id-aqui
   IGDB_CLIENT_SECRET=seu-client-secret-aqui
   ```

4. Rode:
   ```
   netlify dev
   ```
   Isso sobe o site estático e a function juntos (normalmente em `http://localhost:8888`). A CLI vai perguntar se quer conectar a um site Netlify existente ou rodar sem conectar; pra só testar local, pode escolher a opção de não conectar.

## Como conseguir as credenciais da IGDB

1. Crie uma conta gratuita em https://dev.twitch.tv (a IGDB pertence à Twitch).
2. No console de desenvolvedor da Twitch, registre uma aplicação nova (nome, categoria, URL de redirecionamento pode ser algo como `http://localhost`).
3. Isso te dá um **Client ID** e um **Client Secret**. Guarde os dois, principalmente o secret.
4. A documentação oficial da IGDB (https://api-docs.igdb.com/) explica o passo a passo mais atualizado caso a Twitch tenha mudado algo nessa tela; eu não consegui abrir essa página específica no ambiente onde escrevi esse projeto (ela bloqueou o acesso automatizado), então não posso garantir que a tela de hoje é idêntica ao que descrevi aqui. O formato da API em si (endpoint, headers, formato da busca) eu confirmei em outras fontes técnicas e é o que está implementado em `netlify/functions/igdb-search.mjs`.
5. Pra testar rápido que as credenciais funcionam antes de mexer no projeto, dá pra pedir um token direto:
   ```
   curl -X POST "https://id.twitch.tv/oauth2/token?client_id=SEU_CLIENT_ID&client_secret=SEU_CLIENT_SECRET&grant_type=client_credentials"
   ```
   Se voltar um JSON com `access_token`, está tudo certo.

## Configurando o login com Google (opcional)

Idêntico ao Barbie Movies Tracker:

1. Crie um projeto de graça em https://console.firebase.google.com.
2. Em Build > Authentication > Sign-in method, ative o provedor "Google".
3. Em Build > Firestore Database, crie o banco.
4. Em Configurações do projeto > Geral > Seus apps, crie um "app da Web" e copia o objeto de config gerado pro `FIREBASE_CONFIG` do seu `js/config.js`.
5. Quando for publicar o site, volta em Authentication > Settings > Authorized domains e adiciona o domínio publicado.

Se você já tem um projeto Firebase do Barbie Movies Tracker, dá pra reusar o mesmo projeto aqui: os dois salvam o progresso em coleções diferentes do Firestore (`progress` pro Barbie, `pokemon-games-progress` pra esse), então não se misturam. (Neste projeto foi criado um projeto Firebase próprio, separado do Barbie (`pokemon-jogos-5a953`), o que também funciona normalmente, só não compartilha o mesmo login entre os dois sites.)

## Rodando os testes

```
npm test
```

40 testes, todos passando, cobrindo cálculo de progresso, filtros e ordenação, validação de nota, normalização dos dados da IGDB (incluindo o filtro que aceita "Pokémon" com ou sem acento, conversão de data e montagem da URL da capa) e o modo visitante (salvar, carregar, trocar de perfil, recuperar de um JSON corrompido no localStorage).

## O que eu consegui testar e o que eu não consegui

Os módulos com a lógica principal (`progress.js`, `filters.js`, `ratings.js`, `igdb.js`, `storage-local.js`) são funções puras, sem tocar em DOM, rede ou Netlify de verdade, então dá pra testar sem depender de nada externo. Isso eu testei de verdade: os 40 testes acima rodam e passam.

O `js/main.js` não tem teste automatizado (precisa de um navegador de verdade), mas eu abri o site num Chromium headless com o endpoint `/api/igdb-search` mockado (simulando o que a function devolveria) e conferi na prática: login visitante, lista de jogos aparecendo, busca por nome, marcar como jogado, dar nota, progresso e nota média atualizando, e tudo persistindo depois de recarregar a página. Funcionou.

O que eu genuinamente não consegui testar foi a `netlify/functions/igdb-search.mjs` contra a IGDB de verdade, e o `js/firebase-app.js` contra um projeto Firebase de verdade. Os dois exigem credenciais reais que só você tem, e o ambiente onde escrevi esse projeto não tem acesso de rede nem pra id.twitch.tv/api.igdb.com nem pro Firebase. O código segue a documentação oficial de cada API (headers, formato da query Apicalypse da IGDB, SDK modular do Firebase), mas antes de confiar 100%, testa na prática depois de configurar tudo: roda `netlify dev`, entra no site, confere se a lista de jogos carrega. Se der erro, a mensagem que aparece na tela (e o console do navegador, F12) deve dizer se o problema é nas credenciais da IGDB, do Firebase, ou outra coisa.

## Publicando (Netlify)

Esse projeto foi feito pensando especificamente na Netlify, porque a function em `netlify/functions/` usa o formato dela. Também tem um passo de build pequeno só pra gerar o `js/config.js` (que fica fora do git) a partir de variáveis de ambiente. Pra publicar:

1. Conecte o repositório na Netlify normalmente. O `netlify.toml` já diz pra ela rodar `node scripts/generate-config.js` no build e onde ficam as functions (`netlify/functions/`), então não precisa mexer nas build settings.
2. Em **Site configuration > Environment variables**, cadastre:

   ```
   IGDB_CLIENT_ID
   IGDB_CLIENT_SECRET
   FIREBASE_API_KEY
   FIREBASE_AUTH_DOMAIN
   FIREBASE_PROJECT_ID
   FIREBASE_STORAGE_BUCKET
   FIREBASE_MESSAGING_SENDER_ID
   FIREBASE_APP_ID
   ```

   As duas primeiras (`IGDB_CLIENT_ID`/`IGDB_CLIENT_SECRET`) só a function usa, em tempo de execução, e nunca aparecem no `js/config.js` gerado nem no navegador de quem visita o site. As seis `FIREBASE_*` viram o `FIREBASE_CONFIG` do `js/config.js`.
3. Se for usar o login com Google, lembra do passo de "Authorized domains" no Firebase (seção acima) com o domínio que a Netlify te der.

Se preferir publicar na Vercel em vez da Netlify, dá pra fazer, mas a function precisaria ser reescrita no formato de serverless function da Vercel (`api/igdb-search.js`, com uma assinatura de request/response diferente) e o Build Command trocado pra `node scripts/generate-config.js` nas configurações do projeto. Essa versão aqui é específica da Netlify.

## Estrutura do projeto

```
index.html                  página única
css/styles.css                estilos
netlify/functions/
  igdb-search.mjs               proxy que fala com a IGDB (guarda o segredo)
js/
  progress.js                     cálculo de progresso jogado/total
  filters.js                       busca, filtro por ano/não-jogado, ordenação
  ratings.js                        validação de nota e média
  igdb.js                            busca (via proxy) e normalização dos jogos
  storage-local.js                    persistência do modo visitante (localStorage)
  firebase-app.js                      autenticação Google e persistência no Firestore
  main.js                               liga tudo isso na página (DOM)
  config.example.js                      modelo de config (copiar pra config.js)
scripts/
  generate-config.js           gera js/config.js a partir de variáveis de ambiente (só roda no build da Netlify)
netlify.toml                  build command, pasta de publicação e diretório das functions
tests/                        testes automatizados (Node --test), um arquivo por módulo
```
