export type Currency = "EUR" | "USD";

/** US dollars per euro: the European Central Bank reference rate of 19 October 2026. */
export const USD_PER_EUR = 1.1225;

const formatters: Record<Currency, Intl.NumberFormat> = {
  EUR: new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }),
};

/** Formats a whole-euro amount in the chosen currency, e.g. 210 → "€210", or "$236" in US dollars. */
export function formatPrice(amountEur: number, currency: Currency = "EUR"): string {
  const amount = currency === "USD" ? amountEur * USD_PER_EUR : amountEur;
  return formatters[currency].format(amount);
}
