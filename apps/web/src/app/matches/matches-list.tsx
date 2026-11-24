"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { highlight } from "@/lib/highlight";

type Match = {
  phrase: string;
  createdAt: string;
  act: { slug: string; title: string; organ: string; section: string; pubDate: string; excerpt: string; url: string };
};

const dayOf = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "numeric", month: "long" });

// The DOU API names sections "DO1".."DO3"; anything else is shown as published.
const sectionLabel = (s: string) => (/^DO\d$/.test(s) ? `Seção ${s.slice(2)}` : s);

function Marked({ text, phrase }: { text: string; phrase: string }) {
  return highlight(text, phrase).map((s, i) => (s.mark ? <mark key={i}>{s.text}</mark> : s.text));
}

export default function MatchesList() {
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/matches")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setMatches(d.matches ?? []))
      .catch(() => setError("Não foi possível carregar os atos. Recarregue a página para tentar de novo."));
  }, []);

  if (error) return <p role="alert" className="error">{error}</p>;
  if (!matches) return <p className="muted">Carregando atos…</p>;
  if (matches.length === 0)
    return (
      <div className="empty">
        <h2>Nenhum ato encontrado ainda</h2>
        <p>A busca roda toda manhã. Quando uma expressão sua aparecer no Diário Oficial, o ato surge aqui.</p>
        <p><Link href="/">Revise suas expressões</Link></p>
      </div>
    );

  const phrases = [...new Set(matches.map((m) => m.phrase))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const visible = selected.size ? matches.filter((m) => selected.has(m.phrase)) : matches;
  const toggle = (p: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (!next.delete(p)) next.add(p);
      return next;
    });

  // The API returns newest first, so insertion order keeps days descending.
  const groups = new Map<string, Match[]>();
  for (const m of visible) {
    const day = dayOf(m.createdAt);
    groups.set(day, [...(groups.get(day) ?? []), m]);
  }

  return (
    <>
      {phrases.length > 1 && (
        <div className="chips" role="group" aria-label="Filtrar por expressão">
          {phrases.map((p) => (
            <button key={p} type="button" aria-pressed={selected.has(p)} onClick={() => toggle(p)}>
              {p}
            </button>
          ))}
        </div>
      )}
      <p className="muted result-count" aria-live="polite">
        {visible.length === 1 ? "1 ato" : `${visible.length} atos`}
      </p>
      {[...groups].map(([day, items]) => (
        <section key={day} className="day">
          <h2>{day}</h2>
          <ul className="acts">
            {items.map((m) => (
              <li key={`${m.act.slug}-${m.phrase}`} className="act">
                <p className="act-meta">
                  {sectionLabel(m.act.section)} · {m.act.organ}
                </p>
                <h3 className="act-title">{m.act.title}</h3>
                <p className="act-excerpt"><Marked text={m.act.excerpt} phrase={m.phrase} /></p>
                <p className="act-foot">
                  <a href={m.act.url} target="_blank" rel="noopener noreferrer">
                    Ler no DOU<span className="visually-hidden"> (abre em nova aba)</span>
                  </a>
                  <span className="muted">Publicado em {m.act.pubDate} · Alerta: {m.phrase}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
