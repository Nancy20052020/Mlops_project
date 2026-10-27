"use client";

import { useEffect, useMemo, useState } from "react";
import { DensityChart } from "@/components/DensityChart";
import { RefitPanel } from "@/components/RefitPanel";
import { SiteHeader } from "@/components/SiteChrome";
import { TimelineChart } from "@/components/TimelineChart";
import { WeatherField } from "@/components/WeatherField";
import { callLabel, cx } from "@/lib/format";
import { DESK_PRESETS, deskScenario, type DeskControls } from "@/lib/sim/custom";
import { FEATURES } from "@/lib/sim/features";
import { SEED } from "@/lib/sim/protocol";
import { buildStudy, type Study } from "@/lib/sim/study";

const INITIAL: DeskControls = { humidity: 2, wind: 0, concept: 0, labelDelay: 0 };

export function FieldDesk() {
  const [draft, setDraft] = useState<DeskControls>(INITIAL);
  const [cast, setCast] = useState<DeskControls>(INITIAL);
  const study = useMemo(() => buildStudy(deskScenario(cast), SEED), [cast]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [showFront, setShowFront] = useState(true);

  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setIndex(still ? study.frames.length - 1 : 0);
    setPlaying(!still);
  }, [study]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setIndex((value) => (value >= study.frames.length - 1 ? value : value + 1));
    }, 70);
    return () => window.clearInterval(timer);
  }, [playing, study.frames.length]);

  useEffect(() => {
    if (playing && index >= study.frames.length - 1) setPlaying(false);
  }, [playing, index, study.frames.length]);

  const cursor = Math.min(index, study.frames.length - 1);
  const frame = study.frames[cursor];
  const feature = dominantFeature(study, frame.dominant);
  const reference = study.samples.slice(0, study.referenceEnd).map((sample) => sample.x[feature]);
  const current = study.samples.slice(Math.max(0, frame.t - study.window), frame.t).map((sample) => sample.x[feature]);

  return (
    <div className="relative min-h-screen bg-night text-paper">
      <WeatherField severity={frame.severity} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_50%_at_10%_0%,rgb(228_181_106_/_8%),transparent_55%)]" />
      <div className="relative z-10">
        <SiteHeader tone="night" />
        <main className="mx-auto max-w-6xl px-5 pb-16 pt-8 md:px-8">
          <p className="kicker text-brass-bright">Field desk · seed {SEED}</p>
          <h1 className="display mt-3 max-w-3xl text-5xl leading-[0.95] md:text-6xl">Cast your own front.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-paper/70">
            Drag a sensor, rotate the boundary, delay the letters, then cast. The rule underneath is the same one that scored the six weathers. It does not read the sliders.
          </p>

          <section className="mt-8 border border-white/10 bg-black/30 p-4 md:p-5">
            <div className="flex flex-wrap gap-2">
              {DESK_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setDraft(preset.controls);
                    setCast(preset.controls);
                  }}
                  className="border border-white/15 px-3 py-1.5 text-xs text-paper/80 hover:border-brass-bright hover:text-brass-bright"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Slider label="Humidity bias" unit="sd" min={0} max={2.5} step={0.05} value={draft.humidity} onChange={(humidity) => setDraft({ ...draft, humidity })} />
              <Slider label="Wind shift" unit="sd" min={0} max={2} step={0.05} value={draft.wind} onChange={(wind) => setDraft({ ...draft, wind })} />
              <Slider label="Boundary rotation" unit="%" min={0} max={1} step={0.05} value={draft.concept} display={(value) => `${Math.round(value * 100)}`} onChange={(concept) => setDraft({ ...draft, concept })} />
              <Slider label="Label lag" unit="samples" min={0} max={400} step={20} value={draft.labelDelay} display={(value) => String(value)} onChange={(labelDelay) => setDraft({ ...draft, labelDelay })} />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setCast(draft)}
                className="bg-brass-bright px-4 py-2 text-sm text-ink"
              >
                Cast this front
              </button>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-paper/50">
                Injected {study.scenario.groundTruth} · instrument {frame.diagnosis} · {callLabel(frame.call)}
              </p>
            </div>
          </section>

          <section className="mt-4 border border-white/10 bg-black/20 p-3 md:p-4">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="display text-3xl">{frame.call === "hold" ? "Holding" : frame.call === "inspect" ? "Inspect" : "Retrain"}</h2>
              <p className="font-mono text-xs text-paper/50">t {String(frame.t).padStart(4, "0")}</p>
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
              <input
                className="min-w-40 flex-1"
                type="range"
                min={0}
                max={study.frames.length - 1}
                value={cursor}
                aria-label="Scrub the cast weather"
                onChange={(event) => {
                  setPlaying(false);
                  setIndex(Number(event.target.value));
                }}
              />
              <label className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-paper/60">
                <input type="checkbox" checked={showFront} onChange={(event) => setShowFront(event.target.checked)} className="accent-[#e4b56a]" />
                Answer key
              </label>
            </div>
          </section>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <DensityChart reference={reference} current={current} feature={feature} />
            <div className="grid gap-4">
              <article className={cx("border p-4", frame.call === "hold" ? "border-white/10" : "border-brass-bright/40 bg-paper text-ink")}>
                <p className={cx("kicker", frame.call === "hold" ? "text-brass-bright" : "text-brass")}>Ticket · {callLabel(frame.call)}</p>
                <h3 className="display mt-2 text-3xl">{study.scenario.blurb}</h3>
                <p className={cx("mt-3 font-mono text-[11px] uppercase tracking-[0.14em]", frame.call === "hold" ? "text-paper/50" : "text-ink-soft")}>
                  {FEATURES[feature].label} on the glass · PSI {frame.psi[feature].toFixed(2)} · ECE {frame.ece === null ? "dark" : frame.ece.toFixed(3)}
                </p>
              </article>
              <RefitPanel study={study} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Slider({
  label,
  unit,
  min,
  max,
  step,
  value,
  display,
  onChange,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  display?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-paper/55">
        <span>{label}</span>
        <span className="text-brass-bright">
          {display ? display(value) : value.toFixed(2)} {unit}
        </span>
      </span>
      <input
        className="mt-3"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function dominantFeature(study: Study, dominant: number | null): number {
  if (dominant !== null) return dominant;
  const shift = study.scenario.meanShift.findIndex((value) => Math.abs(value) > 0.2);
  return shift >= 0 ? shift : 1;
}
