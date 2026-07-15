"use client";
import { useState } from "react";
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

  const colabList = colabs.split(/[\s,]+/).map((s) => s.replace(/^@/, "").trim()).filter(Boolean).slice(0, 3);
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
    const j = await r.json();
    setEnviando(false);
    if (j.ok && j.agendado) {
      setResultado({ ok: true, msg: "Agendado! 🗓️ Aparece na lista de agendados." });
      limpar();
    } else if (j.ok) {
      setResultado({ ok: true, msg: "Publicado! 🎉", link: j.permalink });
      limpar();
    } else {
      setResultado({ ok: false, msg: j.erro || "Falha ao publicar" });
    }
  }

  function limpar() {
    setMidia([]); setLegenda(""); setColabs(""); setQuando(""); setAgendar(false);
  }

  return (
    <main className="min-h-screen max-w-2xl mx-auto p-6">
      <header className="flex items-end justify-between mb-7">
        <div>
          <span className="text-[11px] tracking-[2.5px] uppercase text-magenta font-bold">Baby Talks</span>
          <h1 className="font-serif text-3xl text-azul leading-tight">Studio</h1>
          <p className="text-sm text-azul-suave">Publicar no @babytalks.evento</p>
        </div>
        <Link href="/agendados" className="text-sm font-semibold text-lilas-esc hover:text-magenta whitespace-nowrap">
          Agendados →
        </Link>
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
        <label className="w-24 h-24 rounded-xl border-2 border-dashed border-lilas-claro grid place-items-center cursor-pointer text-lilas-esc hover:border-magenta hover:text-magenta transition">
          <span className="text-2xl">+</span>
          <input type="file" accept={aceita} multiple={multiplo} className="hidden" onChange={(e) => onEscolher(e.target.files)} />
        </label>
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
        {enviando ? "Enviando…" : agendar ? "Agendar publicação" : "Publicar agora"}
      </button>

      {resultado && (
        <div className={`mt-4 rounded-xl p-4 text-sm ${resultado.ok ? "bg-verde/12 text-verde" : "bg-magenta/12 text-magenta"}`}>
          {resultado.msg}
          {resultado.link && (
            <> <a href={resultado.link} target="_blank" className="underline font-semibold">ver post</a></>
          )}
        </div>
      )}
    </main>
  );
}
