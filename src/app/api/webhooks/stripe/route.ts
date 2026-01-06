import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown Error";
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (event.type === "checkout.session.completed") {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    if (!session?.metadata?.userId) {
      return new NextResponse("User id is required", { status: 400 });
    }

    // Map your Stripe Price IDs to your internal plans and quotas
    // These should match your Capacity Plan and Pricing page
    const planMapping: Record<string, { plan: "FREE" | "PRO" | "ENTERPRISE", quota: number }> = {
      "price_BETA_PRO_ID": { plan: "PRO", quota: 1000 }, // Unlimited/High quota for Pro
      "price_BETA_FREE_ID": { plan: "FREE", quota: 10 },
    };

    const planInfo = planMapping[subscription.items.data[0].price.id] || { plan: "FREE", quota: 10 };

    /* eslint-disable @typescript-eslint/no-explicit-any */
    await (prisma.user.update as any)({
      where: {
        id: session.metadata.userId,
      },
      data: {
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        stripePriceId: subscription.items.data[0].price.id,
        stripeCurrentPeriodEnd: new Date(
          (subscription as any).current_period_end * 1000
        ),
        plan: planInfo.plan as any,
        meetingQuota: planInfo.quota,
      },
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }

  if (event.type === "invoice.payment_succeeded") {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const invoice = event.data.object as any;
    
    if (typeof invoice.subscription !== 'string') {
      return new NextResponse(null, { status: 200 });
    }

    const subscription = await stripe.subscriptions.retrieve(
      invoice.subscription
    );

    await (prisma.user.update as any)({
      where: {
        stripeSubscriptionId: subscription.id,
      },
      data: {
        stripePriceId: subscription.items.data[0].price.id,
        stripeCurrentPeriodEnd: new Date(
          (subscription as any).current_period_end * 1000
        ),
      },
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }

  return new NextResponse(null, { status: 200 });
}
