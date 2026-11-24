import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

// 10.0.2.2 is the Android emulator alias for the host machine; only sensible in development.
const url = process.env.EXPO_PUBLIC_API_URL ?? (__DEV__ ? "http://10.0.2.2:3000" : undefined);
if (!url) throw new Error("EXPO_PUBLIC_API_URL must be set for production builds.");
export const API_URL = url;

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [expoClient({ scheme: "dou-alerts", storage: SecureStore }), emailOTPClient()],
});
