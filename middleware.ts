import { NextRequest, NextResponse } from "next/server";

// Protege tudo, menos login, a API de login, os crons (têm x-cron-secret) e assets.
const PUBLICO = ["/login", "/api/login", "/api/cron"];

function tokenEsperado(): string {
  const senha = process.env.APP_SENHA || "";
  let h = 5381;
  for (let i = 0; i < senha.length; i++) h = ((h << 5) + h + senha.charCodeAt(i)) >>> 0;
  return `bt.${h.toString(36)}.${senha.length}`;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLICO.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const ok = req.cookies.get("bt_auth")?.value === tokenEsperado();
  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
