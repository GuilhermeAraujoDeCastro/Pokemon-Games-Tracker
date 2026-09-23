import { test } from "node:test";
import assert from "node:assert/strict";
import {
  availablePlatforms,
  availableYears,
  filterGames,
  isGameCompleted,
  sortGamesAlphabetically,
  sortGamesByYear,
  splitByCompletion,
  splitUpcoming,
} from "../js/filters.js";

const GAMES = [
  { id: 1, name: "Pokemon Gold Version", year: 1999, platforms: ["Game Boy Color"] },
  { id: 2, name: "Pokemon Red Version", year: 1996, platforms: ["Game Boy"] },
  { id: 3, name: "Pokemon Scarlet", year: 2022, platforms: ["Nintendo Switch", "PC"] },
];

test("filterGames by year keeps only that year", () => {
  const result = filterGames(GAMES, { year: 1996 });
  assert.deepEqual(result.map((g) => g.id), [2]);
});

test("filterGames onlyUnplayed excludes ids already played", () => {
  const result = filterGames(GAMES, { onlyUnplayed: true, playedIds: [1, 3] });
  assert.deepEqual(result.map((g) => g.id), [2]);
});

test("filterGames search matches part of the name, case-insensitive", () => {
  const result = filterGames(GAMES, { search: "scarlet" });
  assert.deepEqual(result.map((g) => g.id), [3]);
});

test("filterGames with no options returns everything unchanged", () => {
  const result = filterGames(GAMES);
  assert.equal(result.length, 3);
});

test("filterGames by platform keeps only games available on it", () => {
  const result = filterGames(GAMES, { platform: "Game Boy" });
  assert.deepEqual(result.map((g) => g.id), [2]);
});

test("filterGames by platform matches a game with multiple platforms", () => {
  const result = filterGames(GAMES, { platform: "PC" });
  assert.deepEqual(result.map((g) => g.id), [3]);
});

test("filterGames combines year and platform", () => {
  const result = filterGames(GAMES, { year: 1999, platform: "Game Boy Color" });
  assert.deepEqual(result.map((g) => g.id), [1]);
  assert.deepEqual(filterGames(GAMES, { year: 1999, platform: "PC" }), []);
});

test("availablePlatforms returns the distinct platforms sorted alphabetically", () => {
  assert.deepEqual(availablePlatforms(GAMES), ["Game Boy", "Game Boy Color", "Nintendo Switch", "PC"]);
});

test("sortGamesByYear ascending puts the oldest first", () => {
  const result = sortGamesByYear(GAMES);
  assert.deepEqual(result.map((g) => g.year), [1996, 1999, 2022]);
});

test("sortGamesByYear descending puts the newest first", () => {
  const result = sortGamesByYear(GAMES, "desc");
  assert.deepEqual(result.map((g) => g.year), [2022, 1999, 1996]);
});

test("sortGamesAlphabetically sorts by name", () => {
  const result = sortGamesAlphabetically(GAMES);
  assert.deepEqual(result.map((g) => g.id), [1, 2, 3]); // Gold, Red, Scarlet
});

test("sortGamesByYear does not mutate the original array", () => {
  const copy = [...GAMES];
  sortGamesByYear(GAMES, "desc");
  assert.deepEqual(GAMES, copy);
});

test("availableYears returns the distinct years in order", () => {
  assert.deepEqual(availableYears(GAMES), [1996, 1999, 2022]);
});

test("isGameCompleted is true only when played and rated", () => {
  const progress = { played: [1], ratings: { 1: 5 } };
  assert.equal(isGameCompleted(progress, 1), true);
  assert.equal(isGameCompleted(progress, 2), false);
});

test("isGameCompleted is false when rated but not played", () => {
  const progress = { played: [], ratings: { 1: 4 } };
  assert.equal(isGameCompleted(progress, 1), false);
});

test("splitByCompletion separates played and rated games from the rest", () => {
  const progress = { played: [1, 2], ratings: { 1: 5 } };
  const result = splitByCompletion(GAMES, progress);
  assert.deepEqual(result.completed.map((g) => g.id), [1]);
  assert.deepEqual(result.active.map((g) => g.id), [2, 3]);
});

test("splitUpcoming separates games released after the given year", () => {
  const result = splitUpcoming(GAMES, 2000);
  assert.deepEqual(result.upcoming.map((g) => g.id), [3]);
  assert.deepEqual(result.released.map((g) => g.id), [1, 2]);
});

test("splitUpcoming treats the current year itself as already released", () => {
  const result = splitUpcoming(GAMES, 2022);
  assert.deepEqual(result.upcoming, []);
  assert.deepEqual(result.released.map((g) => g.id), [1, 2, 3]);
});
