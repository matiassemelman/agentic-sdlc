import { expect, test, type Page } from "@playwright/test";

const rooms = (page: Page) => page.getByTestId("room");
const names = (page: Page) => page.getByTestId("room").getByRole("heading");
const guests = (page: Page) => page.getByLabel("Guests");
const all = ["La Seu", "Bellver", "Badia", "Tramuntana"];

test("AC-2: choosing 3 guests keeps Bellver then Badia", async ({ page }) => {
  await page.goto("/");
  await guests(page).selectOption({ label: "3 guests" });
  await expect(rooms(page)).toHaveCount(2);
  await expect(names(page)).toHaveText(["Bellver", "Badia"]);
  await expect(page.getByRole("heading", { name: "La Seu" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Tramuntana" })).toHaveCount(0);
});

test("AC-3: the drop-down starts on Any with all four rooms", async ({ page }) => {
  await page.goto("/");
  await expect(guests(page)).toBeVisible();
  await expect(guests(page).locator("option:checked")).toHaveText("Any");
  await expect(names(page)).toHaveText(all);
});

test("AC-4: 5 or 6 guests replace the list with a message", async ({ page }) => {
  await page.goto("/");
  await guests(page).selectOption({ label: "5 guests" });
  await expect(rooms(page)).toHaveCount(0);
  await expect(page.getByText("No room sleeps 5 guests. Choose fewer guests to see our rooms.")).toBeVisible();
  await guests(page).selectOption({ label: "6 guests" });
  await expect(rooms(page)).toHaveCount(0);
  await expect(page.getByText("No room sleeps 6 guests. Choose fewer guests to see our rooms.")).toBeVisible();
});

test("AC-5: choosing Any brings every room back", async ({ page }) => {
  await page.goto("/");
  await guests(page).selectOption({ label: "4 guests" });
  await expect(names(page)).toHaveText(["Badia"]);
  await guests(page).selectOption({ label: "Any" });
  await expect(names(page)).toHaveText(all);
  for (const room of await rooms(page).all()) await expect(room).toHaveCSS("opacity", "1");
});

test("AC-6: no sideways scroll with 5 guests, and the drop-down shows a focus ring", async ({ page }, testInfo) => {
  await page.goto("/");
  await guests(page).selectOption({ label: "5 guests" });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  test.skip(testInfo.project.name !== "desktop", "keyboard focus is a desktop concern");
  await page.getByRole("button", { name: "US dollars" }).focus();
  await page.keyboard.press("Tab");
  await expect(guests(page)).toBeFocused();
  await expect(guests(page)).toHaveCSS("outline-style", "solid");
});
