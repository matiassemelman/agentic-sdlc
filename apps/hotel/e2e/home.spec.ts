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

test("rooms stay readable while the active room changes", async ({ page }) => {
  await page.goto("/#rooms");
  const rows = await page.getByTestId("room").all();
  for (const row of rows) {
    await row.scrollIntoViewIfNeeded();
    await row.hover({ trial: false }).catch(() => {});
  }
  for (const row of rows) await expect(row).toHaveCSS("opacity", "1");
});

test("every animated element ends up readable after scrolling the whole page", async ({ page }) => {
  await page.goto("/");
  const animated = await page.locator("[data-reveal]").all();
  expect(animated.length).toBeGreaterThan(0);
  for (const el of animated) await el.scrollIntoViewIfNeeded();
  await page.getByTestId("room").last().hover().catch(() => {});
  for (const el of animated) await expect(el).toHaveCSS("opacity", "1");
});
