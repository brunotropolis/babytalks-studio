"use client";
import { useState } from "react";

type Tipo = "imagem" | "carrossel" | "reels";
type Midia = { url: string; tipo: "imagem" | "video"; nome: string; enviando?: boolean };

const TIPOS: { id: Tipo; label: string; dica: string }[] = [
  { id: "imagem", label: "Foto", dica: "1 imagem" },
  { id: "carrossel", label: "Carrossel", dica: "2 a 10 fotos/vídeos" },
  { id: "reels", label: "Reels", dica: "1 vídeo" },
];

export default function Studio() {
  const [tipo, setTipo] = useState<Tipo>("imagem");
  const [midia, setMidia] = useState<Midia[]>([]);
  const [legenda, setLegenda] = useState("");
  const [colabs, setColabs] = useState("");
  const [compartilharFeed, setCompartilharFeed] = useState(true);
  const [publicando, setPublicando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; msg: string; link?: string } | null>(null);

  const aceita = tipo === "reels" ? "video/*" : tipo === "imagem" ? "image/*" : "image/*,video/*";
  const multiplo = tipo === "carrossel";

  async function onEscolher(files: FileList | null) {
    if (!files?.length) return;
    setResultado(null);
    const arr = Array.from(files);
    for (const f of arr) {
      const placeholder: Midia = { url: "", tipo: f.type.startsWith("video") ? "video" : "imagem", nome: f.name, enviando: true };
      setMidia((m) => (tipo === "carrossel" ? [...m, placeholder] : [placeholder]));
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json();
      setMidia((m) =>
        m.map((x) => (x.nome === f.name && x.enviando ? { url: j.url, tipo: j.tipo, nome: f.name } : x)),
      );
    }
  }

  function remover(nome: string) {
    setMidia((m) => m.filter((x) => x.nome !== nome));
  }

  const colabList = colabs.split(/[\s,]+/).map((s) => s.replace(/^@/, "").trim()).filter(Boolean).slice(0, 3);
  const prontos = midia.filter((m) => m.url && !m.enviando);
  const podePublicar =
    !publicando &&
    prontos.length > 0 &&
    (tipo !== "carrossel" || prontos.length >= 2) &&
    (tipo !== "reels" || prontos[0]?.tipo === "video");

  async function publicar() {
    setPublicando(true);
    setResultado(null);
    const r = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo,
        legenda,
        colaboradores: colabList,
        compartilharFeed,
        midia: prontos.map((m) => ({ url: m.url, tipo: m.tipo })),
      }),
    });
    const j = await r.json();
    setPublicando(false);
    if (j.ok) {
      setResultado({ ok: true, msg: "Publicado! 🎉", link: j.permalink });
      setMidia([]);
      setLegenda("");
      setColabs("");
    } else {
      setResultado({ ok: false, msg: j.erro || "Falha ao publicar" });
    }
  }

  return (
    <main className="min-h-screen max-w-2xl mx-auto p-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Baby Talks Studio</h1>
          <p className="text-sm text-white/50">Publicar no @babytalks.evento</p>
        </div>
      </header>

      {/* tipo */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {TIPOS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTipo(t.id); setMidia([]); setResultado(null); }}
            className={`rounded-xl border px-3 py-3 text-left ${tipo === t.id ? "border-accent bg-accent/10" : "border-white/10 bg-white/5"}`}
          >
            <div className="font-medium">{t.label}</div>
            <div className="text-xs text-white/50">{t.dica}</div>
          </button>
        ))}
      </div>

      {/* mídia */}
      <label className="block mb-2 text-sm text-white/70">Mídia</label>
      <div className="flex flex-wrap gap-3 mb-3">
        {midia.map((m) => (
          <div key={m.nome} className="relative w-24 h-24 rounded-lg overflow-hidden border border-white/10 bg-black/30">
            {m.enviando ? (
              <div className="w-full h-full grid place-items-center text-xs text-white/50">enviando…</div>
            ) : m.tipo === "video" ? (
              <video src={m.url} className="w-full h-full object-cover" muted />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt="" className="w-full h-full object-cover" />
            )}
            <button onClick={() => remover(m.nome)} className="absolute top-1 right-1 bg-black/70 rounded-full w-5 h-5 text-xs leading-5">×</button>
          </div>
        ))}
        <label className="w-24 h-24 rounded-lg border border-dashed border-white/20 grid place-items-center cursor-pointer text-white/50 hover:border-accent">
          <span className="text-2xl">+</span>
          <input type="file" accept={aceita} multiple={multiplo} className="hidden" onChange={(e) => onEscolher(e.target.files)} />
        </label>
      </div>

      {/* legenda */}
      <label className="block mb-2 text-sm text-white/70">Legenda</label>
      <textarea
        value={legenda}
        onChange={(e) => setLegenda(e.target.value)}
        rows={5}
        placeholder="Escreva a legenda…"
        className="w-full rounded-lg bg-black/30 border border-white/10 px-4 py-3 outline-none focus:border-accent mb-4"
      />

      {/* colabs */}
      <label className="block mb-2 text-sm text-white/70">Colaboradores (collab) — até 3, separados por espaço</label>
      <input
        value={colabs}
        onChange={(e) => setColabs(e.target.value)}
        placeholder="@marca1 @parceiro2"
        className="w-full rounded-lg bg-black/30 border border-white/10 px-4 py-3 outline-none focus:border-accent mb-1"
      />
      {colabList.length > 0 && (
        <p className="text-xs text-white/40 mb-4">Convite de collab para: {colabList.map((c) => "@" + c).join(", ")}</p>
      )}

      {tipo === "reels" && (
        <label className="flex items-center gap-2 text-sm text-white/70 mb-4 mt-3">
          <input type="checkbox" checked={compartilharFeed} onChange={(e) => setCompartilharFeed(e.target.checked)} />
          Também mostrar no feed
        </label>
      )}

      <button
        onClick={publicar}
        disabled={!podePublicar}
        className="w-full rounded-xl bg-accent text-ink font-semibold py-3.5 disabled:opacity-40 mt-2"
      >
        {publicando ? "Publicando…" : "Publicar agora"}
      </button>

      {resultado && (
        <div className={`mt-4 rounded-lg p-4 text-sm ${resultado.ok ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300"}`}>
          {resultado.msg}
          {resultado.link && (
            <>
              {" "}
              <a href={resultado.link} target="_blank" className="underline">ver post</a>
            </>
          )}
        </div>
      )}
    </main>
  );
}
