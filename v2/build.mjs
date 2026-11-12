import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('./', import.meta.url);
const content = JSON.parse(await readFile(new URL('content.json', root), 'utf8'));
let photos;
try {
  photos = JSON.parse(await readFile(new URL('photos.json', root), 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  photos = {};
  await writeFile(new URL('photos.json', root), '{}\n');
}
const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[ch]));
const url = value => /^(https?:\/\/|\.\.?\/|\/|#)/i.test(value ?? '') || /^[\w-][\w./-]*$/.test(value ?? '') ? escape(value) : '#';
const mapURL = value => /^https?:\/\//i.test(value) ? value : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
const link = (href, label, cls = 'button') => `<a class="${cls}" href="${url(href)}">${escape(label)}</a>`;
const missing = new Set();
const used = new Set();
function photo(key, gallery, eager = false) {
  const p = photos[key];
  if (!p?.src) {
    if (!missing.has(key)) console.warn(`Warning: missing photo key "${key}"; rendering without image.`);
    missing.add(key);
    return '';
  }
  used.add(key);
  const w = Number(p.w) > 0 ? Number(p.w) : 1200;
  const h = Number(p.h) > 0 ? Number(p.h) : 900;
  return `<a class="glightbox photo" data-gallery="${escape(gallery)}" href="${url(p.src)}" data-description="${escape(`${p.alt ?? ''} — ${p.credit ?? ''}`)}"><img src="${url(p.src)}" alt="${escape(p.alt)}" width="${w}" height="${h}" loading="${eager ? 'eager' : 'lazy'}"${eager ? ' fetchpriority="high"' : ''}></a>`;
}
function gallery(keys, id, hero = false) {
  let first = true;
  const slides = (keys ?? []).map(key => {
    const img = photo(key, id, hero && first);
    if (!img) return '';
    first = false;
    return `<div class="swiper-slide">${img}</div>`;
  }).join('');
  return slides ? `<div class="swiper gallery${hero ? ' hero-gallery' : ''}" aria-label="${escape(hero ? 'Sydney trip photos' : `${id} photos`)}"><div class="swiper-wrapper">${slides}</div><div class="swiper-pagination"></div></div>` : '';
}
function cards(items, heading, id, intro = '') {
  if (!items?.length) return '';
  return `<section class="block"><h3>${escape(heading)}</h3>${intro ? `<p>${escape(intro)}</p>` : ''}<div class="card-row" tabindex="0" role="region" aria-label="${escape(heading)}">${items.map(item => `<article class="place-card">${item.photo ? photo(item.photo, id) : ''}<h4>${escape(item.name)}</h4>${item.price ? `<span class="price-pill">${escape(item.price)}</span>` : ''}<p>${escape(item.text)}</p><div class="actions">${item.url ? link(item.url, 'Menu / website') : ''}${item.map ? link(mapURL(item.map), 'Map') : ''}</div></article>`).join('')}</div></section>`;
}
const links = list => (list ?? []).map(l => link(l.url, l.label)).join('');
const pin = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
const timeline = (items, d) => `<ol class="timeline">${items.map(s => `<li><span class="schedule-time">${escape(s.time)}</span><div><p>${escape(s.text)}</p>${d.id === 'fri' && s.text.includes('Eating near home') ? '<a href="#near-home">Eating near home</a>' : ''}</div>${s.map ? `<a class="map-icon" href="${url(mapURL(s.map))}" aria-label="${escape(`Open in Maps: ${s.map}`)}">${pin}</a>` : ''}</li>`).join('')}</ol>`;
const options = (o, d) => o?.items?.length ? `<section class="block"><h3>${escape(o.heading)}</h3>${o.items.map(it => `<details class="option"><summary>${escape(it.name)}</summary><p class="option-who">${escape(it.who)}</p>${timeline(it.schedule, d)}${it.note ? `<p class="note">${escape(it.note)}</p>` : ''}</details>`).join('')}</section>` : '';
function day(d) {
  const images = gallery(d.gallery, d.id);
  return `<section class="day day-${escape(d.id)}${images ? ' has-gallery' : ''}" id="${escape(d.id)}" data-date="${escape(d.date)}" aria-labelledby="${escape(d.id)}-title">
    ${images}<header class="day-band"><div class="day-heading"><span class="date-number">${escape(d.num)}</span><div><time datetime="${escape(d.date)}">${escape(d.dow)}</time><h2 id="${escape(d.id)}-title">${escape(d.title)}</h2></div></div><p>${escape(d.summary)}</p><span class="pace">${escape(d.pace)}</span></header>
    ${d.schedule?.length ? `<section class="block"><h3>Plan</h3>${timeline(d.schedule, d)}${d.timesNote ? `<p class="note">${escape(d.timesNote)}</p>` : ''}</section>` : ''}${options(d.options, d)}
    ${d.places ? cards(d.places.items, d.places.heading, d.id) + (d.places.note ? `<p class="note inset">${escape(d.places.note)}</p>` : '') : ''}
    ${d.parking ? `<section class="block"><h3>${escape(d.parking.heading)}</h3><ul class="parking">${d.parking.options.map(p => `<li><h4>${escape(p.name)}</h4><p>${escape(p.walk)}</p><p class="parking-price">${escape(p.price)}</p><div class="actions">${p.map ? link(mapURL(p.map), 'Map') : ''}${p.url ? link(p.url, 'Info') : ''}</div></li>`).join('')}</ul>${d.parking.note ? `<p class="note">${escape(d.parking.note)}</p>` : ''}<div class="actions">${links(d.parking.links)}</div></section>` : ''}
    ${d.train ? `<section class="block"><h3>${escape(d.train.heading)}</h3><ol class="train-steps">${d.train.steps.map(s => `<li>${escape(s)}</li>`).join('')}</ol><div class="actions">${links(d.train.links)}</div></section>` : ''}
    ${cards(d.food, d.foodHeading || 'Food', d.id)}${cards(d.treats, d.treatsHeading || 'Treats', d.id)}
  </section>`;
}
const hero = gallery(content.heroGallery, 'hero', true);
const days = content.days.map(day).join('');
const nearHome = cards(content.nearHome.items, content.nearHome.heading, 'near-home', content.nearHome.intro);
const credits = [...used].map(key => {
  const p = photos[key];
  return `<li>${escape(p.alt)} — ${escape(p.credit)}${p.license ? ` (${escape(p.license)})` : ''}${p.source ? ` ${link(p.source, 'Source', 'credit-link')}` : ''}</li>`;
}).join('');
await writeFile(new URL('index.html', root), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><meta name="theme-color" content="#0B5C8A"><title>${escape(content.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;700&family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="vendor/swiper-bundle.min.css"><link rel="stylesheet" href="vendor/glightbox.min.css"><link rel="stylesheet" href="style.css"><script defer src="vendor/swiper-bundle.min.js"></script><script defer src="vendor/glightbox.min.js"></script><script defer src="app.js"></script></head>
<body><a class="skip-link" href="#main">Skip to trip plan</a><header class="hero${hero ? '' : ' no-photos'}">${hero}<div class="hero-copy"><h1>${escape(content.title)}</h1><p class="subtitle">${escape(content.subtitle)}</p><p>${escape(content.tagline)}</p></div></header>
<nav class="daybar" aria-label="Trip days"><div class="daybar-inner">${content.days.map(d => `<a class="day-pill day-${escape(d.id)}" href="#${escape(d.id)}"><span>${escape(d.num)}</span> ${escape(d.dow)}</a>`).join('')}</div></nav>
<main id="main"><section class="home" aria-label="${escape(content.home.label)}"><div class="home-row"><p><span aria-hidden="true">⌂</span> <strong>${escape(content.home.address)}</strong></p>${link(mapURL(content.home.map), 'Open in Maps')}</div><p class="note">${escape(content.home.note)}</p></section>${days}<section id="near-home" class="near-home" aria-label="${escape(content.nearHome.heading)}">${nearHome}</section></main>
<footer><p>${escape(content.footer)}</p><details><summary>Photo credits</summary>${credits ? `<ul>${credits}</ul>` : '<p>No photos included yet.</p>'}</details></footer></body></html>\n`);
console.log(`Built index.html: ${content.days.length} days, ${used.size} photos, ${missing.size} missing photo keys.`);
