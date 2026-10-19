const eur = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Formats a whole-euro amount, e.g. 210 → "€210". */
export function formatPrice(amountEur: number): string {
  return eur.format(amountEur);
}
