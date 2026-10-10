import { NextResponse, type NextRequest } from "next/server";
import { destroyCurrentSession } from "@/lib/auth/session";

export const runtime = "nodejs";

// POST /api/auth/logout — end the session and return to /login.
export async function POST(request: NextRequest) {
  await destroyCurrentSession();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
