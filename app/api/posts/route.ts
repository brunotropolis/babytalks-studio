import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/** Lista os posts (agendados primeiro, depois recentes). */
export async function GET() {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("bt_ig_posts")
    .select("id,criado_em,agendado_para,status,tipo,legenda,colaboradores,midia,permalink,erro,publicado_em")
    .order("criado_em", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ posts: data || [] });
}

/** Edita um agendamento (só status=agendado): horário, legenda e/ou marcação. */
export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ erro: "sem id" }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (typeof body.legenda === "string") patch.legenda = body.legenda;
  if (Array.isArray(body.colaboradores)) patch.colaboradores = body.colaboradores.slice(0, 3);
  if (typeof body.agendado_para === "string") {
    const d = new Date(body.agendado_para);
    if (isNaN(d.getTime())) return NextResponse.json({ erro: "data inválida" }, { status: 400 });
    if (d.getTime() < Date.now() + 30_000) return NextResponse.json({ erro: "escolha um horário no futuro" }, { status: 400 });
    patch.agendado_para = d.toISOString();
  }
  if (!Object.keys(patch).length) return NextResponse.json({ erro: "nada pra atualizar" }, { status: 400 });
  const sb = supabaseAdmin();
  const { error } = await sb.from("bt_ig_posts").update(patch).eq("id", body.id).eq("status", "agendado");
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** Cancela/apaga um agendamento. */
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ erro: "sem id" }, { status: 400 });
  const sb = supabaseAdmin();
  const { error } = await sb.from("bt_ig_posts").delete().eq("id", id).eq("status", "agendado");
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
