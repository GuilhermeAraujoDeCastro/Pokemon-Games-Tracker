// Integracao com Firebase (Authentication com Google e e-mail/senha, mais
// Firestore). Usa o SDK
// modular do Firebase v9+ direto via CDN (gstatic.com), sem bundler nem
// "npm install" pra rodar esse site estatico. Versao fixada em 12.18.0 (a
// mesma usada no Barbie Movies Tracker, era a mais recente no site oficial
// de release notes do Firebase JS SDK quando esses arquivos foram escritos).
//
// Isso aqui e' so uma camada fina em cima do SDK oficial: eu nao consegui
// testar essas funcoes de verdade porque dependem de um projeto Firebase
// real (com Google Sign-In e Firestore configurados) e o sandbox onde
// escrevi esse projeto nao tem acesso a rede pro Firebase. Os outros
// modulos (progress.js, filters.js, ratings.js, igdb.js, storage-local.js)
// tem teste automatizado; esse aqui precisa ser conferido na pratica,
// depois que voce colar sua config real em js/config.js.
//
// Os dados ficam na colecao "progress", pra bater com as regras de
// seguranca ja publicadas no projeto Firebase deste app (pokemon-jogos-5a953).
// Esse projeto Firebase e' separado do Barbie Movies Tracker (cada um tem o
// seu), entao nao tem risco de um jogo se misturar com o progresso de um
// filme dentro do mesmo documento mesmo usando o mesmo nome de colecao.

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
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const PROGRESS_COLLECTION = "progress";

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
  return { played: [], ratings: {} };
}

// Mesma forma de progresso usada em storage-local.js ({played, ratings}),
// so que lendo da colecao acima no Firestore em vez do localStorage.
export async function loadUserProgress(db, userId) {
  const ref = doc(db, PROGRESS_COLLECTION, userId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    return emptyProgress();
  }
  const data = snapshot.data();
  return {
    played: Array.isArray(data.played) ? data.played : [],
    ratings: data.ratings && typeof data.ratings === "object" ? data.ratings : {},
  };
}

export async function saveUserProgress(db, userId, progress) {
  const ref = doc(db, PROGRESS_COLLECTION, userId);
  await setDoc(ref, progress);
}
