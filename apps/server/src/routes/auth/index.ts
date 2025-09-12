import { emailSchema } from "@/validators";
import { auth } from "@call/auth/auth";
import { db } from "@call/db";
import { user as userTable } from "@call/db/schema";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import type { ReqVariables } from "../../index.js";
import { createId } from "@paralleldrive/cuid2";
import { cache } from "@/lib/cache";

const authRouter = new Hono<{ Variables: ReqVariables }>();

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
});

authRouter.post(
  "/check-email",
  zValidator("json", emailSchema),
  async (c: Context) => {
    try {
      const { email } = await c.req.json<{ email: string }>();

      const existingUser = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.email, email.toLowerCase().trim()))
        .limit(1);

      return c.json({ exists: existingUser.length > 0 });
    } catch (error) {
      console.error("Error checking email:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  }
);

// Redirect specific Better Auth error to app
authRouter.get("/error", async (c) => {
  const url = new URL(c.req.url);
  const error = url.searchParams.get("error");

  if (error === "please_restart_the_process") {
    return c.redirect("https://joincall.co/app", 302);
  }
  return auth.handler(c.req.raw);
});

authRouter.on(["POST", "GET"], "/*", async (c: Context) => {
  try {
    return await auth.handler(c.req.raw);
  } catch (error) {
    console.error("Auth handler error:", error);
    return c.json({ error: "Authentication failed" }, 500);
  }
});

authRouter.patch("/update-profile", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json();
    const result = updateProfileSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { message: result.error.errors[0]?.message || "Invalid input" },
        400
      );
    }

    const { name } = result.data;

    await db
      .update(userTable)
      .set({ name, updatedAt: new Date() })
      .where(eq(userTable.id, user.id));

    // Invalidate user-related caches
    await cache.invalidateUserCache(user.id);

    return c.json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error("[PATCH /update-profile] Error:", err);
    return c.json({ message: "An unexpected error occurred" }, 500);
  }
});

// Handle profile image upload
authRouter.patch("/update-profile-image", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  try {
    const formData = await c.req.formData();
    const image = formData.get("image") as File;

    if (!image) {
      return c.json({ message: "No image provided" }, 400);
    }

    // Validate file type
    if (!image.type.startsWith("image/")) {
      return c.json({ message: "File must be an image" }, 400);
    }

    // Validate file size (max 5MB)
    if (image.size > 5 * 1024 * 1024) {
      return c.json({ message: "Image size must be less than 5MB" }, 400);
    }

    // Convert image to base64
    const buffer = await image.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:${image.type};base64,${base64}`;

    // Update user profile with the new image
    await db
      .update(userTable)
      .set({
        image: dataUrl,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, user.id));

    // Invalidate user-related caches
    await cache.invalidateUserCache(user.id);

    return c.json({
      message: "Profile image updated successfully",
      image: dataUrl,
    });
  } catch (err) {
    console.error("[PATCH /update-profile-image] Error:", err);
    return c.json({ message: "An unexpected error occurred" }, 500);
  }
});

export default authRouter;
