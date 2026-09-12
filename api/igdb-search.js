// Proxy pra IGDB: o Client Secret da Twitch nao pode aparecer no navegador,
// entao essa funcao roda no servidor da Vercel (pasta api/, vira rota
// /api/igdb-search sozinha) e guarda ele como variavel de ambiente. O
// js/igdb.js so' fala com essa rota, nunca com a IGDB direto. Nao testei
// contra a IGDB de verdade (sem acesso de rede daqui); o formato segue a
// documentacao oficial (api-docs.igdb.com).

const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const GAMES_URL = "https://api.igdb.com/v4/games";

// Busca por texto ("pokemon") em vez de ID de franquia, pra nao depender
// de acento certo no nome dela na IGDB. O filtro final fica no js/igdb.js.
const GAMES_QUERY =
  'search "pokemon"; fields name,first_release_date,cover.image_id,platforms.name; limit 500;';

let cachedToken = null; // { accessToken, expiresAt } (expiresAt em epoch ms)

async function getAccessToken(clientId, clientSecret) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
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
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    response.status(500).json({
      error: "IGDB_CLIENT_ID e/ou IGDB_CLIENT_SECRET nao configurados nas variaveis de ambiente da Vercel.",
    });
    return;
  }

  try {
    const accessToken = await getAccessToken(clientId, clientSecret);

    const igdbResponse = await fetch(GAMES_URL, {
      method: "POST",
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "text/plain",
      },
      body: GAMES_QUERY,
    });

    if (!igdbResponse.ok) {
      const details = await igdbResponse.text();
      response.status(igdbResponse.status).json({ error: `Erro da IGDB (${igdbResponse.status})`, details });
      return;
    }

    const games = await igdbResponse.json();
    response.status(200).json(games);
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
}
