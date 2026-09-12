import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateProgress, formatProgressLabel } from "../js/progress.js";

const GAMES = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

test("calculateProgress counts played games correctly", () => {
  const result = calculateProgress(GAMES, [1, 3]);
  assert.equal(result.played, 2);
  assert.equal(result.total, 4);
  assert.equal(result.percent, 50);
});

test("calculateProgress ignores played ids that are not in the game list", () => {
  const result = calculateProgress(GAMES, [1, 999]);
  assert.equal(result.played, 1);
});

test("calculateProgress with zero games returns 0 percent instead of dividing by zero", () => {
  const result = calculateProgress([], []);
  assert.deepEqual(result, { played: 0, total: 0, percent: 0 });
});

test("calculateProgress rounds the percentage", () => {
  const result = calculateProgress([{ id: 1 }, { id: 2 }, { id: 3 }], [1]);
  assert.equal(result.percent, 33); // 1/3 = 33.33...
});

test("formatProgressLabel builds the readable string", () => {
  const label = formatProgressLabel({ played: 15, total: 42, percent: 36 });
  assert.equal(label, "15 de 42 · 36%");
});
