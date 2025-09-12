import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { waitlistService } from "@/lib/waitlist";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export async function POST(request: NextRequest) {
  try {
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
    const emailNormalized = email.toLowerCase().trim();

    const { error } = await waitlistService.addEmail(emailNormalized);

    if (error) {
      return NextResponse.json(
        { success: false, error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Error adding email to waitlist:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
