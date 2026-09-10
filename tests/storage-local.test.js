import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  loadLocalProgress,
  saveLocalProgress,
  setRating,
  togglePlayed,
} from "../js/storage-local.js";

// Node nao tem localStorage global por padrao (isso e' uma API de navegador),
// entao pra testar sem abrir um navegador de verdade, um Map simples faz o
// papel dele aqui.
class FakeLocalStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, value);
  }
}

beforeEach(() => {
  globalThis.localStorage = new FakeLocalStorage();
});

test("loadLocalProgress with nothing saved returns an empty progress", () => {
  const progress = loadLocalProgress("Ana");
  assert.deepEqual(progress, { played: [], ratings: {} });
});

test("saveLocalProgress then loadLocalProgress round-trips correctly", () => {
  const progress = { played: [1, 2], ratings: { 1: 5 } };
  saveLocalProgress("Ana", progress);
  assert.deepEqual(loadLocalProgress("Ana"), progress);
});

test("different profile names do not share progress", () => {
  saveLocalProgress("Ana", { played: [1], ratings: {} });
  saveLocalProgress("Beatriz", { played: [2], ratings: {} });
  assert.deepEqual(loadLocalProgress("Ana").played, [1]);
  assert.deepEqual(loadLocalProgress("Beatriz").played, [2]);
});

test("loadLocalProgress recovers from corrupted JSON instead of throwing", () => {
  globalThis.localStorage.setItem("pokemon-games-tracker:Ana", "{isso nao e json valido");
  assert.deepEqual(loadLocalProgress("Ana"), { played: [], ratings: {} });
});

test("togglePlayed adds an id that is not there yet", () => {
  const progress = { played: [1], ratings: {} };
  const result = togglePlayed(progress, 2);
  assert.deepEqual(result.played.sort(), [1, 2]);
});

test("togglePlayed removes an id that is already there", () => {
  const progress = { played: [1, 2], ratings: {} };
  const result = togglePlayed(progress, 2);
  assert.deepEqual(result.played, [1]);
});

test("togglePlayed does not mutate the original object", () => {
  const progress = { played: [1], ratings: {} };
  togglePlayed(progress, 2);
  assert.deepEqual(progress.played, [1]);
});

test("setRating adds a rating without touching the others", () => {
  const progress = { played: [], ratings: { 1: 5 } };
  const result = setRating(progress, 2, 3);
  assert.deepEqual(result.ratings, { 1: 5, 2: 3 });
});
