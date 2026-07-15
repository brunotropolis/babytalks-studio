import { cookies } from "next/headers";

const COOKIE = "bt_auth";

/** Valor do cookie de sessão = hash simples da senha (sem lib externa). */
function tokenEsperado(): string {
  const senha = process.env.APP_SENHA || "";
  // fingerprint estável e não-reversível o suficiente pra um painel interno de 1 usuário
  let h = 5381;
  for (let i = 0; i < senha.length; i++) h = ((h << 5) + h + senha.charCodeAt(i)) >>> 0;
  return `bt.${h.toString(36)}.${senha.length}`;
}

export async function estaLogado(): Promise<boolean> {
  const c = await cookies();
  return c.get(COOKIE)?.value === tokenEsperado();
}

export async function login(senha: string): Promise<boolean> {
  if (!process.env.APP_SENHA || senha !== process.env.APP_SENHA) return false;
  const c = await cookies();
  c.set(COOKIE, tokenEsperado(), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return true;
}

export async function logout() {
  const c = await cookies();
  c.delete(COOKIE);
}
