import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-24">
        <p className="kicker text-brass">404</p>
        <h1 className="display mt-4 text-5xl">This bearing is empty.</h1>
        <p className="mt-4 max-w-md text-ink-soft">That path is not on the array. The observatory, the protocol, and the report are.</p>
        <Link href="/" className="mt-8 inline-block underline decoration-brass underline-offset-4">
          Back to the ridge
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
