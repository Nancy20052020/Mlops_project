import { writeFileSync } from "node:fs";
import { getBench } from "../lib/experiments/bench";
import { buildReport, renderMarkdown } from "../lib/report/document";

const markdown = renderMarkdown(buildReport(getBench()));
writeFileSync(new URL("../REPORT.md", import.meta.url), markdown);
console.log("Wrote REPORT.md");
