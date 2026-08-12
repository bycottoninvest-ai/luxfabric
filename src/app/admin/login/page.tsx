"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/admin";
  const [email, setEmail] = useState("admin@luxfabricshop.uz");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Kirish amalga oshmadi");
        return;
      }
      router.replace(next.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <div>
        <label className="mb-1.5 block text-xs text-white/50" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-lf-red"
          required
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs text-white/50" htmlFor="password">
          Parol
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-lf-red"
          required
        />
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-lf-red py-2.5 text-sm font-semibold disabled:opacity-60"
      >
        {loading ? "Kirilmoqda…" : "Kirish"}
      </button>
      <p className="text-center text-[11px] text-white/35">
        Parol: Vercel / `.env` dagi <span className="text-white/55">ADMIN_PASSWORD</span>
      </p>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070707] px-4 text-white">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center">
          <Image
            src="/brand/luxfabric-logo-on-dark.png"
            alt="LUXFABRIC"
            width={180}
            height={76}
            className="h-12 w-auto"
            priority
          />
          <p className="mt-3 text-[10px] uppercase tracking-[0.25em] text-white/40">
            Admin kirish
          </p>
        </div>
        <Suspense fallback={<p className="mt-8 text-center text-sm text-white/40">…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
