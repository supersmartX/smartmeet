"use server";

import { stripe } from "@/lib/stripe";
import { getServerSession } from "next-auth";
import { enhancedAuthOptions } from "@/lib/enhanced-auth";
import { prisma } from "@/lib/prisma";

export async function createCheckoutSession(priceId: string) {
  try {
    const session = await getServerSession(enhancedAuthOptions);

    if (!session?.user?.email) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Create or retrieve Stripe customer
    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          userId: user.id,
        },
      });
      stripeCustomerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });
    }

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
      return { success: false, error: "Could not create checkout session" };
    }

    return { success: true, url: checkoutSession.url };
  } catch (error) {
    console.error("Stripe Checkout Error:", error);
    return { success: false, error: "An error occurred while creating checkout session" };
  }
}

export async function createPortalSession() {
  try {
    const session = await getServerSession(enhancedAuthOptions);

    if (!session?.user?.email) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || !user.stripeCustomerId) {
      return { success: false, error: "Subscription not found" };
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL}/dashboard/settings`,
    });

    return { success: true, url: portalSession.url };
  } catch (error) {
    console.error("Stripe Portal Error:", error);
    return { success: false, error: "An error occurred while opening billing portal" };
  }
}
