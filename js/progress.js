// Calcula o progresso de quantos jogos ja foram jogados. Funcao pura: so
// olha pra listas que recebe, nunca le Firestore/localStorage direto, pra
// dar pra testar sem simular banco nenhum.

export function calculateProgress(games, playedIds) {
  const total = games.length;
  const playedSet = new Set(playedIds);
  const played = games.filter((game) => playedSet.has(game.id)).length;
  const percent = total === 0 ? 0 : Math.round((played / total) * 100);
  return { played, total, percent };
}

export function formatProgressLabel(progress) {
  return `${progress.played} de ${progress.total} · ${progress.percent}%`;
}
