export const FEATURES = [
  { key: "wind", label: "Wind speed", unit: "m/s", mean: 8.4, sd: 2.1 },
  { key: "vibration", label: "Vibration", unit: "mm/s", mean: 1.85, sd: 0.42 },
  { key: "temperature", label: "Gearbox temp", unit: "°C", mean: 61, sd: 6.5 },
  { key: "rpm", label: "Rotor speed", unit: "rpm", mean: 14.2, sd: 2.2 },
  { key: "humidity", label: "Humidity", unit: "%", mean: 71, sd: 11 },
  { key: "power", label: "Power", unit: "kW", mean: 1480, sd: 360 },
] as const;

export const FEATURE_COUNT = FEATURES.length;

/**
 * Standardized covariates with a light physical correlation:
 * rotor speed and power follow the wind; humidity is nearly independent,
 * which is why a humidity-probe bias is the clean covariate case.
 */
export function sampleCovariates(normal: () => number): number[] {
  const z0 = normal();
  const z1 = normal();
  const z2 = normal();
  const z3 = normal();
  const z4 = normal();
  const z5 = normal();

  const wind = z0;
  const humidity = z4;
  const vibration = 0.18 * z0 + Math.sqrt(1 - 0.18 * 0.18) * z1;
  const tempResidual = Math.sqrt(1 - 0.3 * 0.3 - 0.22 * 0.22);
  const temperature = 0.3 * z0 + 0.22 * z1 + tempResidual * z2;
  const rpmShare = Math.sqrt(1 - 0.66 * 0.66);
  const rpm = 0.66 * wind + rpmShare * z3;
  const powerRaw = 0.55 * wind + 0.45 * rpm + 0.25 * z5;
  const powerZ0 = 0.55 + 0.45 * 0.66;
  const powerVariance = powerZ0 * powerZ0 + 0.45 * 0.45 * rpmShare * rpmShare + 0.25 * 0.25;
  const power = powerRaw / Math.sqrt(powerVariance);

  return [wind, vibration, temperature, rpm, humidity, power];
}

export function toRaw(standardized: number, feature: number): number {
  const spec = FEATURES[feature];
  return spec.mean + standardized * spec.sd;
}
