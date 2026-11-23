import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { authClient } from "@/lib/auth-client";
import { registerPush } from "@/lib/push";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export default function RootLayout() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) registerPush().catch((e) => console.warn("registerPush failed", e));
  }, [session]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => router.navigate("/matches"));
    return () => sub.remove();
  }, [router]);

  if (isPending) return null;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}
