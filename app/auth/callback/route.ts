import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      getSupabaseUrl(),
      getSupabaseAnonKey(),
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: any[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }: any) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.session?.user) {
      const user = data.session.user;
      const email = user.email ? user.email.toLowerCase().trim() : "";
      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        (email ? email.split("@")[0] : "Cliente");

      // Ensure user exists in public.users as 'cliente' if not yet present
      if (email) {
        try {
          const { data: existingUser } = await supabase
            .from("users")
            .select("id, role")
            .eq("email", email)
            .maybeSingle();

          if (!existingUser) {
            await supabase.from("users").insert({
              id: user.id,
              name,
              email,
              role: "cliente",
              is_active: true,
              updated_at: new Date().toISOString(),
            });
          }
        } catch (dbErr) {
          console.error("Error creating/checking public.users row:", dbErr);
        }
      }

      // Check user role for redirection
      let userRole = "cliente";
      if (email) {
        try {
          const { data: roleData } = await supabase
            .from("users")
            .select("role")
            .eq("email", email)
            .maybeSingle();
          if (roleData?.role) {
            userRole = roleData.role;
          }
        } catch {}
      }

      const redirectDestination = userRole === "admin" ? `${origin}/admin` : `${origin}/`;
      const response = NextResponse.redirect(redirectDestination);

      const maxAge = data.session.expires_at
        ? Math.max(60, data.session.expires_at - Math.floor(Date.now() / 1000))
        : 60 * 60 * 24 * 30;

      // Set cookies for middleware and proxy compatibility
      response.cookies.set("sb-access-token", data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "lax",
        maxAge,
      });

      response.cookies.set("sb-refresh-token", data.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30 * 60,
      });

      return response;
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
