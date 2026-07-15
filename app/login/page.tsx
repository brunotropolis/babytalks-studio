"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro("");
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha }),
    });
    setLoading(false);
    if (r.ok) router.push("/");
    else setErro("Senha incorreta");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={entrar} className="w-full max-w-sm bg-white border border-lavanda rounded-3xl p-9 shadow-[0_20px_50px_rgba(31,42,86,.08)]">
        <div className="text-center mb-7">
          <span className="inline-block text-[11px] tracking-[2.5px] uppercase text-magenta font-bold mb-2">Baby Talks</span>
          <h1 className="font-serif text-3xl text-azul leading-tight">Studio</h1>
          <p className="text-sm text-azul-suave mt-2">Publicar no @babytalks.evento</p>
        </div>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Senha"
          className="w-full rounded-xl bg-branco border border-lavanda px-4 py-3 outline-none focus:border-lilas text-azul"
          autoFocus
        />
        {erro && <p className="text-magenta text-sm mt-2">{erro}</p>}
        <button
          disabled={loading}
          className="mt-4 w-full rounded-xl bg-verde hover:bg-verde-bright text-white font-bold py-3 disabled:opacity-50 transition"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
