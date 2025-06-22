import { rateLimitAttempts, waitlist } from "@call/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@call/db";
import { nanoid } from "nanoid";
import { z } from "zod";

async function checkRateLimitDB(ip: string, limit = 3, windowMs = 120000) {
  const now = new Date();

  const attempts = await db
    .select()
    .from(rateLimitAttempts)
    .where(eq(rateLimitAttempts.identifier, ip))
    .limit(1);

  const currentAttempt = attempts[0];

  if (!currentAttempt || currentAttempt.expiresAt < now) {
    const newExpiry = new Date(now.getTime() + windowMs);
    await db
      .insert(rateLimitAttempts)
      .values({ identifier: ip, count: 1, expiresAt: newExpiry })
      .onConflictDoUpdate({
        target: rateLimitAttempts.identifier,
        set: { count: 1, expiresAt: newExpiry },
      });
    return { allowed: true, remaining: limit - 1, resetTime: newExpiry };
  }

  if (currentAttempt.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: currentAttempt.expiresAt,
    };
  }

  await db
    .update(rateLimitAttempts)
    .set({ count: sql`${rateLimitAttempts.count} + 1` })
    .where(eq(rateLimitAttempts.identifier, ip));

  return {
    allowed: true,
    remaining: limit - (currentAttempt.count + 1),
    resetTime: currentAttempt.expiresAt,
  };
}

const emailSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address"),
});

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "anonymous";

    const rateLimitResult = await checkRateLimitDB(ip, 3, 120000);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many requests. Please wait before trying again.",
          retryAfter: Math.ceil(
            (rateLimitResult.resetTime.getTime() - Date.now()) / 1000
          ),
        },
        {
          status: 429,
        }
      );
    }

    const body = await request.json();
    const result = emailSchema.safeParse(body);

    if (!result.success) {
      const errorMessage = result.error.errors[0]?.message;
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

    const { email } = result.data;

    const existingEmail = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.email, email.toLowerCase().trim()))
      .limit(1)
      .then((rows) => rows[0]);

    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: "This email is already on the waitlist" },
        { status: 400 }
      );
    }

    await db.insert(waitlist).values({
      id: nanoid(),
      email: email.toLowerCase().trim(),
    });

    const response = NextResponse.json({ success: true }, { status: 201 });

    return response;
  } catch (error) {
    console.error("Error adding email to waitlist:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
