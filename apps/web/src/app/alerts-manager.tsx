"use client";

import { useEffect, useState } from "react";

type Alert = { id: string; phrase: string; createdAt: string };

export default function AlertsManager() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((d) => setAlerts(d.alerts ?? []))
      .catch(() => setError("Não foi possível carregar os alertas."));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phrase }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error ?? "Não foi possível adicionar o alerta.");
    setAlerts((a) => [data.alert, ...(a ?? [])]);
    setPhrase("");
  }

  async function remove(id: string) {
    const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    if (res.ok) setAlerts((a) => (a ?? []).filter((x) => x.id !== id));
    else setError("Não foi possível remover o alerta.");
  }

  return (
    <>
      <form onSubmit={add} className="row">
        <label>
          Nova expressão
          <input value={phrase} onChange={(e) => setPhrase(e.target.value)} required />
        </label>
        <button type="submit">Adicionar</button>
      </form>
      {error && <p role="alert" className="error">{error}</p>}
      {alerts && alerts.length === 0 && <p>Você ainda não tem alertas.</p>}
      <ul className="list">
        {(alerts ?? []).map((a) => (
          <li key={a.id}>
            <span>{a.phrase}</span>
            <button type="button" onClick={() => remove(a.id)} aria-label={`Remover ${a.phrase}`}>
              Remover
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
