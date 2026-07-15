import { NextRequest, NextResponse } from "next/server";
import { refreshToken } from "@/lib/config";

export const runtime = "nodejs";

/** Chamado por cron (n8n) a cada ~30 dias pra renovar o token IG (60d). */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET)
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  const r = await refreshToken();
  return NextResponse.json(r, { status: r.ok ? 200 : 500 });
}
