import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { api } from "@/lib/api";
import { Marked } from "@/lib/marked";
import { c, font, ui } from "@/lib/theme";

type Alert = { id: string; phrase: string };
type Match = { phrase: string; createdAt: string };

const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

// shortcut: GET /api/matches returns only the latest matches, so counts can undercount; add a counts endpoint if that matters.
function countRecent(matches: Match[]): Map<string, number> {
  const since = Date.now() - NINETY_DAYS;
  const counts = new Map<string, number>();
  for (const m of matches) {
    if (new Date(m.createdAt).getTime() >= since) counts.set(m.phrase, (counts.get(m.phrase) ?? 0) + 1);
  }
  return counts;
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [counts, setCounts] = useState<Map<string, number> | null>(null);
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setAlerts((await api<{ alerts: Alert[] }>("/api/alerts")).alerts);
      api<{ matches: Match[] }>("/api/matches").then((r) => setCounts(countRecent(r.matches)), () => {});
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function run(fn: () => Promise<unknown>) {
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const add = () =>
    run(async () => {
      await api("/api/alerts", { method: "POST", body: JSON.stringify({ phrase }) });
      setPhrase("");
    });
  const remove = (id: string) => run(() => api(`/api/alerts/${id}`, { method: "DELETE" }));

  const countLabel = (p: string) => {
    if (!counts) return " ";
    const n = counts.get(p) ?? 0;
    return n === 0 ? "Nenhum ato nos últimos 90 dias" : `${n === 1 ? "1 ato" : `${n} atos`} nos últimos 90 dias`;
  };

  return (
    <View style={[ui.screen, s.box]}>
      <Text style={s.label}>Nova expressão</Text>
      <View style={s.addRow}>
        <TextInput style={[ui.input, { flex: 1 }]} placeholder="Nome, CNPJ ou expressão" placeholderTextColor={c.inkSoft} value={phrase} onChangeText={setPhrase} onSubmitEditing={add} returnKeyType="done" />
        <Pressable style={[ui.button, !phrase.trim() && s.off]} onPress={add} disabled={!phrase.trim()}>
          <Text style={ui.buttonText}>Adicionar</Text>
        </Pressable>
      </View>
      {!!error && <Text style={ui.error}>{error}</Text>}
      <FlatList
        data={alerts ?? []}
        keyExtractor={(a) => a.id}
        style={{ marginTop: 8 }}
        ListEmptyComponent={alerts ? <Text style={[ui.soft, s.empty]}>Adicione uma expressão para começar.</Text> : undefined}
        renderItem={({ item }) => (
          <View style={s.row}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.phrase}><Marked text={item.phrase} phrase={item.phrase} /></Text>
              <Text style={ui.soft}>{countLabel(item.phrase)}</Text>
            </View>
            <Pressable onPress={() => remove(item.id)} hitSlop={8} accessibilityLabel={`Remover ${item.phrase}`}>
              <Text style={s.remove}>Remover</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  box: { padding: 16, gap: 8 },
  label: { fontFamily: font.sansBold, fontSize: 14, color: c.ink },
  addRow: { flexDirection: "row", gap: 8 },
  off: { opacity: 0.45 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.rule },
  phrase: { fontFamily: font.serif, fontSize: 20, color: c.ink, lineHeight: 28 },
  remove: { fontFamily: font.sans, fontSize: 14, color: c.inkSoft, textDecorationLine: "underline" },
  empty: { paddingVertical: 16 },
});
