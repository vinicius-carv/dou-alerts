import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authClient } from "@/lib/auth-client";
import { Marked } from "@/lib/marked";
import { c, font, ui } from "@/lib/theme";

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
    <SafeAreaView style={ui.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.box} keyboardShouldPersistTaps="handled">
          <Text style={s.wordmark}>
            DOU <Text style={s.mark}>Alertas</Text>
          </Text>
          <Text style={s.h1}>Saiba quando o Diário Oficial falar de você</Text>
          <Text style={[ui.body, s.lead]}>
            Cadastre nomes, CNPJs ou expressões. Todo dia avisamos quando algum ato da União citar um deles.
          </Text>

          {!sent ? (
            <View style={s.form}>
              <Text style={s.label}>E-mail</Text>
              <TextInput style={ui.input} placeholder="voce@exemplo.com" placeholderTextColor={c.inkSoft} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
              <Pressable style={[ui.button, !email.trim() && s.off]} onPress={send} disabled={!email.trim()}>
                <Text style={ui.buttonText}>Enviar código</Text>
              </Pressable>
            </View>
          ) : (
            <View style={s.form}>
              <Text style={ui.body}>Enviamos um código de 6 dígitos para {email.trim()}.</Text>
              <Text style={s.label}>Código</Text>
              <TextInput style={[ui.input, s.code]} placeholder="000000" placeholderTextColor={c.inkSoft} keyboardType="number-pad" maxLength={6} value={otp} onChangeText={setOtp} />
              <Pressable style={[ui.button, otp.trim().length !== 6 && s.off]} onPress={verify} disabled={otp.trim().length !== 6}>
                <Text style={ui.buttonText}>Entrar</Text>
              </Pressable>
              <Pressable onPress={() => { setSent(false); setOtp(""); setError(""); }}>
                <Text style={ui.link}>Usar outro e-mail</Text>
              </Pressable>
            </View>
          )}
          {!!error && <Text style={ui.error}>{error}</Text>}

          <View style={s.sample}>
            <Text style={ui.soft}>Seção 3 · Ministério da Fazenda</Text>
            <Text style={s.sampleTitle}>EXTRATO DE CONTRATO Nº 42/2026</Text>
            <Text style={s.sampleBody}>
              <Marked text="Contratada: Exemplo Serviços Ltda., CNPJ 12.345.678/0001-90, para prestação de serviços de tecnologia da informação." phrase="12.345.678/0001-90" />
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  box: { padding: 24, paddingTop: 40, gap: 14 },
  wordmark: { fontFamily: font.serifBold, fontSize: 20, color: c.ink },
  mark: { backgroundColor: c.marker },
  h1: { fontFamily: font.serifBold, fontSize: 31, lineHeight: 40, color: c.ink, marginTop: 12 },
  lead: { lineHeight: 24, color: c.inkSoft },
  form: { gap: 10, marginTop: 8 },
  label: { fontFamily: font.sansBold, fontSize: 14, color: c.ink },
  code: { letterSpacing: 6, fontSize: 20 },
  off: { opacity: 0.45 },
  sample: { borderTopWidth: 1, borderTopColor: c.rule, marginTop: 24, paddingTop: 16, gap: 6 },
  sampleTitle: { fontFamily: font.serifBold, fontSize: 16, color: c.ink },
  sampleBody: { fontFamily: font.serif, fontSize: 16, lineHeight: 26, color: c.ink },
});
