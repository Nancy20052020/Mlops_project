import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { getBench } from "@/lib/experiments/bench";
import sweep from "@/lib/experiments/sweep.json";
import { callLabel, percent, samplesAfter } from "@/lib/format";

export const metadata: Metadata = {
  title: "Protocol",
  description: "Six seeded weather systems scored by PSI, calibration, Page-Hinkley, and an accuracy rule.",
};

const SCALE = 400;

export default function ProtocolPage() {
  const bench = getBench();
  const clear = bench.scores.find((score) => score.id === "clear-air");
  const wet = bench.scores.find((score) => score.id === "wet-bulb");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
        <p className="kicker text-brass">Protocol · seed {bench.seed}</p>
        <h1 className="display mt-4 max-w-3xl text-5xl leading-[0.95] md:text-7xl">Six weathers, one locked rule.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-soft">
          The thresholds were written down before these scores. PSI alarms at 0.25. Calibration alarms on a rise of 0.07.
          The accuracy rule needs a ten-point drop, held for two windows. Silent means that instrument never fired.
        </p>

        <dl className="mt-12 grid gap-px border border-ink/15 bg-ink/15 sm:grid-cols-3">
          <Stat value={String(clear?.falseInputAlarms ?? 0)} label="False input alarms in clear air" />
          <Stat value={String(wet?.psiDelay ?? "—")} label="Samples to catch the humidity probe" />
          <Stat value={`${sweep.hits}/${sweep.trials}`} label={`Correct diagnoses, seeds ${sweep.seeds[0]}–${sweep.seeds.at(-1)}`} />
        </dl>

        <section className="mt-14">
          <h2 className="display text-3xl">Detection delay</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
            Bars run from the known front. The scale stops at {SCALE} samples. A missing bar is a silent instrument, which is the correct reading whenever that channel is blind.
          </p>
          <div className="mt-4 flex flex-wrap gap-5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
            <span className="inline-flex items-center gap-2"><i className="h-2 w-4 bg-brass" /> PSI</span>
            <span className="inline-flex items-center gap-2"><i className="h-2 w-4 bg-sea" /> Calibration</span>
            <span className="inline-flex items-center gap-2"><i className="h-2 w-4 bg-signal" /> Accuracy rule</span>
          </div>
          <div className="mt-6 space-y-5">
            {bench.scores.map((score) => (
              <div key={score.id} className="grid gap-2 md:grid-cols-[11rem_1fr] md:items-center">
                <Link href={`/observatory?scenario=${score.id}`} className="text-sm underline decoration-brass/50 underline-offset-4">
                  {score.name}
                </Link>
                <div className="grid gap-1.5">
                  <DelayBar delay={score.psiDelay} className="bg-brass" />
                  <DelayBar delay={score.eceDelay} className="bg-sea" />
                  <DelayBar delay={score.accuracyDelay} className="bg-signal" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
            <caption className="mb-3 text-left font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
              Samples after the front. Reference accuracy {percent(bench.scores[0].refAccuracy)}, reference ECE {bench.scores[0].refEce.toFixed(3)}.
            </caption>
            <thead>
              <tr className="border-b border-ink/20">
                {["System", "Truth", "PSI", "ECE", "Page-Hinkley", "Accuracy", "End accuracy", "Call"].map((header) => (
                  <th key={header} className="py-2 pr-4 font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bench.scores.map((score) => (
                <tr key={score.id} className="border-b border-ink/10">
                  <td className="py-3 pr-4">{score.name}</td>
                  <td className="py-3 pr-4 capitalize">{score.groundTruth}</td>
                  <td className="py-3 pr-4 font-mono tabular-nums">{samplesAfter(score.psiDelay)}</td>
                  <td className="py-3 pr-4 font-mono tabular-nums">{samplesAfter(score.eceDelay)}</td>
                  <td className="py-3 pr-4 font-mono tabular-nums">{samplesAfter(score.phDelay)}</td>
                  <td className="py-3 pr-4 font-mono tabular-nums">{samplesAfter(score.accuracyDelay)}</td>
                  <td className="py-3 pr-4 font-mono tabular-nums">{percent(score.endAccuracy)}</td>
                  <td className="py-3 pr-4">{callLabel(score.endCall)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <aside className="mt-12 border-l-2 border-brass bg-paper-deep/60 px-5 py-4">
          <p className="kicker text-brass">The single miss</p>
          <p className="serif mt-2 text-lg leading-8">
            Seed {sweep.misses[0].seed}, Veering wind. PSI fires, and much later calibration rises too, so the settled label is {sweep.misses[0].endDiagnosis}.
            A long shift in a feature the model uses can bruise an otherwise honest fit. The other {sweep.hits} runs match the ground truth.
          </p>
        </aside>

        <p className="mt-10 text-sm text-ink-soft">
          Open any row in the <Link href="/observatory" className="underline decoration-brass underline-offset-4">observatory</Link>, or read the reasoning in the{" "}
          <Link href="/report" className="underline decoration-brass underline-offset-4">report</Link>.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-paper px-5 py-6">
      <dt className="display text-5xl">{value}</dt>
      <dd className="mt-2 text-sm leading-6 text-ink-soft">{label}</dd>
    </div>
  );
}

function DelayBar({ delay, className }: { delay: number | null; className: string }) {
  if (delay === null) {
    return <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-mist">Silent</div>;
  }
  return (
    <div className="h-2 bg-ink/10">
      <div className={`h-full ${className}`} style={{ width: `${Math.min(100, (delay / SCALE) * 100)}%` }} />
    </div>
  );
}
