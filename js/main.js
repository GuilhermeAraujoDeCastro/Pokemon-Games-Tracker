// Liga tudo (DOM, Firebase, IGDB) nos modulos puros. Sem teste automatizado
// aqui (precisa de navegador); a logica testada mora nos outros modulos.

import { calculateProgress, formatProgressLabel } from "./progress.js";
import { availableYears, filterGames, sortGamesAlphabetically, sortGamesByYear } from "./filters.js";
import { averageRating, validateRating } from "./ratings.js";
import { searchPokemonGames } from "./igdb.js";
import { loadLocalProgress, saveLocalProgress, setRating, togglePlayed } from "./storage-local.js";

const GAMES_CACHE_KEY = "pokemon-games-tracker:games-cache";

const el = {
  onboarding: document.getElementById("onboarding"),
  appSection: document.getElementById("app-section"),
  profileBar: document.getElementById("profile-bar"),
  profileName: document.getElementById("profile-name"),
  progressLabel: document.getElementById("progress-label"),
  logoutBtn: document.getElementById("logout-btn"),
  guestForm: document.getElementById("guest-form"),
  guestNameInput: document.getElementById("guest-name"),
  googleLoginBtn: document.getElementById("google-login-btn"),
  googleLoginError: document.getElementById("google-login-error"),
  emailForm: document.getElementById("email-form"),
  emailInput: document.getElementById("email-input"),
  passwordInput: document.getElementById("password-input"),
  emailLoginBtn: document.getElementById("email-login-btn"),
  emailRegisterBtn: document.getElementById("email-register-btn"),
  emailLoginError: document.getElementById("email-login-error"),
  searchInput: document.getElementById("search-input"),
  yearFilter: document.getElementById("year-filter"),
  onlyUnplayed: document.getElementById("only-unplayed"),
  sortSelect: document.getElementById("sort-select"),
  refreshBtn: document.getElementById("refresh-btn"),
  listStatus: document.getElementById("list-status"),
  gameGrid: document.getElementById("game-grid"),
};

const state = {
  profile: null, // { mode: "guest" | "google", id, name }
  games: [],
  progress: { played: [], ratings: {} },
};

let appConfig = null;
let firebaseModule = null;
let firebaseRefs = null; // { app, auth, db }

init();

async function init() {
  appConfig = await loadConfig();

  if (appConfig && appConfig.FIREBASE_CONFIG) {
    await setUpFirebase(appConfig.FIREBASE_CONFIG);
  } else {
    el.googleLoginBtn.disabled = true;
    el.emailLoginBtn.disabled = true;
    el.emailRegisterBtn.disabled = true;
  }

  el.guestForm.addEventListener("submit", handleGuestLogin);
  el.googleLoginBtn.addEventListener("click", handleGoogleLogin);
  el.emailForm.addEventListener("submit", handleEmailLogin);
  el.emailRegisterBtn.addEventListener("click", handleEmailRegister);
  el.logoutBtn.addEventListener("click", handleLogout);
  el.searchInput.addEventListener("input", render);
  el.yearFilter.addEventListener("change", render);
  el.onlyUnplayed.addEventListener("change", render);
  el.sortSelect.addEventListener("change", render);
  el.refreshBtn.addEventListener("click", () => loadGames({ forceRefresh: true }));
  el.gameGrid.addEventListener("click", handleGridClick);
}

async function loadConfig() {
  try {
    return await import("./config.js");
  } catch {
    return null;
  }
}

async function setUpFirebase(firebaseConfig) {
  try {
    firebaseModule = await import("./firebase-app.js");
    firebaseRefs = firebaseModule.initFirebase(firebaseConfig);
    firebaseModule.watchAuthState(firebaseRefs.auth, (user) => {
      if (user && !state.profile) {
        loginWithFirebaseUser(user, firebaseProviderMode(user));
      }
    });
  } catch (error) {
    console.error("Nao foi possivel iniciar o Firebase:", error);
    el.googleLoginBtn.disabled = true;
    el.emailLoginBtn.disabled = true;
    el.emailRegisterBtn.disabled = true;
    el.googleLoginError.hidden = false;
    el.googleLoginError.textContent = "Login com Google e por e-mail indisponivel agora (confira js/config.js).";
  }
}

// Descobre se o login foi por Google ou e-mail/senha, olhando o provedor
// que o Firebase registra (usado ao restaurar a sessao num reload).
function firebaseProviderMode(user) {
  const providerId = user.providerData && user.providerData[0] ? user.providerData[0].providerId : null;
  return providerId === "google.com" ? "google" : "email";
}

