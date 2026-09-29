import { estimateSolar } from '../data/solar';

const root = document.querySelector<HTMLElement>('[data-solar-calculator]');
if (root) {
  const form = root.querySelector<HTMLFormElement>('form')!;
  const mode = form.elements.namedItem('mode') as HTMLSelectElement;
  const connection = form.elements.namedItem('connection') as HTMLSelectElement;
  const amount = form.elements.namedItem('amount') as HTMLInputElement;
  const tariff = form.elements.namedItem('tariff') as HTMLInputElement;
  const result = root.querySelector<HTMLElement>('[data-solar-result]')!;
  const error = root.querySelector<HTMLElement>('[data-calculator-error]')!;
  const enquiry = root.querySelector<HTMLAnchorElement>(
    '[data-calculator-enquiry] a',
  )!;
  const genericEnquiry = enquiry.href;
  const money = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  form.querySelector('fieldset')!.disabled = false;

  function update() {
    const residential = connection.value === 'residential';
    const estimate = form.checkValidity()
      ? estimateSolar({
          mode: mode.value as 'bill' | 'units',
          amount: amount.valueAsNumber,
          tariff: tariff.valueAsNumber,
          residential,
        })
      : null;
    result.hidden = !estimate;
    error.hidden = !!estimate;
    enquiry.href = genericEnquiry;
    if (!estimate) {
      error.textContent =
        mode.value === 'units'
          ? 'Enter monthly consumption between 1 and 12,000 units. For larger systems, ask us for a tailored assessment.'
          : 'Enter a monthly bill from ₹1 to ₹1,00,000 and a rate from ₹1 to ₹30 per unit. For estimates above 12,000 units a month, ask us for a tailored assessment.';
      return;
    }
    for (const [key, value] of Object.entries(estimate)) {
      const target = root!.querySelector(`[data-result="${key}"]`);
      if (target)
        target.textContent =
          key === 'subsidy'
            ? residential
              ? `Up to ${money.format(value)}`
              : 'Not eligible'
            : value.toLocaleString('en-IN');
    }
    root!.querySelector('[data-subsidy-note]')!.textContent = residential
      ? 'For an eligible residential installation. Approval and scheme conditions apply.'
      : 'PM Surya Ghar household subsidy does not apply to commercial connections.';
    const basis =
      mode.value === 'bill'
        ? `monthly bill ${money.format(amount.valueAsNumber)}, assumed rate ${tariff.valueAsNumber.toFixed(2)} rupees/unit`
        : `${estimate.units} units/month`;
    const message = `Hi Incetekh, I would like a free site visit in Andhra Pradesh. ${residential ? 'Residential' : 'Commercial'} connection; ${basis}. Your planning calculator estimated ${estimate.kw} kW and about ${estimate.roofM2} m² clear roof. Please confirm suitability and subsidy eligibility.`;
    const enquiryUrl = new URL(genericEnquiry);
    enquiryUrl.searchParams.set('text', message);
    enquiry.href = enquiryUrl.href;
  }
  mode.addEventListener('change', () => {
    const units = mode.value === 'units';
    root.querySelector('[data-amount-label]')!.textContent = units
      ? 'Monthly consumption (units / kWh)'
      : 'Monthly bill (₹)';
    root.querySelector<HTMLElement>('[data-tariff-field]')!.hidden = units;
    tariff.disabled = units;
    amount.max = units ? '12000' : '100000';
    // Each mode has an explicit fresh example; never silently reinterpret rupees as kWh.
    amount.value = units ? '300' : '2400';
    update();
  });
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    update();
  });
  update();
}
