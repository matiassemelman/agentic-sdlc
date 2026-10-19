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
  const credits = page.getByTestId("credit");
  await expect(credits).toHaveCount(5);
  for (const credit of await credits.all()) await expect(credit.getByRole("link")).toHaveCount(2);
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
    await row.hover();
  }
  for (const row of rows) await expect(row).toHaveCSS("opacity", "1");
});

test("every animated element ends up readable after scrolling the whole page", async ({ page }) => {
  await page.goto("/");
  const animated = await page.locator("[data-reveal]").all();
  expect(animated.length).toBeGreaterThan(0);
  for (const el of animated) await el.scrollIntoViewIfNeeded();
  await page.getByTestId("room").last().hover();
  for (const el of animated) await expect(el).toHaveCSS("opacity", "1");
});

test("a jump past a section leaves the skipped content readable", async ({ page }) => {
  await page.goto("/#built");
  const skipped = page.locator("#house [data-reveal], #rooms [data-reveal]");
  await expect(skipped.first()).toBeAttached();
  for (const el of await skipped.all()) await expect(el).toHaveCSS("opacity", "1");
});

test("shows everything when the page script never loads", async ({ page }) => {
  // Only the scripts: the stylesheet is served from the same folder and must still load.
  await page.route((url) => url.pathname.startsWith("/_next/static/") && url.pathname.endsWith(".js"), (route) => route.abort());
  await page.goto("/");
  for (const el of await page.locator("[data-reveal]").all()) await expect(el).toHaveCSS("opacity", "1");
});

test("the focus ring shows on the hero button", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "keyboard focus is a desktop concern");
  await page.goto("/");
  const button = page.getByRole("link", { name: "Choose a room" });
  await button.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(button).toBeFocused();
  // The ring takes the field's ink, not the button's own green, which matches the background.
  await expect(button).toHaveCSS("outline-color", "rgb(226, 227, 223)");
});