async function handleGuestLogin(event) {
  event.preventDefault();
  const name = el.guestNameInput.value.trim();
  if (!name) {
    return;
  }
  state.profile = { mode: "guest", id: name, name };
  state.progress = loadLocalProgress(name);
  await enterApp();
}

async function handleGoogleLogin() {
  if (!firebaseModule || !firebaseRefs) {
    return;
  }
  el.googleLoginError.hidden = true;
  try {
    const user = await firebaseModule.loginWithGoogle(firebaseRefs.auth);
    await loginWithFirebaseUser(user, "google");
  } catch (error) {
    console.error("Falha no login com Google:", error);
    el.googleLoginError.hidden = false;
    el.googleLoginError.textContent = "Nao foi possivel entrar com Google. Tente de novo.";
  }
}

async function handleEmailLogin(event) {
  event.preventDefault();
  if (!firebaseModule || !firebaseRefs) {
    return;
  }
  el.emailLoginError.hidden = true;
  try {
    const user = await firebaseModule.loginWithEmail(firebaseRefs.auth, el.emailInput.value.trim(), el.passwordInput.value);
    await loginWithFirebaseUser(user, "email");
  } catch (error) {
    console.error("Falha no login com e-mail:", error);
    el.emailLoginError.hidden = false;
    el.emailLoginError.textContent = emailErrorMessage(error);
  }
}

async function handleEmailRegister() {
  if (!firebaseModule || !firebaseRefs) {
    return;
  }
  el.emailLoginError.hidden = true;
  try {
    const user = await firebaseModule.registerWithEmail(firebaseRefs.auth, el.emailInput.value.trim(), el.passwordInput.value);
    await loginWithFirebaseUser(user, "email");
  } catch (error) {
    console.error("Falha ao criar conta por e-mail:", error);
    el.emailLoginError.hidden = false;
    el.emailLoginError.textContent = emailErrorMessage(error);
  }
}

// Traduz os codigos de erro mais comuns do Firebase pra uma frase legivel.
function emailErrorMessage(error) {
  const code = error && error.code;
  if (code === "auth/email-already-in-use") {
    return "Ja existe uma conta com esse e-mail. Tenta entrar em vez de criar uma nova.";
  }
  if (code === "auth/weak-password") {
    return "Senha muito curta (minimo de 6 caracteres).";
  }
  if (code === "auth/invalid-email") {
    return "Esse e-mail nao parece valido.";
  }
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "E-mail ou senha incorretos.";
  }
  return "Nao foi possivel completar agora. Tenta de novo.";
}

async function loginWithFirebaseUser(user, mode) {
  const fallbackName = mode === "google" ? "sua conta Google" : user.email || "sua conta";
  state.profile = { mode, id: user.uid, name: user.displayName || fallbackName };
  state.progress = await firebaseModule.loadUserProgress(firebaseRefs.db, user.uid);
  await enterApp();
}

async function handleLogout() {
  if (state.profile && state.profile.mode !== "guest" && firebaseModule && firebaseRefs) {
    try {
      await firebaseModule.logout(firebaseRefs.auth);
    } catch (error) {
      console.error("Erro ao sair da conta:", error);
    }
  }
  state.profile = null;
  state.progress = { played: [], ratings: {} };
  el.appSection.hidden = true;
  el.profileBar.hidden = true;
  el.onboarding.hidden = false;
}

async function enterApp() {
  el.onboarding.hidden = true;
  el.profileBar.hidden = false;
  el.appSection.hidden = false;
  el.profileName.textContent = `Ola, ${state.profile.name}`;
  await loadGames({ forceRefresh: false });
}

async function loadGames({ forceRefresh }) {
  if (!forceRefresh) {
    const cached = readGamesCache();
    if (cached) {
      state.games = cached;
      populateYearFilter();
      render();
    }
  }

  if (!forceRefresh && state.games.length > 0) {
    return;
  }

  showListStatus("Buscando jogos na IGDB...");
  try {
    const games = await searchPokemonGames();
    state.games = games;
    saveGamesCache(games);
    populateYearFilter();
    hideListStatus();
    render();
  } catch (error) {
    console.error("Erro ao buscar jogos na IGDB:", error);
    showListStatus(
      state.games.length > 0
        ? "Nao deu pra atualizar agora. Mostrando a ultima lista salva."
        : "Nao deu pra buscar os jogos na IGDB agora. Confira se o proxy (netlify/functions/igdb-search.mjs) esta configurado.",
    );
  }
}

