// Cost/Margin %/Markup %/Price stay cross-consistent: whichever of the three
// was just edited is treated as authoritative (together with Cost, which is
// always the anchor), and the others are recomputed from it. Margin is
// "% of price" (Price = Cost / (1 - Margin/100)); Markup is "% of cost"
// (Price = Cost * (1 + Markup/100)) — the two standard, different
// definitions, both surfaced since they read very differently at the same
// dollar spread. Shared by the Equipment Library form and the Proposal line
// items table so both compute the same Price from the same Cost/Margin/Markup.
export const round2 = (n: number) => Math.round(n * 100) / 100;

export function priceFromMargin(cost: number | null, marginPct: number | null): number | null {
  if (cost == null || marginPct == null) return null;
  const m = Math.min(99.99, marginPct);
  return round2(cost / (1 - m / 100));
}

export function priceFromMarkup(cost: number | null, markupPct: number | null): number | null {
  if (cost == null || markupPct == null) return null;
  return round2(cost * (1 + markupPct / 100));
}

export function marginFromPrice(cost: number | null, price: number | null): number | null {
  if (cost == null || price == null || price === 0) return null;
  return round2(((price - cost) / price) * 100);
}

export function markupFromPrice(cost: number | null, price: number | null): number | null {
  if (cost == null || price == null || cost === 0) return null;
  return round2(((price - cost) / cost) * 100);
}
