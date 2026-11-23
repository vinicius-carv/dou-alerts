import { Expo } from "expo-server-sdk";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { pushToken } from "@/db/schema";

export async function sendPush(tokens: string[], body: string): Promise<void> {
  const expo = new Expo();
  const valid = tokens.filter((t) => Expo.isExpoPushToken(t));
  const dead: string[] = [];
  const failures: string[] = [];
  for (const chunk of expo.chunkPushNotifications(
    valid.map((to) => ({ to, title: "DOU Alertas", body, data: { url: "/matches" } })),
  )) {
    const tickets = await expo.sendPushNotificationsAsync(chunk);
    tickets.forEach((t, i) => {
      if (t.status !== "error") return;
      if (t.details?.error === "DeviceNotRegistered") dead.push(String(chunk[i]!.to));
      else failures.push(t.message);
    });
  }
  if (dead.length) await db.delete(pushToken).where(inArray(pushToken.token, dead));
  if (failures.length) throw new Error(`Expo push: ${failures.join("; ")}`);
}
