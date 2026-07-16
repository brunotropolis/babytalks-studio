import { NextResponse } from "next/server";
import { getToken, getIgUserId } from "@/lib/config";
import { listarMedia } from "@/lib/instagram";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  try {
    const token = await getToken();
    const igUserId = getIgUserId();
    if (!token || !igUserId) {
      return NextResponse.json({ erro: "token/ig_user_id ausente" }, { status: 500 });
    }
    const posts = await listarMedia(token, igUserId, 100);
    return NextResponse.json({ posts });
  } catch (e: any) {
    return NextResponse.json({ erro: e?.message || "falha ao ler o feed do Instagram" }, { status: 500 });
  }
}
