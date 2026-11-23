import { useCallback, useState } from "react";
import { Button, Linking, SectionList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { api } from "@/lib/api";

type Match = {
  phrase: string;
  act: { slug: string; title: string; organ: string; section: string; pubDate: string; excerpt: string; url: string };
  createdAt: string;
};

const dayOf = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "long" });

export default function Matches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      api<{ matches: Match[] }>("/api/matches").then((r) => setMatches(r.matches), (e) => setError(e.message));
    }, []),
  );

  // The API returns newest first, so insertion order keeps days descending.
  const days = new Map<string, Match[]>();
  for (const m of matches) days.set(dayOf(m.createdAt), [...(days.get(dayOf(m.createdAt)) ?? []), m]);
  const sections = [...days].map(([title, data]) => ({ title, data }));

  return (
    <View style={s.box}>
      {!!error && <Text style={s.error}>{error}</Text>}
      <SectionList
        sections={sections}
        renderSectionHeader={({ section }) => <Text style={s.day}>{section.title}</Text>}
        keyExtractor={(m) => `${m.phrase}:${m.act.slug}`}
        ListEmptyComponent={<Text>Nenhum resultado ainda.</Text>}
        renderItem={({ item: m }) => (
          <View style={s.card}>
            <Text style={s.phrase}>{m.phrase}</Text>
            <Text style={s.title}>{m.act.title}</Text>
            <Text>{m.act.organ} · {m.act.section} · {m.act.pubDate}</Text>
            <Text numberOfLines={4}>{m.act.excerpt}</Text>
            <Button title="Ler no DOU" onPress={() => Linking.openURL(m.act.url)} />
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  box: { flex: 1, padding: 16 },
  error: { color: "#b00020" },
  card: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, marginBottom: 12, gap: 4 },
  day: { fontSize: 14, fontWeight: "700", paddingVertical: 8, backgroundColor: "#fff" },
  phrase: { color: "#555", fontSize: 12, textTransform: "uppercase" },
  title: { fontSize: 16, fontWeight: "600" },
});
