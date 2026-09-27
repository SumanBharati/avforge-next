import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// AVGenix Pro is billed per seat: quantity mirrors an org's current headcount.
// This is applied forward-only — it fires from the actions that actually
// change membership (invite accepted, member removed, member leaves) rather
// than a one-time backfill, so an org's existing Stripe quantity is left
// alone until the next such event. Individual workspaces never call this;
// they're always a single seat and aren't billed per-member.
export async function syncOrgSeats(orgId: string): Promise<void> {
  const { data: org, error } = await admin
    .from("organizations")
    .select("id, is_individual, stripe_subscription_id")
    .eq("id", orgId)
    .single();
  if (error || !org || org.is_individual || !org.stripe_subscription_id) return;

  const { count } = await admin
    .from("organization_members")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);
  const seats = Math.max(1, count ?? 1);

  try {
    const sub = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
    const item = sub.items.data[0];
    if (!item || item.quantity === seats) return;

    await stripe.subscriptionItems.update(item.id, {
      quantity: seats,
      proration_behavior: "create_prorations",
    });
  } catch (err) {
    // Best-effort: a canceled/missing subscription or a transient Stripe
    // error shouldn't block the membership change that triggered this.
    console.error(`Seat sync failed for org ${orgId}:`, err instanceof Error ? err.message : err);
  }
}
