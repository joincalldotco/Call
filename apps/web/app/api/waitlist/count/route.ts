import { NextResponse } from "next/server";
import { waitlistService } from "@/lib/waitlist";

export async function GET() {
  try {
    const result = await waitlistService.getCount();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error getting waitlist count:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
