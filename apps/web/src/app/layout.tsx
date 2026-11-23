import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DOU Alertas",
  description: "Alertas diários do Diário Oficial da União por palavra-chave",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
