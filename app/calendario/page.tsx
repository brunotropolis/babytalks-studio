"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Post = {
  id: string;
  agendado_para: string | null;
  publicado_em: string | null;
  status: string;
  tipo: string;
  legenda: string | null;
  midia: { url: string; tipo: string }[] | null;
  permalink: string | null;
};

const TIPO_LABEL: Record<string, string> = { imagem: "Foto", carrossel: "Carrossel", reels: "Reels", stories: "Stories" };
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// cor por status
function corStatus(s: string) {
  if (s === "publicado" || s === "postado") return { dot: "bg-verde", txt: "text-verde", label: "publicado" };
  if (s === "erro") return { dot: "bg-magenta", txt: "text-magenta", label: "erro" };
  return { dot: "bg-lilas-esc", txt: "text-lilas-esc", label: "agendado" };
}
function dataDoPost(p: Post): Date | null {
  const iso = p.status === "agendado" ? p.agendado_para : (p.publicado_em || p.agendado_para);
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
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [sel, setSel] = useState<string | null>(chaveDia(hoje));

  useEffect(() => {
    fetch("/api/posts")
      .then((r) => r.json())
      .then((j) => { if (j.erro) setErro(j.erro); else setPosts(j.posts || []); })
      .catch(() => setErro("falha ao carregar os agendamentos"))
      .finally(() => setLoading(false));
  }, []);

  const porDia = useMemo(() => {
    const m: Record<string, Post[]> = {};
    for (const p of posts) {
      const d = dataDoPost(p);
      if (!d) continue;
      const k = chaveDia(d);
      (m[k] = m[k] || []).push(p);
    }
    return m;
  }, [posts]);

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
          <p className="text-sm text-azul-suave">{nAgendados} agendado{nAgendados === 1 ? "" : "s"} · o que está programado pra postar</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Link href="/" className={btnSoft}>✏️ Novo post</Link>
          <Link href="/agendados" className={btnSoft}>⏳ Lista</Link>
        </div>
      </header>

      {loading && <p className="text-azul-suave text-sm">Carregando…</p>}
      {erro && <p className="text-magenta text-sm">Erro: {erro}</p>}

      {!loading && !erro && (
        <>
          {/* controles do mês */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={prev} className="w-9 h-9 rounded-full bg-white border border-lavanda hover:border-magenta text-azul grid place-items-center transition">‹</button>
            <div className="flex items-center gap-3">
              <h2 className="font-serif text-xl text-azul">{MESES[mes]} {ano}</h2>
              <button onClick={irHoje} className="text-xs font-semibold text-magenta hover:underline">hoje</button>
            </div>
            <button onClick={next} className="w-9 h-9 rounded-full bg-white border border-lavanda hover:border-magenta text-azul grid place-items-center transition">›</button>
          </div>

          {/* grade */}
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
                  <button
                    key={i}
                    onClick={() => setSel(k)}
                    className={`min-h-[76px] border-b border-r border-lavanda p-1.5 text-left align-top flex flex-col gap-1 transition
                      ${isSel ? "bg-rosa/50" : "hover:bg-branco"}`}
                  >
                    <span className={`text-xs font-bold w-6 h-6 grid place-items-center rounded-full
                      ${isHoje ? "bg-magenta text-white" : "text-azul"}`}>{d.getDate()}</span>
                    <div className="flex flex-col gap-0.5">
                      {dayPosts.slice(0, 3).map((p) => {
                        const c = corStatus(p.status);
                        return (
                          <span key={p.id} className="flex items-center gap-1 text-[10px] text-azul-suave truncate">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                            <span className="truncate">{hora(p.status === "agendado" ? p.agendado_para : p.publicado_em)} {TIPO_LABEL[p.tipo] || p.tipo}</span>
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

          {/* legenda de cores */}
          <div className="flex gap-4 mt-3 text-[11px] text-azul-suave">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-lilas-esc" /> agendado</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-verde" /> publicado</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-magenta" /> erro</span>
          </div>

          {/* painel do dia selecionado */}
          {sel && (
            <div className="mt-6">
              <h3 className="font-serif text-lg text-azul mb-2">
                {(() => { const [y, m, dd] = sel.split("-").map(Number); return `${String(dd).padStart(2, "0")} de ${MESES[m]}`; })()}
              </h3>
              {selPosts.length === 0 ? (
                <p className="text-sm text-azul-suave">Nada programado nesse dia. <Link href="/" className="text-magenta font-semibold">Criar um post →</Link></p>
              ) : (
                <div className="flex flex-col gap-2">
                  {selPosts.map((p) => {
                    const c = corStatus(p.status);
                    const capa = p.midia?.[0];
                    return (
                      <div key={p.id} className="bg-white border border-lavanda rounded-2xl p-3 flex gap-3">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-branco border border-lavanda shrink-0 grid place-items-center text-[10px] text-azul-suave">
                          {capa ? (capa.tipo === "video"
                            ? <video src={capa.url} className="w-full h-full object-cover" muted />
                            // eslint-disable-next-line @next/next/no-img-element
                            : <img src={capa.url} alt="" className="w-full h-full object-cover" />)
                            : "sem mídia"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-azul">{hora(p.status === "agendado" ? p.agendado_para : p.publicado_em)} · {TIPO_LABEL[p.tipo] || p.tipo}</span>
                            <span className={`text-[11px] font-semibold ${c.txt}`}>{c.label}</span>
                          </div>
                          {p.legenda && <p className="text-xs text-azul-suave mt-1 line-clamp-2">{p.legenda}</p>}
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
