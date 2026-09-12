# Pokémon Games Tracker

Site pra acompanhar quais jogos da franquia Pokémon você já jogou, dar nota de 1 a 5 estrelas pra cada um e ver seu progresso. Os dados dos jogos (nome, ano, capa, plataformas) vêm da IGDB (Internet Game Database) via API.

Dá pra usar de três jeitos: só digitando um nome (modo visitante, progresso salvo no navegador), entrando com a conta Google, ou criando uma conta com e-mail e senha (esses dois últimos salvam o progresso na nuvem via Firebase e sincronizam entre aparelhos). Isso é idêntico ao Barbie Movies Tracker, o outro projeto que segue essa mesma arquitetura, só que esse aqui pega jogos em vez de filmes.

## A diferença importante em relação ao Barbie Movies Tracker: por que esse projeto tem um "backend"

O Barbie Movies Tracker busca filme direto do navegador do visitante pra API da TMDB, usando só uma API key simples. Isso funciona porque a TMDB foi feita pra esse tipo de uso: a chave pública dela é segura o suficiente pra aparecer no código de um site estático.

A IGDB é diferente. Ela pertence à Twitch, e pra usar a API dela você precisa de duas coisas: um "Client ID" (público, sem problema) e um "Client Secret" (uma senha, literalmente). O Client Secret é usado num fluxo de autenticação (OAuth "client credentials") que gera um token de acesso. O problema: se eu colocasse o Client Secret dentro do `js/config.js` como fiz com a chave da TMDB, qualquer pessoa que abrisse o "Ver código-fonte" do site conseguiria copiar ele e usar sua conta Twitch/IGDB como quisesse.

Por isso esse projeto tem uma peça a mais que o Barbie Movies Tracker não tem: `api/igdb-search.js`, uma função serverless que roda no servidor da Vercel (não no navegador de quem visita o site). Ela guarda o Client ID e o Client Secret como variável de ambiente, pede o token pra Twitch, busca os jogos na IGDB, e devolve pro navegador só o resultado da busca. O segredo nunca sai do servidor. O `js/igdb.js` (que roda no navegador) só conversa com essa função, nunca com a IGDB direto.

Isso significa que, pra rodar esse projeto de verdade (mesmo local), você precisa de um jeito de rodar a function, não só abrir o `index.html`. Veja a próxima seção.

## Como rodar localmente

Diferente do Barbie Movies Tracker (que roda com qualquer servidor estático simples), esse projeto precisa da Vercel CLI, porque ela é quem sabe rodar a função serverless localmente:

1. Instale a Vercel CLI (não precisa de conta paga, só de uma conta gratuita na Vercel):
   ```
   npm install -g vercel
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
   vercel dev
   ```
   Isso sobe o site estático e a função juntos (normalmente em `http://localhost:3000`). Na primeira vez a CLI deve perguntar se quer linkar a um projeto Vercel existente (escolha o `pokemon-games-tracker`) ou criar um novo; qualquer uma das opções funciona pra testar local.

## Como conseguir as credenciais da IGDB

