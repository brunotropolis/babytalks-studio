import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com service_role — SÓ no servidor (API routes).
 * Nunca importar isto em componente client.
 */
export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const BUCKET = "bt-ig-media";
