import { NextResponse } from "next/server";
import type { TipoPost } from "@/lib/instagram";

export const runtime = "nodejs";
export const revalidate = 0;

const HUB = "https://conteudo.babytalks.com.br";
const MIDIA_BASE = `${HUB}/midia`;

// formato do plano (texto livre, pode ser composto "Reels / Carrossel") -> tipos possíveis
function formatoParaTipos(formato: string): TipoPost[] {
  const tipos: TipoPost[] = [];
  for (const parte of formato.split("/").map((s) => s.trim().toLowerCase())) {
    if (parte.includes("carross")) tipos.push("carrossel");
    else if (parte.includes("reels") || parte.includes("vídeo") || parte.includes("video")) tipos.push("reels");
    else if (parte.includes("stor")) tipos.push("stories");
    else if (parte.includes("post") || parte.includes("feed") || parte.includes("foto") || parte.includes("imagem")) tipos.push("imagem");
  }
  return [...new Set(tipos)];
}

const ehVideo = (f: string) => /\.(mp4|mov|m4v|webm)$/i.test(f);

export async function GET() {
  try {
    // cache-bust pra sempre pegar o plano atual (GitHub Pages + Cloudflare cacheiam)
    const r = await fetch(`${HUB}/posts.json?cb=${Math.floor(Date.now() / 60000)}`, { cache: "no-store" });
    if (!r.ok) return NextResponse.json({ erro: `hub respondeu ${r.status}` }, { status: 502 });
    const data = await r.json();
    const posts = (data.posts || []).map((p: any) => {
      const arquivos: string[] = p.midia || [];
      const midia = arquivos.map((f) => ({
        url: f.startsWith("http") ? f : `${MIDIA_BASE}/${f}`,
        tipo: ehVideo(f) ? "video" : "imagem",
      }));
      return {
        n: p.n,
        data: p.data,
        dia_semana: p.dia_semana,
        fase_titulo: p.fase_titulo,
        formato: p.formato,
        status: p.status,
        caption: p.caption || "",
        hook: p.hook || "",
        tipos: formatoParaTipos(p.formato || ""),
        midia,
        podePuxar: midia.length > 0,
      };
    });
    return NextResponse.json({ posts });
  } catch (e: any) {
    return NextResponse.json({ erro: e?.message || "falha ao ler o plano" }, { status: 500 });
  }
}
