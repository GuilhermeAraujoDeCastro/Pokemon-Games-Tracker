import { test } from "node:test";
import assert from "node:assert/strict";
import { isRateLimited } from "../api/igdb-search.js";

test("isRateLimited allows requests under the limit", () => {
  const ip = "1.1.1.1";
  for (let i = 0; i < 20; i += 1) {
    assert.equal(isRateLimited(ip, 1000), false);
  }
});

test("isRateLimited blocks once the limit is exceeded within the window", () => {
  const ip = "2.2.2.2";
  for (let i = 0; i < 20; i += 1) {
    isRateLimited(ip, 1000);
  }
  assert.equal(isRateLimited(ip, 1000), true);
});

test("isRateLimited forgets requests older than the window", () => {
  const ip = "3.3.3.3";
  for (let i = 0; i < 20; i += 1) {
    isRateLimited(ip, 0);
  }
  assert.equal(isRateLimited(ip, 0), true);
  // 61s depois a janela de 60s ja passou, entao volta a liberar.
  assert.equal(isRateLimited(ip, 61_000), false);
});

test("isRateLimited tracks each ip independently", () => {
  for (let i = 0; i < 20; i += 1) {
    isRateLimited("4.4.4.4", 1000);
  }
  assert.equal(isRateLimited("4.4.4.4", 1000), true);
  assert.equal(isRateLimited("5.5.5.5", 1000), false);
});

test("isRateLimited resets everyone once the map grows past its size cap", () => {
  for (let i = 0; i < 20; i += 1) {
    isRateLimited("6.6.6.6", 1000);
  }
  assert.equal(isRateLimited("6.6.6.6", 1000), true);

  for (let i = 0; i < 10_001; i += 1) {
    isRateLimited(`filler-${i}`, 1000);
  }

  // O mapa estourou o teto e foi zerado - "6.6.6.6" volta a ter janela limpa.
  assert.equal(isRateLimited("6.6.6.6", 1000), false);
});
