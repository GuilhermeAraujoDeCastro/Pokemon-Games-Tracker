// Proxy pro IGDB. Existe por um motivo especifico: diferente da TMDB (usada
// no Barbie Movies Tracker), a IGDB exige um Client Secret pra gerar o
// token de acesso (fluxo OAuth "client credentials" da Twitch, dona da
// IGDB), e um Client Secret nunca pode ficar num site estatico. Qualquer
// pessoa que abrisse "Ver codigo-fonte da pagina" ou o painel de rede do
// navegador conseguiria copiar ele.
//
// Por isso essa funcao roda no servidor da Netlify (nao no navegador do
// visitante), guarda o Client ID e o Client Secret como variavel de
// ambiente (Site configuration > Environment variables no painel da
// Netlify, nunca dentro do codigo nem do repositorio), pede um token pra
// Twitch, busca os jogos na IGDB, e devolve pro navegador so' o resultado
// da busca. O segredo nunca sai do servidor.
//
// Eu nao consegui testar essa funcao contra a IGDB de verdade: ela so'
// roda dentro do ambiente da Netlify (com "netlify dev" ou depois de
// publicada), e o sandbox onde escrevi isso nao tem acesso a rede pra
// id.twitch.tv nem pra api.igdb.com. O formato do request segue a
// documentacao oficial (https://api-docs.igdb.com/), mas testa na pratica
// depois de configurar suas credenciais.

const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const GAMES_URL = "https://api.igdb.com/v4/games";

// Query no formato Apicalypse (a linguagem de consulta da IGDB). Busca por
// texto em vez de tentar filtrar por um ID de franquia especifico, porque
// eu nao tenho como confirmar contra a IGDB de verdade se o nome exato da
// franquia no banco deles tem acento ou nao (um acento errado ali faria a
// busca voltar vazia, sem erro nenhum). A normalizacao final de quais
// resultados realmente valem fica no js/igdb.js, que tem teste.
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

export default async (request, context) => {
  const clientId = Netlify.env.get("IGDB_CLIENT_ID");
  const clientSecret = Netlify.env.get("IGDB_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    return jsonResponse(
      { error: "IGDB_CLIENT_ID e/ou IGDB_CLIENT_SECRET nao configurados nas variaveis de ambiente da Netlify." },
      500,
    );
  }

  try {
    const accessToken = await getAccessToken(clientId, clientSecret);

    const response = await fetch(GAMES_URL, {
      method: "POST",
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "text/plain",
      },
      body: GAMES_QUERY,
    });

    if (!response.ok) {
      const details = await response.text();
      return jsonResponse({ error: `Erro da IGDB (${response.status})`, details }, response.status);
    }

    const games = await response.json();
    return jsonResponse(games, 200);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
};

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const config = {
  path: "/api/igdb-search",
};
