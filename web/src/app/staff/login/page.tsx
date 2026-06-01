"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStaffAuth } from "@/components/staff/StaffAuthProvider";

export default function StaffLoginPage() {
  const { login } = useStaffAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      router.push("/staff");
    } catch {
      setError("Email o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-gold text-center">Acceso personal</h1>
        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" required placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input id="password" type="password" className="input" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Ingresando..." : "Iniciar sesión"}
        </button>
      </form>
    </div>
  );
}
