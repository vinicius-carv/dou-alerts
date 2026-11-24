import { useCallback, useState } from "react";
import { Linking, Pressable, ScrollView, SectionList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { api } from "@/lib/api";
import { Marked } from "@/lib/marked";
import { c, font, ui } from "@/lib/theme";

type Match = {
  phrase: string;
  act: { slug: string; title: string; organ: string; section: string; pubDate: string; excerpt: string; url: string };
  createdAt: string;
};

const dayOf = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "full" });

export default function Matches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      api<{ matches: Match[] }>("/api/matches").then((r) => setMatches(r.matches), (e) => setError(e.message));
    }, []),
  );

  const phrases = [...new Set(matches.map((m) => m.phrase))];
  const shown = filter && phrases.includes(filter) ? matches.filter((m) => m.phrase === filter) : matches;
  // The API returns newest first, so insertion order keeps days descending.
  const days = new Map<string, Match[]>();
  for (const m of shown) days.set(dayOf(m.createdAt), [...(days.get(dayOf(m.createdAt)) ?? []), m]);
  const sections = [...days].map(([title, data]) => ({ title, data }));

  return (
    <View style={ui.screen}>
      {!!error && <Text style={[ui.error, s.pad]}>{error}</Text>}
      {phrases.length > 1 && (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            {phrases.map((p) => {
              const on = filter === p;
              return (
                <Pressable key={p} onPress={() => setFilter(on ? null : p)} style={[s.chip, on && s.chipOn]} accessibilityState={{ selected: on }}>
                  <Text style={[s.chipText, on && { color: c.paper }]}>{p}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
      <SectionList
        sections={sections}
        contentContainerStyle={s.pad}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => <Text style={s.day}>{section.title}</Text>}
        keyExtractor={(m) => `${m.phrase}:${m.act.slug}`}
        ListEmptyComponent={<Text style={ui.soft}>Nenhum ato ainda. Adicione uma expressão na aba Alertas.</Text>}
        renderItem={({ item: m }) => (
          <View style={s.act}>
            <Text style={ui.soft}>{m.act.section} · {m.act.organ}</Text>
            <Text style={s.title}>{m.act.title}</Text>
            <Text style={s.excerpt} numberOfLines={4}><Marked text={m.act.excerpt} phrase={m.phrase} /></Text>
            <Pressable onPress={() => Linking.openURL(m.act.url)} hitSlop={8}>
              <Text style={s.read}>Ler no DOU</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  pad: { paddingHorizontal: 16, paddingBottom: 24 },
  chips: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip: { borderWidth: 1, borderColor: c.rule, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#fff" },
  chipOn: { backgroundColor: c.ink, borderColor: c.ink },
  chipText: { fontFamily: font.sans, fontSize: 14, color: c.ink },
  day: { fontFamily: font.serifBold, fontSize: 20, color: c.ink, paddingTop: 20, paddingBottom: 4 },
  act: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.rule, gap: 6 },
  title: { fontFamily: font.serifBold, fontSize: 16, lineHeight: 24, color: c.ink },
  excerpt: { fontFamily: font.serif, fontSize: 16, lineHeight: 26, color: c.ink },
  read: { fontFamily: font.sansBold, fontSize: 14, color: c.seal, textDecorationLine: "underline" },
});
