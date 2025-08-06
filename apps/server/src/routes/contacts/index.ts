import { Hono } from "hono";
import { z } from "zod";
import { db } from "@call/db";
import { contactRequests, contacts, user as userTable } from "@call/db/schema";
import { createId } from "@paralleldrive/cuid2";
import { and, eq, or } from "drizzle-orm";
import type { ReqVariables } from "../../index.js";
import { sendMail } from "@call/auth/utils/send-mail";
import { cache } from "@/lib/cache";

const contactsRoutes = new Hono<{ Variables: ReqVariables }>();

const inviteSchema = z.object({
  receiverEmail: z.string().email("Invalid email format"),
});

const requestIdSchema = z.object({
  id: z.string().cuid2("Invalid request ID format"),
});

contactsRoutes.post("/invite", async (c) => {
  const user = c.get("user")!;
  const senderId = user.id;

  try {
    const body = await c.req.json();
    const result = inviteSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { message: result.error.errors[0]?.message || "Invalid input" },
        400
      );
    }
    const { receiverEmail } = result.data;

    if (receiverEmail === user.email) {
      return c.json(
        { message: "You cannot send a contact request to yourself." },
        400
      );
    }

    const [receiver] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, receiverEmail));

    if (!receiver) {
      await sendMail({
        to: receiverEmail,
        subject: "Invitation to join Call",
        text: `You are invited to join Call by ${user.name} here is the link ${process.env.FRONTEND_URL}/login`,
      });
      return c.json(
        { message: "Email sent to receiver to invite them to the app." },
        200
      );
    }

    const receiverId = receiver.id;

    const [existingRelation] = await db
      .select({ check: contacts.userId })
      .from(contacts)
      .where(
        and(eq(contacts.userId, senderId), eq(contacts.contactId, receiverId))
      )
      .limit(1);

    if (existingRelation) {
      return c.json(
        { message: "You are already contacts with this user." },
        409
      );
    }

    const [existingRequest] = await db
      .select({ id: contactRequests.id })
      .from(contactRequests)
      .where(
        and(
          eq(contactRequests.senderId, senderId),
          eq(contactRequests.receiverEmail, receiverEmail),
          eq(contactRequests.status, "pending")
        )
      )
      .limit(1);

    if (existingRequest) {
      return c.json(
        { message: "A pending request to this user already exists." },
        409
      );
    }

    await db.insert(contactRequests).values({
      id: createId(),
      senderId,
      receiverEmail,
      receiverId,
      status: "pending",
      createdAt: new Date(),
    });

    return c.json({ message: "Contact request sent successfully." }, 201);
  } catch (err) {
    console.error("[POST /invite] Error:", err);
    return c.json({ message: "An unexpected error occurred." }, 500);
  }
});

contactsRoutes.get("/requests", async (c) => {
  const user = c.get("user")!;
  const userId = user.id;

  try {
    const pendingRequests = await db
      .select({
        id: contactRequests.id,
        senderId: contactRequests.senderId,
        senderName: userTable.name,
        senderEmail: userTable.email,
        profilePictureUrl: userTable.image,
        createdAt: contactRequests.createdAt,
      })
      .from(contactRequests)
      .leftJoin(userTable, eq(contactRequests.senderId, userTable.id))
      .where(
        and(
          eq(contactRequests.receiverId, userId),
          eq(contactRequests.status, "pending")
        )
      );

    const requests = pendingRequests.map((r) => ({
      ...r,
      senderName: r.senderName || "",
      senderEmail: r.senderEmail || "",
      profilePictureUrl: r.profilePictureUrl || null,
    }));

    return c.json({ requests });
  } catch (err) {
    console.error("[GET /requests] Error:", err);
    return c.json({ message: "An unexpected error occurred." }, 500);
  }
});

