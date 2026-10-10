import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

// Optimistic auth gate (see Next.js "Optimistic checks with Proxy"). This only
// looks at the presence of the session cookie — the authoritative check is the
// server-side DAL (verifySession) at each data source. Cheap redirect, no I/O.

const PUBLIC_PREFIXES = ["/login", "/signup", "/about"];

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  // Signed-in users never need the auth screens.
  if (hasSession && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Everything that isn't public requires a session cookie.
  if (!hasSession && !isPublic(pathname)) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except API routes, Next internals, and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
