import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { publicarRegistro, type PostRow } from "@/lib/publish-flow";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Chamado pelo cron (n8n). Publica os posts agendados cujo horário chegou. */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET)
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

  const sb = supabaseAdmin();
  const agora = new Date().toISOString();
  const { data: pendentes } = await sb
    .from("bt_ig_posts")
    .select("id,tipo,legenda,colaboradores,compartilhar_feed,cover_url,midia")
    .eq("status", "agendado")
    .lte("agendado_para", agora)
    .order("agendado_para", { ascending: true })
    .limit(5); // no máx 5 por rodada, evita estourar o timeout

  const resultados = [];
  for (const p of (pendentes || []) as PostRow[]) {
    const r = await publicarRegistro(p);
    resultados.push({ id: p.id, ok: r.ok, erro: r.erro });
  }
  return NextResponse.json({ ok: true, publicados: resultados.length, resultados });
}
