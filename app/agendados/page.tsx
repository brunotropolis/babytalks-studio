"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Post = {
  id: string;
  criado_em: string;
  agendado_para: string | null;
  status: string;
  tipo: string;
  legenda: string | null;
  colaboradores: string[] | null;
  midia: { url: string; tipo: string }[];
  permalink: string | null;
  erro: string | null;
  publicado_em: string | null;
};

const TIPO_LABEL: Record<string, string> = { imagem: "Foto", carrossel: "Carrossel", reels: "Reels", stories: "Stories" };
const STATUS: Record<string, { txt: string; cls: string }> = {
  agendado: { txt: "Agendado", cls: "bg-lilas/20 text-lilas-esc" },
  publicando: { txt: "Publicando", cls: "bg-rosa text-magenta" },
  publicado: { txt: "Publicado", cls: "bg-verde/15 text-verde" },
  erro: { txt: "Erro", cls: "bg-magenta/15 text-magenta" },
  rascunho: { txt: "Rascunho", cls: "bg-lavanda text-azul-suave" },
};

function fmt(d: string | null) {
  if (!d) return "";
  try { return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch { return d; }
}
// ISO -> valor do input datetime-local (hora local)
function paraInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export default function Agendados() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [eQuando, setEQuando] = useState("");
  const [eLegenda, setELegenda] = useState("");
  const [eColabs, setEColabs] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ id: string; txt: string; ok: boolean } | null>(null);

  async function carregar() {
    setLoading(true);
    const r = await fetch("/api/posts");
    const j = await r.json();
    setPosts(j.posts || []);
    setLoading(false);
  }
  useEffect(() => { carregar(); }, []);

  async function cancelar(id: string) {
    if (!confirm("Cancelar este agendamento?")) return;
    await fetch(`/api/posts?id=${id}`, { method: "DELETE" });
    carregar();
  }

  function abrirEdicao(p: Post) {
    setEditId(p.id);
    setEQuando(paraInput(p.agendado_para));
    setELegenda(p.legenda || "");
    setEColabs((p.colaboradores || []).map((h) => "@" + h).join(" "));
    setMsg(null);
  }

  async function salvar(id: string) {
    setSalvando(true); setMsg(null);
    const colaboradores = eColabs.split(/[\s,]+/).map((s) => s.replace(/^@/, "").trim()).filter(Boolean).slice(0, 3);
    const r = await fetch("/api/posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, agendado_para: new Date(eQuando).toISOString(), legenda: eLegenda, colaboradores }),
    });
    const j = await r.json().catch(() => ({ erro: "falha" }));
    setSalvando(false);
    if (j.ok) { setEditId(null); setMsg({ id, txt: "Salvo!", ok: true }); carregar(); }
    else setMsg({ id, txt: j.erro || "não deu pra salvar", ok: false });
  }

  const agendados = posts.filter((p) => p.status === "agendado").sort((a, b) => (a.agendado_para || "").localeCompare(b.agendado_para || ""));
  const historico = posts.filter((p) => p.status !== "agendado");

  const Card = (p: Post) => {
    const capa = p.midia?.[0];
    const s = STATUS[p.status] || STATUS.rascunho;
    const emEdicao = editId === p.id;
    return (
      <div key={p.id} className="bg-white border border-lavanda rounded-2xl p-3">
        <div className="flex gap-3">
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-branco border border-lavanda shrink-0">
            {capa && (capa.tipo === "video"
              ? <video src={capa.url} className="w-full h-full object-cover" muted />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={capa.url} alt="" className="w-full h-full object-cover" />)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-azul">{TIPO_LABEL[p.tipo] || p.tipo}</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${s.cls}`}>{s.txt}</span>
              {p.agendado_para && <span className="text-[11px] text-lilas-esc">🗓️ {fmt(p.agendado_para)}</span>}
              {p.publicado_em && <span className="text-[11px] text-azul-suave">{fmt(p.publicado_em)}</span>}
              {p.colaboradores && p.colaboradores.length > 0 && <span className="text-[11px] text-magenta">🏷️ {p.colaboradores.map((h) => "@" + h).join(" ")}</span>}
            </div>
            {!emEdicao && p.legenda && <p className="text-xs text-azul-suave mt-1 line-clamp-2">{p.legenda}</p>}
            {p.erro && <p className="text-xs text-magenta mt-1 line-clamp-2">{p.erro}</p>}
            {msg && msg.id === p.id && <p className={`text-xs mt-1 font-semibold ${msg.ok ? "text-verde" : "text-magenta"}`}>{msg.txt}</p>}
            <div className="flex gap-3 mt-1.5">
              {p.permalink && <a href={p.permalink} target="_blank" className="text-xs font-semibold text-verde underline">ver post</a>}
              {p.status === "agendado" && !emEdicao && <button onClick={() => abrirEdicao(p)} className="text-xs font-semibold text-azul">editar</button>}
              {p.status === "agendado" && !emEdicao && <button onClick={() => cancelar(p.id)} className="text-xs font-semibold text-magenta">cancelar</button>}
            </div>
          </div>
        </div>

        {emEdicao && (
          <div className="mt-3 border-t border-lavanda pt-3 flex flex-col gap-2">
            <label className="text-[11px] font-semibold text-azul-suave">Data e hora</label>
            <input type="datetime-local" value={eQuando} onChange={(e) => setEQuando(e.target.value)}
              className="rounded-lg bg-branco border border-lavanda px-3 py-2 text-sm outline-none focus:border-lilas text-azul" />
            <label className="text-[11px] font-semibold text-azul-suave">Legenda</label>
            <textarea value={eLegenda} onChange={(e) => setELegenda(e.target.value)} rows={4}
              className="rounded-lg bg-branco border border-lavanda px-3 py-2 text-sm outline-none focus:border-lilas text-azul" />
            <label className="text-[11px] font-semibold text-azul-suave">Marcação (collab) — até 3</label>
            <input value={eColabs} onChange={(e) => setEColabs(e.target.value)} placeholder="@perfil1 @perfil2"
              className="rounded-lg bg-branco border border-lavanda px-3 py-2 text-sm outline-none focus:border-lilas text-azul" />
            <div className="flex gap-2 mt-1">
              <button onClick={() => salvar(p.id)} disabled={salvando || !eQuando}
                className="text-xs font-bold px-4 py-2 rounded-full bg-verde text-white hover:bg-verde-bright disabled:opacity-40 transition">
                {salvando ? "Salvando…" : "Salvar"}
              </button>
              <button onClick={() => setEditId(null)} className="text-xs font-semibold px-4 py-2 rounded-full bg-white border border-lavanda text-azul-suave">Cancelar</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="min-h-screen max-w-2xl mx-auto p-6">
      <a href="https://conteudo.babytalks.com.br" className="inline-block text-sm font-semibold text-lilas-esc hover:text-magenta mb-4">
        ← Central de Conteúdo
      </a>
      <header className="flex items-end justify-between mb-6">
        <div>
          <span className="text-[11px] tracking-[2.5px] uppercase text-magenta font-bold">Baby Talks</span>
          <h1 className="font-serif text-3xl text-azul leading-tight">Agendados</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/calendario" className="text-sm font-semibold text-lilas-esc hover:text-magenta">🗓️ Calendário</Link>
          <Link href="/" className="text-sm font-semibold text-lilas-esc hover:text-magenta">← Novo post</Link>
        </div>
      </header>

      {loading ? (
        <p className="text-azul-suave text-sm">Carregando…</p>
      ) : (
        <>
          <h2 className="font-serif text-lg text-azul mt-2 mb-3">Na fila ({agendados.length})</h2>
          {agendados.length === 0 ? (
            <p className="text-sm text-azul-suave mb-6">Nada agendado. Crie um post e marque “Agendar para depois”.</p>
          ) : (
            <div className="flex flex-col gap-2 mb-8">{agendados.map(Card)}</div>
          )}

          <h2 className="font-serif text-lg text-azul mb-3">Histórico</h2>
          {historico.length === 0 ? (
            <p className="text-sm text-azul-suave">Ainda sem publicações.</p>
          ) : (
            <div className="flex flex-col gap-2">{historico.map(Card)}</div>
          )}
        </>
      )}
    </main>
  );
}
