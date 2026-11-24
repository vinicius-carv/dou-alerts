import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AccountActions from "./account-actions";

export default async function AccountPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return (
    <main>
      <div className="page-head">
        <h1>Conta</h1>
      </div>
      <section className="panel" aria-labelledby="email-heading">
        <h2 id="email-heading">E-mail</h2>
        <p>Os resumos diários chegam em <span className="value">{session.user.email}</span>.</p>
      </section>
      <AccountActions />
    </main>
  );
}
