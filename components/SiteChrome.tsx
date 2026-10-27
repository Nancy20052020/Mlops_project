"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/format";

const LINKS = [
  { href: "/observatory", label: "Observatory" },
  { href: "/protocol", label: "Protocol" },
  { href: "/report", label: "Report" },
];

export function Wordmark({ tone = "paper" }: { tone?: "paper" | "night" }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Heliograph, home">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden className={tone === "night" ? "text-brass-bright" : "text-brass"}>
        <circle cx="9" cy="9" r="7.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="9" cy="9" r="2.4" fill="currentColor" />
      </svg>
      <span className="display text-[1.35rem] leading-none">Heliograph</span>
    </Link>
  );
}

export function SiteHeader({ tone = "paper" }: { tone?: "paper" | "night" }) {
  const pathname = usePathname();
  const night = tone === "night";

  return (
    <header
      className={cx(
        "sticky top-0 z-40 border-b backdrop-blur-md",
        night ? "border-white/10 bg-night/80 text-paper" : "border-ink/10 bg-paper/85 text-ink",
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 md:px-8">
        <Wordmark tone={tone} />
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "underline-offset-4 transition",
                  active ? "underline decoration-brass-bright" : night ? "text-paper/70 hover:text-paper" : "text-ink-soft hover:text-ink",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-ink/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-ink-soft md:flex-row md:items-end md:justify-between md:px-8">
        <div>
          <p className="display text-xl text-ink">Heliograph</p>
          <p className="mt-1 max-w-md">
            AIM4142 MLOps · Department of AI & ML · School of Computer Science and Engineering · Manipal University Jaipur
          </p>
        </div>
        <p className="font-mono text-xs tracking-wide">Seeded weather. No external data. No environment variables.</p>
      </div>
    </footer>
  );
}
