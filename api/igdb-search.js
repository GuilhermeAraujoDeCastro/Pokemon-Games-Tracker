// Proxy pra IGDB: o Client Secret da Twitch nao pode aparecer no navegador,
// entao essa funcao roda no servidor da Vercel (pasta api/, vira rota
// /api/igdb-search sozinha) e guarda ele como variavel de ambiente. O
// js/igdb.js so' fala com essa rota, nunca com a IGDB direto. Nao testei
// contra a IGDB de verdade (sem acesso de rede daqui); o formato segue a
// documentacao oficial (api-docs.igdb.com).

import * as Sentry from "@sentry/node";

// Opcional (so' liga se SENTRY_DSN estiver configurado na Vercel). Ao
// contrario do frontend (que importa do CDN pra nao precisar de bundler),
// aqui e' uma dependencia real do package.json porque a function da
// Vercel ja passa pelo empacotamento deles de qualquer jeito.
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN });
}

const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const GAMES_URL = "https://api.igdb.com/v4/games";

// Busca por texto ("pokemon") em vez de ID de franquia, pra nao depender
// de acento certo no nome dela na IGDB. O filtro final fica no js/igdb.js.
// category/game_type e involved_companies deixam o js/igdb.js separar jogo oficial de ROM hack.
const GAMES_QUERY =
  'search "pokemon"; fields name,first_release_date,cover.image_id,platforms.name,summary,total_rating,category,game_type,involved_companies.company.name; limit 500;';

// { accessToken, expiresAt } (expiresAt em epoch ms). So' evita pedir um
// token novo a cada busca enquanto esta instancia da function continuar
// "quente"; a Vercel pode subir outra instancia do zero a qualquer momento.
let cachedToken = null;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

// IP -> lista de horarios (epoch ms) das ultimas chamadas. Mesma ressalva
// do cache do token: so' existe enquanto esta instancia da function
// estiver "quente", nao e' um rate limit de verdade compartilhado entre
// instancias. Serve pra dificultar abuso casual de quem descobrir o
// endpoint, nao pra proteger contra um ataque coordenado de verdade.
const requestLog = new Map();
const REQUEST_LOG_MAX_SIZE = 10_000;

function isRateLimited(ip, now = Date.now()) {
  // Sem isso o Map so cresce (nada nunca remove um IP que parou de
  // chamar) - um teto simples evita crescimento sem limite; zerar todo
  // mundo de vez em quando e aceitavel pra um limite so' best-effort.
  if (requestLog.size > REQUEST_LOG_MAX_SIZE) {
    requestLog.clear();
  }
  const recent = (requestLog.get(ip) || []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  requestLog.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX_REQUESTS;
}

async function getAccessToken(clientId, clientSecret, { force = false } = {}) {
  if (!force && cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  const url = `${TOKEN_URL}?client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`;
  const response = await fetch(url, { method: "POST" });
  if (!response.ok) {
    throw new Error(`Erro ao autenticar na Twitch (${response.status}). Confira IGDB_CLIENT_ID e IGDB_CLIENT_SECRET.`);
  }
  const data = await response.json();
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.accessToken;
}

export default async function handler(request, response) {
  // x-forwarded-for pode ter varios ips separados por virgula (um por
  // proxy no caminho); o PRIMEIRO e' o que o proprio cliente manda (da pra
  // forjar), o ULTIMO e' o que a borda da Vercel anexou de verdade - por
  // isso pega o ultimo, nao o primeiro.
  const forwardedFor = request.headers["x-forwarded-for"] || "";
  const ip = forwardedFor.split(",").pop().trim() || "unknown";
  if (isRateLimited(ip)) {
    response.status(429).json({
      error: "Muitas buscas em pouco tempo. Tenta de novo daqui a um minuto.",
      code: "rate_limited",
    });
    return;
  }

  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    // code machine-readable pro front-end distinguir esse erro especifico
    // (mostrar instrucao de configuracao) sem precisar comparar o texto.
    response.status(500).json({
      error: "IGDB_CLIENT_ID e/ou IGDB_CLIENT_SECRET nao configurados nas variaveis de ambiente da Vercel.",
      code: "missing_env",
    });
    return;
  }

  try {
    let igdbResponse = await queryGames(clientId, await getAccessToken(clientId, clientSecret));
    // Token revogado antes da hora: pede outro e tenta uma vez so.
    if (igdbResponse.status === 401) {
      igdbResponse = await queryGames(clientId, await getAccessToken(clientId, clientSecret, { force: true }));
    }

    if (!igdbResponse.ok) {
      const details = await igdbResponse.text();
      response.status(igdbResponse.status).json({ error: `Erro da IGDB (${igdbResponse.status})`, details });
      return;
    }

    const games = await igdbResponse.json();
    // A lista muda pouco: a borda da Vercel guarda 6h e poupa a cota da Twitch.
    response.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400");
    response.status(200).json(games);
  } catch (error) {
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error);
      await Sentry.flush(2000); // a function pode congelar antes do envio
    }
    response.status(500).json({ error: error.message });
  }
}

function queryGames(clientId, accessToken) {
  return fetch(GAMES_URL, {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "text/plain",
    },
    body: GAMES_QUERY,
  });
}
