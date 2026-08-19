import { NextResponse } from "next/server";
import { initialState } from "@/lib/demo-data";
import { loadCloudState } from "@/lib/supabase-admin";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Cloud unavailable";
  }
}

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") ?? "riceball-campus";
  try {
    const state = await loadCloudState(slug);
    return NextResponse.json({ mode: state ? "cloud" : "demo", state: state ?? initialState });
  } catch (error) {
    return NextResponse.json({ mode: "demo", state: initialState, error: getErrorMessage(error) });
  }
}
