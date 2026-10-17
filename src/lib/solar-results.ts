import type { SolarRoof } from '../../worker/solar';
import { billSlider } from '../data/solar';

// Owner approved 18 October 2026. Illustration, not a measured inverter efficiency.
export const rooftopAssumptions = { version: '2026-10-18.1', dcToAc: 0.85 };
export function rooftopResults(
  roof: SolarRoof,
  targetKw: number,
  panelsCount?: number,
) {
  if (
    !Number.isFinite(targetKw) ||
    targetKw <= 0 ||
    !Number.isFinite(roof.panelCapacityWatts) ||
    roof.panelCapacityWatts <= 0 ||
    !roof.configurations.length
  )
    return null;
  if (
    roof.configurations.some(
      (c) =>
        !Number.isSafeInteger(c.panelsCount) ||
        c.panelsCount < 1 ||
        c.panelsCount > roof.panels.length ||
        !Number.isFinite(c.yearlyEnergyDcKwh) ||
        c.yearlyEnergyDcKwh <= 0,
    )
  )
    return null;
  const selected =
    panelsCount === undefined
      ? roof.configurations.reduce((best, candidate) => {
          const distance = Math.abs(
            candidate.panelsCount * roof.panelCapacityWatts - targetKw * 1000,
          );
          const bestDistance = Math.abs(
            best.panelsCount * roof.panelCapacityWatts - targetKw * 1000,
          );
          return distance < bestDistance - 1e-7 ||
            (Math.abs(distance - bestDistance) < 1e-7 &&
              candidate.panelsCount < best.panelsCount)
            ? candidate
            : best;
        })
      : roof.configurations.find((c) => c.panelsCount === panelsCount);
  if (!selected) return null;
  const capacityKw = (selected.panelsCount * roof.panelCapacityWatts) / 1000;
  const maximumKw = Math.max(
    ...roof.configurations.map(
      (c) => (c.panelsCount * roof.panelCapacityWatts) / 1000,
    ),
  );
  const annualAc = selected.yearlyEnergyDcKwh * rooftopAssumptions.dcToAc;
  return {
    panelsCount: selected.panelsCount,
    capacityKw,
    maximumKw,
    limited: maximumKw < targetKw,
    annualDc: selected.yearlyEnergyDcKwh,
    annualAc,
    monthlyAc: annualAc / 12,
    monthlyValue: (annualAc * billSlider.tariff) / 12,
  };
}
