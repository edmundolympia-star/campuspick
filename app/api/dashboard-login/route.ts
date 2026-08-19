import { NextResponse } from "next/server";

async function dashboardToken(password: string) {
  const data = new TextEncoder().encode(`campuspick-dashboard:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  const configuredPassword = process.env.DASHBOARD_PASSWORD;
  if (!configuredPassword) {
    return NextResponse.json({ error: "Dashboard password is not configured." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  if (body.password !== configuredPassword) {
    return NextResponse.json({ error: "Wrong dashboard password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("campuspick_dashboard", await dashboardToken(configuredPassword), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
  return response;
}
