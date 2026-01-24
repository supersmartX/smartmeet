import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/actions/notification";
import Stripe from "stripe";
import { createSuccessResponse, createErrorResponse, ApiErrorCode } from "@/lib/api-response";

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
    return NextResponse.json(
      createErrorResponse(ApiErrorCode.BAD_REQUEST, `Webhook Error: ${message}`),
      { status: 400 }
    );
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (event.type === "checkout.session.completed") {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    if (!session?.metadata?.userId) {
      return NextResponse.json(
        createErrorResponse(ApiErrorCode.BAD_REQUEST, "User id is required"),
        { status: 400 }
      );
    }

    // Map your Stripe Price IDs to your internal plans and quotas
    // These should match your Capacity Plan and Pricing page
    const planMapping: Record<string, { plan: "FREE" | "PRO" | "ENTERPRISE", quota: number }> = {
      "price_BETA_PRO_ID": { plan: "PRO", quota: 1000 }, // Unlimited/High quota for Pro
      "price_BETA_FREE_ID": { plan: "FREE", quota: 10 },
    };

    const planInfo = planMapping[subscription.items.data[0].price.id] || { plan: "FREE", quota: 10 };

    await prisma.user.update({
      where: {
        id: session.metadata.userId,
      },
      data: {
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        stripePriceId: subscription.items.data[0].price.id,
        stripeCurrentPeriodEnd: new Date(
          subscription.items.data[0].current_period_end * 1000
        ),
        plan: planInfo.plan,
        meetingQuota: planInfo.quota,
      },
    });

    await createNotification(session.metadata.userId, {
      title: "Subscription Activated",
      message: `Your ${planInfo.plan} plan is now active! Enjoy your enhanced features.`,
      type: "SUCCESS",
      link: "/dashboard/settings"
    });
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    
    const subscriptionId = invoice.parent?.subscription_details?.subscription;
    
    if (typeof subscriptionId !== 'string') {
      return NextResponse.json(createSuccessResponse({ received: true }));
    }

    const subscription = await stripe.subscriptions.retrieve(
      subscriptionId
    );

    const updatedUser = await prisma.user.update({
      where: {
        stripeSubscriptionId: subscription.id,
      },
      data: {
        stripePriceId: subscription.items.data[0].price.id,
        stripeCurrentPeriodEnd: new Date(
          subscription.items.data[0].current_period_end * 1000
        ),
      },
    });

    await createNotification(updatedUser.id, {
      title: "Payment Successful",
      message: "Your subscription has been successfully renewed.",
      type: "SUCCESS",
      link: "/dashboard/settings"
    });
  }

  return NextResponse.json(createSuccessResponse({ received: true }));
}
