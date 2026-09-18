export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.client_reference_id;
      if (orgId && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const periodEnd = sub.items.data[0]?.current_period_end;
        await admin.from("organizations").update({
          stripe_subscription_id: sub.id,
          subscription_status: sub.status,
          subscription_current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          subscription_cancel_at_period_end: sub.cancel_at_period_end,
        }).eq("id", orgId);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const periodEnd = sub.items.data[0]?.current_period_end;
      await admin.from("organizations").update({
        stripe_subscription_id: sub.id,
        subscription_status: sub.status,
        subscription_current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        subscription_cancel_at_period_end: sub.cancel_at_period_end,
      }).eq("stripe_customer_id", sub.customer as string);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
