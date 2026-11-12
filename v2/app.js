(() => {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof window.Swiper === 'function') {
    document.querySelectorAll('.gallery').forEach(el => {
      try {
        new window.Swiper(el, {
          loop: false,
          speed: reduceMotion ? 0 : 300,
          a11y: { enabled: true },
          keyboard: { enabled: true, onlyInViewport: true },
          pagination: { el: el.querySelector('.swiper-pagination'), clickable: true },
        });
      } catch (error) {
        el.classList.remove('swiper-initialized');
        console.warn('Gallery remains available by scrolling.', error);
      }
    });
  }
  if (typeof window.GLightbox === 'function') {
    try {
      window.GLightbox({ selector: '.glightbox', touchNavigation: true, loop: false,
        openEffect: reduceMotion ? 'none' : 'zoom', closeEffect: reduceMotion ? 'none' : 'zoom',
        slideEffect: reduceMotion ? 'none' : 'slide' });
    } catch (error) { console.warn('Photos remain available as direct links.', error); }
  }
  const nav = document.querySelector('.daybar');
  const navInner = document.querySelector('.daybar-inner');
  const days = [...document.querySelectorAll('.day[data-date]')];
  const pills = [...document.querySelectorAll('.day-pill')];
  let navHeight = 0;
  let active = '';
  let pending = false;
  function measure() {
    navHeight = nav.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--nav-height', `${navHeight}px`);
    scheduleUpdate();
  }
  function update() {
    pending = false;
    const current = days.reduce((result, section) => section.getBoundingClientRect().top <= navHeight + 32 ? section : result, days[0]);
    if (!current || current.id === active) return;
    active = current.id;
    pills.forEach(pill => {
      const selected = pill.hash === `#${active}`;
      if (selected) {
        pill.setAttribute('aria-current', 'true');
        const item = pill.getBoundingClientRect();
        const box = navInner.getBoundingClientRect();
        if (item.left < box.left || item.right > box.right) {
          navInner.scrollTo({ left: navInner.scrollLeft + item.left - box.left - (box.width - item.width) / 2, behavior: 'auto' });
        }
      } else pill.removeAttribute('aria-current');
    });
  }
  function scheduleUpdate() {
    if (!pending) { pending = true; requestAnimationFrame(update); }
  }
  measure();
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(nav);
  window.addEventListener('resize', measure);
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  let userNavigated = false;
  window.addEventListener('hashchange', () => { userNavigated = true; scheduleUpdate(); });
  document.addEventListener('click', event => {
    if (event.target.closest('a[href^="#"]')) userNavigated = true;
  });
  function jumpToToday() {
    if (location.hash || userNavigated) return;
    const override = new URLSearchParams(location.search).get('today');
    const parts = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const value = type => parts.find(p => p.type === type).value;
    const today = override && /^\d{4}-\d{2}-\d{2}$/.test(override) ? override : `${value('year')}-${value('month')}-${value('day')}`;
    const target = days.find(section => section.dataset.date === today);
    measure();
    if (target) target.scrollIntoView({ behavior: 'auto', block: 'start' });
    scheduleUpdate();
  }
  if (document.readyState === 'complete') jumpToToday();
  else window.addEventListener('load', jumpToToday, { once: true });
})();