function readGamesCache() {
  try {
    const raw = localStorage.getItem(GAMES_CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.games) ? parsed.games : null;
  } catch {
    return null;
  }
}

function saveGamesCache(games) {
  try {
    localStorage.setItem(GAMES_CACHE_KEY, JSON.stringify({ games, fetchedAt: Date.now() }));
  } catch (error) {
    console.error("Nao deu pra salvar o cache dos jogos:", error);
  }
}

function populateYearFilter() {
  const years = availableYears(state.games);
  const previousValue = el.yearFilter.value;
  el.yearFilter.innerHTML =
    '<option value="">Todos</option>' + years.map((year) => `<option value="${year}">${year}</option>`).join("");
  el.yearFilter.value = years.some((year) => String(year) === previousValue) ? previousValue : "";
}

function showListStatus(message) {
  el.listStatus.hidden = false;
  el.listStatus.textContent = message;
}

function hideListStatus() {
  el.listStatus.hidden = true;
}

function render() {
  const filtered = filterGames(state.games, {
    search: el.searchInput.value,
    year: el.yearFilter.value ? Number(el.yearFilter.value) : null,
    onlyUnplayed: el.onlyUnplayed.checked,
    playedIds: state.progress.played,
  });
  const sorted = applySort(filtered, el.sortSelect.value);

  el.gameGrid.innerHTML =
    sorted.length > 0
      ? sorted.map((game) => gameCardHtml(game)).join("")
      : '<p class="empty-message">Nenhum jogo encontrado com esses filtros.</p>';

  const progress = calculateProgress(state.games, state.progress.played);
  const avg = averageRating(state.progress.ratings);
  el.progressLabel.textContent =
    avg === null ? formatProgressLabel(progress) : `${formatProgressLabel(progress)} · nota media: ${avg}`;
}

function applySort(games, sortKey) {
  if (sortKey === "year-desc") {
    return sortGamesByYear(games, "desc");
  }
  if (sortKey === "title-asc") {
    return sortGamesAlphabetically(games, "asc");
  }
  return sortGamesByYear(games, "asc");
}

function gameCardHtml(game) {
  const played = state.progress.played.includes(game.id);
  const rating = state.progress.ratings[game.id] || 0;
  const safeName = escapeHtml(game.name);
  const platformsText = game.platforms.length > 0 ? escapeHtml(game.platforms.join(", ")) : "";

  const cover = game.coverUrl
    ? `<img class="game-cover" src="${game.coverUrl}" alt="Capa de ${safeName}" loading="lazy" />`
    : `<div class="cover-placeholder"><span>${safeName}</span></div>`;

  const stars = [1, 2, 3, 4, 5]
    .map(
      (value) =>
        `<button type="button" class="star${value <= rating ? " filled" : ""}" data-rating="${value}" aria-label="Dar nota ${value}">★</button>`,
    )
    .join("");

  return `
    <article class="game-card" data-game-id="${game.id}">
      ${cover}
      <div class="game-info">
        <h3>${safeName} <span class="game-year">(${game.year})</span></h3>
        ${platformsText ? `<p class="game-platforms">${platformsText}</p>` : ""}
        <label class="played-label">
          <input type="checkbox" class="played-checkbox" ${played ? "checked" : ""} />
          Jogado
        </label>
        <div class="stars">${stars}</div>
      </div>
    </article>
  `;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function handleGridClick(event) {
  const card = event.target.closest(".game-card");
  if (!card || !state.profile) {
    return;
  }
  const gameId = Number(card.dataset.gameId);

  if (event.target.matches(".star")) {
    const validated = validateRating(event.target.dataset.rating);
    if (validated === null) {
      return;
    }
    state.progress = setRating(state.progress, gameId, validated);
    persistProgress();
    render();
    return;
  }

  if (event.target.matches(".played-checkbox")) {
    state.progress = togglePlayed(state.progress, gameId);
    persistProgress();
    render();
  }
}

function persistProgress() {
  if (state.profile.mode === "guest") {
    saveLocalProgress(state.profile.id, state.progress);
  } else if (firebaseModule && firebaseRefs) {
    firebaseModule.saveUserProgress(firebaseRefs.db, state.profile.id, state.progress).catch((error) => {
      console.error("Erro ao salvar progresso no Firestore:", error);
    });
  }
}
