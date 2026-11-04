import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/admin")) {
    const cookies = req.cookies.getAll();
    const hasAuthCookie = cookies.some(
      (c) =>
        c.name === "sb-access-token" ||
        c.name === "sb-refresh-token" ||
        c.name.startsWith("sb-")
    );

    if (!hasAuthCookie) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin-login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
