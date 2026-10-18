// The enquiry and assessment use separate widgets/actions on one page.
let loading: Promise<void> | undefined;
export function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    const nonce =
      document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce;
    if (nonce) script.nonce = nonce;
    const timer = setTimeout(
      () => reject(new Error('Security unavailable')),
      15000,
    );
    script.onload = () => {
      clearTimeout(timer);
      window.turnstile ? resolve() : reject(new Error('Security unavailable'));
    };
    script.onerror = () => {
      clearTimeout(timer);
      reject(new Error('Security unavailable'));
    };
    document.head.append(script);
  });
  return loading;
}
