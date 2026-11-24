import { useEffect } from "react";
import { StatusBar } from "react-native";
import { SplashScreen, Stack, useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { useFonts } from "expo-font";
import { Literata_400Regular, Literata_600SemiBold } from "@expo-google-fonts/literata";
import { AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold } from "@expo-google-fonts/atkinson-hyperlegible";
import { authClient } from "@/lib/auth-client";
import { registerPush } from "@/lib/push";
import { c } from "@/lib/theme";

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export default function RootLayout() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const [fontsReady, fontError] = useFonts({
    Literata_400Regular, Literata_600SemiBold, AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold,
  });
  const ready = (fontsReady || !!fontError) && !isPending;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    if (session) registerPush().catch((e) => console.warn("registerPush failed", e));
  }, [session]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => router.navigate("/matches"));
    return () => sub.remove();
  }, [router]);
  if (!ready) return null;
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.paper } }}>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
