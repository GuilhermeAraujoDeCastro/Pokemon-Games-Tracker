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
