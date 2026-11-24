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
  const [busy, setBusy] = useState(false);

  async function requestLink(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await authClient.signIn.magicLink({ email, callbackURL: "/" });
    setBusy(false);
    if (error) setError("Não foi possível enviar o e-mail. Confira o endereço e tente de novo.");
    else setSent(true);
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await authClient.signIn.emailOtp({ email, otp: code });
    setBusy(false);
    if (error) setError("Código inválido ou expirado. Peça um novo código se precisar.");
    else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <main className="wide">
      <div className="login">
        <div className="login-intro">
          <h1>Saiba quando o Diário Oficial falar de você</h1>
          <p>
            Cadastre um CNPJ, um nome ou um tema. Toda manhã lemos o Diário Oficial da União e mandamos por e-mail
            os atos que citam suas expressões, já marcados.
          </p>
          {!sent ? (
            <form onSubmit={requestLink}>
              <div>
                <label htmlFor="email">E-mail</label>
                <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                <p className="hint">Sem senha: enviamos um link e um código de acesso.</p>
              </div>
              <div><button type="submit" disabled={busy}>Receber link de acesso</button></div>
            </form>
          ) : (
            <form onSubmit={verifyCode}>
              <p>Enviamos um código e um link para <strong>{email}</strong>. Abra o link ou digite o código abaixo.</p>
              <div>
                <label htmlFor="code">Código de 6 dígitos</label>
                <input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <div className="actions">
                <button type="submit" disabled={busy}>Entrar</button>
                <button type="button" className="secondary" onClick={() => { setSent(false); setCode(""); setError(""); }}>
                  Usar outro e-mail
                </button>
              </div>
            </form>
          )}
          {error && <p role="alert" className="error">{error}</p>}
        </div>

        <figure className="login-sample" aria-label="Exemplo de ato encontrado">
          <article className="clipping">
            <p className="clipping-meta">Seção 3 · Universidade Federal do Vale Sereno/Pró-Reitoria de Administração</p>
            <h2>EXTRATO DE CONTRATO Nº 48/2026</h2>
            <p>
              Processo nº 23001.004512/2026-17. Contratante: Universidade Federal do Vale Sereno. Contratada: Horizonte
              Azul Soluções em Tecnologia Ltda., CNPJ <mark>12.345.678/0001-90</mark>. Objeto: prestação de serviços de
              suporte técnico e manutenção de rede.
            </p>
            <p>Vigência: 12 meses a partir da assinatura. Valor global: R$ 418.300,00.</p>
          </article>
          <figcaption className="clipping-caption">Exemplo ilustrativo: órgão, empresa e CNPJ fictícios.</figcaption>
        </figure>
      </div>
    </main>
  );
}
