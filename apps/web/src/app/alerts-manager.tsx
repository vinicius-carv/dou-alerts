"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Alert = { id: string; phrase: string; createdAt: string };
type Match = { phrase: string; createdAt: string };

const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
const NETWORK_ERROR = "Sem conexão com o servidor. Verifique sua internet e tente de novo.";

// shortcut: GET /api/matches returns at most the latest 100 matches, so counts can undercount; add a counts endpoint if that matters.
function countRecent(matches: Match[]): Map<string, number> {
  const since = Date.now() - NINETY_DAYS;
  const counts = new Map<string, number>();
  for (const m of matches)
    if (new Date(m.createdAt).getTime() >= since) counts.set(m.phrase, (counts.get(m.phrase) ?? 0) + 1);
  return counts;
}

export default function AlertsManager() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [counts, setCounts] = useState<Map<string, number> | null>(null);
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setAlerts(d.alerts ?? []))
      .catch(() => setError("Não foi possível carregar os alertas. Recarregue a página para tentar de novo."));
    // Counts are a nicety: if they fail, the list still works without them.
    fetch("/api/matches")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setCounts(countRecent(d.matches ?? [])))
      .catch(() => {});
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phrase }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? "Não foi possível adicionar o alerta.");
      setAlerts((a) => [data.alert, ...(a ?? [])]);
      setPhrase("");
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  async function remove(a: Alert) {
    setError("");
    try {
      const res = await fetch(`/api/alerts/${a.id}`, { method: "DELETE" });
      if (!res.ok) return setError(`Não foi possível remover “${a.phrase}”. Tente de novo.`);
      setAlerts((list) => (list ?? []).filter((x) => x.id !== a.id));
    } catch {
      setError(NETWORK_ERROR);
    }
  }

  const countLabel = (p: string) => {
    if (!counts) return null;
    const n = counts.get(p) ?? 0;
    if (n === 0) return "Nenhum ato nos últimos 90 dias";
    return <Link href="/matches">{n === 1 ? "1 ato" : `${n} atos`} nos últimos 90 dias</Link>;
  };

  return (
    <>
      <form onSubmit={add} className="add-form">
        <div className="field">
          <label htmlFor="phrase">Nova expressão</label>
          <input
            id="phrase"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            aria-describedby="phrase-hint"
            required
          />
        </div>
        <button type="submit" disabled={busy}>Adicionar</button>
      </form>
      <p id="phrase-hint" className="hint">Um CNPJ, um nome ou um tema, como “licitação TI”. Acentos e maiúsculas não importam.</p>
      {error && <p role="alert" className="error">{error}</p>}
      {alerts === null && !error && <p className="muted empty">Carregando alertas…</p>}
      {alerts?.length === 0 && (
        <div className="empty">
          <h2>Adicione uma expressão para começar</h2>
          <p>Assim que ela aparecer em um ato publicado, você recebe o resumo do dia por e-mail.</p>
        </div>
      )}
      {alerts && alerts.length > 0 && (
        <ul className="terms" aria-label="Expressões monitoradas">
          {alerts.map((a) => (
            <li key={a.id}>
              <div>
                <mark className="term">{a.phrase}</mark>
                <span className="term-count">{countLabel(a.phrase)}</span>
              </div>
              <button type="button" className="quiet" onClick={() => remove(a)} aria-label={`Remover ${a.phrase}`}>
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
