import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { publicarRegistro } from "@/lib/publish-flow";
import type { MidiaItem, TipoPost } from "@/lib/instagram";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });

  const tipo = body.tipo as TipoPost;
  const midia = (body.midia || []) as MidiaItem[];
  const legenda = String(body.legenda || "");
  const colaboradores = (body.colaboradores || []) as string[];
  const compartilharFeed = body.compartilharFeed !== false;
  const agendadoPara: string | null = body.agendadoPara || null; // ISO string ou null

  if (!["imagem", "carrossel", "reels", "stories"].includes(tipo))
    return NextResponse.json({ erro: "tipo inválido" }, { status: 400 });
  if (!midia.length) return NextResponse.json({ erro: "sem mídia" }, { status: 400 });

  const agendar = !!agendadoPara && new Date(agendadoPara).getTime() > Date.now() + 30_000;
  const sb = supabaseAdmin();

  const { data: linha, error } = await sb
    .from("bt_ig_posts")
    .insert({
      tipo,
      legenda,
      colaboradores,
      compartilhar_feed: compartilharFeed,
      midia,
      agendado_para: agendar ? agendadoPara : null,
      status: agendar ? "agendado" : "publicando",
    })
    .select("id")
    .single();

  if (error || !linha)
    return NextResponse.json({ erro: error?.message || "falha ao salvar" }, { status: 500 });

  // agendado: só guarda na fila
  if (agendar) return NextResponse.json({ ok: true, agendado: true, id: linha.id });

  // publicar agora
  const r = await publicarRegistro({
    id: linha.id, tipo, legenda, colaboradores,
    compartilhar_feed: compartilharFeed, cover_url: null, midia,
  });
  return NextResponse.json(r, { status: r.ok ? 200 : 500 });
}