1. Crie uma conta gratuita em https://dev.twitch.tv (a IGDB pertence à Twitch).
2. No console de desenvolvedor da Twitch, registre uma aplicação nova (nome, categoria, URL de redirecionamento pode ser algo como `http://localhost`).
3. Isso te dá um **Client ID** e um **Client Secret**. Guarde os dois, principalmente o secret.
4. A documentação oficial da IGDB (https://api-docs.igdb.com/) explica o passo a passo mais atualizado caso a Twitch tenha mudado algo nessa tela; eu não consegui abrir essa página específica no ambiente onde escrevi esse projeto (ela bloqueou o acesso automatizado), então não posso garantir que a tela de hoje é idêntica ao que descrevi aqui. O formato da API em si (endpoint, headers, formato da busca) eu confirmei em outras fontes técnicas e é o que está implementado em `api/igdb-search.js`.
5. Pra testar rápido que as credenciais funcionam antes de mexer no projeto, dá pra pedir um token direto:
   ```
   curl -X POST "https://id.twitch.tv/oauth2/token?client_id=SEU_CLIENT_ID&client_secret=SEU_CLIENT_SECRET&grant_type=client_credentials"
   ```
   Se voltar um JSON com `access_token`, está tudo certo.

## Configurando o login com Google e e-mail/senha (opcional)

Idêntico ao Barbie Movies Tracker:

1. Crie um projeto de graça em https://console.firebase.google.com.
2. Em Build > Authentication > Sign-in method, ative os provedores "Google" e "E-mail/senha".
3. Em Build > Firestore Database, crie o banco.
4. Em Configurações do projeto > Geral > Seus apps, crie um "app da Web" e copia o objeto de config gerado pro `FIREBASE_CONFIG` do seu `js/config.js`.
5. Quando for publicar o site, volta em Authentication > Settings > Authorized domains e adiciona o domínio publicado.

Se você já tem um projeto Firebase do Barbie Movies Tracker, dá pra reusar o mesmo projeto aqui também, mas presta atenção: os dois usam o mesmo nome de coleção no Firestore (`progress`), então nesse caso os documentos se misturariam (um uid que jogou um filme e um jogo cairia no mesmo documento). Por isso esse projeto usa um projeto Firebase próprio, separado do Barbie (`pokemon-jogos-5a953`), o que evita a mistura e só tem a desvantagem de não compartilhar o mesmo login entre os dois sites.

## Rodando os testes

```
npm test
```

43 testes, todos passando, cobrindo cálculo de progresso, filtros, ordenação e a separação entre jogos ativos e concluídos (Coleção x Perfil), validação de nota, normalização dos dados da IGDB (incluindo o filtro que aceita "Pokémon" com ou sem acento, conversão de data e montagem da URL da capa) e o modo visitante (salvar, carregar, trocar de perfil, recuperar de um JSON corrompido no localStorage).

## O que eu consegui testar e o que eu não consegui

Os módulos com a lógica principal (`progress.js`, `filters.js`, `ratings.js`, `igdb.js`, `storage-local.js`) são funções puras, sem tocar em DOM, rede ou servidor de verdade, então dá pra testar sem depender de nada externo. Isso eu testei de verdade: os 43 testes acima rodam e passam.

O `js/main.js` não tem teste automatizado (precisa de um navegador de verdade), mas eu abri o site num Chromium headless com o endpoint `/api/igdb-search` mockado (simulando o que a function devolveria) e conferi na prática: login visitante, lista de jogos aparecendo, busca por nome, trocar entre as abas Coleção e Perfil, marcar como jogado e dar nota (o jogo sai da Coleção e aparece no Perfil com as estatísticas certas), abrir e fechar o painel de filtros, e tudo persistindo depois de recarregar a página. Funcionou.

O que eu genuinamente não consegui testar foi a `api/igdb-search.js` contra a IGDB de verdade, e o `js/firebase-app.js` (incluindo o login por e-mail/senha, adicionado depois) contra um projeto Firebase de verdade. Os dois exigem credenciais reais que só você tem, e o ambiente onde escrevi esse projeto não tem acesso de rede nem pra id.twitch.tv/api.igdb.com nem pro Firebase. O código segue a documentação oficial de cada API (headers, formato da query Apicalypse da IGDB, SDK modular do Firebase), mas antes de confiar 100%, testa na prática depois de configurar tudo: roda `vercel dev`, entra no site, confere se a lista de jogos carrega e se dá pra criar conta/entrar com e-mail. Se der erro, a mensagem que aparece na tela (e o console do navegador, F12) deve dizer se o problema é nas credenciais da IGDB, do Firebase, ou outra coisa.

## Publicando (Vercel)

Esse projeto está publicado na Vercel (pokemon-games-tracker.vercel.app), com a função em `api/igdb-search.js` e o `vercel.json` dizendo pra rodar `node scripts/generate-config.js` no build. Pra configurar:

1. Conecte o repositório na Vercel normalmente (Add New > Project, escolhendo esse repo no GitHub). O `vercel.json` já cobre o build command e diz que os arquivos publicados são os da raiz do projeto (`outputDirectory`), e a pasta `api/` é reconhecida automaticamente como funções serverless, então não precisa mexer nas build settings. Só confira se não ficou um Build Command manual antigo sobrescrevendo o do `vercel.json` (Project Settings > Build and Deployment).
2. Em **Project Settings > Environment Variables**, cadastre estas oito:

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

   As duas primeiras (`IGDB_CLIENT_ID`/`IGDB_CLIENT_SECRET`) só a função usa, em tempo de execução, e nunca aparecem no `js/config.js` gerado nem no navegador de quem visita o site. As seis `FIREBASE_*` viram o `FIREBASE_CONFIG` do `js/config.js`.
3. Se for usar o login com Google, lembra do passo de "Authorized domains" no Firebase (seção acima) com o domínio da Vercel (pokemon-games-tracker.vercel.app).
4. Depois de cadastrar as variáveis pela primeira vez, force um redeploy: a Vercel não aplica variável nova em builds que já rodaram antes dela existir.

Esse projeto rodou na Netlify antes de mudar pra Vercel, então ainda pode sobrar um `netlify.toml` e uma pasta `netlify/functions/` no repositório. Os dois não são mais usados e dá pra apagar.

## Estrutura do projeto

```
index.html                  página única
css/styles.css                estilos
api/
  igdb-search.js               proxy que fala com a IGDB (guarda o segredo)
js/
  progress.js                     cálculo de progresso jogado/total
  filters.js                       busca, filtro por ano/não-jogado, ordenação
  ratings.js                        validação de nota e média
  igdb.js                            busca (via proxy) e normalização dos jogos
  storage-local.js                    persistência do modo visitante (localStorage)
  firebase-app.js                      autenticação (Google, e-mail/senha) e persistência no Firestore
  main.js                               liga tudo isso na página (DOM)
  config.example.js                      modelo de config (copiar pra config.js)
scripts/
  generate-config.js           gera js/config.js a partir de variáveis de ambiente (só roda no build da Vercel)
vercel.json                  build command da Vercel
tests/                        testes automatizados (Node --test), um arquivo por módulo
LICENSE                      licença MIT do código
CREDITS.md                   créditos da IGDB e aviso de marca do Pokémon
```
