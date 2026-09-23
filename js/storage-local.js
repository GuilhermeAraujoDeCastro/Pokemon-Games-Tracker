// Persistencia do modo visitante: so' digita o nome, sem cadastro, e o
// progresso fica salvo no localStorage do navegador (nao sincroniza entre
// aparelhos, mas funciona na hora, sem depender do Firebase).

const KEY_PREFIX = "pokemon-games-tracker:";

function emptyProgress() {
  return { played: [], ratings: {}, completedAt: {} };
}

export function loadLocalProgress(profileName) {
  const raw = localStorage.getItem(KEY_PREFIX + profileName);
  if (!raw) {
    return emptyProgress();
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      played: Array.isArray(parsed.played) ? parsed.played : [],
      ratings: typeof parsed.ratings === "object" && parsed.ratings !== null ? parsed.ratings : {},
      // Campo novo (Fase 8) - progresso salvo antes disso existir nao tem,
      // por isso o fallback pra {} em vez de quebrar.
      completedAt: typeof parsed.completedAt === "object" && parsed.completedAt !== null ? parsed.completedAt : {},
    };
  } catch {
    return emptyProgress();
  }
}

// Pode lancar (quota cheia, aba anonima em alguns navegadores) - quem chama
// deve envolver em try/catch pra nao perder o resto do fluxo por causa disso.
export function saveLocalProgress(profileName, progress) {
  localStorage.setItem(KEY_PREFIX + profileName, JSON.stringify(progress));
}

export function togglePlayed(progress, gameId) {
  const played = new Set(progress.played);
  if (played.has(gameId)) {
    played.delete(gameId);
  } else {
    played.add(gameId);
  }
  return { ...progress, played: [...played] };
}

export function setRating(progress, gameId, rating) {
  return { ...progress, ratings: { ...progress.ratings, [gameId]: rating } };
}
