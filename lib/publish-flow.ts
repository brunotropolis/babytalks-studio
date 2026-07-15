import { publicarPost, type MidiaItem, type TipoPost } from "./instagram";
import { supabaseAdmin } from "./supabase";
import { getToken, getIgUserId } from "./config";
import { marcarPostado } from "./hub";

export type PostRow = {
  id: string;
  tipo: TipoPost;
  legenda: string | null;
  colaboradores: string[] | null;
  compartilhar_feed: boolean | null;
  cover_url: string | null;
  midia: MidiaItem[];
};

/** Publica UM registro de post e atualiza seu status no banco. */
export async function publicarRegistro(post: PostRow): Promise<{ ok: boolean; igMediaId?: string; permalink?: string; erro?: string }> {
  const sb = supabaseAdmin();
  await sb.from("bt_ig_posts").update({ status: "publicando" }).eq("id", post.id);
  try {
    const token = await getToken();
    const r = await publicarPost({
      igUserId: getIgUserId(),
      token,
      tipo: post.tipo,
      legenda: post.legenda || "",
      midia: post.midia || [],
      colaboradores: post.colaboradores || [],
      compartilharFeed: post.compartilhar_feed !== false,
      coverUrl: post.cover_url || undefined,
    });
    await sb.from("bt_ig_posts").update({
      status: "publicado",
      ig_media_id: r.igMediaId,
      permalink: r.permalink,
      publicado_em: new Date().toISOString(),
    }).eq("id", post.id);
    // fecha o loop: se a mídia veio do plano, marca o item como POSTADO (best-effort)
    try { await marcarPostado(post.midia || [], r.permalink); }
    catch (e) { console.error("marcarPostado falhou:", (e as any)?.message); }
    return { ok: true, ...r };
  } catch (e: any) {
    const msg = e?.message || "falha ao publicar";
    await sb.from("bt_ig_posts").update({ status: "erro", erro: msg }).eq("id", post.id);
    return { ok: false, erro: msg };
  }
}
