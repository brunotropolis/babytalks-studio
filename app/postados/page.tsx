"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type MediaPost = {
  id: string;
  caption: string;
  tipo: string;
  thumb: string;
  permalink: string;
  timestamp: string;
};

const TIPO_LABEL: Record<string, string> = {
  IMAGE: "Foto",
  VIDEO: "Reels",
  CAROUSEL_ALBUM: "Carrossel",
};

function fmtData(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  } catch {
    return "";
  }
}

export default function Postados() {
  const [posts, setPosts] = useState<MediaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch("/api/instagram/media")
      .then((r) => r.json())
      .then((j) => { if (j.erro) setErro(j.erro); else setPosts(j.posts || []); })
      .catch(() => setErro("falha ao carregar o feed do Instagram"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen max-w-2xl mx-auto p-6">
      <a href="https://conteudo.babytalks.com.br" className="inline-block text-sm font-semibold text-lilas-esc hover:text-magenta mb-4">
        ← Central de Conteúdo
      </a>
      <header className="flex items-end justify-between mb-6">
        <div>
          <span className="text-[11px] tracking-[2.5px] uppercase text-magenta font-bold">Baby Talks</span>
          <h1 className="font-serif text-3xl text-azul leading-tight">Conteúdos postados</h1>
          <p className="text-sm text-azul-suave">Tudo que já está no Instagram @babytalks.evento</p>
        </div>
        <Link href="/" className="text-sm font-semibold text-lilas-esc hover:text-magenta">← Novo post</Link>
      </header>

      {loading && <p className="text-azul-suave text-sm">Carregando o feed do Instagram…</p>}
      {erro && <p className="text-magenta text-sm">Erro: {erro}</p>}
      {!loading && !erro && posts.length === 0 && <p className="text-azul-suave text-sm">Nenhum post publicado ainda.</p>}

      {posts.length > 0 && (
        <>
          <p className="text-xs text-azul-suave mb-3">{posts.length} publicações</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {posts.map((p) => (
              <a
                key={p.id}
                href={p.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white border border-lavanda rounded-2xl overflow-hidden hover:border-magenta transition flex flex-col"
              >
                <div style={{ aspectRatio: "1 / 1" }} className="relative block w-full bg-branco overflow-hidden">
                  {p.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumb} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-xs text-azul-suave">sem thumb</div>
                  )}
                  <span className="absolute top-1.5 left-1.5 text-[10px] px-2 py-0.5 rounded-full bg-azul/80 text-white font-semibold">
                    {TIPO_LABEL[p.tipo] || p.tipo}
                  </span>
                </div>
                <div className="p-2.5 flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-lilas-esc">{fmtData(p.timestamp)}</span>
                  <p className="text-xs text-azul line-clamp-2 leading-snug">{p.caption || "—"}</p>
                  <span className="text-[11px] font-semibold text-magenta opacity-0 group-hover:opacity-100 transition mt-0.5">ver no Instagram ↗</span>
                </div>
              </a>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
