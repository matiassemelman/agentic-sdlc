import { expect, test, type Page } from "@playwright/test";

const prices = (page: Page) => page.getByTestId("room-price");
const names = (page: Page) => page.getByTestId("room").getByRole("heading", { level: 3 });
const ourOrder = (page: Page) => page.getByRole("button", { name: "Our order" });
const lowest = (page: Page) => page.getByRole("button", { name: "Lowest price first" });

test("AC-4: the rooms start in our order", async ({ page }) => {
  await page.goto("/");
  await expect(ourOrder(page)).toHaveAttribute("aria-pressed", "true");
  await expect(lowest(page)).toHaveAttribute("aria-pressed", "false");
  await expect(names(page)).toHaveText(["La Seu", "Bellver", "Badia", "Tramuntana"]);
  await expect(prices(page)).toHaveText(["€210", "€185", "€260", "€120"]);
});

test("AC-5: Lowest price first puts the cheapest room first", async ({ page }) => {
  await page.goto("/");
  await lowest(page).click();
  await expect(lowest(page)).toHaveAttribute("aria-pressed", "true");
  await expect(ourOrder(page)).toHaveAttribute("aria-pressed", "false");
  await expect(names(page)).toHaveText(["Tramuntana", "Bellver", "La Seu", "Badia"]);
  await expect(prices(page)).toHaveText(["€120", "€185", "€210", "€260"]);
  const tramuntana = page.getByTestId("room").filter({ has: page.getByRole("heading", { name: "Tramuntana" }) });
  await expect(tramuntana.getByTestId("room-guests")).toHaveText("1 guest");
  const badia = page.getByTestId("room").filter({ has: page.getByRole("heading", { name: "Badia" }) });
  await expect(badia.getByTestId("room-guests")).toHaveText("Up to 4 guests");
  await expect(badia.locator(".room__facts")).toContainText("36 m²");
  await expect(badia.locator(".room__facts")).toContainText("Two double beds");
  await expect(badia.locator(".room__price")).toContainText("a night");
});

test("AC-6: the sort works with dollars, and Our order brings the first order back", async ({ page }) => {
  await page.goto("/");
  await lowest(page).click();
  await page.getByRole("button", { name: "US dollars" }).click();
  await expect(prices(page)).toHaveText(["$135", "$208", "$236", "$292"]);
  await ourOrder(page).click();
  await expect(prices(page)).toHaveText(["$236", "$208", "$292", "$135"]);
  await expect(names(page)).toHaveText(["La Seu", "Bellver", "Badia", "Tramuntana"]);
});

test("AC-7: no sideways scroll with the sort on, and both sort buttons show a focus ring", async ({ page }, testInfo) => {
  await page.goto("/");
  await lowest(page).click();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  test.skip(testInfo.project.name !== "desktop", "keyboard focus is a desktop concern");
  await ourOrder(page).focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(ourOrder(page)).toBeFocused();
  await expect(ourOrder(page)).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Tab");
  await expect(lowest(page)).toBeFocused();
  await expect(lowest(page)).toHaveCSS("outline-style", "solid");
});

test("prices start in euros", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Euros" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "US dollars" })).toHaveAttribute("aria-pressed", "false");
  await expect(prices(page)).toHaveText(["€210", "€185", "€260", "€120"]);
});

test("the US dollars button shows dollar prices", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "US dollars" }).click();
  await expect(prices(page)).toHaveText(["$236", "$208", "$292", "$135"]);
  for (const room of await page.getByTestId("room").all()) await expect(room.locator(".room__price")).toContainText("a night");
  await expect(page.getByRole("button", { name: "US dollars" })).toHaveAttribute("aria-pressed", "true");
});

test("the Euros button brings euros back", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "US dollars" }).click();
  await page.getByRole("button", { name: "Euros" }).click();
  await expect(prices(page).first()).toHaveText("€210");
  await expect(page.getByRole("button", { name: "Euros" })).toHaveAttribute("aria-pressed", "true");
});

test("the note names the rate", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByText("Dollar prices are approximate, converted at 1 EUR = 1.1225 USD, the European Central Bank reference rate of 19 October 2026."),
  ).toBeVisible();
});

test("no sideways scroll in dollars, and both buttons show a focus ring", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "US dollars" }).click();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  test.skip(testInfo.project.name !== "desktop", "keyboard focus is a desktop concern");
  const euros = page.getByRole("button", { name: "Euros" });
  const dollars = page.getByRole("button", { name: "US dollars" });
  await euros.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(euros).toBeFocused();
  await expect(euros).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Tab");
  await expect(dollars).toBeFocused();
  await expect(dollars).toHaveCSS("outline-style", "solid");
});

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
