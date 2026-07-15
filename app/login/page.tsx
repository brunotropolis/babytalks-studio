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
      <form onSubmit={entrar} className="w-full max-w-sm bg-ink/60 border border-white/10 rounded-2xl p-8">
        <h1 className="text-xl font-semibold mb-1">Baby Talks Studio</h1>
        <p className="text-sm text-white/50 mb-6">Postagem no @babytalks.evento</p>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Senha"
          className="w-full rounded-lg bg-black/30 border border-white/10 px-4 py-3 outline-none focus:border-accent"
          autoFocus
        />
        {erro && <p className="text-red-400 text-sm mt-2">{erro}</p>}
        <button
          disabled={loading}
          className="mt-4 w-full rounded-lg bg-accent text-ink font-semibold py-3 disabled:opacity-50"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
