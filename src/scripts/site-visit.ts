import { t } from '../i18n/text';

interface Turnstile {
  render(element: HTMLElement, options: Record<string, unknown>): string;
  reset(id: string): void;
}
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const form = document.querySelector<HTMLFormElement>('[data-site-visit-form]');
if (form) {
  const button = form.querySelector<HTMLButtonElement>(
    'button[type="submit"]',
  )!;
  const status = form.querySelector<HTMLElement>('[data-visit-status]')!;
  const widget = form.querySelector<HTMLElement>('[data-visit-security]')!;
  const sitekey = form.dataset.siteKey;
  let token = '';
  let widgetId: string | undefined;
  let pending = false;
  // Memory only. Keep the same ID after an uncertain response until details change.
  let attempt: { payload: string; id: string; received: boolean } | undefined;
  const show = (message: string, focus = true) => {
    status.hidden = false;
    status.textContent = t(message);
    if (focus) status.focus();
  };
  const securityError = () => {
    token = '';
    show(
      'The security check could not finish. Please try again or contact us on WhatsApp.',
      false,
    );
  };
  button.disabled = false;
  if (sitekey) {
    // Load only on pages with a configured form, exactly once. No analytics script.
    const script = document.createElement('script');
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onerror = securityError;
    script.onload = () => {
      if (!window.turnstile) return securityError();
      widgetId = window.turnstile.render(widget, {
        sitekey,
        action: 'site_visit',
        size: 'flexible',
        callback: (value: string) => {
          token = value;
        },
        'expired-callback': () => {
          token = '';
        },
        'error-callback': () => {
          securityError();
          return true;
        },
      });
    };
    document.head.append(script);
  }
  form.addEventListener('input', () => {
    if (!pending) status.hidden = true;
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (pending) return;
    if (!sitekey) {
      show(
        'Online requests are currently unavailable. Please contact us on WhatsApp to arrange your visit.',
      );
      return;
    }
    const data = new FormData(form);
    const values = {
      fullName: String(data.get('fullName') ?? '').trim(),
      phone: String(data.get('phone') ?? '').trim(),
      email: String(data.get('email') ?? '').trim(),
      location: String(data.get('location') ?? '').trim(),
      plan: String(data.get('plan') ?? ''),
      language: document.documentElement.lang,
    };
    const payload = JSON.stringify(values);
    if (attempt?.payload !== payload)
      attempt = { payload, id: crypto.randomUUID(), received: false };
    if (attempt.received) {
      show(
        'Your enquiry has been received. Our team will contact you to confirm availability. This is not a confirmed booking.',
      );
      return;
    }
    // Empty tokens are allowed on retries: the server can acknowledge an existing
    // receipt without consuming a new challenge. New rows always require validation.
    pending = true;
    button.disabled = true;
    const inputs = form.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      'input, select',
    );
    inputs.forEach((input) => {
      input.disabled = true;
    });
    form.setAttribute('aria-busy', 'true');
    show('Sending your enquiry. Please wait.');
    try {
      const response = await fetch('/api/site-visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, id: attempt.id, token }),
        signal: AbortSignal.timeout(15000),
        credentials: 'omit',
      });
      const result = await response.json();
      if (
        (response.status === 200 || response.status === 201) &&
        result.code === 'received' &&
        result.id === attempt.id
      ) {
        attempt.received = true;
        show(
          'Your enquiry has been received. Our team will contact you to confirm availability. This is not a confirmed booking.',
        );
      } else if (response.status === 429) {
        show(
          'Too many attempts. Please wait a minute before trying again, or contact us on WhatsApp.',
        );
      } else if (response.status === 422) {
        show('Please complete the security check and try again.');
      } else if (response.status === 400) {
        show('Please check your details and try again.');
      } else {
        show(
          'We could not confirm receipt. Your details are still on this page. Retry without changing them, or contact us on WhatsApp.',
        );
      }
    } catch {
      show(
        'We could not confirm receipt. Your details are still on this page. Retry without changing them, or contact us on WhatsApp.',
      );
    } finally {
      pending = false;
      button.disabled = false;
      inputs.forEach((input) => {
        input.disabled = false;
      });
      form.removeAttribute('aria-busy');
      token = '';
      if (widgetId !== undefined) window.turnstile?.reset(widgetId);
    }
  });
}
