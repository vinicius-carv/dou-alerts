import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AlertsManager from "./alerts-manager";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return (
    <main>
      <h1>Alertas</h1>
      <p>Receba um aviso diário quando uma dessas expressões aparecer no Diário Oficial da União.</p>
      <AlertsManager />
    </main>
  );
}
