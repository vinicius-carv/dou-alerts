"use client";

import { useEffect, useState } from "react";

type Match = {
  phrase: string;
  createdAt: string;
  act: { slug: string; title: string; organ: string; excerpt: string; url: string };
};

const dayOf = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "long" });

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/matches")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setMatches(d.matches))
      .catch(() => setError("Não foi possível carregar os atos."));
  }, []);

  // The API returns newest first, so insertion order keeps days descending.
  const groups = new Map<string, Match[]>();
  for (const m of matches ?? []) {
    const day = dayOf(m.createdAt);
    groups.set(day, [...(groups.get(day) ?? []), m]);
  }

  return (
    <main>
      <h1>Atos encontrados</h1>
      {error && <p role="alert" className="error">{error}</p>}
      {matches?.length === 0 && <p>Nenhum ato encontrado até agora.</p>}
      {[...groups].map(([day, items]) => (
        <section key={day}>
          <h2>{day}</h2>
          <ul className="list">
            {items.map((m) => (
              <li key={`${m.act.slug}-${m.phrase}`} className="match">
                <strong>{m.act.title}</strong>
                <span className="muted">{m.act.organ}</span>
                <span className="muted">Alerta: {m.phrase}</span>
                <p>{m.act.excerpt}</p>
                <a href={m.act.url} target="_blank" rel="noopener noreferrer">Ler no DOU</a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
