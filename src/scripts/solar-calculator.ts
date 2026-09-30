import {
  estimateSolar,
  billSlider,
  financialEstimate,
  usageProfile,
} from '../data/solar';
import { t } from '../i18n/text';

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
      t(`${slider.valueAsNumber.toLocaleString('en-IN')} rupees per month`),
    );
    for (const [key, value] of Object.entries(estimate)) {
      const target = root!.querySelector(`[data-result="${key}"]`);
      if (target)
        target.textContent =
          key === 'subsidy'
            ? residential
              ? t(`Up to ${money.format(value)}`)
              : t('40% depreciation')
            : value.toLocaleString('en-IN');
    }
    root!.querySelector('[data-profile]')!.textContent = t(
      usageProfile(estimate.kw, residential),
    );
    root!.querySelector('[data-benefit-label]')!.textContent = t(
      residential ? 'Potential subsidy' : 'Potential tax benefit',
    );
    const finance = financialEstimate(estimate.kw, estimate.subsidy);
    for (const key of ['monthlySavings', 'payback', 'savings25'] as const) {
      root!.querySelector(`[data-finance="${key}"]`)!.textContent =
        key === 'payback'
          ? t(`${finance[key].toFixed(1)} years`)
          : key === 'savings25'
            ? t(`₹${(finance[key] / 100000).toFixed(1)} lakh`)
            : money.format(finance[key]);
    }
    root!.querySelector('[data-subsidy-note]')!.textContent = t(
      residential
        ? 'For an eligible residential installation. Approval and scheme conditions apply.'
        : 'Tax deduction, not a cash subsidy. Eligibility and time in use apply; confirm with your tax adviser. Commercial connections are not eligible for the household subsidy.',
    );
  }
  root.addEventListener('input', update);
  update();
}
