// Integracao com Firebase: Authentication (Google e e-mail/senha) mais
// Firestore. SDK modular v9+ via CDN, sem bundler. Versao fixa 12.18.0
// (mesma do Barbie Movies Tracker).
//
// Nao testei contra um projeto Firebase de verdade (sem acesso de rede
// daqui). Confere na pratica depois de colar sua config em js/config.js.
//
// Colecao "progress", batendo com as regras ja publicadas no Firebase.

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
