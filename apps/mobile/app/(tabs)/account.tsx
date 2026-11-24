import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { c, font, ui } from "@/lib/theme";

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
    <View style={[ui.screen, s.box]}>
      <View style={{ gap: 4 }}>
        <Text style={ui.soft}>Conectado como</Text>
        <Text style={s.email}>{session?.user.email}</Text>
      </View>
      <Pressable style={ui.button} onPress={() => authClient.signOut()}>
        <Text style={ui.buttonText}>Sair</Text>
      </Pressable>
      <View style={s.danger}>
        <Text style={ui.soft}>Excluir a conta apaga todos os seus alertas e não pode ser desfeito.</Text>
        <Pressable onPress={confirmDelete} hitSlop={8}>
          <Text style={s.delete}>Excluir conta</Text>
        </Pressable>
      </View>
      {!!error && <Text style={ui.error}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  box: { padding: 16, gap: 20 },
  email: { fontFamily: font.serif, fontSize: 20, color: c.ink },
  danger: { borderTopWidth: 1, borderTopColor: c.rule, paddingTop: 16, gap: 8 },
  delete: { fontFamily: font.sansBold, fontSize: 14, color: c.alert, textDecorationLine: "underline" },
});
