import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import MatchesList from "./matches-list";

export default async function MatchesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return (
    <main>
      <div className="page-head">
        <h1>Atos encontrados</h1>
        <p>Atos publicados no Diário Oficial da União que citam suas expressões, do mais recente ao mais antigo.</p>
      </div>
      <MatchesList />
    </main>
  );
}
