import { NextResponse, type NextRequest } from "next/server";
import { handleSeed } from "@/lib/check/handlers";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { status, body } = await handleSeed({ role: req.nextUrl.searchParams.get("role") });
  return NextResponse.json(body, { status });
}
