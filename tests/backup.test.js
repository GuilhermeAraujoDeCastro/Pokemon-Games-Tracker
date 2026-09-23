import { test } from "node:test";
import assert from "node:assert/strict";
import { exportProgressPayload, parseImportedProgress } from "../js/backup.js";

test("exportProgressPayload wraps the progress with profile name and timestamp", () => {
  const profile = { mode: "guest", id: "Ash", name: "Ash" };
  const progress = { played: [1, 2], ratings: { 1: 5 }, completedAt: { 1: "2024-01-01T00:00:00.000Z" } };
  const payload = exportProgressPayload(profile, progress);
  assert.equal(payload.profileName, "Ash");
  assert.deepEqual(payload.progress, progress);
  assert.equal(typeof payload.exportedAt, "string");
});

test("exportProgressPayload does not share references with the original progress", () => {
  const progress = { played: [1], ratings: { 1: 5 }, completedAt: {} };
  const payload = exportProgressPayload({ name: "Ash" }, progress);
  payload.progress.played.push(2);
  assert.deepEqual(progress.played, [1]);
});

test("exportProgressPayload defaults completedAt to {} when the progress object doesn't have it", () => {
  const payload = exportProgressPayload({ name: "Ash" }, { played: [], ratings: {} });
  assert.deepEqual(payload.progress.completedAt, {});
});

test("parseImportedProgress round-trips a payload made by exportProgressPayload", () => {
  const progress = { played: [1, 2], ratings: { 1: 5, 2: 3 }, completedAt: { 1: "2024-01-01T00:00:00.000Z" } };
  const payload = exportProgressPayload({ name: "Ash" }, progress);
  const parsed = parseImportedProgress(JSON.stringify(payload));
  assert.deepEqual(parsed, progress);
});

test("parseImportedProgress returns null for invalid JSON", () => {
  assert.equal(parseImportedProgress("not json"), null);
});

test("parseImportedProgress returns null when progress is missing", () => {
  assert.equal(parseImportedProgress(JSON.stringify({ profileName: "Ash" })), null);
});

test("parseImportedProgress filters out non-numeric played ids", () => {
  const raw = JSON.stringify({ progress: { played: [1, "two", null, 3], ratings: {} } });
  assert.deepEqual(parseImportedProgress(raw).played, [1, 3]);
});

test("parseImportedProgress filters out out-of-range, non-integer or non-numeric ratings", () => {
  const raw = JSON.stringify({ progress: { played: [], ratings: { 1: 5, 2: 0, 3: 6, 4: "x", 5: 4.5 } } });
  assert.deepEqual(parseImportedProgress(raw).ratings, { 1: 5 });
});

test("parseImportedProgress filters out non-string completedAt values", () => {
  const raw = JSON.stringify({
    progress: { played: [], ratings: {}, completedAt: { 1: "2024-01-01T00:00:00.000Z", 2: 12345, 3: null } },
  });
  assert.deepEqual(parseImportedProgress(raw).completedAt, { 1: "2024-01-01T00:00:00.000Z" });
});

test("parseImportedProgress defaults to empty played/ratings/completedAt when fields are missing", () => {
  const raw = JSON.stringify({ progress: {} });
  assert.deepEqual(parseImportedProgress(raw), { played: [], ratings: {}, completedAt: {} });
});
