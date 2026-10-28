"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COURSE } from "@/lib/course";
import { cx } from "@/lib/format";

const LINKS = [
  { href: "/observatory", label: "Observatory" },
  { href: "/desk", label: "Field desk" },
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
        <div>
          <Wordmark tone={tone} />
          <p className={cx("mt-1 font-mono text-[10px] uppercase tracking-[0.14em]", night ? "text-paper/45" : "text-ink-soft")}>
            {COURSE.student} · {COURSE.registration} · {COURSE.branch}
          </p>
        </div>
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
            {COURSE.student} · {COURSE.registration} · {COURSE.branch}
            <br />
            {COURSE.code} {COURSE.subject} · {COURSE.department} · {COURSE.university}
          </p>
        </div>
        <p className="flex flex-col gap-1 font-mono text-xs tracking-wide">
          <a href={COURSE.vercel} className="underline decoration-brass underline-offset-4">
            {COURSE.vercel.replace("https://", "")}
          </a>
          <a href={COURSE.github} className="underline decoration-brass underline-offset-4">
            github.com/Nancy20052020/Mlops_project
          </a>
          <a
            href="/Nancy-Verma-Industrial-Training-Report.pdf?v=2"
            className="underline decoration-brass underline-offset-4"
          >
            Industrial training report (PDF)
          </a>
        </p>
      </div>
    </footer>
  );
}
