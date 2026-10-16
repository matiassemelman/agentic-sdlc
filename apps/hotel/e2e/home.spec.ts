import { expect, test } from "@playwright/test";

test("shows the four rooms with their nightly price and capacity", async ({ page }) => {
  await page.goto("/");
  const rooms = page.getByTestId("room");
  await expect(rooms).toHaveCount(4);
  const laSeu = rooms.filter({ has: page.getByRole("heading", { name: "La Seu" }) });
  await expect(laSeu.getByTestId("room-price")).toHaveText("€210");
  await expect(laSeu.getByTestId("room-guests")).toHaveText("Up to 2 guests");
});

test("names the hotel and credits every picture", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/mirador/i);
  await expect(page.locator("#credits a")).toHaveCount(5);
});

test("never scrolls sideways", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
