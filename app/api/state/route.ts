import { NextResponse } from "next/server";
import { initialState } from "@/lib/demo-data";
import { loadCloudState } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") ?? "riceball-campus";
  try {
    const state = await loadCloudState(slug);
    return NextResponse.json({ mode: state ? "cloud" : "demo", state: state ?? initialState });
  } catch (error) {
    return NextResponse.json({ mode: "demo", state: initialState, error: error instanceof Error ? error.message : "Cloud unavailable" });
  }
}
