// Busca os jogos de Pokemon via IGDB, chamando o proxy em api/igdb-search.js
// (o Client Secret da IGDB nao pode ficar no navegador).

const PROXY_ENDPOINT = "/api/igdb-search";

export async function searchPokemonGames(fetchImpl = fetch) {
  const response = await fetchImpl(PROXY_ENDPOINT);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Erro ao buscar jogos: ${response.status}`);
  }
  if (data && data.error) {
    const error = new Error(data.error);
    error.code = data.code || null;
    throw error;
  }

  return normalizeGames(data);
}

export function normalizeGames(rawResults) {
  return rawResults
    .filter((game) => game.name && normalizeText(game.name).includes("pokemon"))
    .map((game) => ({
      id: game.id,
      name: game.name,
      year: game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : null,
      platforms: Array.isArray(game.platforms) ? game.platforms.map((platform) => platform.name).filter(Boolean) : [],
      coverUrl:
        game.cover && game.cover.image_id
          ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`
          : null,
      summary: game.summary || null,
      // IGDB usa escala 0-100; converte pra 0-10 e chama de "nota IGDB" na
      // UI pra nao confundir com as estrelas de 1 a 5 do proprio app.
      totalRating: typeof game.total_rating === "number" ? Math.round(game.total_rating) / 10 : null,
    }))
    .filter((game) => game.year !== null)
    .sort((a, b) => a.year - b.year);
}

// Remove acentos pra "Pokemon" bater no filtro com ou sem acento.
function normalizeText(text) {
  return text
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .toLowerCase();
}
