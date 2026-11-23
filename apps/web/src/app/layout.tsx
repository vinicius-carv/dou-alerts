import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "DOU Alertas",
  description: "Alertas diários do Diário Oficial da União por palavra-chave",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth.api.getSession({ headers: await headers() });
  return (
    <html lang="pt-BR">
      <body>
        {session && (
          <nav aria-label="Principal">
            <Link href="/">Alertas</Link>
            <Link href="/matches">Atos</Link>
            <Link href="/account">Conta</Link>
          </nav>
        )}
        {children}
      </body>
    </html>
  );
}
