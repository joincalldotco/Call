// import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const protectedRoutes: string[] = ["/app"];
const publicRoutes = new Set(["/", "/login", "/r"]);

const donotGotoProductionRoutes: string[] = ["/app", "/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProd = process.env.NODE_ENV === "production";

  if (pathname.startsWith("/r")) {
    return NextResponse.next();
  }

  const isCallId = pathname.split("/")[3];
  const isCallPath = isCallId?.length === 6;
  const isdoNotGotoProductionRoutes = donotGotoProductionRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const isPublic = publicRoutes.has(pathname);

  try {
    // const sessionCookie = getSessionCookie(request.headers, {});

    if (isCallPath && !isProd) {
      return NextResponse.redirect(
        new URL("/r?meetingId=" + isCallId, request.url)
      );
    }

    // we're disabling the /app for now because we're not ready to launch it yet so all routes to the /app with /app will be redirected to the /r route
    if (isdoNotGotoProductionRoutes && isProd) {
      return NextResponse.redirect(new URL("/r", request.url));
    }

    // if (isPublic && sessionCookie && pathname !== "/") {
    //   return NextResponse.redirect(new URL("/app", request.url));
    // }

    // if (isProtected && !sessionCookie) {
    //   return NextResponse.redirect(new URL("/login", request.url));
    // }
  } catch (error) {
    console.error("Auth middleware error:", error);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
