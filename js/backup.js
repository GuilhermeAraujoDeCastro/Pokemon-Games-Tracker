// Exportar/importar o progresso como JSON - sobretudo pro modo visitante,
// que perde tudo se limpar o navegador. Funcao pura: nao mexe em arquivo
// nem em DOM, so' monta/valida o objeto.

import { validateRating } from "./ratings.js";

export function exportProgressPayload(profile, progress) {
  return {
    exportedAt: new Date().toISOString(),
    profileName: profile.name,
    progress: {
      played: [...progress.played],
      ratings: { ...progress.ratings },
      completedAt: { ...progress.completedAt },
    },
  };
}

// Devolve null em qualquer formato inesperado (JSON invalido, campo
// faltando, tipo errado) pra quem chamou decidir como avisar o usuario -
// mesmo padrao defensivo do resto do projeto (loadLocalProgress etc).
// Sempre devolve os tres campos (played/ratings/completedAt), mesmo os que
// faltarem no arquivo - o resto do app assume que esse formato tem sempre
// os tres (ver emptyProgress em storage-local.js/firebase-app.js).
export function parseImportedProgress(rawJson) {
  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return null;
  }

  const progress = parsed && typeof parsed === "object" ? parsed.progress : null;
  if (!progress || typeof progress !== "object") {
    return null;
  }

  const played = Array.isArray(progress.played)
    ? progress.played.filter((id) => typeof id === "number")
    : [];

  const ratings =
    progress.ratings && typeof progress.ratings === "object"
      ? Object.fromEntries(
          Object.entries(progress.ratings).filter(([, value]) => validateRating(value) !== null),
        )
      : {};

  const completedAt =
    progress.completedAt && typeof progress.completedAt === "object"
      ? Object.fromEntries(
          Object.entries(progress.completedAt).filter(([, value]) => typeof value === "string"),
        )
      : {};

  return { played, ratings, completedAt };
}
