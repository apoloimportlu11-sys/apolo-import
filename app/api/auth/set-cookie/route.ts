import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { access_token, refresh_token, expires_in } = body;

    if (
      typeof access_token !== "string" ||
      typeof refresh_token !== "string" ||
      !access_token.trim() ||
      !refresh_token.trim()
    ) {
      return NextResponse.json({ error: "Missing tokens" }, { status: 400 });
    }

    const url = getSupabaseUrl();
    const anonKey = getSupabaseAnonKey();
    if (!url || !anonKey) {
      return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });
    }

    // Solo aceptamos tokens que Supabase reconoce como sesión válida.
    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error || !data.session?.user) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
    }

    const secure = process.env.NODE_ENV === "production";
    const maxAge =
      typeof expires_in === "number" && expires_in > 0
        ? expires_in
        : data.session.expires_in || 60 * 60 * 24 * 30;

    const res = NextResponse.json({ ok: true });

    res.cookies.set("sb-access-token", data.session.access_token, {
      httpOnly: true,
      secure,
      path: "/",
      sameSite: "lax",
      maxAge,
    });
    res.cookies.set("sb-refresh-token", data.session.refresh_token, {
      httpOnly: true,
      secure,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30 * 60,
    });

    return res;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
