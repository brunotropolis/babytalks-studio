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
