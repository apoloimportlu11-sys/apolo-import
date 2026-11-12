import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";
import { resolveStaffRole } from "@/lib/admin-role";
import { canAccessAdminPath, defaultAdminPath } from "@/lib/admin-permissions";

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/admin-login";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

/**
 * Protege /admin: sesión Supabase + rol staff (admin | editor | vendor).
 * Restringe rutas según matriz en lib/admin-permissions.ts.
 */
export async function proxy(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) {
    return redirectToLogin(req);
  }

  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }>
      ) {
        cookiesToSet.forEach(({ name, value }) => {
          req.cookies.set(name, value);
        });
        response = NextResponse.next({ request: req });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  let {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const access = req.cookies.get("sb-access-token")?.value;
    const refresh = req.cookies.get("sb-refresh-token")?.value;
    if (access && refresh) {
      const { data } = await supabase.auth.setSession({
        access_token: access,
        refresh_token: refresh,
      });
      user = data.user ?? null;
    }
  }

  if (!user?.email) {
    return redirectToLogin(req);
  }

  const role = await resolveStaffRole(supabase, user);
  if (!role) {
    const home = req.nextUrl.clone();
    home.pathname = "/";
    home.search = "";
    return NextResponse.redirect(home);
  }

  if (!canAccessAdminPath(role, req.nextUrl.pathname)) {
    const dest = req.nextUrl.clone();
    dest.pathname = defaultAdminPath(role);
    dest.search = "";
    return NextResponse.redirect(dest);
  }

  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
