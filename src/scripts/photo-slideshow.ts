import { t } from '../i18n/text';

const gallery = document.querySelector<HTMLElement>('.project-gallery');
if (gallery) {
  const track = gallery.querySelector<HTMLElement>('.gallery-track')!;
  const slides = [...gallery.querySelectorAll<HTMLElement>('.gallery-slide')];
  const dots = [...gallery.querySelectorAll<HTMLButtonElement>('.gallery-dot')];
  const toggle = gallery.querySelector<HTMLButtonElement>('.gallery-toggle')!;
  const controls = gallery.querySelector<HTMLElement>('.gallery-controls')!;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = preference.matches;
  let active = 0;
  let paused = false;
  let visible = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const show = (index: number) => {
    active = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.toggleAttribute('data-active', i === active);
      slide.setAttribute('aria-hidden', String(i !== active));
      dots[i].setAttribute('aria-pressed', String(i === active));
    });
  };
  const sync = () => {
    clearTimeout(timer);
    toggle.hidden = reduced;
    toggle.dataset.paused = String(paused);
    toggle.setAttribute(
      'aria-label',
      t(`${paused ? 'Resume' : 'Pause'} gallery`),
    );
    if (!paused && !reduced && visible && !document.hidden) {
      timer = setTimeout(() => {
        show(active + 1);
        sync();
      }, 5000);
    }
  };
  const choose = (index: number) => {
    paused = true;
    show(index);
    sync();
  };
  dots.forEach((dot, index) =>
    dot.addEventListener('click', () => choose(index)),
  );
  toggle.addEventListener('click', () => {
    paused = !paused;
    sync();
  });
  gallery.addEventListener('focusin', (event) => {
    if (event.target !== toggle) {
      paused = true;
      sync();
    }
  });
  gallery.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      choose(active + (event.key === 'ArrowRight' ? 1 : -1));
      if (dots.includes(document.activeElement as HTMLButtonElement))
        dots[active].focus();
    }
  });
  let touchStart: { x: number; y: number } | undefined;
  track.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch') return;
    touchStart = { x: event.clientX, y: event.clientY };
    paused = true;
    sync();
  });
  track.addEventListener('pointerup', (event) => {
    if (!touchStart) return;
    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy))
      choose(active + (dx < 0 ? 1 : -1));
    touchStart = undefined;
  });
  track.addEventListener('pointercancel', () => {
    touchStart = undefined;
  });
  preference.addEventListener('change', (event) => {
    reduced = event.matches;
    sync();
  });
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }).observe(track);
  gallery.dataset.ready = 'true';
  controls.hidden = false;
  show(0);
  sync();
}
