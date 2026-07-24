import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { TipoPost } from "@/lib/instagram";

export const runtime = "nodejs";
export const revalidate = 0;

const HUB = "https://conteudo.babytalks.com.br";

function formatoParaTipo(formato: string): TipoPost {
  const f = (formato || "").toLowerCase();
  if (f.includes("carross")) return "carrossel";
  if (f.includes("reels") || f.includes("vídeo") || f.includes("video")) return "reels";
  if (f.includes("stor")) return "stories";
  return "imagem";
}
const ehVideo = (f: string) => /\.(mp4|mov|m4v|webm)$/i.test(f);
const urlMidia = (f: string) => (f.startsWith("http") ? f : `${HUB}/midia/${f}`);

/**
 * Sincroniza o PLANO (plano.json) -> agendamentos no banco.
 * Cada item futuro do plano que ainda nao esta agendado/postado vira um bt_ig_posts
 * status "agendado", com agendado_para e colaboradores (marcacao). Idempotente:
 * deduplica pela URL da 1a midia. Chamado por cron (n8n) ou manualmente.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET)
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

  // plano (agenda) + repositorio (midia/legenda/colaboradores)
  const cb = Math.floor(Date.now() / 60000);
  const [plano, repoRaw] = await Promise.all([
    fetch(`${HUB}/plano.json?cb=${cb}`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({ itens: [] })),
    fetch(`${HUB}/posts.json?cb=${cb}`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({ posts: [] })),
  ]);
  const repo: Record<string, any> = {};
  for (const p of (repoRaw.posts || [])) repo[String(p.n)] = p;

  const sb = supabaseAdmin();
  // urls ja no banco (qualquer status) — evita duplicar
  const { data: existentes } = await sb.from("bt_ig_posts").select("midia");
  const jaTem = new Set<string>();
  for (const r of (existentes || [])) {
    const u = (r.midia as any)?.[0]?.url;
    if (u) jaTem.add(u);
  }

  const agora = Date.now();
  const novos: any[] = [];
  for (const it of (plano.itens || [])) {
    if (it.postado) continue;
    const full = repo[String(it.n)];
    if (!full) continue;
    const arquivos: string[] = full.midia || [];
    if (!arquivos.length) continue;
    const midia = arquivos.map((f) => ({ url: urlMidia(f), tipo: ehVideo(f) ? "video" : "imagem" }));
    if (jaTem.has(midia[0].url)) continue; // ja agendado/postado
    const quando = new Date(`${it.data}T${it.hora}:00`);
    if (isNaN(quando.getTime()) || quando.getTime() < agora + 60_000) continue; // so futuro
    const tipo = formatoParaTipo(it.fmt || full.formato || "");
    novos.push({
      tipo,
      legenda: tipo === "stories" ? "" : (full.caption || ""),
      colaboradores: tipo === "stories" ? [] : (full.colaboradores || []),
      compartilhar_feed: true,
      midia,
      agendado_para: quando.toISOString(),
      status: "agendado",
    });
    jaTem.add(midia[0].url);
  }

  if (novos.length) {
    const { error } = await sb.from("bt_ig_posts").insert(novos);
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, agendados: novos.length });
}
