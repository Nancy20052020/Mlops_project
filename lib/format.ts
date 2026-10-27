export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function percent(value: number | null, digits = 1): string {
  if (value === null) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function fixed(value: number | null, digits = 2): string {
  if (value === null) return "—";
  return value.toFixed(digits);
}

export function samplesAfter(delay: number | null): string {
  if (delay === null) return "Silent";
  return String(delay);
}

export function prettyLabel(value: string): string {
  if (value === "ece") return "ECE";
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

export function callLabel(call: string): string {
  if (call === "inspect") return "Inspect";
  if (call === "retrain") return "Retrain";
  return "Hold";
}
