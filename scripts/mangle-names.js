// Passo opcional de build (roda na Vercel, depois do generate-config.js e
// antes do minify.js): troca os id/class do HTML/CSS/JS publicados por
// nomes curtos sem sentido (tipo "a" em vez de "game-grid"), so' pra deixar
// o F12 um pouco menos confortavel de ler. E' tao cosmetico quanto a
// minificacao (veja minify.js): quem quiser entender a estrutura ainda
// consegue, so' fica um pouco mais chato. O codigo-fonte no repositorio
// continua com os nomes de verdade; so' a copia publicada na Vercel fica
// assim.
//
// So' funciona porque a lista de id/class aqui embaixo e' fixa e conhecida
// (esse projeto nao gera id/class vindo de fora, tipo de uma API). Se um
// dia adicionar um id/class novo no HTML/CSS/JS, cadastra ele nas listas
// ID_NAMES/CLASS_NAMES tambem — senao ele simplesmente nao troca (nao
// quebra nada, so' fica sem o disfarce).

import { readFileSync, writeFileSync } from "node:fs";

// Ordem alfabetica so' por organizacao; a posicao na lista e' o que decide
// o nome curto (buildMap), entao mudar a ordem muda os nomes gerados, mas
// nunca quebra a troca em si.
const ID_NAMES = [
  "app-section",
  "backup-error",
  "bottom-nav",
  "completion-delay",
  "detail-close-btn",
  "detail-platforms",
  "detail-rating",
  "detail-sheet",
  "detail-summary",
  "detail-title",
  "email-form",
  "email-input",
  "email-login-btn",
  "email-login-error",
  "email-register-btn",
  "exit-share-btn",
  "export-btn",
  "filter-close-btn",
  "filter-sheet",
  "filter-toggle-btn",
  "game-grid",
  "generation-stats",
  "google-login-btn",
  "google-login-error",
  "guest-form",
  "guest-name",
  "import-btn",
  "import-file-input",
  "list-status",
  "logout-btn",
  "onboarding",
  "only-unplayed",
  "password-input",
  "platform-filter",
  "profile-grid",
  "profile-greeting",
  "profile-stats",
  "ranking-list",
  "rating-distribution",
  "refresh-btn",
  "search-input",
  "share-banner",
  "sort-select",
  "tab-collection",
  "tab-profile",
  "theme-toggle-btn",
  "upcoming-grid",
  "upcoming-section",
  "year-filter",
];

const CLASS_NAMES = [
  "active",
  "app-section",
  "app-shell",
  "badge-upcoming",
  "bottom-nav",
  "btn-secondary",
  "checkbox-label",
  "cover-placeholder",
  "credits-line",
  "detail-platforms",
  "detail-rating",
  "detail-summary",
  "email-form-actions",
  "empty-message",
  "error-text",
  "fab",
  "field-label",
  "filled",
  "game-card",
  "game-cover",
  "game-grid",
  "game-info",
  "game-platforms",
  "game-year",
  "icon-btn",
  "list-status",
  "nav-btn",
  "nav-icon",
  "onboarding",
  "onboarding-card",
  "open",
  "played-checkbox",
  "played-label",
  "profile-actions",
  "profile-greeting",
  "profile-header",
  "profile-stats",
  "ranking-item",
  "ranking-list",
  "ranking-rating",
  "read-only",
  "scroll-area",
  "search-bar",
  "section-title",
  "share-banner",
  "sheet",
  "sheet-handle",
  "sheet-overlay",
  "skeleton-card",
  "skeleton-cover",
  "skeleton-line",
  "star",
  "stars",
  "stat-bar-fill",
  "stat-bar-row",
  "stat-bar-track",
  "stat-bars",
  "stat-note",
  "stats-section",
  "tab-view",
  "theme-toggle-btn",
  "topbar",
  "upcoming-section",
];

