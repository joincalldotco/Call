import { Hono } from "hono";
import { z } from "zod";
import { db } from "@call/db";
import {
  calls,
  callInvitations,
  notifications,
  user as userTable,
} from "@call/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { ReqVariables } from "../../index.js";
import { sendMail } from '@call/auth/utils/send-mail';

const callsRoutes = new Hono<{ Variables: ReqVariables }>();

const createCallSchema = z.object({
  name: z.string().min(1),
  members: z.array(z.string().email()).min(1),
});

function generateCallCode() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

callsRoutes.post("/create", async (c) => {
  console.log("🔍 [CALLS DEBUG] POST /create called");

  // Get authenticated user (like teams does)
  const user = c.get("user");
  console.log("👤 [CALLS DEBUG] User:", { id: user?.id, email: user?.email });

  if (!user || !user.id) {
    console.log("❌ [CALLS DEBUG] No user found - returning 401");
    return c.json({ message: "Unauthorized" }, 401);
  }

  let body;
  try {
    body = await c.req.json();
    console.log("📝 [CALLS DEBUG] Request body:", body);
  } catch (e) {
    console.error("❌ [CALLS DEBUG] JSON parse error:", e);
    return c.json({ message: "Invalid JSON body" }, 400);
  }

  // Validate input
  const parse = createCallSchema.safeParse(body);
  if (!parse.success) {
    console.log("❌ [CALLS DEBUG] Validation error:", parse.error.errors);
    return c.json(
      { message: parse.error.errors[0]?.message || "Invalid input" },
      400
    );
  }
  const { name, members } = parse.data;
  console.log("✅ [CALLS DEBUG] Validated data:", { name, members });

  // Find users by email (like teams does)
  console.log("🔍 [CALLS DEBUG] Finding users by email:", members);
  const users = await db
    .select()
    .from(userTable)
    .where(inArray(userTable.email, members));
  console.log("👥 [CALLS DEBUG] Found users:", users.length);
  const emailToUserId = new Map(users.map((u) => [u.email, u.id]));

  // Generate unique call ID
  console.log("🔑 [CALLS DEBUG] Generating call ID...");
  let callId;
  let exists = true;
  while (exists) {
    callId = generateCallCode();
    const found = await db.select().from(calls).where(eq(calls.id, callId));
    exists = found.length > 0;
  }
  console.log("✅ [CALLS DEBUG] Generated call ID:", callId);

  // Insert call
  console.log("💾 [CALLS DEBUG] Inserting call into database...");
  try {
    await db.insert(calls).values({
      id: callId as string,
      name,
      creatorId: user.id as string,
      createdAt: new Date(),
    });
    console.log("✅ [CALLS DEBUG] Call inserted successfully");
  } catch (error) {
    console.error("❌ [CALLS DEBUG] Error inserting call:", error);
    throw error;
  }

  // Insert invitations and notifications
  console.log("📧 [CALLS DEBUG] Creating invitations and notifications...");
  try {
    for (const email of members) {
      const inviteeId = emailToUserId.get(email);
      console.log(
        `📨 [CALLS DEBUG] Processing invitation for ${email}, inviteeId: ${inviteeId}`
      );

      const invitationData: any = {
        id: crypto.randomUUID(),
        callId,
        inviteeEmail: email,
        status: "pending",
        createdAt: new Date(),
      };
      if (inviteeId) invitationData.inviteeId = inviteeId;

      await db.insert(callInvitations).values(invitationData);
      console.log(`✅ [CALLS DEBUG] Invitation created for ${email}`);

      if (inviteeId) {
        await db.insert(notifications).values({
          id: crypto.randomUUID(),
          userId: inviteeId,
          message: `${user.name || user.email} hes inviting you to a call: ${name}`,
          callId,
          createdAt: new Date(),
        });
        console.log(`✅ [CALLS DEBUG] Notification created for ${email}`);
      }

      await sendMail({
        to: email,
        subject: "You've been invited to a call",
        text: `${name} has invited you to a call. Click the link below to join: ${process.env.FRONTEND_URL}/calls/${callId}`,
      });
    }
    console.log("✅ [CALLS DEBUG] All invitations and notifications created");
  } catch (error) {
    console.error(
      "❌ [CALLS DEBUG] Error creating invitations/notifications:",
      error
    );
    throw error;
  }

  console.log("🎉 [CALLS DEBUG] Call created successfully:", callId);
  return c.json({ callId });
});

callsRoutes.patch("/invitations/:id/accept", async (c) => {
  const invitationId = c.req.param("id");
  if (!invitationId) return c.json({ error: "Missing invitation id" }, 400);

  const [invitation] = await db
    .select()
    .from(callInvitations)
    .where(eq(callInvitations.id, invitationId));
  if (!invitation) return c.json({ error: "Invitation not found" }, 404);
  if (invitation.status !== "pending")
    return c.json({ error: "Already handled" }, 400);

  await db
    .update(callInvitations)
    .set({ status: "accepted" })
    .where(eq(callInvitations.id, invitationId));

  return c.json({ callId: invitation.callId });
});

callsRoutes.patch("/invitations/:id/reject", async (c) => {
  const invitationId = c.req.param("id");
  if (!invitationId) return c.json({ error: "Missing invitation id" }, 400);

  const [invitation] = await db
    .select()
    .from(callInvitations)
    .where(eq(callInvitations.id, invitationId));
  if (!invitation) return c.json({ error: "Invitation not found" }, 404);
  if (invitation.status !== "pending")
    return c.json({ error: "Already handled" }, 400);

  await db
    .update(callInvitations)
    .set({ status: "rejected" })
    .where(eq(callInvitations.id, invitationId));

  return c.json({ message: "Invitation rejected" });
});

export default callsRoutes;
