import { NextResponse } from "next/server";
import { getGithubPat } from "@/lib/config";

export const runtime = "nodejs";
export const revalidate = 0;

const OWNER = "brunotropolis";
const REPO = "babytalks-conteudo";
const HUB = "https://conteudo.babytalks.com.br";

const IMG = /\.(png|jpe?g|webp|gif)$/i;
const VID = /\.(mp4|mov|m4v|webm)$/i;

/** Lista as mídias da pasta /midia do hub (recursivo, 1 chamada via git tree). */
export async function GET() {
  try {
    const pat = await getGithubPat();
    const headers: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "babytalks-studio" };
    if (pat) headers.Authorization = `token ${pat}`;

    const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/trees/main?recursive=1`, { headers, cache: "no-store" });
    if (!r.ok) return NextResponse.json({ erro: `GitHub ${r.status}` }, { status: 502 });
    const tree = await r.json();

    const arquivos = (tree.tree || [])
      .filter((t: any) => t.type === "blob" && t.path.startsWith("midia/") && (IMG.test(t.path) || VID.test(t.path)))
      .map((t: any) => {
        const partes = t.path.split("/");
        const nome = partes[partes.length - 1];
        const pasta = partes.length > 2 ? partes.slice(1, -1).join("/") : "";
        return {
          path: t.path,
          nome,
          pasta,
          url: `${HUB}/${t.path.split("/").map(encodeURIComponent).join("/")}`,
          tipo: VID.test(nome) ? "video" : "imagem",
        };
      })
      // mais recentes primeiro (git tree não dá data; ordena por nome desc como proxy dos "-vN")
      .sort((a: any, b: any) => b.nome.localeCompare(a.nome));

    return NextResponse.json({ total: arquivos.length, arquivos });
  } catch (e: any) {
    return NextResponse.json({ erro: e?.message || "falha ao listar mídia" }, { status: 500 });
  }
}
