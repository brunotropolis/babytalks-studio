/**
 * Escreve de volta no plano de conteúdo do hub (posts.json do repo
 * babytalks-conteudo) marcando um item como POSTADO quando o studio publica.
 * Fonte única: planejado -> pronto -> postado no mesmo arquivo.
 *
 * O vínculo é feito pelo NOME DO ARQUIVO da mídia: o plano guarda
 * 'reels-01.mp4' e a mídia publicada vem de conteudo.../midia/reels-01.mp4.
 * Assim posts manuais (mídia do bucket Supabase) não casam e não marcam nada.
 */
import type { MidiaItem } from "./instagram";
import { getGithubPat } from "./config";

const OWNER = "brunotropolis";
const REPO = "babytalks-conteudo";
const FILE = "posts.json";
const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`;

const nomeArquivo = (u: string) => (u || "").split("/").pop() || "";

/** Marca no plano o item cuja mídia bate com a publicada (+ permalink + data). Best-effort. */
export async function marcarPostado(midia: MidiaItem[], permalink?: string): Promise<void> {
  const nomes = (midia || []).map((m) => nomeArquivo(m.url)).filter(Boolean);
  const pat = await getGithubPat();
  if (!pat || nomes.length === 0) return;

  const headers = {
    Authorization: `token ${pat}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "babytalks-studio",
  };
  const g = await fetch(`${API}?ref=main`, { headers, cache: "no-store" });
  if (!g.ok) throw new Error(`GitHub GET posts.json: ${g.status}`);
  const file = await g.json();
  const plano = JSON.parse(Buffer.from(file.content, "base64").toString("utf-8"));

  // acha o item do plano que contém algum dos arquivos publicados
  const post = (plano.posts || []).find((p: any) =>
    (p.midia || []).some((f: string) => nomes.includes(f)),
  );
  if (!post || post.status === "POSTADO") return; // manual, ou já marcado

  post.status = "POSTADO";
  if (permalink) post.permalink = permalink;
  post.postado_em = new Date().toISOString();

  const novo = Buffer.from(JSON.stringify(plano, null, 2), "utf-8").toString("base64");
  const put = await fetch(API, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ message: `postado: #${post.n} via studio`, content: novo, sha: file.sha, branch: "main" }),
  });
  if (!put.ok) throw new Error(`GitHub PUT posts.json: ${put.status}`);
}