contactsRoutes.patch("/requests/:id/accept", async (c) => {
  const user = c.get("user")!;
  const userId = user.id;
  const { id: requestId } = requestIdSchema.parse(c.req.param());

  try {
    await db.transaction(async (tx) => {
      const [request] = await tx
        .select()
        .from(contactRequests)
        .where(
          and(
            eq(contactRequests.id, requestId),
            eq(contactRequests.receiverId, userId),
            eq(contactRequests.status, "pending")
          )
        );

      if (!request) {
        return c.json(
          {
            message:
              "Request not found, already handled, or you are not the recipient.",
          },
          404
        );
      }

      const senderId = request.senderId;

      await tx
        .update(contactRequests)
        .set({ status: "accepted" })
        .where(eq(contactRequests.id, requestId));

      await tx.insert(contacts).values([
        { userId: userId, contactId: senderId, createdAt: new Date() },
        { userId: senderId, contactId: userId, createdAt: new Date() },
      ]);

      // Invalidate contacts cache for both users
      await Promise.all([
        cache.del(cache.getUserContactsKey(userId)),
        cache.del(cache.getUserContactsKey(senderId)),
      ]);
    });

    return c.json({ message: "Contact request accepted." });
  } catch (err) {
    console.error("[PATCH /requests/:id/accept] Error:", err);
    return c.json({ message: "An unexpected error occurred." }, 500);
  }
});

contactsRoutes.patch("/requests/:id/reject", async (c) => {
  const user = c.get("user")!;
  const userId = user.id;
  const { id: requestId } = requestIdSchema.parse(c.req.param());

  try {
    const { rowCount } = await db
      .update(contactRequests)
      .set({ status: "rejected" })
      .where(
        and(
          eq(contactRequests.id, requestId),
          eq(contactRequests.receiverId, userId),
          eq(contactRequests.status, "pending")
        )
      );

    if (rowCount === 0) {
      return c.json(
        {
          message:
            "Request not found, already handled, or you are not the recipient.",
        },
        404
      );
    }

    return c.json({ message: "Contact request rejected." });
  } catch (err) {
    console.error("[PATCH /requests/:id/reject] Error:", err);
    return c.json({ message: "An unexpected error occurred." }, 500);
  }
});

contactsRoutes.get("/", async (c) => {
  const user = c.get("user")!;
  const userId = user.id;

  const cacheKey = cache.getUserContactsKey(userId);

  // Try to get from cache first
  const cachedContacts = await cache.get(cacheKey);
  if (cachedContacts) {
    console.log(`[CACHE HIT] Contacts for user ${userId}`);
    return c.json({ contacts: cachedContacts });
  }

  console.log(`[CACHE MISS] Contacts for user ${userId}`);

  try {
    const userContacts = await db
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        image: userTable.image,
        createdAt: contacts.createdAt,
      })
      .from(contacts)
      .leftJoin(userTable, eq(contacts.contactId, userTable.id))
      .where(eq(contacts.userId, userId));

    // Cache the result for 10 minutes (contacts don't change frequently)
    await cache.set(cacheKey, userContacts, 600);

    return c.json({ contacts: userContacts });
  } catch (err) {
    console.error("[GET /] Error:", err);
    return c.json({ message: "An unexpected error occurred." }, 500);
  }
});

contactsRoutes.delete("/:id", async (c) => {
  const user = c.get("user")!;
  const userId = user.id;
  const contactId = c.req.param("id");

  try {
    await db.transaction(async (tx) => {
      await tx
        .delete(contacts)
        .where(
          or(
            and(eq(contacts.userId, userId), eq(contacts.contactId, contactId)),
            and(eq(contacts.userId, contactId), eq(contacts.contactId, userId))
          )
        );
    });

    // Invalidate contacts cache for both users
    await Promise.all([
      cache.del(cache.getUserContactsKey(userId)),
      cache.del(cache.getUserContactsKey(contactId)),
    ]);

    return c.json({ message: "Contact deleted successfully." });
  } catch (err) {
    console.error("[DELETE /:id] Error:", err);
    return c.json({ message: "An unexpected error occurred." }, 500);
  }
});

export default contactsRoutes;
