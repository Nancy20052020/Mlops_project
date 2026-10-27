import { ONSET, type GroundTruth, type Scenario } from "@/lib/sim/protocol";

export type DeskControls = {
  humidity: number;
  wind: number;
  concept: number;
  labelDelay: number;
};

export const DESK_PRESETS: { id: string; label: string; controls: DeskControls }[] = [
  { id: "clear", label: "Clear", controls: { humidity: 0, wind: 0, concept: 0, labelDelay: 0 } },
  { id: "probe", label: "Probe", controls: { humidity: 2, wind: 0, concept: 0, labelDelay: 0 } },
  { id: "wind", label: "Wind", controls: { humidity: 0, wind: 1.45, concept: 0, labelDelay: 0 } },
  { id: "boundary", label: "Boundary", controls: { humidity: 0, wind: 0, concept: 1, labelDelay: 0 } },
  { id: "squall", label: "Squall", controls: { humidity: 1.8, wind: 0, concept: 1, labelDelay: 0 } },
  { id: "letters", label: "Late letters", controls: { humidity: 0, wind: 0, concept: 1, labelDelay: 280 } },
];

export function injectedKind(controls: DeskControls): GroundTruth {
  const input = controls.humidity >= 0.45 || controls.wind >= 0.45;
  const concept = controls.concept >= 0.35;
  if (input && concept) return "mixed";
  if (input) return "covariate";
  if (concept) return "concept";
  return "stable";
}

export function deskScenario(controls: DeskControls): Scenario {
  const kind = injectedKind(controls);
  return {
    id: "field-desk",
    name: "Field desk",
    kicker: "Your front",
    blurb: deskBlurb(controls, kind),
    groundTruth: kind,
    labelDelay: controls.labelDelay,
    onset: ONSET,
    ramp: controls.wind > 0.2 && controls.humidity < 0.2 && controls.concept < 0.2 ? 380 : 0,
    meanShift: [controls.wind, 0, 0, 0, controls.humidity, 0],
    conceptMix: controls.concept,
  };
}

function deskBlurb(controls: DeskControls, kind: GroundTruth): string {
  if (kind === "stable") return "Nothing is being injected. The instruments should stay quiet.";
  const parts: string[] = [];
  if (controls.humidity >= 0.45) parts.push(`humidity +${controls.humidity.toFixed(1)} sd`);
  if (controls.wind >= 0.45) parts.push(`wind +${controls.wind.toFixed(1)} sd`);
  if (controls.concept >= 0.35) parts.push(`boundary rotated ${Math.round(controls.concept * 100)}%`);
  if (controls.labelDelay > 0) parts.push(`labels lag ${controls.labelDelay}`);
  return `Injected ${kind}: ${parts.join(", ")}.`;
}
