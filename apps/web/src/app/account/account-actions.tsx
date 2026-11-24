"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function AccountActions() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  async function deleteAccount() {
    setError("");
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) return setError("Não foi possível excluir a conta. Tente de novo em instantes.");
      router.push("/login");
      router.refresh();
    } catch {
      setError("Sem conexão com o servidor. Verifique sua internet e tente de novo.");
    }
  }

  return (
    <>
      <section className="panel" aria-labelledby="session-heading">
        <h2 id="session-heading">Sessão</h2>
        <p>Sair deste navegador. Seus alertas continuam ativos.</p>
        <div className="actions">
          <button type="button" className="secondary" onClick={signOut}>Sair</button>
        </div>
      </section>
      <section className="panel" aria-labelledby="delete-heading">
        <h2 id="delete-heading">Excluir conta</h2>
        <p>Apaga sua conta, seus alertas e os atos encontrados. Não dá para desfazer.</p>
        {!confirming ? (
          <div className="actions">
            <button type="button" className="danger" onClick={() => setConfirming(true)}>Excluir conta</button>
          </div>
        ) : (
          <div role="group" aria-label="Confirmar exclusão" className="actions">
            <button type="button" className="danger" onClick={deleteAccount}>Sim, excluir minha conta</button>
            <button type="button" className="secondary" onClick={() => setConfirming(false)}>Cancelar</button>
          </div>
        )}
        {error && <p role="alert" className="error">{error}</p>}
      </section>
    </>
  );
}
