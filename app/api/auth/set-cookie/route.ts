import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { access_token, refresh_token, expires_in } = body;

    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: 'Missing tokens' }, { status: 400 });
    }

    const secure = process.env.NODE_ENV === 'production';
    const maxAge = typeof expires_in === 'number' && expires_in > 0 ? expires_in : 60 * 60 * 24 * 30;

    const res = NextResponse.json({ ok: true });

    // Set HttpOnly cookies so server-side code (createServerClient) can read session
    res.cookies.set('sb-access-token', access_token, {
      httpOnly: true,
      secure,
      path: '/',
      sameSite: 'lax',
      maxAge,
    });
    res.cookies.set('sb-refresh-token', refresh_token, {
      httpOnly: true,
      secure,
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30 * 60, // longer for refresh
    });

    return res;
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
