// Ranking pessoal e estatisticas agregadas. Funcoes puras, mesmo estilo dos
// outros modulos (filters.js, progress.js): recebem jogos/progresso, nunca
// tocam em DOM/storage.

import { isGameCompleted } from "./filters.js";

export function topRankedGames(games, progress, limit = 10) {
  const ratings = progress.ratings || {};
  return games
    .filter((game) => typeof ratings[game.id] === "number" && ratings[game.id] > 0)
    .map((game) => ({ ...game, rating: ratings[game.id] }))
    .sort((a, b) => b.rating - a.rating || b.year - a.year || a.name.localeCompare(b.name, "pt-BR"))
    .slice(0, limit);
}

export function ratingDistribution(ratings) {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const value of Object.values(ratings)) {
    if (typeof value === "number" && distribution[value] !== undefined) {
      distribution[value] += 1;
    }
  }
  return distribution;
}

// Checa cada padrao nessa ordem (por isso Game Boy Color/Advance vem antes
// do "Game Boy" generico, senao o generico bateria primeiro).
const GENERATION_RULES = [
  { pattern: /game boy color/i, label: "Game Boy Color (Ger. 2)" },
  { pattern: /game boy advance/i, label: "Game Boy Advance (Ger. 3)" },
  { pattern: /game boy/i, label: "Game Boy (Ger. 1)" },
  { pattern: /nintendo ds/i, label: "Nintendo DS (Ger. 4-5)" },
  { pattern: /nintendo 3ds/i, label: "Nintendo 3DS (Ger. 6-7)" },
  { pattern: /nintendo switch/i, label: "Nintendo Switch (Ger. 8-9)" },
];

function platformGeneration(platformName) {
  const rule = GENERATION_RULES.find((r) => r.pattern.test(platformName));
  return rule ? rule.label : "Outra plataforma";
}

// Um jogo pode ter varias plataformas (reedicoes); usa so a primeira da
// lista pra nao contar o mesmo jogo em mais de uma geracao.
export function gamesByGeneration(games) {
  const counts = {};
  for (const game of games) {
    const label = game.platforms.length > 0 ? platformGeneration(game.platforms[0]) : "Outra plataforma";
    counts[label] = (counts[label] || 0) + 1;
  }
  return counts;
}

// Chamado toda vez que played/rating de um jogo muda; so grava a 1a vez que
// ele vira "completo" (nao sobrescreve se a pessoa desmarcar e marcar nao
// jogado, jogado de novo depois).
export function stampCompletionIfNeeded(progress, gameId) {
  const alreadyStamped = Boolean(progress.completedAt && progress.completedAt[gameId]);
  if (!isGameCompleted(progress, gameId) || alreadyStamped) {
    return progress;
  }
  return {
    ...progress,
    completedAt: { ...progress.completedAt, [gameId]: new Date().toISOString() },
  };
}

// Nao existe data de "comecei a jogar" nem "terminei" de verdade - so um
// booleano de jogado e uma nota. Em vez de inventar "tempo pra completar",
// reporta algo que da pra derivar de fato: quantos anos depois do
// lancamento a pessoa costuma terminar um jogo (completedAt e' carimbado a
// primeira vez que o jogo vira "completo", acima). Jogos completados antes
// dessa funcionalidade existir (sem completedAt) ficam de fora da media,
// em vez de usar uma data forjada.
export function averageCompletionDelay(games, progress) {
  const completedAt = progress.completedAt || {};
  const delays = [];
  for (const game of games) {
    const stamp = completedAt[game.id];
    if (!stamp || typeof game.year !== "number" || !isGameCompleted(progress, game.id)) {
      continue;
    }
    // getUTCFullYear (nao getFullYear): o carimbo vem de toISOString(),
    // sempre UTC - pegar o ano local podia trocar de ano dependendo do
    // fuso horario de quem esta rodando isso.
    delays.push(new Date(stamp).getUTCFullYear() - game.year);
  }
  if (delays.length === 0) {
    return null;
  }
  const average = delays.reduce((sum, value) => sum + value, 0) / delays.length;
  return Math.round(average * 10) / 10;
}
