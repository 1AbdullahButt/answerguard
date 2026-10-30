import { NextResponse, type NextRequest } from "next/server";
import { routeDeps } from "@/lib/check/deps";
import { handleCheck } from "@/lib/check/handlers";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const json: unknown = await req.json().catch(() => null);
  const { status, body } = await handleCheck(json, routeDeps());
  return NextResponse.json(body, { status });
}
