import { supabaseAdmin } from "./supabase";
import { renovarToken } from "./instagram";

/**
 * Token do IG: fonte de verdade é a tabela bt_ig_config (chave 'ig_token'),
 * pra o cron de renovação atualizar sem precisar de redeploy.
 * Fallback pro env BABYTALKS_IG_TOKEN (bootstrap, 1ª vez).
 */
export async function getToken(): Promise<string> {
  const sb = supabaseAdmin();
  const { data } = await sb.from("bt_ig_config").select("valor").eq("chave", "ig_token").maybeSingle();
  const envTok = process.env.BABYTALKS_IG_TOKEN || "";
  if (data?.valor) return data.valor;
  // semeia a config com o token do env na 1ª vez
  if (envTok) {
    await sb.from("bt_ig_config").upsert({ chave: "ig_token", valor: envTok, atualizado_em: new Date().toISOString() });
  }
  return envTok;
}

export function getIgUserId(): string {
  return process.env.BABYTALKS_IG_USER_ID || "";
}

/** Renova o token de longa duração e persiste no banco. Idempotente. */
export async function refreshToken(): Promise<{ ok: boolean; expiraEmDias?: number; erro?: string }> {
  try {
    const atual = await getToken();
    const { token, expiraEm } = await renovarToken(atual);
    const sb = supabaseAdmin();
    await sb.from("bt_ig_config").upsert({ chave: "ig_token", valor: token, atualizado_em: new Date().toISOString() });
    await sb.from("bt_ig_config").upsert({ chave: "ig_token_renovado_em", valor: new Date().toISOString(), atualizado_em: new Date().toISOString() });
    return { ok: true, expiraEmDias: Math.round((expiraEm || 0) / 86400) };
  } catch (e: any) {
    return { ok: false, erro: e?.message || "falha ao renovar" };
  }
}
