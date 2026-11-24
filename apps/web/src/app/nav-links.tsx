"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Alertas" },
  { href: "/matches", label: "Atos" },
  { href: "/account", label: "Conta" },
] as const;

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal">
      {links.map((l) => (
        <Link key={l.href} href={l.href} aria-current={pathname === l.href ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
