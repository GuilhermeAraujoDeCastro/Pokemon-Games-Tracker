import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeGames, searchPokemonGames } from "../js/igdb.js";

test("normalizeGames keeps titles that mention Pokemon regardless of accent", () => {
  const raw = [
    { id: 1, name: "Pokémon Red Version", first_release_date: Date.UTC(1996, 1, 27) / 1000 },
    { id: 2, name: "Pokemon Snap", first_release_date: Date.UTC(1999, 5, 30) / 1000 },
    { id: 3, name: "Some Unrelated Game", first_release_date: Date.UTC(2010, 0, 1) / 1000 },
  ];
  const result = normalizeGames(raw);
  assert.deepEqual(
    result.map((g) => g.id).sort((a, b) => a - b),
    [1, 2],
  );
});

test("normalizeGames discards entries without a release date", () => {
  const raw = [{ id: 1, name: "Pokemon Unreleased Thing" }];
  assert.deepEqual(normalizeGames(raw), []);
});

test("normalizeGames extracts the release year from the unix timestamp (seconds)", () => {
  const releaseDate = Date.UTC(1996, 1, 27) / 1000;
  const raw = [{ id: 1, name: "Pokemon Test Game", first_release_date: releaseDate }];
  const [game] = normalizeGames(raw);
  assert.equal(game.year, 1996);
});

test("normalizeGames builds the cover URL from cover.image_id", () => {
  const raw = [
    {
      id: 1,
      name: "Pokemon Cover Test",
      first_release_date: Date.UTC(2000, 0, 1) / 1000,
      cover: { image_id: "abc123" },
    },
  ];
  const [game] = normalizeGames(raw);
  assert.equal(game.coverUrl, "https://images.igdb.com/igdb/image/upload/t_cover_big/abc123.jpg");
});

test("normalizeGames handles a missing cover gracefully", () => {
  const raw = [{ id: 1, name: "Pokemon No Cover", first_release_date: Date.UTC(2000, 0, 1) / 1000 }];
  const [game] = normalizeGames(raw);
  assert.equal(game.coverUrl, null);
});

test("normalizeGames collects platform names", () => {
  const raw = [
    {
      id: 1,
      name: "Pokemon Multi Platform",
      first_release_date: Date.UTC(2000, 0, 1) / 1000,
      platforms: [{ name: "Game Boy" }, { name: "Game Boy Color" }],
    },
  ];
  const [game] = normalizeGames(raw);
  assert.deepEqual(game.platforms, ["Game Boy", "Game Boy Color"]);
});

test("normalizeGames defaults platforms to an empty list when missing", () => {
  const raw = [{ id: 1, name: "Pokemon No Platforms", first_release_date: Date.UTC(2000, 0, 1) / 1000 }];
  const [game] = normalizeGames(raw);
  assert.deepEqual(game.platforms, []);
});

test("normalizeGames sorts by release year", () => {
  const raw = [
    { id: 1, name: "Pokemon B", first_release_date: Date.UTC(2010, 0, 1) / 1000 },
    { id: 2, name: "Pokemon A", first_release_date: Date.UTC(1998, 0, 1) / 1000 },
  ];
  const result = normalizeGames(raw);
  assert.deepEqual(result.map((g) => g.id), [2, 1]);
});

test("searchPokemonGames calls the same-origin proxy endpoint", async () => {
  let requestedUrl = null;
  const fetchImpl = async (url) => {
    requestedUrl = url;
    return {
      ok: true,
      status: 200,
      json: async () => [{ id: 1, name: "Pokemon Fake Game", first_release_date: Date.UTC(2005, 0, 1) / 1000 }],
    };
  };

  const games = await searchPokemonGames(fetchImpl);

  assert.equal(requestedUrl, "/api/igdb-search");
  assert.equal(games.length, 1);
  assert.equal(games[0].id, 1);
});

test("searchPokemonGames throws a clear error on HTTP failure", async () => {
  const fetchImpl = async () => ({ ok: false, status: 500, json: async () => ({}) });
  await assert.rejects(() => searchPokemonGames(fetchImpl), /500/);
});

test("searchPokemonGames surfaces the proxy's own error message when present", async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ error: "IGDB_CLIENT_ID nao configurado" }),
  });
  await assert.rejects(() => searchPokemonGames(fetchImpl), /IGDB_CLIENT_ID/);
});
