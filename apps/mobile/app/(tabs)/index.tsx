import { useCallback, useState } from "react";
import { Button, FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { api } from "@/lib/api";

type Alert = { id: string; phrase: string };

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setAlerts((await api<{ alerts: Alert[] }>("/api/alerts")).alerts);
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

  return (
    <View style={s.box}>
      <TextInput style={s.input} placeholder="Palavra ou expressão a monitorar" value={phrase} onChangeText={setPhrase} />
      <Button title="Adicionar alerta" onPress={add} disabled={!phrase.trim()} />
      {!!error && <Text style={s.error}>{error}</Text>}
      <FlatList
        data={alerts}
        keyExtractor={(a) => a.id}
        ListEmptyComponent={<Text>Nenhum alerta cadastrado.</Text>}
        renderItem={({ item }) => (
          <View style={s.row}>
            <Text style={s.phrase}>{item.phrase}</Text>
            <Button title="Remover" color="#b00020" onPress={() => remove(item.id)} />
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  box: { flex: 1, padding: 16, gap: 10 },
  input: { borderWidth: 1, borderColor: "#aaa", borderRadius: 8, padding: 10, fontSize: 16 },
  error: { color: "#b00020" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  phrase: { fontSize: 16, flex: 1 },
});
