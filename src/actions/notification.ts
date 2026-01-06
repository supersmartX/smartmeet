"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { enhancedAuthOptions } from "@/lib/enhanced-auth";
import { revalidatePath } from "next/cache";
import { Notification, NotificationType } from "@prisma/client";

export type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Fetch all notifications for the current user
 */
export async function getNotifications(): Promise<ActionResult<Notification[]>> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const notifications = await prisma.notification.findMany({
      where: {
        user: { email: session.user.email },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Limit to last 50 notifications
    });

    return { success: true, data: notifications };
  } catch (error: unknown) {
    console.error("Get notifications error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch notifications" 
    };
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(id: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    await prisma.notification.update({
      where: {
        id,
        user: { email: session.user.email },
      },
      data: {
        read: true,
      },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: unknown) {
    console.error("Mark notification as read error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to mark notification as read" 
    };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<ActionResult> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    await prisma.notification.updateMany({
      where: {
        user: { email: session.user.email },
        read: false,
      },
      data: {
        read: true,
      },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: unknown) {
    console.error("Mark all notifications as read error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to mark all notifications as read" 
    };
  }
}

/**
 * Create a new notification (internal use)
 */
export async function createNotification(
  userId: string,
  data: {
    title: string;
    message: string;
    type?: NotificationType;
    link?: string;
  }
): Promise<ActionResult<Notification>> {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title: data.title,
        message: data.message,
        type: data.type || "INFO",
        link: data.link,
      },
    });

    return { success: true, data: notification };
  } catch (error: unknown) {
    console.error("Create notification error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to create notification" 
    };
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(id: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    await prisma.notification.delete({
      where: {
        id,
        user: { email: session.user.email },
      },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: unknown) {
    console.error("Delete notification error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to delete notification" 
    };
  }
}
