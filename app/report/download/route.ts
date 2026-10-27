import { getBench } from "@/lib/experiments/bench";
import { buildReport, renderMarkdown } from "@/lib/report/document";

export function GET() {
  const markdown = renderMarkdown(buildReport(getBench()));
  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": "attachment; filename=Heliograph-MLOps-Report.md",
    },
  });
}
