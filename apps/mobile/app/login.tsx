import { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";
import { authClient } from "@/lib/auth-client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    setError("");
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "sign-in" });
    if (error) setError(error.message ?? "Não foi possível enviar o código.");
    else setSent(true);
  }

  async function verify() {
    setError("");
    const { error } = await authClient.signIn.emailOtp({ email: email.trim(), otp: otp.trim() });
    if (error) setError(error.message ?? "Código inválido.");
  }

  return (
    <View style={s.box}>
      <Text style={s.title}>DOU Alertas</Text>
      {!sent ? (
        <>
          <TextInput style={s.input} placeholder="Seu e-mail" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Button title="Enviar código" onPress={send} disabled={!email.trim()} />
        </>
      ) : (
        <>
          <Text>Enviamos um código de 6 dígitos para {email}.</Text>
          <TextInput style={s.input} placeholder="Código" keyboardType="number-pad" maxLength={6} value={otp} onChangeText={setOtp} />
          <Button title="Entrar" onPress={verify} disabled={otp.trim().length !== 6} />
          <Button title="Usar outro e-mail" onPress={() => { setSent(false); setOtp(""); }} />
        </>
      )}
      {!!error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  box: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: "#aaa", borderRadius: 8, padding: 10, fontSize: 16 },
  error: { color: "#b00020" },
});
