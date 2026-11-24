import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { api } from "./api";

export async function registerPush(): Promise<void> {
  // Needs an EAS projectId (owner Expo account); without it push is skipped.
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.warn("registerPush: extra.eas.projectId missing, push notifications disabled");
    return;
  }
  // Android 13+ only shows the permission prompt once a channel exists.
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Alertas",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await api("/api/push-token", { method: "POST", body: JSON.stringify({ token }) });
}
