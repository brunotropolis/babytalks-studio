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
    resultados.push({ id: p.id, ok: r.ok, erro: r.erro, semCollab: r.semCollab, permalink: r.permalink });
  }

  // avisa no WhatsApp quando um agendado saiu SEM o collab (Bruno não tá na tela)
  const semCollab = resultados.filter((r) => r.ok && r.semCollab);
  if (semCollab.length && process.env.WHAPI_TOKEN && process.env.BT_ALERT_PHONE) {
    const linhas = semCollab.map((r) => `• ${r.permalink || r.id}`).join("\n");
    await fetch("https://gate.whapi.cloud/messages/text", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHAPI_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        to: process.env.BT_ALERT_PHONE,
        body: `📣 Baby Talks: um post agendado foi publicado SEM o collab (um @ de colaborador era inválido). Convide o parceiro manualmente no app.\n${linhas}`,
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, publicados: resultados.length, resultados });
}
