(() => {
  const days = [...document.querySelectorAll('.day[data-date]')];
  const nav = document.querySelector('.day-nav');
  const pills = [...document.querySelectorAll('.day-pill')];
  const strip = nav?.querySelector('.nav-inner');
  if (!days.length || !nav) return;

  let activeDay = null;
  function revealPill(pill) {
    if (!strip || !pill) return;
    const bounds = strip.getBoundingClientRect();
    const rect = pill.getBoundingClientRect();
    // Move only the strip, never the page; leave room for the focus outline.
    if (rect.left < bounds.left + 8) strip.scrollLeft += rect.left - bounds.left - 8;
    else if (rect.right > bounds.right - 8) strip.scrollLeft += rect.right - bounds.right + 8;
  }
  function activate(day) {
    if (day === activeDay) return;
    activeDay = day;
    pills.forEach(pill => {
      if (day && pill.hash === `#${day.id}`) {
        pill.setAttribute('aria-current', 'location');
        revealPill(pill);
      }
      else pill.removeAttribute('aria-current');
    });
  }
  let frame = 0;
  function update() {
    frame = 0;
    const bottom = nav.getBoundingClientRect().bottom + 2;
    const current = days.filter(day => day.getBoundingClientRect().top <= bottom).at(-1);
    activate(current || null);
  }
  function scheduleUpdate() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  function measureNav() {
    const height = nav.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--nav-height', `${height}px`);
    scheduleUpdate();
    revealPill(pills.find(pill => pill.hasAttribute('aria-current')));
  }
  measureNav();
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', measureNav, { passive: true });
  window.addEventListener('load', measureNav, { once: true });
  if ('ResizeObserver' in window) new ResizeObserver(measureNav).observe(nav);
  pills.forEach(pill => {
    pill.addEventListener('focus', () => revealPill(pill));
    pill.addEventListener('click', measureNav);
  });

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const datePart = type => parts.find(part => part.type === type).value;
  const today = new URLSearchParams(location.search).get('today') ||
    `${datePart('year')}-${datePart('month')}-${datePart('day')}`;
  const currentDay = days.find(day => day.dataset.date === today);
  if (currentDay) {
    currentDay.querySelector('.today-badge').hidden = false;
    const pill = pills.find(item => item.hash === `#${currentDay.id}`);
    if (pill) pill.querySelector('.today-badge').hidden = false;
    measureNav();
    if (!location.hash) {
      requestAnimationFrame(() => {
        currentDay.scrollIntoView({ behavior: 'instant', block: 'start' });
        scheduleUpdate();
      });
    }
  }
})();
