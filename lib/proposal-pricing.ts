import { priceFromMargin, priceFromMarkup, marginFromPrice, markupFromPrice } from "./pricing";

// Shared proposal line-item pricing — used by the Proposal page, the Project
// Dashboard's Cost Breakdown/Margins cards, and Procurement's Release
// snapshot, so all three read the same sell price for the same line instead
// of drifting out of sync (this session found two independent copies of this
// math disagree before this file existed).
export interface PricingLineItem {
  qty: number;
  unitCost: number;
  // Only one of these is ever an explicit per-item override — whichever the
  // user last edited. When both are null, the item falls back to the
  // proposal's default Margin % (see itemMargin below).
  margin?: number | null;
  markup?: number | null;
  laborHours?: number;
  laborRate?: number;
}

export interface PricingSection {
  items: PricingLineItem[];
}

export function itemMargin(item: PricingLineItem, defaultMarginPct: number): number {
  if (item.margin != null) return item.margin;
  if (item.markup != null) return marginFromPrice(item.unitCost, priceFromMarkup(item.unitCost, item.markup)) ?? defaultMarginPct;
  return defaultMarginPct;
}

export function itemMarkup(item: PricingLineItem, defaultMarginPct: number): number {
  if (item.markup != null) return item.markup;
  return markupFromPrice(item.unitCost, priceFromMargin(item.unitCost, itemMargin(item, defaultMarginPct))) ?? 0;
}

export function itemPrice(item: PricingLineItem, defaultMarginPct: number): number {
  return priceFromMargin(item.unitCost, itemMargin(item, defaultMarginPct)) ?? item.unitCost;
}

export function itemLineTotal(item: PricingLineItem, defaultMarginPct: number): number {
  return item.qty * itemPrice(item, defaultMarginPct) + (item.laborHours || 0) * (item.laborRate || 0);
}

export function sectionSubtotalPrice(section: PricingSection, defaultMarginPct: number): number {
  return section.items.reduce((sum, i) => sum + itemLineTotal(i, defaultMarginPct), 0);
}

// A proposal line item removed from the live BOM while editing under a
// Change Order — the item itself is gone from the proposal, so its price at
// the moment of removal is snapshotted here (on the Change Order record)
// instead, since there's nowhere live left to look it up from.
export interface RemovedChangeOrderItem {
  id: string;
  category: string;
  manufacturer: string;
  model: string;
  description: string;
  qty: number;
  priceAtRemoval: number;
  lineTotalAtRemoval: number;
}

// Net $ impact of a Change Order: current sell price of whatever is still in
// the live proposal tagged with this CO's id, minus the value of whatever
// this CO removed (its frozen snapshots). Added items are looked up live
// (not snapshotted) so an later price edit is reflected automatically.
export function changeOrderCostImpact(
  addedItems: PricingLineItem[],
  removedItems: RemovedChangeOrderItem[],
  defaultMarginPct: number
): number {
  const addedTotal = addedItems.reduce((sum, i) => sum + itemLineTotal(i, defaultMarginPct), 0);
  const removedTotal = removedItems.reduce((sum, r) => sum + r.lineTotalAtRemoval, 0);
  return addedTotal - removedTotal;
}

export interface ProposalTotals {
  totalEquipmentPrice: number;
  totalEquipmentCost: number;
  totalLabor: number;
  tax: number;
  grandTotal: number;
}

// Tax is computed off the equipment sell price (what the client is actually
// charged), matching real sales-tax practice — not off raw equipment cost.
export function computeProposalTotals(sections: PricingSection[], defaultMarginPct: number, taxRatePct: number): ProposalTotals {
  const allItems = sections.flatMap((s) => s.items);
  const totalEquipmentPrice = allItems.reduce((sum, i) => sum + i.qty * itemPrice(i, defaultMarginPct), 0);
  const totalEquipmentCost = allItems.reduce((sum, i) => sum + i.qty * i.unitCost, 0);
  const totalLabor = allItems.reduce((sum, i) => sum + (i.laborHours || 0) * (i.laborRate || 0), 0);
  const tax = totalEquipmentPrice * (taxRatePct / 100);
  const grandTotal = totalEquipmentPrice + totalLabor + tax;
  return { totalEquipmentPrice, totalEquipmentCost, totalLabor, tax, grandTotal };
}