// Gera "a", "b", ..., "z", "aa", "ab", ... na ordem do indice (mesma logica
// de nomear coluna de planilha). Curto, sem sentido, nunca repete.
function shortCode(index) {
  let n = index;
  let code = "";
  do {
    code = String.fromCharCode(97 + (n % 26)) + code;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return code;
}

function buildMap(names) {
  const map = {};
  names.forEach((name, i) => {
    map[name] = shortCode(i);
  });
  return map;
}

const ID_MAP = buildMap(ID_NAMES);
const CLASS_MAP = buildMap(CLASS_NAMES);

// "a b c" -> mapeia cada classe da lista separadamente (um elemento pode
// ter mais de uma classe) e devolve remontado com espaco.
function mapClassList(list) {
  return list
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => CLASS_MAP[token] || token)
    .join(" ");
}

function mangleHtmlLike(text) {
  return text
    .replace(/id="([^"]+)"/g, (full, name) => `id="${ID_MAP[name] || name}"`)
    .replace(/for="([^"]+)"/g, (full, name) => `for="${ID_MAP[name] || name}"`)
    .replace(/class="([^"]+)"/g, (full, list) => `class="${mapClassList(list)}"`);
}

function mangleCss(text) {
  // So' existe seletor por classe nesse projeto (nenhum "#id" no CSS, so'
  // cores hexadecimais tipo #e0218a) — por isso so' mexe em ".nome".
  return text.replace(/\.([a-zA-Z][\w-]*)/g, (full, name) => `.${CLASS_MAP[name] || name}`);
}

// Troca cada token "#nome"/"nome" (prefixado por # ou .) dentro de um
// seletor, mesmo quando ele e' composto (tipo "#bottom-nav .nav-btn") -
// diferente de so' aceitar a string inteira ser ".nome".
function mangleSelector(selector) {
  return selector.replace(/([.#])([a-zA-Z][\w-]*)/g, (full, prefix, name) => {
    const map = prefix === "#" ? ID_MAP : CLASS_MAP;
    return prefix + (map[name] || name);
  });
}

function mangleJs(text) {
  // Unico lugar com classe montada dinamicamente: a estrela cheia. Essa
  // linha tem aspas dentro do ${...} (o ternario), o que quebraria a regex
  // generica de class="..." mais abaixo se ela tentasse ler essa linha
  // tambem — por isso troca essa linha inteira primeiro, por um marcador,
  // e devolve o valor certo so' no final.
  const ESTRELA_ANTIGA = 'class="star${value <= rating ? " filled" : ""}"';
  if (!text.includes(ESTRELA_ANTIGA)) {
    throw new Error(
      "mangle-names: padrao da estrela nao encontrado em js/main.js (o arquivo mudou?) — abortando pra nao publicar quebrado.",
    );
  }
  const ESTRELA_NOVA = `class="${CLASS_MAP.star}\${value <= rating ? " ${CLASS_MAP.filled}" : ""}"`;
  const MARCADOR = "@@MANGLE_STAR@@";

  let out = text.split(ESTRELA_ANTIGA).join(MARCADOR);

  out = out
    .replace(/getElementById\("([^"]+)"\)/g, (full, name) => `getElementById("${ID_MAP[name] || name}")`)
    .replace(
      /(querySelectorAll|matches|closest)\("([^"]+)"\)/g,
      (full, method, selector) => `${method}("${mangleSelector(selector)}")`,
    )
    .replace(
      /classList\.(add|toggle|remove)\("([a-zA-Z][\w-]*)"/g,
      (full, method, name) => `classList.${method}("${CLASS_MAP[name] || name}"`,
    )
    .replace(/class="([^"]+)"/g, (full, list) => `class="${mapClassList(list)}"`);

  return out.split(MARCADOR).join(ESTRELA_NOVA);
}

try {
  const htmlPath = "index.html";
  const cssPath = "css/styles.css";
  const jsPath = "js/main.js";

  writeFileSync(htmlPath, mangleHtmlLike(readFileSync(htmlPath, "utf8")));
  writeFileSync(cssPath, mangleCss(readFileSync(cssPath, "utf8")));
  writeFileSync(jsPath, mangleJs(readFileSync(jsPath, "utf8")));

  console.log("id/class trocados por nomes curtos pra publicacao (so estetico, mesma ideia da minificacao).");
} catch (error) {
  console.error("Erro ao trocar id/class:", error);
  process.exit(1);
}
