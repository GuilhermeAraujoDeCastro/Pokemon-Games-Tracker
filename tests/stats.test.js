import { test } from "node:test";
import assert from "node:assert/strict";
import {
  averageCompletionDelay,
  gamesByGeneration,
  platformGeneration,
  ratingDistribution,
  stampCompletionIfNeeded,
  topRankedGames,
} from "../js/stats.js";

const GAMES = [
  { id: 1, name: "Pokemon Red", year: 1996, platforms: ["Game Boy"] },
  { id: 2, name: "Pokemon Gold", year: 1999, platforms: ["Game Boy Color"] },
  { id: 3, name: "Pokemon Scarlet", year: 2022, platforms: ["Nintendo Switch"] },
];

test("topRankedGames keeps only rated games, highest first", () => {
  const progress = { played: [1, 2], ratings: { 1: 3, 2: 5 } };
  const result = topRankedGames(GAMES, progress);
  assert.deepEqual(result.map((g) => g.id), [2, 1]);
  assert.equal(result[0].rating, 5);
});

test("topRankedGames breaks ties by year, newest first", () => {
  const progress = { played: [1, 2], ratings: { 1: 4, 2: 4 } };
  const result = topRankedGames(GAMES, progress);
  assert.deepEqual(result.map((g) => g.id), [2, 1]);
});

test("topRankedGames respects the limit", () => {
  const progress = { played: [1, 2, 3], ratings: { 1: 3, 2: 5, 3: 4 } };
  assert.equal(topRankedGames(GAMES, progress, 2).length, 2);
});

test("topRankedGames ignores games with no rating or a zero rating", () => {
  const progress = { played: [1], ratings: { 1: 0 } };
  assert.deepEqual(topRankedGames(GAMES, progress), []);
});

test("ratingDistribution counts each star value", () => {
  const result = ratingDistribution({ 1: 5, 2: 5, 3: 3, 4: 1 });
  assert.deepEqual(result, { 1: 1, 2: 0, 3: 1, 4: 0, 5: 2 });
});

test("ratingDistribution ignores invalid values", () => {
  const result = ratingDistribution({ 1: 0, 2: 6, 3: "x" });
  assert.deepEqual(result, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
});

test("platformGeneration recognizes Game Boy Color before the generic Game Boy", () => {
  assert.equal(platformGeneration("Game Boy Color"), "Game Boy Color (Ger. 2)");
  assert.equal(platformGeneration("Game Boy"), "Game Boy (Ger. 1)");
});

test("platformGeneration falls back to 'Outra plataforma' for unknown platforms", () => {
  assert.equal(platformGeneration("Sega Genesis"), "Outra plataforma");
});

test("gamesByGeneration groups by the first platform of each game", () => {
  const result = gamesByGeneration(GAMES);
  assert.deepEqual(result, {
    "Game Boy (Ger. 1)": 1,
    "Game Boy Color (Ger. 2)": 1,
    "Nintendo Switch (Ger. 8-9)": 1,
  });
});

test("gamesByGeneration counts games with no platforms as 'Outra plataforma'", () => {
  const result = gamesByGeneration([{ id: 1, name: "X", year: 2000, platforms: [] }]);
  assert.deepEqual(result, { "Outra plataforma": 1 });
});

test("averageCompletionDelay averages years between release and completion", () => {
  const progress = {
    played: [1, 2],
    ratings: { 1: 5, 2: 4 },
    completedAt: { 1: "2020-01-01T00:00:00.000Z", 2: "2021-01-01T00:00:00.000Z" },
  };
  // jogo 1: 2020 - 1996 = 24, jogo 2: 2021 - 1999 = 22 -> media 23
  assert.equal(averageCompletionDelay(GAMES, progress), 23);
});

test("averageCompletionDelay ignores completed games without a completedAt stamp", () => {
  const progress = { played: [1], ratings: { 1: 5 }, completedAt: {} };
  assert.equal(averageCompletionDelay(GAMES, progress), null);
});

test("averageCompletionDelay ignores games that are not actually completed", () => {
  const progress = { played: [], ratings: {}, completedAt: { 1: "2020-01-01T00:00:00.000Z" } };
  assert.equal(averageCompletionDelay(GAMES, progress), null);
});

test("stampCompletionIfNeeded stamps the first time a game becomes completed", () => {
  const progress = { played: [1], ratings: { 1: 5 }, completedAt: {} };
  const result = stampCompletionIfNeeded(progress, 1);
  assert.equal(typeof result.completedAt[1], "string");
});

test("stampCompletionIfNeeded does not overwrite an existing stamp", () => {
  const progress = { played: [1], ratings: { 1: 5 }, completedAt: { 1: "2020-01-01T00:00:00.000Z" } };
  const result = stampCompletionIfNeeded(progress, 1);
  assert.equal(result, progress);
});

test("stampCompletionIfNeeded does nothing when the game is not completed yet", () => {
  const progress = { played: [1], ratings: {}, completedAt: {} };
  const result = stampCompletionIfNeeded(progress, 1);
  assert.equal(result, progress);
});
