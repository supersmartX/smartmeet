"use server";

import { stripe } from "@/lib/stripe";
import { getServerSession } from "next-auth";
import { enhancedAuthOptions } from "@/lib/enhanced-auth";
import { prisma } from "@/lib/prisma";

export async function createCheckoutSession(priceId: string) {
  const session = await getServerSession(enhancedAuthOptions);

  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Create or retrieve Stripe customer
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let stripeCustomerId = (user as any).stripeCustomerId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      metadata: {
        userId: user.id,
      },
    });
    stripeCustomerId = customer.id;
    await (prisma.user.update as any)({
      where: { id: user.id },
      data: { stripeCustomerId },
    });
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXTAUTH_URL}/dashboard?canceled=true`,
    metadata: {
      userId: user.id,
    },
  });

  if (!checkoutSession.url) {
    throw new Error("Could not create checkout session");
  }

  return { url: checkoutSession.url };
}

export async function createPortalSession() {
  const session = await getServerSession(enhancedAuthOptions);

  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  /* eslint-disable @typescript-eslint/no-explicit-any */
  if (!user || !(user as any).stripeCustomerId) {
    throw new Error("User or customer not found");
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: (user as any).stripeCustomerId,
    return_url: `${process.env.NEXTAUTH_URL}/dashboard/settings`,
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return { url: portalSession.url };
}
