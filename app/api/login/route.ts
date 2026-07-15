import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { senha } = await req.json().catch(() => ({ senha: "" }));
  const ok = await login(String(senha || ""));
  return NextResponse.json({ ok }, { status: ok ? 200 : 401 });
}
