import { Hono } from "hono";
import { db } from "@call/db";
import {
  notifications,
  callInvitations,
  calls,
  user as userTable,
} from "@call/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { ReqVariables } from "../../index.js";
import { cache } from "@/lib/cache";

const notificationsRoutes = new Hono<{ Variables: ReqVariables }>();

// GET /api/notifications - Get notifications for authenticated user
notificationsRoutes.get("/", async (c) => {
  console.log("[NOTIFICATIONS DEBUG] GET /notifications called");

  const user = c.get("user");
  console.log("[NOTIFICATIONS DEBUG] User:", {
    id: user?.id,
    email: user?.email,
  });

  if (!user || !user.id) {
    console.log("[NOTIFICATIONS DEBUG] No user found - returning 401");
    return c.json({ message: "Unauthorized" }, 401);
  }

  const cacheKey = cache.getUserNotificationsKey(user.id);

  // Try to get from cache first
  const cachedNotifications = await cache.get(cacheKey);
  if (cachedNotifications) {
    console.log(`[CACHE HIT] Notifications for user ${user.id}`);
    return c.json({ notifications: cachedNotifications });
  }

  console.log(`[CACHE MISS] Notifications for user ${user.id}`);

  try {
    console.log(
      "[NOTIFICATIONS DEBUG] Fetching notifications for userId:",
      user.id
    );

    // Get notifications with call information and invitation details
    const userNotifications = await db
      .select({
        id: notifications.id,
        message: notifications.message,
        callId: notifications.callId,
        createdAt: notifications.createdAt,
        callName: calls.name,
        invitationId: callInvitations.id,
        invitationStatus: callInvitations.status,
        inviterName: userTable.name,
        inviterEmail: userTable.email,
        inviterProfilePictureUrl: userTable.image,
      })
      .from(notifications)
      .leftJoin(calls, eq(notifications.callId, calls.id))
      .leftJoin(
        callInvitations,
        and(
          eq(callInvitations.callId, notifications.callId),
          eq(callInvitations.inviteeId, user.id)
        )
      )
      .leftJoin(userTable, eq(calls.creatorId, userTable.id))
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt));

    console.log(
      "[NOTIFICATIONS DEBUG] Found notifications:",
      userNotifications.length
    );
    console.log("[NOTIFICATIONS DEBUG] Notifications data:", userNotifications);

    // Cache the result for 1 minute (notifications are time-sensitive)
    await cache.set(cacheKey, userNotifications, 60);

    return c.json({ notifications: userNotifications });
  } catch (error) {
    console.error("[NOTIFICATIONS DEBUG] Error fetching notifications:", error);
    return c.json({ message: "An unexpected error occurred." }, 500);
  }
});

export default notificationsRoutes;
