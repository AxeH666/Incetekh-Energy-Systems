import { t } from '../i18n/text';

for (const section of document.querySelectorAll<HTMLElement>(
  '[data-floating-strip]',
)) {
  const track = section.querySelector<HTMLElement>('[data-strip-track]');
  const list = track?.querySelector<HTMLUListElement>('[data-strip-list]');
  const toggle = section.querySelector<HTMLButtonElement>(
    '[data-strip-toggle]',
  );
  if (section && track && list && toggle) {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let motionReduced = reducedMotion.matches;
    // One visual copy makes the boundary seamless. Assistive technology reads
    // the original list once; no links or focusable controls live in the copy.
    const copy = list.cloneNode(true) as HTMLUListElement;
    copy.setAttribute('aria-hidden', 'true');
    // The copy contains no interactive elements; allow pointer hover styling.
    copy.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    copy.querySelectorAll('img').forEach((img) => (img.alt = ''));
    const speed = Number(section.dataset.speed ?? 45) / 1000;
    let paused = false;
    let visible = false;
    let frame: number | null = null;
    let previousTime = 0;
    let position = 0;
    const cycleWidth = () =>
      list.getBoundingClientRect().width +
      parseFloat(getComputedStyle(track).columnGap);
    const canMove = () =>
      !paused &&
      visible &&
      !document.hidden &&
      !motionReduced &&
      document.activeElement !== track;
    const stop = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      previousTime = 0;
    };
    const tick = (time: number) => {
      frame = null;
      if (!canMove()) return;
      if (previousTime) {
        position =
          (position + Math.min(time - previousTime, 64) * speed) % cycleWidth();
        track.scrollLeft = position;
      }
      previousTime = time;
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      stop();
      toggle.hidden = motionReduced;
      if (motionReduced) {
        copy.remove();
      } else if (!copy.isConnected) track.append(copy);
      if (canMove()) {
        position = track.scrollLeft % cycleWidth();
        frame = requestAnimationFrame(tick);
      }
    };
    const updateLabel = () => {
      toggle.setAttribute(
        'aria-label',
        t(`${paused ? 'Resume' : 'Pause'} scrolling`),
      );
      toggle.dataset.paused = String(paused);
    };
    toggle.addEventListener('click', () => {
      paused = !paused;
      updateLabel();
      sync();
    });
    const pauseForInteraction = () => {
      paused = true;
      updateLabel();
      sync();
    };
    track.addEventListener('pointerdown', pauseForInteraction);
    // Vertical page scrolling must not silently turn off the floating strip.
    track.addEventListener(
      'wheel',
      (event) => {
        if (Math.abs(event.deltaX) > 0 || event.shiftKey) pauseForInteraction();
      },
      { passive: true },
    );
    track.addEventListener('keydown', pauseForInteraction);
    track.addEventListener('focus', sync);
    track.addEventListener('blur', sync);
    reducedMotion.addEventListener('change', (event) => {
      motionReduced = event.matches;
      sync();
    });
    document.addEventListener('visibilitychange', sync);
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }).observe(track);
    sync();
  }
}
