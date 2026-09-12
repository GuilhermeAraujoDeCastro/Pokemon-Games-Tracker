// Filtros e ordenacao da lista de jogos. Tudo funcao pura: recebe a lista
// de jogos (e o estado de "jogado"), devolve uma lista nova, nunca mexe no
// DOM nem em armazenamento.

export function filterGames(games, options = {}) {
  const { year = null, onlyUnplayed = false, playedIds = [], search = "" } = options;
  const playedSet = new Set(playedIds);
  const searchTerm = search.trim().toLowerCase();

  return games.filter((game) => {
    if (year !== null && game.year !== year) {
      return false;
    }
    if (onlyUnplayed && playedSet.has(game.id)) {
      return false;
    }
    if (searchTerm && !game.name.toLowerCase().includes(searchTerm)) {
      return false;
    }
    return true;
  });
}

export function sortGamesByYear(games, direction = "asc") {
  const sorted = [...games].sort((a, b) => a.year - b.year);
  return direction === "desc" ? sorted.reverse() : sorted;
}

export function sortGamesAlphabetically(games, direction = "asc") {
  const sorted = [...games].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return direction === "desc" ? sorted.reverse() : sorted;
}

export function availableYears(games) {
  return [...new Set(games.map((game) => game.year))].sort((a, b) => a - b);
}

// Um jogo "completo" ja foi jogado e tem nota. So esses saem da colecao e
// vao pro perfil; separar assim evita guardar esse estado em outro lugar.
export function isGameCompleted(progress, gameId) {
  const played = progress.played.includes(gameId);
  const rating = progress.ratings[gameId];
  return played && typeof rating === "number" && rating > 0;
}

export function splitByCompletion(games, progress) {
  const active = [];
  const completed = [];
  for (const game of games) {
    if (isGameCompleted(progress, game.id)) {
      completed.push(game);
    } else {
      active.push(game);
    }
  }
  return { active, completed };
}
