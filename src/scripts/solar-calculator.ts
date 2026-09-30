import { estimateSolar, billSlider } from '../data/solar';

const root = document.querySelector<HTMLElement>('[data-solar-calculator]');
if (root) {
  const slider = root.querySelector<HTMLInputElement>('#solar-bill')!;
  const money = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });
  slider.disabled = false;
  root.querySelector('fieldset')!.disabled = false;
  function update() {
    const residential =
      root!.querySelector<HTMLInputElement>(
        'input[name="solar-connection"]:checked',
      )!.value === 'residential';
    const estimate = estimateSolar({
      mode: 'bill',
      amount: slider.valueAsNumber,
      tariff: billSlider.tariff,
      residential,
    })!;
    const bill = money.format(slider.valueAsNumber);
    root!.querySelector('[data-bill-value]')!.textContent = bill;
    slider.setAttribute(
      'aria-valuetext',
      `${slider.valueAsNumber.toLocaleString('en-IN')} rupees per month`,
    );
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
  }
  root.addEventListener('input', update);
  update();
}
