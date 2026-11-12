import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('./', import.meta.url);
const readJSON = async name => JSON.parse(await readFile(new URL(name, root), 'utf8'));
const content = await readJSON('content.json');
let photos;
try {
  photos = await readJSON('photos.json');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  photos = Object.fromEntries(Object.entries({
    opera: 'Sydney Opera House', bridge: 'Sydney Harbour Bridge',
    ayrfield: 'SS Ayrfield shipwreck', brickpit: 'Brickpit Ring Walk',
    skyway: 'Scenic Skyway in the Blue Mountains', sisters: 'The Three Sisters',
    bondi: 'Bondi Beach', icebergs: 'Bondi Icebergs ocean pool', newcastle: 'Newcastle waterfront',
  }).map(([key, alt]) => [key, {
    src: `img/${key}.jpg`, w: 1400, h: 900, alt,
    credit: 'Placeholder — credit pending', license: 'License pending',
    source: '',
  }]));
  await writeFile(new URL('photos.json', root), JSON.stringify(photos, null, 2) + '\n', { flag: 'wx' });
}

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[c]);
const link = (url, label) => `<a class="button" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`;
const map = query => query ? link(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '📍 Map') : '';
const links = items => items?.length ? `<div class="actions">${items.map(item => link(item.url, item.label)).join('')}</div>` : '';
const usedPhotos = new Set();
function photo(key, hero = false) {
  const p = photos[key];
  if (!p) throw new Error(`Missing photo metadata: ${key}`);
  usedPhotos.add(key);
  return `<img src="${esc(p.src)}" width="${esc(p.w)}" height="${esc(p.h)}" alt="${esc(p.alt)}" ${hero ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}
const warning = compact => `<aside class="warning${compact ? ' compact' : ''}" aria-label="Food and allergy notice"><strong><span aria-hidden="true">⚠️</span> Food &amp; allergy reminder</strong><p>${esc(content.foodNote)}</p></aside>`;
function cards(items, food = false) {
  return `<div class="cards">${items.map(item => `<article class="card"><h4>${esc(item.name)}</h4>${item.price ? `<span class="chip price">${esc(item.price)}</span>` : ''}<p>${esc(item.text)}</p><div class="actions">${food && item.url ? link(item.url, 'Menu / website') : ''}${map(item.map)}</div></article>`).join('')}</div>`;
}
function daySection(day) {
  return `<section class="day" id="${esc(day.id)}" data-date="${esc(day.date)}" aria-labelledby="${esc(day.id)}-title">
    <header class="day-header">
      <div class="photo-banner">${photo(day.photos[0])}<div class="overlay wrap"><p class="eyebrow">${esc(day.short)} <span class="today-badge" hidden>TODAY</span></p><h2 id="${esc(day.id)}-title">${esc(day.title)}</h2></div></div>
      <div class="wrap day-summary"><p>${esc(day.summary)}</p><span class="chip">${esc(day.pace)}</span></div>
    </header>
    <div class="wrap day-body">
      <section class="block"><h3>Today's plan</h3><ol class="timeline">${day.schedule.map(item => `<li><strong class="time">${esc(item.time)}</strong><div><p>${esc(item.text)}</p>${map(item.map)}</div></li>`).join('')}</ol></section>
      ${day.highlights ? `<section class="block"><h3>${esc(day.highlights.heading)}</h3>${cards(day.highlights.items)}${day.highlights.note ? `<aside class="callout">${esc(day.highlights.note)}</aside>` : ''}</section>` : ''}
      ${day.photos.slice(1).map(key => `<figure>${photo(key)}<figcaption>${esc(photos[key].alt)}</figcaption></figure>`).join('')}
      ${day.train ? `<section class="block train"><h3>${esc(day.train.heading)}</h3><ol class="steps">${day.train.steps.map(step => `<li>${esc(step)}</li>`).join('')}</ol>${links(day.train.links)}</section>` : ''}
      ${day.practical ? `<section class="block practical"><h3>${esc(day.practical.heading)}</h3><p>${esc(day.practical.text)}</p>${links(day.practical.links)}</section>` : ''}
      ${day.food?.length ? `<section class="block"><h3>${esc(day.foodHeading)}</h3>${warning(true)}${cards(day.food, true)}</section>` : ''}
      ${day.treats?.length ? `<section class="block"><h3>${esc(day.treatsHeading ?? 'Treats')}</h3>${cards(day.treats, true)}</section>` : ''}
    </div>
  </section>`;
}

const hero = photo(content.hero, true);
const days = content.days.map(daySection).join('\n');
const credits = [...usedPhotos].map(key => {
  const p = photos[key];
  const label = esc(`${p.alt} — ${p.credit}, ${p.license}`);
  return `<li>${p.source ? `<a href="${esc(p.source)}" target="_blank" rel="noopener">${label}</a>` : label}</li>`;
}).join('');
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <meta name="theme-color" content="#143d46">
  <title>${esc(content.title)}</title>
  <link rel="stylesheet" href="style.css">
  <script src="app.js" defer></script>
</head>
<body>
  <a class="skip-link button" href="#main">Skip to trip details</a>
  <header class="hero photo-banner">${hero}<div class="overlay wrap"><p class="eyebrow">${esc(content.subtitle)}</p><h1>${esc(content.title)}</h1><p>${esc(content.tagline)}</p></div></header>
  <nav class="day-nav" aria-label="Trip days"><div class="nav-inner">${content.days.map(day => `<a class="day-pill" href="#${esc(day.id)}">${esc(day.short)}<span class="today-badge" hidden>TODAY</span></a>`).join('')}</div></nav>
  <main id="main" tabindex="-1">
    <div class="wrap intro">
      <section class="home card"><h2>${esc(content.home.label)}</h2><p>${esc(content.home.address)}</p>${link(content.home.map, 'Open in Maps')}</section>
      <section class="essentials-section"><h2>Trip essentials</h2><dl class="essentials">${content.essentials.map(item => `<div><dt><span class="icon" aria-hidden="true">${esc(item.icon)}</span>${esc(item.label)}</dt><dd>${esc(item.value)}</dd></div>`).join('')}</dl></section>
      ${warning(false)}
    </div>
    ${days}
  </main>
  <footer class="wrap"><p>${esc(content.footer)}</p><h2>Photo credits</h2><ul class="credits">${credits}</ul><a class="button" href="#top">Back to top ↑</a></footer>
</body>
</html>
`;
await writeFile(new URL('index.html', root), html);
console.log(`Built index.html: ${content.days.length} days, ${usedPhotos.size} photos.`);
