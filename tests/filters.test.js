import { test } from "node:test";
import assert from "node:assert/strict";
import {
  availableYears,
  filterGames,
  sortGamesAlphabetically,
  sortGamesByYear,
} from "../js/filters.js";

const GAMES = [
  { id: 1, name: "Pokemon Gold Version", year: 1999 },
  { id: 2, name: "Pokemon Red Version", year: 1996 },
  { id: 3, name: "Pokemon Scarlet", year: 2022 },
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
