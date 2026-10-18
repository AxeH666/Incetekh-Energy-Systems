import {
  estimateSolar,
  billSlider,
  financialEstimate,
  usageProfile,
} from '../data/solar';
import { t } from '../i18n/text';
import { languageOf } from '../i18n/languages';
import {
  readSolarSession,
  writeSolarSession,
  type SolarSession,
} from '../lib/solar-session';

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
  const prior = readSolarSession();
  if (prior) {
    slider.value = String(prior.bill);
    root.querySelector<HTMLInputElement>(
      `input[value="${prior.residential ? 'residential' : 'commercial'}"]`,
    )!.checked = true;
  }
  const planner = root.closest<HTMLElement>('#solar-planner')!;
  for (const previewLink of planner.querySelectorAll<HTMLAnchorElement>(
    '[data-preview-link], [data-capacity-preview]',
  ))
    previewLink.addEventListener('click', (event) => {
      event.preventDefault();
      const requestedKw = Number(previewLink.dataset.capacityPreview);
      const saved = writeSolarSession({
        version: 1,
        createdAt: Date.now(),
        bill: slider.valueAsNumber,
        residential:
          root.querySelector<HTMLInputElement>(
            'input[name="solar-connection"]:checked',
          )!.value === 'residential',
        language: languageOf(location.pathname),
        ...([3, 5, 7, 10].includes(requestedKw)
          ? { requestedKw: requestedKw as SolarSession['requestedKw'] }
          : {}),
      });
      if (saved) location.assign('/solar-preview/');
      else
        previewLink.parentElement!.querySelector(
          '[data-preview-handoff-status]',
        )!.textContent =
          'Preview needs temporary session storage. Your calculator still works; please arrange a free site visit.';
    });
  void fetch('/api/solar-preview-config', { cache: 'no-store' })
    .then((response) => (response.ok ? response.json() : null))
    .then((config) => {
      if (config?.enabled === true)
        planner
          .querySelectorAll<HTMLElement>('[data-preview-entry]')
          .forEach((entry) => {
            entry.hidden = false;
          });
    })
    .catch(() => {});
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
