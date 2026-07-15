import { NextRequest, NextResponse } from "next/server";
import { publicarPost, type PostInput, type MidiaItem } from "@/lib/instagram";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 300; // reels podem demorar a processar

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });

  const tipo = body.tipo as PostInput["tipo"];
  const midia = (body.midia || []) as MidiaItem[];
  const legenda = String(body.legenda || "");
  const colaboradores = (body.colaboradores || []) as string[];
  const compartilharFeed = body.compartilharFeed !== false;
  const coverUrl = body.coverUrl || undefined;

  if (!["imagem", "carrossel", "reels"].includes(tipo))
    return NextResponse.json({ erro: "tipo inválido" }, { status: 400 });
  if (!midia.length)
    return NextResponse.json({ erro: "sem mídia" }, { status: 400 });

  const token = process.env.BABYTALKS_IG_TOKEN!;
  const igUserId = process.env.BABYTALKS_IG_USER_ID!;
  const sb = supabaseAdmin();

  // registra a tentativa
  const { data: linha } = await sb
    .from("bt_ig_posts")
    .insert({ tipo, legenda, colaboradores, compartilhar_feed: compartilharFeed, cover_url: coverUrl, midia, status: "publicando" })
    .select("id")
    .single();
  const id = linha?.id;

  try {
    const r = await publicarPost({ igUserId, token, tipo, legenda, midia, colaboradores, compartilharFeed, coverUrl });
    if (id)
      await sb.from("bt_ig_posts").update({
        status: "publicado",
        ig_media_id: r.igMediaId,
        permalink: r.permalink,
        publicado_em: new Date().toISOString(),
      }).eq("id", id);
    return NextResponse.json({ ok: true, ...r });
  } catch (e: any) {
    const msg = e?.message || "falha ao publicar";
    if (id) await sb.from("bt_ig_posts").update({ status: "erro", erro: msg }).eq("id", id);
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
