"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Midia = { url: string; tipo: string };
type Post = {
  id: string;
  agendado_para: string | null;
  publicado_em: string | null;
  status: string; // agendado | publicado | erro | planejado
  tipo: string;
  legenda: string | null;
  midia: Midia[] | null;
  permalink: string | null;
  plano?: boolean;
  n?: string | number;
  quando?: string;
  colaboradores?: string[];
  erro?: string | null;
};

const HUB = "https://conteudo.babytalks.com.br";
const TIPO_LABEL: Record<string, string> = { imagem: "Foto", carrossel: "Carrossel", reels: "Reels", stories: "Stories" };
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function fmtParaTipo(fmt: string): string {
  const f = (fmt || "").toLowerCase();
  if (f.includes("carross")) return "carrossel";
  if (f.includes("reels") || f.includes("vídeo") || f.includes("video")) return "reels";
  if (f.includes("stor")) return "stories";
  return "imagem";
}
function corStatus(s: string) {
  if (s === "publicado" || s === "postado") return { dot: "bg-verde", txt: "text-verde", label: "publicado" };
  if (s === "erro") return { dot: "bg-magenta", txt: "text-magenta", label: "erro" };
  if (s === "planejado") return { dot: "bg-rosa border border-magenta", txt: "text-magenta", label: "planejado" };
  return { dot: "bg-lilas-esc", txt: "text-lilas-esc", label: "agendado" };
}
function dataDoPost(p: Post): Date | null {
  const iso = p.status === "publicado" || p.status === "postado" ? (p.publicado_em || p.agendado_para) : p.agendado_para;
  return iso ? new Date(iso) : null;
}
function chaveDia(d: Date) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
function hora(iso: string | null) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; }
}

