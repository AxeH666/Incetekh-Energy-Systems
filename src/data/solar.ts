// Planning assumptions, not a site-specific production or financial forecast.
// Source/eligibility notes: docs/SOLAR-PLANNING.md.
export const planning = {
  dailyYield: 4,
  roofM2PerKw: 10,
  maxMonthlyUnits: 12_000,
};

export function centralSubsidy(kw: number, residential: boolean): number {
  if (!residential || !Number.isFinite(kw) || kw <= 0) return 0;
  return Math.round(
    Math.min(kw, 2) * 30_000 + Math.min(Math.max(kw - 2, 0), 1) * 18_000,
  );
}

export function estimateSolar(input: {
  mode: 'bill' | 'units';
  amount: number;
  tariff: number;
  residential: boolean;
}) {
  const { mode, amount, tariff, residential } = input;
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    (mode === 'bill' && (!Number.isFinite(tariff) || tariff < 1 || tariff > 30))
  )
    return null;
  const units = mode === 'bill' ? amount / tariff : amount;
  if (units > planning.maxMonthlyUnits) return null;
  const kw = Math.max(1, Math.ceil(units / (planning.dailyYield * 30)));
  return {
    units: Math.round(units),
    kw,
    monthlyGeneration: kw * planning.dailyYield * 30,
    roofM2: kw * planning.roofM2PerKw,
    roofSqft: Math.ceil(kw * planning.roofM2PerKw * 10.7639),
    subsidy: centralSubsidy(kw, residential),
  };
}

export const solarSources = {
  status:
    'https://www.pib.gov.in/FactsheetDetails.aspx?id=150868&lang=2&reg=48',
  subsidy: 'https://solar.delhi.gov.in/page/central-subsidy',
  portal: 'https://pmsuryaghar.gov.in/',
  faq: 'https://online.ndmc.gov.in/solar/FAQs.aspx',
};
