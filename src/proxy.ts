import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, readSessionToken } from "@/lib/admin-session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname === "/admin/login";
  const isLoginApi = pathname === "/api/admin/auth/login";
  const isLogoutApi = pathname === "/api/admin/auth/logout";
  const needsAuth =
    (pathname.startsWith("/admin") && !isLoginPage) ||
    (pathname.startsWith("/api/admin") && !isLoginApi && !isLogoutApi);

  if (!needsAuth) {
    if (isLoginPage) {
      const session = await readSessionToken(request.cookies.get(ADMIN_COOKIE)?.value);
      if (session) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
    }
    return NextResponse.next();
  }

  const session = await readSessionToken(request.cookies.get(ADMIN_COOKIE)?.value);
  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
