import type { Metadata } from "next";
import { ReportArticle } from "@/components/ReportArticle";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { getBench } from "@/lib/experiments/bench";
import { buildReport } from "@/lib/report/document";

export const metadata: Metadata = {
  title: "Report",
  description: "Problem, method, results, and conclusion for the Heliograph drift study.",
};

export default function ReportPage() {
  const report = buildReport(getBench());
  return (
    <>
      <SiteHeader />
      <main>
        <ReportArticle report={report} />
      </main>
      <SiteFooter />
    </>
  );
}
