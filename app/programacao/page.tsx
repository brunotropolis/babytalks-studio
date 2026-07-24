"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Tipo = "imagem" | "carrossel" | "reels" | "stories";
type PlanoPost = {
  n: number | string;
  data: string;
  dia_semana: string;
  fase_titulo: string;
  formato: string;
  status: string;
  caption: string;
  hook: string;
  colaboradores?: string[];
  tipos: Tipo[];
  midia: { url: string; tipo: "imagem" | "video" }[];
  podePuxar: boolean;
};

const TIPO_LABEL: Record<Tipo, string> = { imagem: "Foto", carrossel: "Carrossel", reels: "Reels", stories: "Stories" };

export default function Programacao() {
  const [posts, setPosts] = useState<PlanoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [escolhendo, setEscolhendo] = useState<number | string | null>(null);
  const [fechados, setFechados] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    fetch("/api/plano")
      .then((r) => r.json())
      .then((j) => {
        if (j.erro) { setErro(j.erro); return; }
        const ps: PlanoPost[] = j.posts || [];
        setPosts(ps);
        // categorias grandes (ex.: memes) começam fechadas pra não poluir
        const cont: Record<string, number> = {};
        for (const p of ps) { const k = p.fase_titulo || "Outros"; cont[k] = (cont[k] || 0) + 1; }
        setFechados(new Set(Object.entries(cont).filter(([, n]) => n > 12).map(([k]) => k)));
      })
      .catch(() => setErro("falha ao carregar o plano"))
      .finally(() => setLoading(false));
  }, []);

  // agrupa por categoria (fase), preservando a ordem de aparição
  const grupos: { titulo: string; posts: PlanoPost[] }[] = [];
  const idxGrupo: Record<string, number> = {};
  for (const p of posts) {
    const k = p.fase_titulo || "Outros";
    if (!(k in idxGrupo)) { idxGrupo[k] = grupos.length; grupos.push({ titulo: k, posts: [] }); }
    grupos[idxGrupo[k]].posts.push(p);
  }
  const toggle = (k: string) =>
    setFechados((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });

  function puxar(p: PlanoPost, tipo: Tipo) {
    const prefill = {
      tipo,
      legenda: tipo === "stories" ? "" : p.caption,
      midia: p.midia,
      data: p.data,
      colaboradores: tipo === "stories" ? [] : (p.colaboradores || []),
    };
    sessionStorage.setItem("bt_prefill", JSON.stringify(prefill));
    router.push("/");
  }

  return (
    <main className="min-h-screen max-w-2xl mx-auto p-6">
      <a href="https://conteudo.babytalks.com.br" className="inline-block text-sm font-semibold text-lilas-esc hover:text-magenta mb-4">
        ← Central de Conteúdo
      </a>
      <header className="flex items-end justify-between mb-6">
        <div>
          <span className="text-[11px] tracking-[2.5px] uppercase text-magenta font-bold">Baby Talks</span>
          <h1 className="font-serif text-3xl text-azul leading-tight">Da programação</h1>
          <p className="text-sm text-azul-suave">Puxe um post do calendário</p>
        </div>
        <Link href="/" className="text-sm font-semibold text-lilas-esc hover:text-magenta">← Novo post</Link>
      </header>

      {loading && <p className="text-azul-suave text-sm">Carregando o plano…</p>}
      {erro && <p className="text-magenta text-sm">Erro: {erro}</p>}

      <div className="flex flex-col gap-4">
        {grupos.map((g) => {
          const aberto = !fechados.has(g.titulo);
          const prontos = g.posts.filter((p) => p.status === "PRONTO").length;
          return (
            <section key={g.titulo}>
              <button
                onClick={() => toggle(g.titulo)}
                className="w-full flex items-center gap-2 mb-2 text-left"
              >
                <span className={`text-lilas-esc text-sm transition-transform ${aberto ? "rotate-90" : ""}`}>▶</span>
                <h2 className="font-serif text-lg text-azul flex-1 leading-tight">{g.titulo}</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-verde/15 text-verde font-semibold">{prontos} prontos</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-lavanda text-azul-suave font-semibold">{g.posts.length}</span>
              </button>

              {aberto && (
                <div className="flex flex-col gap-2">
                  {g.posts.map((p) => {
                    const capa = p.midia[0];
                    return (
                      <div key={p.n} className={`bg-white border border-lavanda rounded-2xl p-3 ${p.podePuxar ? "" : "opacity-60"}`}>
                        <div className="flex gap-3">
                          <div className="w-16 h-16 rounded-xl overflow-hidden bg-branco border border-lavanda shrink-0 grid place-items-center text-lilas-esc text-xs">
                            {capa ? (capa.tipo === "video"
                              ? <video src={capa.url} className="w-full h-full object-cover" muted />
                              // eslint-disable-next-line @next/next/no-img-element
                              : <img src={capa.url} alt="" className="w-full h-full object-cover" />)
                              : "sem mídia"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-azul">#{p.n}</span>
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-lavanda text-azul-suave font-semibold">{p.formato}</span>
                              {p.status === "PRONTO"
                                ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-verde/15 text-verde font-semibold">pronto</span>
                                : <span className="text-[11px] px-2 py-0.5 rounded-full bg-rosa text-magenta font-semibold">aguardando mídia</span>}
                            </div>
                            <p className="text-xs text-azul-suave mt-1 line-clamp-2">{p.caption || p.hook}</p>
                          </div>
                        </div>

                        {p.podePuxar && (
                          <div className="mt-2 pl-[76px]">
                            {escolhendo === p.n && p.tipos.length > 1 ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-azul-suave">Publicar como:</span>
                                {p.tipos.map((t) => (
                                  <button key={t} onClick={() => puxar(p, t)} className="text-xs font-semibold px-3 py-1 rounded-full bg-lilas/15 text-lilas-esc hover:bg-magenta hover:text-white transition">
                                    {TIPO_LABEL[t]}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <button
                                onClick={() => (p.tipos.length > 1 ? setEscolhendo(p.n) : puxar(p, p.tipos[0] || "imagem"))}
                                className="text-xs font-bold px-3 py-1.5 rounded-full bg-verde text-white hover:bg-verde-bright transition"
                              >
                                Usar este →
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
