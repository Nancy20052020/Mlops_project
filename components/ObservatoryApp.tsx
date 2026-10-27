"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { reliability } from "@/lib/drift/calibration";
import { DensityChart } from "@/components/DensityChart";
import { RefitPanel } from "@/components/RefitPanel";
import { SiteHeader } from "@/components/SiteChrome";
import { TimelineChart } from "@/components/TimelineChart";
import { WeatherField } from "@/components/WeatherField";
import { callLabel, cx, fixed, percent } from "@/lib/format";
import { FEATURES } from "@/lib/sim/features";
import {
  LABEL_MIN,
  PH_LAMBDA,
  PSI_ALARM,
  PSI_WATCH,
  SCENARIOS,
  type Scenario,
  type Severity,
} from "@/lib/sim/protocol";
import { getStudy, type Frame, type Study } from "@/lib/sim/study";

const SEVERITY_COPY: Record<Severity, string> = {
  calm: "Calm",
  watch: "Watch",
  alarm: "Alarm",
  retrain: "Retrain",
};

export function ObservatoryApp() {
  const params = useSearchParams();
  const requested = params.get("scenario");
  const initial = SCENARIOS.some((scenario) => scenario.id === requested) ? requested! : "wet-bulb";
  const [scenarioId, setScenarioId] = useState(initial);
  const study = useMemo(() => getStudy(scenarioId), [scenarioId]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [feature, setFeature] = useState(() => defaultFeature(study.scenario));
  const [showFront, setShowFront] = useState(true);

  useEffect(() => {
    setScenarioId(initial);
  }, [initial]);

  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setIndex(still ? study.frames.length - 1 : 0);
    setPlaying(!still);
    setFeature(defaultFeature(study.scenario));
  }, [study]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setIndex((value) => (value >= study.frames.length - 1 ? value : value + 1));
    }, 90);
    return () => window.clearInterval(timer);
  }, [playing, study.frames.length]);

  useEffect(() => {
    if (playing && index >= study.frames.length - 1) setPlaying(false);
  }, [playing, index, study.frames.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)) return;
      if (event.key === " ") {
        event.preventDefault();
        setPlaying((value) => !value);
      } else if (event.key === "ArrowRight") {
        setPlaying(false);
        setIndex((value) => Math.min(study.frames.length - 1, value + 1));
      } else if (event.key === "ArrowLeft") {
        setPlaying(false);
        setIndex((value) => Math.max(0, value - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [study.frames.length]);

  const cursor = Math.min(index, study.frames.length - 1);
  const frame = study.frames[cursor];
  const reference = study.samples.slice(0, study.referenceEnd).map((sample) => sample.x[feature]);
  const current = study.samples.slice(Math.max(0, frame.t - study.window), frame.t).map((sample) => sample.x[feature]);
  const labeled = recentLabeled(study, frame);
  const bins = labeled.length >= LABEL_MIN
    ? reliability(
        labeled.map((sample) => sample.pModel),
        labeled.map((sample) => sample.y),
      )
    : [];

  const download = () => {
    const header = "t,maxPsi,ece,accuracy,ph,diagnosis,call\n";
    const body = study.frames
      .map((item) =>
        [item.t, item.maxPsi.toFixed(4), item.ece ?? "", item.accuracy ?? "", item.ph.toFixed(3), item.diagnosis, item.call].join(","),
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${study.scenario.id}-seed-${study.seed}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative min-h-screen bg-night text-paper">
      <WeatherField severity={frame.severity} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_60%_at_80%_0%,transparent,rgb(12_16_14)_78%)]" />
      <div className="relative z-10">
        <SiteHeader tone="night" />
        <main className="mx-auto max-w-6xl px-5 pb-16 pt-8 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="kicker text-paper/50">Observatory · North array · seed {study.seed}</p>
              <h1 className="display mt-3 text-5xl text-paper md:text-6xl">Field watch</h1>
            </div>
            <StatusSeal severity={frame.severity} />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
              {SCENARIOS.map((scenario) => {
                const selected = scenario.id === study.scenario.id;
                return (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => setScenarioId(scenario.id)}
                    aria-pressed={selected}
                    className={cx(
                      "min-w-[220px] border px-3 py-3 text-left transition lg:min-w-0",
                      selected ? "border-brass-bright/70 bg-white/5" : "border-white/10 hover:border-white/30",
                    )}
                  >
                    <span className="kicker text-brass-bright/80">{scenario.kicker}</span>
                    <span className="mt-1 block text-sm">{scenario.name}</span>
                  </button>
                );
              })}
            </aside>

            <section>
              <div className="border border-white/10 bg-black/20 p-3 md:p-4">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <h2 className="display text-3xl">{study.scenario.name}</h2>
                    <p className="mt-1 max-w-xl text-sm leading-6 text-paper/70">{study.scenario.blurb}</p>
                  </div>
                  <p className="font-mono text-xs text-paper/50">
                    t {String(frame.t).padStart(4, "0")} / {study.length}
                  </p>
                </div>
                <TimelineChart
                  frames={study.frames}
                  cursor={cursor}
                  onset={study.onset}
                  length={study.length}
                  showFront={showFront}
                  onScrub={(next) => {
                    setPlaying(false);
                    setIndex(next);
                  }}
                />
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (cursor >= study.frames.length - 1) {
                        setIndex(0);
                        setPlaying(true);
                        return;
                      }
                      setPlaying((value) => !value);
                    }}
                    className="border border-brass-bright/70 px-4 py-2 text-sm text-brass-bright"
                  >
                    {playing ? "Pause" : cursor >= study.frames.length - 1 ? "Replay" : "Play"}
                  </button>
                  <label className="flex min-w-40 flex-1 items-center gap-3 text-xs text-paper/60">
                    <span className="sr-only">Scrub the stream</span>
                    <input
                      type="range"
                      min={0}
                      max={study.frames.length - 1}
                      value={cursor}
                      onChange={(event) => {
                        setPlaying(false);
                        setIndex(Number(event.target.value));
                      }}
                    />
                  </label>
                  <label className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-paper/60">
                    <input
                      type="checkbox"
                      checked={showFront}
                      onChange={(event) => setShowFront(event.target.checked)}
                      className="accent-[#e4b56a]"
                    />
                    Answer key
                  </label>
                </div>
                <p className="mt-2 font-mono text-[11px] text-paper/40">Space plays. Arrows step. Brass is PSI, phosphor is accuracy.</p>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
                <div className="grid gap-4">
                  <DensityChart reference={reference} current={current} feature={feature} />
                  <div className="border border-white/10 p-4">
                    <p className="kicker text-paper/50">Feature climate · alarm at {PSI_ALARM.toFixed(2)}</p>
                    <ul className="mt-4 grid gap-3">
                      {FEATURES.map((spec, featureIndex) => {
                        const value = frame.psi[featureIndex];
                        const hot = value >= PSI_ALARM;
                        const selected = featureIndex === feature;
                        return (
                          <li key={spec.key}>
                            <button
                              type="button"
                              onClick={() => setFeature(featureIndex)}
                              className={cx("w-full text-left", selected && "text-brass-bright")}
                            >
                              <span className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-[0.14em]">
                                <span>{spec.label}</span>
                                <span className="tabular-nums">{value.toFixed(2)}</span>
                              </span>
                              <span className="mt-1.5 block h-1 bg-white/10">
                                <span
                                  className={cx("block h-full", hot ? "bg-signal" : "bg-brass-bright")}
                                  style={{ width: `${Math.min(100, value * 100)}%` }}
                                />
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>

                <div className="grid content-start gap-4">
                  <Ticket study={study} frame={frame} />
                  <div className="grid grid-cols-2 gap-px border border-white/10 bg-white/10">
                    <Metric label="Window accuracy" value={percent(frame.accuracy)} note={`ref ${percent(study.model.refAccuracy)}`} />
                    <Metric label="Calibration error" value={fixed(frame.ece, 3)} note={`ref ${fixed(study.model.refEce, 3)}`} />
                    <Metric label="Page-Hinkley" value={frame.ph.toFixed(1)} note={`λ ${PH_LAMBDA}`} />
                    <Metric label="Labels in window" value={String(frame.labeled)} note={study.scenario.labelDelay ? `lag ${study.scenario.labelDelay}` : "no lag"} />
                  </div>
                  <Reliability bins={bins} ready={labeled.length >= LABEL_MIN} />
                  <RefitPanel study={study} />
                  <button type="button" onClick={download} className="justify-self-start font-mono text-[11px] uppercase tracking-[0.14em] text-paper/60 underline decoration-white/20 underline-offset-4">
                    Download this run as CSV
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatusSeal({ severity }: { severity: Severity }) {
  const live = severity === "alarm" || severity === "retrain";
  return (
    <div
      role="status"
      className={cx(
        "grid h-24 w-24 place-items-center rounded-full border text-center",
        live ? "seal-live border-signal text-signal" : severity === "watch" ? "border-brass-bright text-brass-bright" : "border-phosphor/70 text-phosphor",
      )}
    >
      <span>
        <span className="kicker block text-[0.62rem] opacity-70">Status</span>
        <span className="display mt-1 block text-lg leading-none">{SEVERITY_COPY[severity]}</span>
      </span>
    </div>
  );
}

function Ticket({ study, frame }: { study: Study; frame: Frame }) {
  const featureName = frame.dominant === null ? "A feature" : FEATURES[frame.dominant].label;
  let title = "Hold the weights";
  let body = "The rule has not fired. The deployed model stays on the array.";
  if (frame.call === "retrain" && frame.diagnosis === "mixed") {
    title = "Retrain";
    body = `${featureName} left the reference, and the labels no longer match the probabilities. Both the climate and the boundary moved.`;
  } else if (frame.call === "retrain") {
    title = "Retrain";
    body = "Calibration broke while the inputs still match the reference. The boundary is what moved. A new labeled set is the remedy.";
  } else if (frame.call === "inspect") {
    title = "Inspect the feed";
    body = `${featureName} shifted, and expected calibration error held. The weights can stay. Send someone to the sensor.`;
  } else if (study.scenario.labelDelay > 0 && frame.labeled < LABEL_MIN) {
    title = "Holding for letters";
    body = `Labels lag by ${study.scenario.labelDelay} samples, so the performance instruments are dark. The input climate is the light that is on.`;
  }

  const paper = frame.call !== "hold";
  return (
    <article
      key={`${frame.call}-${frame.diagnosis}`}
      className={cx("ticket-in border p-4", paper ? "border-brass-bright/40 bg-paper text-ink" : "border-white/10 bg-white/5 text-paper")}
    >
      <p className={cx("kicker", paper ? "text-brass" : "text-paper/50")}>Ticket · {callLabel(frame.call)}</p>
      <h3 className="display mt-2 text-3xl">{title}</h3>
      <p className={cx("mt-2 text-sm leading-6", paper ? "text-ink-soft" : "text-paper/75")}>{body}</p>
      <p className={cx("mt-4 font-mono text-[11px] uppercase tracking-[0.14em]", paper ? "text-ink-soft" : "text-paper/40")}>
        Diagnosis {frame.diagnosis} · watch {PSI_WATCH.toFixed(2)} · alarm {PSI_ALARM.toFixed(2)}
      </p>
    </article>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="bg-night px-3 py-3">
      <p className="kicker text-paper/45">{label}</p>
      <p className="mt-2 font-mono text-lg tabular-nums text-paper">{value}</p>
      <p className="mt-1 font-mono text-[11px] text-paper/40">{note}</p>
    </div>
  );
}

function Reliability({
  bins,
  ready,
}: {
  bins: { count: number; meanPrediction: number; observedRate: number }[];
  ready: boolean;
}) {
  return (
    <div className="border border-white/10 p-4">
      <p className="kicker text-paper/50">Reliability</p>
      {ready ? (
        <svg viewBox="0 0 220 160" className="mt-3 h-36 w-full" role="img" aria-label="Reliability diagram for the current labeled window">
          <line x1="28" y1="132" x2="200" y2="20" stroke="rgb(243 238 228 / 25%)" />
          {bins.map((bin, index) => {
            if (!bin.count) return null;
            const cx = 28 + bin.meanPrediction * 172;
            const cy = 132 - bin.observedRate * 112;
            return <circle key={index} cx={cx} cy={cy} r={4 + Math.sqrt(bin.count) * 0.35} fill="#e4b56a" fillOpacity="0.85" />;
          })}
          <text x="28" y="150" fill="rgb(243 238 228 / 45%)" fontSize="9" fontFamily="ui-monospace, monospace">
            predicted
          </text>
          <text x="4" y="24" fill="rgb(243 238 228 / 45%)" fontSize="9" fontFamily="ui-monospace, monospace">
            observed
          </text>
        </svg>
      ) : (
        <p className="mt-3 text-sm leading-6 text-paper/65">This window is still waiting on labels. The reliability diagram switches on once they arrive.</p>
      )}
    </div>
  );
}

function recentLabeled(study: Study, frame: Frame) {
  const last = frame.t - study.scenario.labelDelay;
  if (last <= 0) return [];
  return study.samples.slice(Math.max(0, last - study.window), last);
}

function defaultFeature(scenario: Scenario): number {
  const shifted = scenario.meanShift.findIndex((value) => Math.abs(value) > 0);
  return shifted >= 0 ? shifted : 1;
}
