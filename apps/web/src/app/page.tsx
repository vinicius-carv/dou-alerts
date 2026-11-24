import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AlertsManager from "./alerts-manager";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return (
    <main>
      <div className="page-head">
        <h1>Alertas</h1>
        <p>Toda manhã procuramos estas expressões no Diário Oficial da União e avisamos você por e-mail quando aparecerem.</p>
      </div>
      <AlertsManager />
    </main>
  );
}
