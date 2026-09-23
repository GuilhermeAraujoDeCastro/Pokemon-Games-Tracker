// Integracao com Firebase: Authentication (Google e e-mail/senha) mais
// Firestore. SDK modular v9+ via CDN, sem bundler. Versao fixa 12.18.0
// (mesma do Barbie Movies Tracker).
//
// Nao testei contra um projeto Firebase de verdade (sem acesso de rede
// daqui). Confere na pratica depois de colar sua config em js/config.js.
//
// Um doc por jogo em progress/{uid}/games/{gameId} (nao mais um doc unico
// em progress/{uid}) - grava so' o jogo que mudou a cada clique em vez do
// progresso inteiro, o que fica mais barato conforme a colecao cresce.
// Regra do Firestore precisa liberar leitura/escrita dessa subcolecao pro
// dono (veja firestore.rules na raiz do projeto).

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const PROGRESS_COLLECTION = "progress";
const GAMES_SUBCOLLECTION = "games";

export function initFirebase(firebaseConfig) {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  return { app, auth, db };
}

export async function loginWithGoogle(auth) {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function registerWithEmail(auth, email, password) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function loginWithEmail(auth, email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export function logout(auth) {
  return signOut(auth);
}

// callback recebe o objeto "user" do Firebase (ou null quando ninguem esta
// logado). Devolve a funcao de "unsubscribe" que o proprio Firebase gera.
export function watchAuthState(auth, callback) {
  return onAuthStateChanged(auth, callback);
}

function emptyProgress() {
  return { played: [], ratings: {}, completedAt: {} };
}

// gameId sempre gravado como string no id do documento (Firestore nao
// aceita numero como id) - por isso Number(...) na volta em todo lugar.
function applyGameDocData(progress, gameId, data) {
  if (data.played) {
    progress.played.push(gameId);
  }
  if (typeof data.rating === "number") {
    progress.ratings[gameId] = data.rating;
  }
  if (typeof data.completedAt === "string") {
    progress.completedAt[gameId] = data.completedAt;
  }
}

// Mesma forma de progresso usada em storage-local.js ({played, ratings,
// completedAt}), montada a partir de um doc por jogo.
function progressFromGameDocs(gameDocs) {
  const progress = emptyProgress();
  for (const gameDoc of gameDocs) {
    applyGameDocData(progress, Number(gameDoc.id), gameDoc.data());
  }
  return progress;
}

// Le so' os jogos de um uid conhecido, um get por vez - nunca lista a
// subcolecao inteira (a regra do Firestore so libera "list" pro dono; um
// visitante do link publico "?share=uid" so pode fazer "get" de um doc por
// vez). gameIds vem do catalogo de jogos que o app ja tem carregado.
export async function loadSharedProgress(db, userId, gameIds) {
  const progress = emptyProgress();
  await Promise.all(
    gameIds.map(async (gameId) => {
      const snapshot = await getDoc(doc(db, PROGRESS_COLLECTION, userId, GAMES_SUBCOLLECTION, String(gameId)));
      if (snapshot.exists()) {
        applyGameDocData(progress, gameId, snapshot.data());
      }
    }),
  );
  return progress;
}

function legacyProgressFromDocData(data) {
  return {
    played: Array.isArray(data.played) ? data.played : [],
    ratings: data.ratings && typeof data.ratings === "object" ? data.ratings : {},
    completedAt: data.completedAt && typeof data.completedAt === "object" ? data.completedAt : {},
  };
}

// Le a subcolecao nova primeiro; se estiver vazia, cai pro formato antigo
// (doc unico) e migra em lote pra subcolecao, sem exigir nada manual de
// quem ja usava o site antes dessa mudanca.
export async function loadUserProgress(db, userId) {
  const gamesRef = collection(db, PROGRESS_COLLECTION, userId, GAMES_SUBCOLLECTION);
  const snapshot = await getDocs(gamesRef);
  if (!snapshot.empty) {
    return progressFromGameDocs(snapshot.docs);
  }

  const legacyRef = doc(db, PROGRESS_COLLECTION, userId);
  const legacySnapshot = await getDoc(legacyRef);
  if (!legacySnapshot.exists()) {
    return emptyProgress();
  }
  const legacyProgress = legacyProgressFromDocData(legacySnapshot.data());
  await writeProgressBatch(db, userId, legacyProgress);
  return legacyProgress;
}

// existingGameIds: jogos que ja tem doc na subcolecao mas ficaram de fora
// do progress novo - viram delete em vez de ficar esquecidos com dado
// velho (usado pelo import de backup, que deve substituir tudo; a
// migracao chama sem isso, ja que a subcolecao dela sempre comeca vazia).
function writeProgressBatch(db, userId, progress, existingGameIds = new Set()) {
  const newGameIds = new Set([...progress.played, ...Object.keys(progress.ratings).map(Number)]);
  const allGameIds = new Set([...newGameIds, ...existingGameIds]);
  if (allGameIds.size === 0) {
    return Promise.resolve();
  }
  const batch = writeBatch(db);
  for (const gameId of allGameIds) {
    const ref = doc(db, PROGRESS_COLLECTION, userId, GAMES_SUBCOLLECTION, String(gameId));
    if (newGameIds.has(gameId)) {
      batch.set(ref, {
        played: progress.played.includes(gameId),
        rating: typeof progress.ratings[gameId] === "number" ? progress.ratings[gameId] : null,
        completedAt: progress.completedAt[gameId] || null,
      });
    } else {
      batch.delete(ref);
    }
  }
  return batch.commit();
}

// Grava so' o jogo que mudou (chamado a cada clique na estrela/checkbox).
export async function saveGameProgress(db, userId, gameId, { played, rating, completedAt }) {
  const ref = doc(db, PROGRESS_COLLECTION, userId, GAMES_SUBCOLLECTION, String(gameId));
  await setDoc(ref, { played, rating: rating ?? null, completedAt: completedAt ?? null }, { merge: true });
}

// Grava varios jogos de uma vez (usado so' na importacao de um backup
// .json, onde muita coisa pode mudar junto) - um batch em vez de N
// escritas soltas. Le a subcolecao atual primeiro pra apagar jogos que
// ficaram de fora do backup importado (senao o import so soma, nunca
// remove o que ja estava salvo).
export async function saveAllProgress(db, userId, progress) {
  const gamesRef = collection(db, PROGRESS_COLLECTION, userId, GAMES_SUBCOLLECTION);
  const snapshot = await getDocs(gamesRef);
  const existingGameIds = new Set(snapshot.docs.map((gameDoc) => Number(gameDoc.id)));
  return writeProgressBatch(db, userId, progress, existingGameIds);
}
