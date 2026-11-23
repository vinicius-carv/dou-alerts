import { useState } from "react";
import { Alert, Button, StyleSheet, Text, View } from "react-native";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

export default function Account() {
  const { data: session } = authClient.useSession();
  const [error, setError] = useState("");

  function confirmDelete() {
    Alert.alert("Excluir conta", "Isso apaga sua conta e todos os alertas. Essa ação não pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await api("/api/account", { method: "DELETE" });
            await authClient.signOut();
          } catch (e) {
            setError((e as Error).message);
          }
        },
      },
    ]);
  }

  return (
    <View style={s.box}>
      <Text>Conectado como {session?.user.email}</Text>
      <Button title="Sair" onPress={() => authClient.signOut()} />
      <Button title="Excluir conta" color="#b00020" onPress={confirmDelete} />
      {!!error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({ box: { flex: 1, padding: 16, gap: 12 }, error: { color: "#b00020" } });
