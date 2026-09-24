import { test, expect } from "@playwright/test";

// IGDB de verdade mockada (nunca chamada nesse teste) - o objetivo aqui e
// testar o app, nao a IGDB.
const MOCK_GAMES = [
  {
    id: 1,
    name: "Pokemon Red Version",
    first_release_date: 823996800,
    platforms: [{ name: "Game Boy" }],
  },
];

test("modo visitante: marcar jogado, dar nota, e o progresso sobrevive a um reload", async ({ page }) => {
  await page.route("**/api/igdb-search", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_GAMES) }),
  );

  await page.goto("/");
  await page.getByPlaceholder("Ex: Ana").fill("Ash");
  await page.locator("#guest-form button[type=submit]").click();

  const collectionCard = page.locator("#game-grid .game-card", { hasText: "Pokemon Red" });
  await expect(collectionCard).toBeVisible();
  await collectionCard.locator(".played-checkbox").check();
  await collectionCard.getByRole("button", { name: "Dar nota 5" }).click();

  await page.locator('.nav-btn[data-tab="profile"]').click();
  const profileCard = page.locator("#profile-grid .game-card", { hasText: "Pokemon Red" });
  await expect(profileCard).toBeVisible();
  await expect(profileCard.locator(".star.filled")).toHaveCount(5);

  // Sai e entra de novo com o mesmo nome - o progresso deve vir do localStorage.
  await page.reload();
  await page.getByPlaceholder("Ex: Ana").fill("Ash");
  await page.locator("#guest-form button[type=submit]").click();
  await page.locator('.nav-btn[data-tab="profile"]').click();
  await expect(page.locator("#profile-grid .game-card", { hasText: "Pokemon Red" })).toBeVisible();
});

test("clicar no texto Jogado marca o jogo sem abrir a ficha", async ({ page }) => {
  await page.route("**/api/igdb-search", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_GAMES) }),
  );
  await page.goto("/");
  await page.getByPlaceholder("Ex: Ana").fill("Brock");
  await page.locator("#guest-form button[type=submit]").click();

  const card = page.locator("#game-grid .game-card", { hasText: "Pokemon Red" });
  await card.locator(".played-label").click();
  await expect(card.locator(".played-checkbox")).toBeChecked();
  await expect(page.locator("#detail-close-btn")).toBeHidden();
});

test("card focado abre a ficha com Enter", async ({ page }) => {
  await page.route("**/api/igdb-search", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_GAMES) }),
  );
  await page.goto("/");
  await page.getByPlaceholder("Ex: Ana").fill("Misty");
  await page.locator("#guest-form button[type=submit]").click();

  await page.locator("#game-grid .game-card").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#detail-close-btn")).toBeFocused();
});
