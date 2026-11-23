import { API_URL, authClient } from "./auth-client";

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "omit", // the session cookie is sent manually below
    headers: {
      "Content-Type": "application/json",
      Cookie: await authClient.getCookie(),
      ...init.headers,
    },
  });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
  return body as T;
}
