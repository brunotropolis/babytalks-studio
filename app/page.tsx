"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Tipo = "imagem" | "carrossel" | "reels" | "stories";
type Midia = { url: string; tipo: "imagem" | "video"; nome: string; enviando?: boolean };

const TIPOS: { id: Tipo; label: string; dica: string; ic: string }[] = [
  { id: "imagem", label: "Foto", dica: "1 imagem", ic: "🖼️" },
  { id: "carrossel", label: "Carrossel", dica: "2 a 10", ic: "🎠" },
  { id: "reels", label: "Reels", dica: "1 vídeo", ic: "🎬" },
  { id: "stories", label: "Stories", dica: "foto ou vídeo", ic: "⚡" },
];

export default function Studio() {
  const [tipo, setTipo] = useState<Tipo>("imagem");
  const [midia, setMidia] = useState<Midia[]>([]);
  const [legenda, setLegenda] = useState("");
  const [colabs, setColabs] = useState("");
  const [compartilharFeed, setCompartilharFeed] = useState(true);
  const [agendar, setAgendar] = useState(false);
  const [quando, setQuando] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; msg: string; link?: string } | null>(null);
  const [colabFreq, setColabFreq] = useState<Record<string, number>>({});
  const [marcBase, setMarcBase] = useState<{ nome: string; handles: string[]; grupo: string }[]>([]);
  // biblioteca de mídia do hub
  const fileRef = useRef<HTMLInputElement>(null);
  const [bibAberta, setBibAberta] = useState(false);
  const [bibItens, setBibItens] = useState<{ url: string; nome: string; pasta: string; tipo: "imagem" | "video" }[]>([]);
  const [bibLoading, setBibLoading] = useState(false);
  const [bibBusca, setBibBusca] = useState("");

  // prefill vindo da "Da programação"
  useEffect(() => {
    const raw = typeof window !== "undefined" ? sessionStorage.getItem("bt_prefill") : null;
    if (!raw) return;
    sessionStorage.removeItem("bt_prefill");
    try {
      const p = JSON.parse(raw);
      if (p.tipo) setTipo(p.tipo);
      if (typeof p.legenda === "string") setLegenda(p.legenda);
      if (Array.isArray(p.midia)) {
        setMidia(p.midia.map((m: any, i: number) => ({
          url: m.url,
          tipo: m.tipo === "video" ? "video" : "imagem",
          nome: m.url.split("/").pop() || `midia-${i}`,
        })));
      }
      if (Array.isArray(p.colaboradores) && p.colaboradores.length) {
        setColabs(p.colaboradores.slice(0, 3).map((h: string) => "@" + String(h).replace(/^@/, "")).join(" "));
      }
      const quandoISO = p.quando || (p.data ? `${p.data}T09:00` : "");
      if (quandoISO && new Date(quandoISO).getTime() > Date.now()) {
        setAgendar(true);
        setQuando(quandoISO);
      }
      setResultado({ ok: true, msg: "Puxado da programação — revise e publique/agende. 👇" });
    } catch { /* ignora prefill inválido */ }
  }, []);

  // histórico de collabs mais usados (por navegador)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("bt_colab_freq");
      if (raw) setColabFreq(JSON.parse(raw));
    } catch { /* ignora */ }
  }, []);

  // base de palestrantes e marcas (pra clicar e carregar as @)
  useEffect(() => {
    fetch(`https://conteudo.babytalks.com.br/marcacoes.json?cb=${Math.floor(Date.now() / 3600000)}`)
      .then((r) => r.json())
      .then((j) => {
        const lista: { nome: string; handles: string[]; grupo: string }[] = [];
        for (const v of Object.values(j.palestrantes || {}) as any[]) lista.push({ nome: v.nome, handles: v.handles, grupo: "Palestrantes" });
        for (const v of Object.values(j.parceiros || {}) as any[]) lista.push({ nome: v.nome, handles: v.handles, grupo: "Marcas parceiras" });
        setMarcBase(lista);
      })
      .catch(() => { /* ignora */ });
  }, []);

  function carregarMarcacao(handles: string[]) {
    const atuais = colabs.split(/[\s,]+/).map((s) => s.replace(/^@/, "").trim()).filter(Boolean);
    const nova = [...atuais];
    for (const h of handles) if (!nova.includes(h) && nova.length < 3) nova.push(h);
    setColabs(nova.map((h) => "@" + h).join(" "));
  }

  function registrarColabs(list: string[]) {
    if (!list.length) return;
    setColabFreq((prev) => {
      const next = { ...prev };
      for (const c of list) next[c] = (next[c] || 0) + 1;
      try { localStorage.setItem("bt_colab_freq", JSON.stringify(next)); } catch { /* ignora */ }
      return next;
    });
  }

  function addColab(handle: string) {
    const atuais = colabs.split(/[\s,]+/).map((s) => s.replace(/^@/, "").trim()).filter(Boolean);
    if (atuais.includes(handle) || atuais.length >= 3) return;
    setColabs((c) => (c.trim() ? c.trim() + " @" + handle : "@" + handle));
  }

  const ehStories = tipo === "stories";
  const aceita = tipo === "reels" ? "video/*" : ehStories ? "image/*,video/*" : tipo === "imagem" ? "image/*" : "image/*,video/*";
  const multiplo = tipo === "carrossel";

  async function onEscolher(files: FileList | null) {
    if (!files?.length) return;
    setResultado(null);
    for (const f of Array.from(files)) {
      const ph: Midia = { url: "", tipo: f.type.startsWith("video") ? "video" : "imagem", nome: f.name, enviando: true };
      setMidia((m) => (tipo === "carrossel" ? [...m, ph] : [ph]));
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json();
      setMidia((m) => m.map((x) => (x.nome === f.name && x.enviando ? { url: j.url, tipo: j.tipo, nome: f.name } : x)));
    }
  }

  const remover = (nome: string) => setMidia((m) => m.filter((x) => x.nome !== nome));

  async function abrirBiblioteca() {
    setBibAberta(true);
    if (bibItens.length === 0) {
      setBibLoading(true);
      try {
        const j = await (await fetch("/api/midia")).json();
        setBibItens(j.arquivos || []);
      } catch { /* ignora */ }
      setBibLoading(false);
    }
  }

  function adicionarDaBiblioteca(item: { url: string; nome: string; tipo: "imagem" | "video" }) {
    setResultado(null);
    const novo = { url: item.url, tipo: item.tipo, nome: item.nome };
    setMidia((m) => {
      if (tipo === "carrossel") {
        if (m.some((x) => x.url === item.url)) return m; // sem duplicar
        return [...m, novo];
      }
      return [novo];
    });
    if (tipo !== "carrossel") setBibAberta(false);
  }

  const colabList = colabs.split(/[\s,]+/).map((s) => s.replace(/^@/, "").trim()).filter(Boolean).slice(0, 3);
  const sugeridosColab = Object.entries(colabFreq)
    .sort((a, b) => b[1] - a[1])
    .map(([h]) => h)
    .filter((h) => !colabList.includes(h))
    .slice(0, 8);
  const bibFiltrada = bibItens.filter((it) => (it.nome + " " + it.pasta).toLowerCase().includes(bibBusca.toLowerCase()));
  const prontos = midia.filter((m) => m.url && !m.enviando);
  const podeEnviar =
    !enviando &&
    prontos.length > 0 &&
    (tipo !== "carrossel" || prontos.length >= 2) &&
    (tipo !== "reels" || prontos[0]?.tipo === "video") &&
    (!agendar || !!quando);

  async function enviar() {
    setEnviando(true);
    setResultado(null);
    const agendadoPara = agendar && quando ? new Date(quando).toISOString() : null;
    try {
      const r = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          legenda: ehStories ? "" : legenda,
          colaboradores: ehStories ? [] : colabList,
          compartilharFeed,
          agendadoPara,
          midia: prontos.map((m) => ({ url: m.url, tipo: m.tipo })),
        }),
      });
      const j = await r.json().catch(() => ({ ok: false, erro: `HTTP ${r.status}` }));
      if (j.ok && j.agendado) {
        registrarColabs(colabList);
        setResultado({ ok: true, msg: "Agendado! 🗓️ Aparece na lista de agendados." });
        limpar();
      } else if (j.ok) {
        registrarColabs(colabList);
        setResultado({
          ok: true,
          msg: j.semCollab
            ? "Publicado! 🎉 Mas saiu SEM o collab (um @ era inválido). Convide o parceiro manualmente no app."
            : "Publicado! 🎉",
          link: j.permalink,
        });
        limpar();
      } else {
        setResultado({ ok: false, msg: msgErro(j.erro) });
      }
    } catch (e: any) {
      setResultado({ ok: false, msg: "Conexão caiu antes de terminar. Confira em Agendados se saiu, e tente de novo se precisar." });
    } finally {
      setEnviando(false);
    }
  }

  function msgErro(erro?: string) {
    const e = (erro || "").toLowerCase();
    if (e.includes("invalid user id"))
      return "Um dos @ de colaborador não pôde ser convidado (conta inexistente ou com convite de collab restrito). Dica: use só 1 collab por post, ou remova o collab e publique.";
    return erro || "Falha ao publicar";
  }

  function limpar() {
    setMidia([]); setLegenda(""); setColabs(""); setQuando(""); setAgendar(false); setTipo("imagem");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="min-h-screen max-w-2xl mx-auto p-6">
      <a href="https://conteudo.babytalks.com.br" className="inline-block text-sm font-semibold text-lilas-esc hover:text-magenta mb-4">
        ← Central de Conteúdo
      </a>
      <header className="flex items-end justify-between mb-7">
        <div>
          <span className="text-[11px] tracking-[2.5px] uppercase text-magenta font-bold">Baby Talks</span>
          <h1 className="font-serif text-3xl text-azul leading-tight">Studio</h1>
          <p className="text-sm text-azul-suave">Publicar no @babytalks.evento</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 max-w-[62%]">
          <Link href="/programacao" className="text-sm font-semibold text-white bg-magenta hover:bg-magenta-suave rounded-full px-3.5 py-1.5 whitespace-nowrap transition">
            📅 Da programação
          </Link>
          <Link href="/calendario" className="text-sm font-semibold text-azul bg-white border border-lavanda hover:border-magenta hover:text-magenta rounded-full px-3.5 py-1.5 whitespace-nowrap transition">
            🗓️ Calendário
          </Link>
          <Link href="/agendados" className="text-sm font-semibold text-azul bg-white border border-lavanda hover:border-magenta hover:text-magenta rounded-full px-3.5 py-1.5 whitespace-nowrap transition">
            ⏳ Agendados
          </Link>
          <Link href="/postados" className="text-sm font-semibold text-azul bg-white border border-lavanda hover:border-magenta hover:text-magenta rounded-full px-3.5 py-1.5 whitespace-nowrap transition">
            ✅ Postados
          </Link>
        </div>
      </header>

      {/* tipo */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {TIPOS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTipo(t.id); setMidia([]); setResultado(null); }}
            className={`rounded-2xl border px-2 py-3 text-center transition ${tipo === t.id ? "border-magenta bg-rosa/60" : "border-lavanda bg-white hover:border-lilas"}`}
          >
            <div className="text-xl mb-1">{t.ic}</div>
            <div className="font-semibold text-sm text-azul">{t.label}</div>
            <div className="text-[11px] text-azul-suave">{t.dica}</div>
          </button>
        ))}
      </div>

      {/* mídia */}
      <label className="block mb-2 text-sm font-semibold text-azul-suave">Mídia</label>
      <div className="flex gap-2 mb-3">
        <button type="button" onClick={() => fileRef.current?.click()} className="flex-1 rounded-xl border border-lavanda bg-white hover:border-lilas py-2.5 text-sm font-semibold text-azul-suave transition">
          ⬆️ Subir do computador
        </button>
        <button type="button" onClick={abrirBiblioteca} className="flex-1 rounded-xl border border-lavanda bg-white hover:border-magenta py-2.5 text-sm font-semibold text-magenta transition">
          🖼️ Biblioteca
        </button>
        <input ref={fileRef} type="file" accept={aceita} multiple={multiplo} className="hidden" onChange={(e) => onEscolher(e.target.files)} />
      </div>
      <div className="flex flex-wrap gap-3 mb-4">
        {midia.map((m) => (
          <div key={m.nome} className="relative w-24 h-24 rounded-xl overflow-hidden border border-lavanda bg-white">
            {m.enviando ? (
              <div className="w-full h-full grid place-items-center text-xs text-azul-suave">enviando…</div>
            ) : m.tipo === "video" ? (
              <video src={m.url} className="w-full h-full object-cover" muted />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt="" className="w-full h-full object-cover" />
            )}
            <button onClick={() => remover(m.nome)} className="absolute top-1 right-1 bg-azul/80 text-white rounded-full w-5 h-5 text-xs leading-5">×</button>
          </div>
        ))}
        {midia.length === 0 && (
          <div className="w-full text-xs text-azul-suave py-2">Escolha “Subir do computador” ou “Biblioteca”.</div>
        )}
      </div>

      {/* legenda + collabs (não em stories) */}
      {!ehStories && (
        <>
          <label className="block mb-2 text-sm font-semibold text-azul-suave">Legenda</label>
          <textarea
            value={legenda}
            onChange={(e) => setLegenda(e.target.value)}
            rows={5}
            placeholder="Escreva a legenda…"
            className="w-full rounded-xl bg-white border border-lavanda px-4 py-3 outline-none focus:border-lilas mb-4 text-azul"
          />
          <label className="block mb-2 text-sm font-semibold text-azul-suave">Colaboradores (collab) — até 3</label>
          <input
            value={colabs}
            onChange={(e) => setColabs(e.target.value)}
            placeholder="@marca1 @parceiro2"
            className="w-full rounded-xl bg-white border border-lavanda px-4 py-3 outline-none focus:border-lilas text-azul"
          />
          {colabList.length > 0 && (
            <p className="text-xs text-azul-suave mt-1">Convite de collab para: {colabList.map((c) => "@" + c).join(", ")}</p>
          )}
          {sugeridosColab.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-xs text-azul-suave">Mais usados:</span>
              {sugeridosColab.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => addColab(h)}
                  disabled={colabList.length >= 3}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full bg-lilas/15 text-lilas-esc hover:bg-magenta hover:text-white transition disabled:opacity-40 disabled:hover:bg-lilas/15 disabled:hover:text-lilas-esc"
                >
                  @{h}
                </button>
              ))}
            </div>
          )}

          {/* palestrantes e marcas — clica e carrega as @ */}
          {marcBase.length > 0 && (
            <div className="mt-3 rounded-xl border border-lavanda bg-branco p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-azul-suave">Palestrantes e marcas — clique pra marcar</span>
                {colabList.length > 0 && (
                  <button type="button" onClick={() => setColabs("")} className="text-[11px] font-semibold text-magenta hover:underline">limpar</button>
                )}
              </div>
              {["Palestrantes", "Marcas parceiras"].map((grupo) => (
                <div key={grupo} className="mb-1.5 last:mb-0">
                  <div className="text-[10px] uppercase tracking-wide text-lilas-esc font-bold mb-1">{grupo}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {marcBase.filter((m) => m.grupo === grupo).map((m) => {
                      const jaTem = m.handles.every((h) => colabList.includes(h));
                      return (
                        <button
                          key={m.nome}
                          type="button"
                          onClick={() => carregarMarcacao(m.handles)}
                          disabled={colabList.length >= 3 && !jaTem}
                          title={m.handles.map((h) => "@" + h).join(" ")}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full transition disabled:opacity-40
                            ${jaTem ? "bg-magenta text-white" : "bg-white border border-lavanda text-azul hover:border-magenta hover:text-magenta"}`}
                        >
                          {jaTem ? "✓ " : ""}{m.nome}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tipo === "reels" && (
        <label className="flex items-center gap-2 text-sm text-azul-suave mt-4">
          <input type="checkbox" checked={compartilharFeed} onChange={(e) => setCompartilharFeed(e.target.checked)} />
          Também mostrar no feed
        </label>
      )}

      {/* agendar */}
      <div className="mt-5 rounded-2xl border border-lavanda bg-white p-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-azul">
          <input type="checkbox" checked={agendar} onChange={(e) => setAgendar(e.target.checked)} />
          🗓️ Agendar para depois
        </label>
        {agendar && (
          <input
            type="datetime-local"
            value={quando}
            onChange={(e) => setQuando(e.target.value)}
            className="mt-3 w-full rounded-xl bg-branco border border-lavanda px-4 py-2.5 outline-none focus:border-lilas text-azul"
          />
        )}
      </div>

      <button
        onClick={enviar}
        disabled={!podeEnviar}
        className="w-full rounded-2xl bg-verde hover:bg-verde-bright text-white font-bold py-4 disabled:opacity-40 mt-5 transition text-[15px]"
      >
        {enviando ? (agendar ? "Agendando…" : "Publicando…") : agendar ? "Agendar publicação" : "Publicar agora"}
      </button>
      {enviando && !agendar && (tipo === "carrossel" || tipo === "reels" || (tipo === "stories" && prontos[0]?.tipo === "video")) && (
        <p className="text-center text-xs text-azul-suave mt-2">Aguarde — a Meta processa cada mídia, pode levar até ~1 min. Não feche a página.</p>
      )}

      {resultado && (
        <div className={`mt-4 rounded-xl p-4 text-sm ${resultado.ok ? "bg-verde/12 text-verde" : "bg-magenta/12 text-magenta"}`}>
          {resultado.msg}
          {resultado.link && (
            <> <a href={resultado.link} target="_blank" className="underline font-semibold">ver post</a></>
          )}
        </div>
      )}

      {bibAberta && (
        <div className="fixed inset-0 z-50 bg-azul/40 flex items-end sm:items-center justify-center p-3" onClick={() => setBibAberta(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[82vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-lavanda">
              <h3 className="font-serif text-lg text-azul">Biblioteca de mídia</h3>
              <button onClick={() => setBibAberta(false)} className="text-azul-suave text-2xl leading-none">×</button>
            </div>
            <div className="p-3 border-b border-lavanda">
              <input value={bibBusca} onChange={(e) => setBibBusca(e.target.value)} placeholder="Buscar por nome…" className="w-full rounded-lg bg-branco border border-lavanda px-3 py-2 text-sm outline-none focus:border-lilas text-azul" />
            </div>
            <div className="p-3 overflow-y-auto grid grid-cols-3 gap-2">
              {bibLoading && <p className="col-span-3 text-sm text-azul-suave p-4 text-center">Carregando biblioteca…</p>}
              {!bibLoading && bibFiltrada.length === 0 && <p className="col-span-3 text-sm text-azul-suave p-4 text-center">Nada encontrado.</p>}
              {bibFiltrada.map((it) => {
                const sel = midia.some((x) => x.url === it.url);
                return (
                  <button key={it.url} type="button" onClick={() => adicionarDaBiblioteca(it)} title={it.nome} style={{ aspectRatio: "1 / 1" }} className={`relative block w-full rounded-lg overflow-hidden border ${sel ? "border-magenta ring-2 ring-magenta" : "border-lavanda hover:border-lilas"}`}>
                    {it.tipo === "video"
                      ? <video src={it.url} className="absolute inset-0 w-full h-full object-cover" muted />
                      // eslint-disable-next-line @next/next/no-img-element
                      : <img src={it.url} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />}
                    {sel && <span className="absolute top-1 right-1 bg-magenta text-white rounded-full w-5 h-5 text-xs grid place-items-center z-10">✓</span>}
                  </button>
                );
              })}
            </div>
            {tipo === "carrossel" && (
              <div className="p-3 border-t border-lavanda">
                <button onClick={() => setBibAberta(false)} className="w-full rounded-lg bg-verde hover:bg-verde-bright text-white font-bold py-2.5 transition">Pronto ({midia.length} selecionada{midia.length === 1 ? "" : "s"})</button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
