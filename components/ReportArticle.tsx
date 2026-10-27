import Link from "next/link";
import { COURSE } from "@/lib/course";
import type { Block, ReportModel } from "@/lib/report/document";

export function ReportArticle({ report }: { report: ReportModel }) {
  let section = 0;

  return (
    <article className="report-doc mx-auto max-w-3xl px-5 py-10 font-serif text-ink md:px-8 md:py-14">
      <section className="cover-sheet border border-ink/20 bg-white px-6 py-12 text-center md:px-12 md:py-16">
        <p className="text-lg font-semibold">{COURSE.university}</p>
        <p className="mt-2 text-sm leading-6">{COURSE.school}</p>
        <p className="text-sm leading-6">{COURSE.department}</p>

        <p className="mt-10 text-base font-semibold">
          {COURSE.code} — {COURSE.subject}
        </p>
        <p className="mt-6 text-sm">Research project report</p>
        <h1 className="mx-auto mt-3 max-w-xl text-2xl font-semibold leading-snug">{report.title}</h1>

        <div className="mt-12 space-y-1 text-sm leading-6">
          <p>Submitted by</p>
          <p className="text-base font-semibold">{COURSE.student}</p>
          <p>Registration number: {COURSE.registration}</p>
          <p>Branch: {COURSE.branch}</p>
        </div>

        <div className="mt-10 space-y-2 text-sm leading-6">
          <p>
            Deployed project:{" "}
            <a href={COURSE.vercel} className="underline">
              {COURSE.vercel}
            </a>
          </p>
          <p>
            GitHub:{" "}
            <a href={COURSE.github} className="underline">
              {COURSE.github}
            </a>
          </p>
        </div>
      </section>

      <div className="report-body mt-12 space-y-4 text-[1.05rem] leading-8">
        <h2 className="pt-2 text-xl font-semibold">Abstract</h2>
        <p>{report.standfirst}</p>
        <p className="no-print text-sm">
          <a href={COURSE.pdf} className="underline">
            Download the PDF report
          </a>
          {" · "}
          <Link href="/report/download" className="underline">
            Download markdown
          </Link>
        </p>

        {report.blocks.map((block, index) => {
          if (block.type === "h2") section += 1;
          return <BlockView key={index} block={block} section={block.type === "h2" ? section : 0} />;
        })}
      </div>
    </article>
  );
}

function BlockView({ block, section }: { block: Block; section: number }) {
  if (block.type === "h2") {
    return (
      <h2 id={block.id} className="scroll-mt-24 pt-6 text-xl font-semibold">
        {section}. {block.text}
      </h2>
    );
  }
  if (block.type === "p") {
    return <p>{block.text}</p>;
  }
  if (block.type === "ul") {
    return (
      <ul className="list-disc space-y-2 pl-6">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  if (block.type === "callout") {
    return (
      <p>
        <strong>{block.kicker}. </strong>
        {block.text}
      </p>
    );
  }
  if (block.type === "table") {
    return (
      <figure className="overflow-x-auto py-2">
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm leading-6">
          <caption className="mb-2 text-left text-sm">{block.caption}</caption>
          <thead>
            <tr>
              {block.headers.map((header) => (
                <th key={header} className="border border-ink/30 px-2 py-1 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr key={row.join("-")}>
                {row.map((cell, index) => (
                  <td key={`${cell}-${index}`} className="border border-ink/30 px-2 py-1">
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
  if (block.type === "shot") {
    return (
      <figure className="py-3">
        <img src={block.src} alt={block.alt} className="w-full border border-ink/20" />
        <figcaption className="mt-2 text-sm leading-6">{block.caption}</figcaption>
      </figure>
    );
  }
  if (block.type === "figure") {
    return (
      <p>
        The monitoring path is a locked reference, a frozen model, a sliding window, PSI on the inputs, ECE and
        Page-Hinkley on the labels that have arrived, and then one action: hold, inspect, or retrain.
      </p>
    );
  }
  return (
    <ol className="list-decimal space-y-2 pl-6 text-base leading-7">
      {block.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ol>
  );
}
