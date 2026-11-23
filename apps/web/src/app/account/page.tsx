import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AccountActions from "./account-actions";

export default async function AccountPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return (
    <main>
      <h1>Conta</h1>
      <p>E-mail: <strong>{session.user.email}</strong></p>
      <AccountActions />
    </main>
  );
}
