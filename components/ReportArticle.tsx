import Image from "next/image";
import Link from "next/link";
import type { Block, ReportModel } from "@/lib/report/document";

export function ReportArticle({ report }: { report: ReportModel }) {
  return (
    <article className="mx-auto max-w-3xl px-5 py-12 md:px-8 md:py-16">
      <p className="kicker text-brass">{report.kicker}</p>
      <h1 className="display mt-4 text-4xl leading-[1.05] text-ink md:text-6xl">{report.title}</h1>
      <p className="serif mt-8 text-xl leading-8 text-ink-soft">{report.standfirst}</p>
      <p className="no-print mt-6 flex flex-wrap gap-4 text-sm">
        <Link href="/report/download" className="underline decoration-brass underline-offset-4">
          Download markdown
        </Link>
        <span className="text-ink-soft">Print this page to PDF for the submission.</span>
      </p>

      <figure className="mt-10">
        <div className="relative aspect-[16/9] overflow-hidden bg-ink">
          <Image
            src="/images/instrument-room.jpg"
            alt="A dim research room with a sunlit sheet of diagrams, a brass protractor, and a glass prism"
            fill
            className="object-cover"
            sizes="(min-width: 768px) 768px, 100vw"
          />
        </div>
        <figcaption className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
          The reference window is a locked climate, the way a chart is a locked afternoon.
        </figcaption>
      </figure>

      <div className="mt-12 space-y-6">
        {report.blocks.map((block, index) => (
          <BlockView key={index} block={block} />
        ))}
      </div>
    </article>
  );
}

function BlockView({ block }: { block: Block }) {
  if (block.type === "h2") {
    return (
      <h2 id={block.id} className="display scroll-mt-24 pt-8 text-3xl md:text-4xl">
        {block.text}
      </h2>
    );
  }
  if (block.type === "p") {
    return <p className="serif text-[1.05rem] leading-8 text-ink/90">{block.text}</p>;
  }
  if (block.type === "ul") {
    return (
      <ul className="serif list-disc space-y-3 pl-5 text-[1.05rem] leading-8 text-ink/90">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  if (block.type === "callout") {
    return (
      <aside className="border-l-2 border-brass bg-paper-deep/70 px-5 py-4">
        <p className="kicker text-brass">{block.kicker}</p>
        <p className="serif mt-2 text-lg leading-8">{block.text}</p>
      </aside>
    );
  }
  if (block.type === "table") {
    return (
      <figure className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <caption className="mb-3 text-left font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
            {block.caption}
          </caption>
          <thead>
            <tr className="border-b border-ink/20">
              {block.headers.map((header) => (
                <th key={header} className="py-2 pr-4 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr key={row.join("-")} className="border-b border-ink/10">
                {row.map((cell, index) => (
                  <td key={`${cell}-${index}`} className="py-2 pr-4 font-mono text-[13px] tabular-nums">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    );
  }
  if (block.type === "figure") {
    return <MethodFigure />;
  }
  return (
    <ol className="space-y-3 text-sm leading-6 text-ink-soft">
      {block.items.map((item, index) => (
        <li key={item} className="grid grid-cols-[2rem_1fr] gap-2">
          <span className="font-mono text-xs text-brass">{String(index + 1).padStart(2, "0")}</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function MethodFigure() {
  const stages = [
    ["01", "Lock", "Train on the opening climate. Freeze the weights, the threshold, and the reference histograms."],
    ["02", "Watch inputs", "Population stability on each sensor, every twenty samples, against that locked reference."],
    ["03", "Watch labels", "Calibration error and Page-Hinkley, computed only on labels that have arrived."],
    ["04", "Say the action", "Inspect when inputs move. Retrain when calibration breaks. Hold when both are quiet."],
  ];
  return (
    <ol className="grid gap-px border border-ink/15 bg-ink/15 sm:grid-cols-2">
      {stages.map(([index, title, body]) => (
        <li key={index} className="bg-paper p-4">
          <p className="kicker text-brass">{index}</p>
          <h3 className="display mt-2 text-2xl">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-ink-soft">{body}</p>
        </li>
      ))}
    </ol>
  );
}
