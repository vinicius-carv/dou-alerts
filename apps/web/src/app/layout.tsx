import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Literata } from "next/font/google";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import NavLinks from "./nav-links";
import "./globals.css";

const serif = Literata({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const sans = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "DOU Alertas",
  description: "Alertas diários do Diário Oficial da União por palavra-chave",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth.api.getSession({ headers: await headers() });
  return (
    <html lang="pt-BR" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <header className="site-header">
          <Link href="/" className="wordmark">
            DOU <span className="marker">Alertas</span>
          </Link>
          {session && <NavLinks />}
        </header>
        {children}
      </body>
    </html>
  );
}
