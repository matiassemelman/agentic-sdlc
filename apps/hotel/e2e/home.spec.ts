import { expect, test, type Page } from "@playwright/test";

const prices = (page: Page) => page.getByTestId("room-price");

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

const perGuestLines = (page: Page) => page.locator(".room__per-guest");
const roomNamed = (page: Page, name: string) => page.getByTestId("room").filter({ has: page.getByRole("heading", { name }) });

test("AC-4: rooms for several guests show the price per guest in euros, under the nightly price", async ({ page }) => {
  await page.goto("/");
  await expect(perGuestLines(page)).toHaveText(["€105 per guest when full", "€62 per guest when full", "€65 per guest when full"]);
  for (const name of ["La Seu", "Bellver", "Badia"]) {
    const row = roomNamed(page, name);
    const price = await row.getByTestId("room-price").boundingBox();
    const line = await row.getByTestId("room-price-per-guest").boundingBox();
    expect(line!.y).toBeGreaterThan(price!.y);
  }
});

test("AC-5: the US dollars button changes the price per guest", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "US dollars" }).click();
  await expect(perGuestLines(page)).toHaveText(["$118 per guest when full", "$69 per guest when full", "$73 per guest when full"]);
});

test("AC-6: Tramuntana shows no price per guest in either currency", async ({ page }) => {
  await page.goto("/");
  const tramuntana = roomNamed(page, "Tramuntana");
  // Only the other three rooms have the line: without it the absence below would prove nothing.
  await expect(perGuestLines(page)).toHaveCount(3);
  await expect(tramuntana.getByTestId("room-price")).toHaveText("€120");
  await expect(tramuntana.getByTestId("room-price-per-guest")).toHaveCount(0);
  await expect(tramuntana).not.toContainText("per guest when full");
  await page.getByRole("button", { name: "US dollars" }).click();
  await expect(perGuestLines(page)).toHaveCount(3);
  await expect(tramuntana.getByTestId("room-price")).toHaveText("$135");
  await expect(tramuntana.getByTestId("room-price-per-guest")).toHaveCount(0);
  await expect(tramuntana).not.toContainText("per guest when full");
});

test("AC-7: no sideways scroll with the price per guest in US dollars", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "US dollars" }).click();
  await expect(page.getByTestId("room-price-per-guest").first()).toHaveText("$118");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
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
