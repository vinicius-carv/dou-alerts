import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:3000";

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [expoClient({ scheme: "dou-alerts", storage: SecureStore }), emailOTPClient()],
});
