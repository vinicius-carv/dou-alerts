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
    const res = await fetch("/api/account", { method: "DELETE" });
    if (res.ok) {
      router.push("/login");
      router.refresh();
    } else setError("Não foi possível excluir a conta.");
  }

  return (
    <>
      <p><button type="button" onClick={signOut}>Sair</button></p>
      {!confirming ? (
        <button type="button" className="danger" onClick={() => setConfirming(true)}>Excluir conta</button>
      ) : (
        <div role="group" aria-label="Confirmar exclusão">
          <p>Isso apaga sua conta, seus alertas e os atos encontrados. Não dá para desfazer.</p>
          <button type="button" className="danger" onClick={deleteAccount}>Sim, excluir minha conta</button>{" "}
          <button type="button" onClick={() => setConfirming(false)}>Cancelar</button>
        </div>
      )}
      {error && <p role="alert" className="error">{error}</p>}
    </>
  );
}
