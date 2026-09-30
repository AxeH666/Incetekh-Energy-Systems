// Planning assumptions, not a site-specific production or financial forecast.
// Source/eligibility notes: docs/SOLAR-PLANNING.md.
export const planning = {
  dailyYield: 4,
  roofM2PerKw: 10,
  maxMonthlyUnits: 12_000,
};

// Founder-approved generation-value scenario, not a tariff or installation quote.
export const calculatorAssumptions = {
  daysPerMonth: 30,
  roofSqftPerKw: 100,
  budgetPerKw: 70_000,
};

export const billSlider = {
  min: 200,
  max: 50_000,
  step: 100,
  initial: 2500,
  tariff: 8,
};

// Disclosed comparison scenario, not an installation quote or tariff model.
export function financialEstimate(kw: number, subsidy: number) {
  const cost = kw * calculatorAssumptions.budgetPerKw;
  const monthlySavings =
    kw *
    planning.dailyYield *
    calculatorAssumptions.daysPerMonth *
    billSlider.tariff;
  const savings25 = monthlySavings * 12 * 25;
  return {
    cost,
    monthlySavings,
    payback: (cost - subsidy) / (monthlySavings * 12),
    savings25,
  };
}

export function usageProfile(kw: number, residential: boolean) {
  if (!residential)
    return kw <= 3
      ? 'Shop / clinic / small office'
      : kw <= 10
        ? 'Office / retail / daytime business use'
        : 'Larger commercial premises';
  if (kw < 3) return 'Small home · fans, lights & everyday essentials';
  if (kw < 5) return 'Family home · 2 ACs + 2 fans';
  if (kw < 7) return 'Larger home · 3 ACs + 3 fans';
  return 'High-use home · 4 ACs + 5 fans';
}

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
  const kw = Math.max(
    1,
    Math.ceil(
      units / (planning.dailyYield * calculatorAssumptions.daysPerMonth),
    ),
  );
  const roofSqft = kw * calculatorAssumptions.roofSqftPerKw;
  return {
    units: Math.round(units),
    kw,
    monthlyGeneration:
      kw * planning.dailyYield * calculatorAssumptions.daysPerMonth,
    roofM2: Math.round(roofSqft / 10.7639),
    roofSqft,
    subsidy: centralSubsidy(kw, residential),
  };
}

export const solarSources = {
  status:
    'https://www.pib.gov.in/FactsheetDetails.aspx?id=150868&lang=2&reg=48',
  subsidy: 'https://solar.delhi.gov.in/page/central-subsidy',
  portal: 'https://pmsuryaghar.gov.in/',
  faq: 'https://online.ndmc.gov.in/solar/FAQs.aspx',
  loan: 'https://indianbank.bank.in/en/pm-surya-ghar-muft-bijli-yojana-roof-top-solar-loan-scheme',
  tax: 'https://www.incometaxindia.gov.in/documents/20117/42998/Appendix-I_2026-05-05_02-00-13_4242fc_en.pdf/28d049ac-bf1e-a110-a258-deff0f8cc6f8?t=1779517231846&version=1.0',
};
