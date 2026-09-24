import { test } from "node:test";
import assert from "node:assert/strict";
import { filterOfficialGames, isOfficialGame, normalizeGames, searchPokemonGames } from "../js/igdb.js";

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

test("normalizeGames carries the summary and converts the 0-100 IGDB rating to 0-10", () => {
  const raw = [
    {
      id: 1,
      name: "Pokemon With Details",
      first_release_date: Date.UTC(2000, 0, 1) / 1000,
      summary: "Um jogo de Pokemon.",
      total_rating: 87.3,
    },
  ];
  const [game] = normalizeGames(raw);
  assert.equal(game.summary, "Um jogo de Pokemon.");
  assert.equal(game.totalRating, 8.7);
});

test("normalizeGames defaults summary and totalRating to null when missing", () => {
  const raw = [{ id: 1, name: "Pokemon No Details", first_release_date: Date.UTC(2000, 0, 1) / 1000 }];
  const [game] = normalizeGames(raw);
  assert.equal(game.summary, null);
  assert.equal(game.totalRating, null);
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

test("searchPokemonGames propagates the proxy's machine-readable error code", async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ error: "faltam variaveis de ambiente", code: "missing_env" }),
  });
  try {
    await searchPokemonGames(fetchImpl);
    assert.fail("deveria ter lancado");
  } catch (error) {
    assert.equal(error.code, "missing_env");
  }
});

// Empresa oficial no formato que a IGDB devolve (involved_companies.company.name).
const NINTENDO = [{ company: { name: "Nintendo" } }];

test("isOfficialGame keeps main games from official companies", () => {
  assert.equal(isOfficialGame({ name: "Pokemon Red", game_type: 0, involved_companies: [{ company: { name: "Game Freak" } }] }), true);
  assert.equal(isOfficialGame({ name: "Pokemon Go", category: 0, involved_companies: [{ company: { name: "Niantic" } }] }), true);
});

test("isOfficialGame drops ROM hacks, fan games, DLC and seasons", () => {
  assert.equal(isOfficialGame({ name: "Pokemon Radical Red", game_type: 5, involved_companies: NINTENDO }), false); // mod
  assert.equal(isOfficialGame({ name: "Pokemon Bois", game_type: 0, involved_companies: [{ company: { name: "Some Fan" } }] }), false);
  assert.equal(isOfficialGame({ name: "Pokemon Uranium", game_type: 0 }), false); // sem empresa nenhuma
  assert.equal(isOfficialGame({ name: "Pokemon Sword Expansion Pass", game_type: 1, involved_companies: NINTENDO }), false);
  assert.equal(isOfficialGame({ name: "Pokemon Go: Shared Skies", game_type: { id: 7 }, involved_companies: NINTENDO }), false);
});

test("filterOfficialGames leaves the list alone when the proxy sends no company data", () => {
  const raw = [{ id: 1, name: "Pokemon Red" }, { id: 2, name: "Pokemon Hack" }];
  assert.deepEqual(filterOfficialGames(raw), raw);
});

test("filterOfficialGames never returns an empty list", () => {
  const raw = [{ id: 1, name: "Pokemon Hack", involved_companies: [{ company: { name: "Fan" } }] }];
  assert.deepEqual(filterOfficialGames(raw), raw);
});

test("searchPokemonGames only returns official games when company data is present", async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => [
      { id: 1, name: "Pokemon Red", first_release_date: 823996800, game_type: 0, involved_companies: NINTENDO },
      { id: 2, name: "Pokemon Twitch Dates", first_release_date: 1420070400, game_type: 0, involved_companies: [] },
    ],
  });
  const games = await searchPokemonGames(fetchImpl);
  assert.deepEqual(games.map((g) => g.id), [1]);
});
