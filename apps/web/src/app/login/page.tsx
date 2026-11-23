"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function requestLink(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error } = await authClient.signIn.magicLink({ email, callbackURL: "/" });
    if (error) setError("Não foi possível enviar o e-mail. Tente novamente.");
    else setSent(true);
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error } = await authClient.signIn.emailOtp({ email, otp: code });
    if (error) setError("Código inválido ou expirado.");
    else router.push("/");
  }

  return (
    <main>
      <h1>Entrar</h1>
      {!sent ? (
        <form onSubmit={requestLink}>
          <label>
            E-mail
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button type="submit">Enviar</button>
        </form>
      ) : (
        <form onSubmit={verifyCode}>
          <p>Enviamos um código e um link para seu e-mail</p>
          <label>
            Código
            <input inputMode="numeric" pattern="\d{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          <button type="submit">Entrar</button>{" "}
          <button type="button" onClick={() => { setSent(false); setCode(""); setError(""); }}>Usar outro e-mail</button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