export default function Calendario() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const router = useRouter();
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [sel, setSel] = useState<string | null>(chaveDia(hoje));

  useEffect(() => {
    (async () => {
      try {
        const [rPosts, rPlano, rPlanoJson] = await Promise.all([
          fetch("/api/posts").then((r) => r.json()).catch(() => ({ posts: [] })),
          fetch("/api/plano").then((r) => r.json()).catch(() => ({ posts: [] })),
          fetch(`${HUB}/plano.json?cb=${Math.floor(Date.now() / 60000)}`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({ itens: [] })),
        ]);
        const reais: Post[] = rPosts.posts || [];
        // urls de midia ja agendadas/postadas — pra nao duplicar o planejado
        const jaTem = new Set<string>();
        for (const p of reais) if (p.midia?.[0]?.url) jaTem.add(p.midia[0].url);
        // mapa n -> post completo do repositorio (tem midia + legenda)
        const repo: Record<string, any> = {};
        for (const p of (rPlano.posts || [])) repo[String(p.n)] = p;
        const planejados: Post[] = [];
        for (const it of (rPlanoJson.itens || [])) {
          const full = repo[String(it.n)];
          const midia: Midia[] = full?.midia || (it.capa ? [{ url: it.capa.startsWith("http") ? it.capa : `${HUB}/midia/${it.capa}`, tipo: "imagem" }] : []);
          if (midia[0]?.url && jaTem.has(midia[0].url)) continue; // ja foi agendado de verdade
          if (it.postado) continue;
          const quando = `${it.data}T${it.hora}:00`;
          planejados.push({
            id: `plano-${it.n}`, status: "planejado", plano: true, n: it.n, quando,
            agendado_para: quando, publicado_em: null, permalink: null,
            tipo: fmtParaTipo(it.fmt || full?.formato || ""),
            legenda: full?.caption || it.linha || "",
            midia,
            colaboradores: full?.colaboradores || it.colaboradores || [],
          });
        }
        setPosts([...reais, ...planejados]);
      } catch { setErro("falha ao carregar o calendário"); }
      finally { setLoading(false); }
    })();
  }, []);

  const porDia = useMemo(() => {
    const m: Record<string, Post[]> = {};
    for (const p of posts) {
      const d = dataDoPost(p);
      if (!d) continue;
      (m[chaveDia(d)] = m[chaveDia(d)] || []).push(p);
    }
    for (const k in m) m[k].sort((a, b) => (a.agendado_para || "").localeCompare(b.agendado_para || ""));
    return m;
  }, [posts]);

  function programar(p: Post) {
    const prefill = {
      tipo: p.tipo,
      legenda: p.tipo === "stories" ? "" : (p.legenda || ""),
      midia: (p.midia || []).map((m) => ({ url: m.url, tipo: m.tipo === "video" ? "video" : "imagem" })),
      colaboradores: p.tipo === "stories" ? [] : (p.colaboradores || []),
      quando: p.quando,
    };
    sessionStorage.setItem("bt_prefill", JSON.stringify(prefill));
    router.push("/");
  }

  const inicioSemana = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < inicioSemana; i++) cells.push(null);
  for (let d = 1; d <= diasNoMes; d++) cells.push(new Date(ano, mes, d));
  function prev() { if (mes === 0) { setMes(11); setAno((a) => a - 1); } else setMes((m) => m - 1); }
  function next() { if (mes === 11) { setMes(0); setAno((a) => a + 1); } else setMes((m) => m + 1); }
  function irHoje() { setAno(hoje.getFullYear()); setMes(hoje.getMonth()); setSel(chaveDia(hoje)); }

  const hojeK = chaveDia(hoje);
  const selPosts = sel ? (porDia[sel] || []) : [];
  const nAgendados = posts.filter((p) => p.status === "agendado").length;
  const nPlanejados = posts.filter((p) => p.status === "planejado").length;
  const btnSoft = "text-sm font-semibold text-azul bg-white border border-lavanda rounded-full px-3 py-1.5 hover:border-magenta hover:text-magenta transition whitespace-nowrap";

  return (
    <main className="min-h-screen max-w-3xl mx-auto p-6">
      <a href="https://conteudo.babytalks.com.br" className="inline-block text-sm font-semibold text-lilas-esc hover:text-magenta mb-4">
        ← Central de Conteúdo
      </a>
      <header className="flex items-start justify-between gap-3 mb-5 flex-wrap">
        <div>
          <span className="text-[11px] tracking-[2.5px] uppercase text-magenta font-bold">Baby Talks</span>
          <h1 className="font-serif text-3xl text-azul leading-tight">Calendário</h1>
          <p className="text-sm text-azul-suave">{nPlanejados} planejado{nPlanejados === 1 ? "" : "s"} · {nAgendados} agendado{nAgendados === 1 ? "" : "s"}</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Link href="/programacao" className={btnSoft}>📅 Programação</Link>
          <Link href="/agendados" className={btnSoft}>⏳ Lista</Link>
        </div>
      </header>

      {loading && <p className="text-azul-suave text-sm">Carregando…</p>}
      {erro && <p className="text-magenta text-sm">Erro: {erro}</p>}

      {!loading && !erro && (
        <>
          <div className="flex items-center justify-between mb-3">
            <button onClick={prev} className="w-9 h-9 rounded-full bg-white border border-lavanda hover:border-magenta text-azul grid place-items-center transition">‹</button>
            <div className="flex items-center gap-3">
              <h2 className="font-serif text-xl text-azul">{MESES[mes]} {ano}</h2>
              <button onClick={irHoje} className="text-xs font-semibold text-magenta hover:underline">hoje</button>
            </div>
            <button onClick={next} className="w-9 h-9 rounded-full bg-white border border-lavanda hover:border-magenta text-azul grid place-items-center transition">›</button>
          </div>

          <div className="bg-white border border-lavanda rounded-2xl overflow-hidden">
            <div className="grid grid-cols-7 bg-branco border-b border-lavanda">
              {WD.map((w) => <div key={w} className="text-center text-[11px] font-bold uppercase tracking-wide text-lilas-esc py-2">{w}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((d, i) => {
                if (!d) return <div key={i} className="min-h-[76px] border-b border-r border-lavanda bg-branco/40" />;
                const k = chaveDia(d);
                const dayPosts = porDia[k] || [];
                const isHoje = k === hojeK;
                const isSel = k === sel;
                return (
                  <button key={i} onClick={() => setSel(k)}
                    className={`min-h-[76px] border-b border-r border-lavanda p-1.5 text-left align-top flex flex-col gap-1 transition ${isSel ? "bg-rosa/50" : "hover:bg-branco"}`}>
                    <span className={`text-xs font-bold w-6 h-6 grid place-items-center rounded-full ${isHoje ? "bg-magenta text-white" : "text-azul"}`}>{d.getDate()}</span>
                    <div className="flex flex-col gap-0.5">
                      {dayPosts.slice(0, 3).map((p) => {
                        const c = corStatus(p.status);
                        return (
                          <span key={p.id} className="flex items-center gap-1 text-[10px] text-azul-suave truncate">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                            <span className="truncate">{hora(p.agendado_para)} {TIPO_LABEL[p.tipo] || p.tipo}</span>
                          </span>
                        );
                      })}
                      {dayPosts.length > 3 && <span className="text-[10px] text-lilas-esc font-semibold">+{dayPosts.length - 3}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-4 mt-3 text-[11px] text-azul-suave flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rosa border border-magenta" /> planejado</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-lilas-esc" /> agendado</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-verde" /> publicado</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-magenta" /> erro</span>
          </div>

          {sel && (
            <div className="mt-6">
              <h3 className="font-serif text-lg text-azul mb-2">
                {(() => { const [y, m, dd] = sel.split("-").map(Number); return `${String(dd).padStart(2, "0")} de ${MESES[m]}`; })()}
              </h3>
              {selPosts.length === 0 ? (
                <p className="text-sm text-azul-suave">Nada nesse dia. <Link href="/programacao" className="text-magenta font-semibold">Programar um post →</Link></p>
              ) : (
                <div className="flex flex-col gap-2">
                  {selPosts.map((p) => {
                    const c = corStatus(p.status);
                    const capa = p.midia?.[0];
                    return (
                      <div key={p.id} className={`bg-white border rounded-2xl p-3 flex gap-3 ${p.status === "planejado" ? "border-dashed border-magenta/50" : "border-lavanda"}`}>
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-branco border border-lavanda shrink-0 grid place-items-center text-[10px] text-azul-suave">
                          {capa ? (capa.tipo === "video"
                            ? <video src={capa.url} className="w-full h-full object-cover" muted />
                            // eslint-disable-next-line @next/next/no-img-element
                            : <img src={capa.url} alt="" className="w-full h-full object-cover" />)
                            : "sem mídia"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-azul">{hora(p.agendado_para)} · {TIPO_LABEL[p.tipo] || p.tipo}</span>
                            {p.n ? <span className="text-[11px] text-azul-suave">#{p.n}</span> : null}
                            <span className={`text-[11px] font-semibold ${c.txt}`}>{c.label}</span>
                          </div>
                          {p.legenda && <p className="text-xs text-azul-suave mt-1 line-clamp-2">{p.legenda}</p>}
                          {p.erro && (
                            <p className={`text-[11px] mt-1 font-semibold ${p.erro.includes("SEM collab") ? "text-magenta" : "text-magenta"}`}>
                              {p.erro.includes("SEM collab") ? "⚠️ publicado sem a marcação (um @ falhou)" : `⚠️ ${p.erro}`}
                            </p>
                          )}
                          {p.status === "planejado" && (
                            <button onClick={() => programar(p)} className="mt-2 text-xs font-bold px-3 py-1.5 rounded-full bg-verde text-white hover:bg-verde-bright transition">
                              Programar este →
                            </button>
                          )}
                          {p.permalink && <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-magenta">ver no Instagram ↗</a>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}
