(() => {
  'use strict';
  window.__trip = true;
  const root = document.documentElement;
  const nav = document.querySelector('.jump');
  const navInner = document.querySelector('.jump-inner');
  const links = [...document.querySelectorAll('.jump a')];
  const days = [...document.querySelectorAll('.day[data-date]')];
  let navH = 60, active = '', pending = false, userNavigated = false;

  /* scroll reveal: elements are only hidden because the .js class exists */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px 10% 0px' });
    reveals.forEach(el => io.observe(el));
  } else reveals.forEach(el => el.classList.add('in'));

  function measure() {
    navH = nav.getBoundingClientRect().height;
    root.style.setProperty('--nav-h', `${navH}px`);
    schedule();
  }
  function update() {
    pending = false;
    const current = days.reduce((hit, s) => s.getBoundingClientRect().top <= navH + 48 ? s : hit, days[0]);
    if (!current || current.id === active) return;
    active = current.id;
    links.forEach(a => {
      if (a.dataset.day === active) {
        a.setAttribute('aria-current', 'true');
        const r = a.getBoundingClientRect(), box = navInner.getBoundingClientRect();
        if (r.left < box.left || r.right > box.right) navInner.scrollTo({ left: navInner.scrollLeft + r.left - box.left - (box.width - r.width) / 2 });
      } else a.removeAttribute('aria-current');
    });
  }
  function schedule() { if (!pending) { pending = true; requestAnimationFrame(update); } }

  measure();
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(nav);
  addEventListener('resize', measure);
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('hashchange', () => { userNavigated = true; schedule(); });
  document.addEventListener('click', e => { if (e.target.closest('a[href^="#"]')) userNavigated = true; });

  /* jump to today (Sydney time). Test with ?today=2026-11-29 */
  function jumpToToday() {
    if (location.hash || userNavigated) return;
    const override = new URLSearchParams(location.search).get('today');
    const parts = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const v = t => parts.find(p => p.type === t).value;
    const today = override && /^\d{4}-\d{2}-\d{2}$/.test(override) ? override : `${v('year')}-${v('month')}-${v('day')}`;
    const target = days.find(s => s.dataset.date === today);
    if (target) {
      const link = links.find(a => a.dataset.day === target.id);
      if (link) link.insertAdjacentHTML('beforeend', ' <small>today</small>');
      target.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
    schedule();
  }
  if (document.readyState === 'complete') jumpToToday();
  else addEventListener('load', jumpToToday, { once: true });
})();
