// v3 build: node build.mjs → index.html (fully static, no runtime fetch)
import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('./', import.meta.url);
const readJSON = async name => JSON.parse(await readFile(new URL(name, root), 'utf8'));
const content = await readJSON('content.json');
const photos = await readJSON('photos.json');

const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const safeURL = v => /^(https?:\/\/|\.\.?\/|#)/i.test(v ?? '') || /^[\w-][\w./-]*$/.test(v ?? '') ? esc(v) : '#';
const mapURL = v => /^https?:\/\//i.test(v) ? v : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v)}`;
const ext = (href, label, cls = 'btn') => `<a class="${cls}" href="${safeURL(href)}" target="_blank" rel="noopener">${esc(label)}</a>`;
const pinIcon = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';

const used = new Set();
const missing = new Set();
function img(key, { eager = false, sizes = '100vw', cls = 'ph' } = {}) {
  const p = photos[key];
  if (!p?.src) { if (!missing.has(key)) console.warn(`Missing photo key "${key}"`); missing.add(key); return ''; }
  used.add(key);
  const pos = /^[\d.]+% [\d.]+%$/.test(p.pos ?? '') ? ` style="object-position:${p.pos}"` : '';
  return `<figure class="${cls}"><img src="${safeURL(p.src)}" alt="${esc(p.alt)}" width="${Number(p.w) || 1200}" height="${Number(p.h) || 900}"${pos} sizes="${sizes}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></figure>`;
}
const tags = list => list?.length ? `<ul class="tags">${list.map(t => `<li class="tag tag-${esc(t.toLowerCase().replace(/[^a-z]+/g, '-'))}">${esc(t)}</li>`).join('')}</ul>` : '';
const mapBtn = (q, label) => q ? `<a class="pin" href="${safeURL(mapURL(q))}" target="_blank" rel="noopener" aria-label="${esc(`Open in Maps: ${label || q}`)}">${pinIcon}</a>` : '';

/* ---------- Plan: morning / afternoon / evening ---------- */
const PARTS = [['morning', 'Morning'], ['afternoon', 'Afternoon'], ['evening', 'Evening']];
function moments(items) {
  return PARTS.map(([key, label]) => {
    const list = items.filter(s => (s.part || 'afternoon') === key);
    if (!list.length) return '';
    return `<section class="part part-${key}" aria-label="${label}"><h4 class="part-label">${label}</h4><ol class="moments">${list.map(s => `<li class="moment${s.lead ? ' is-lead' : ''}"><span class="when">${esc(s.time)}</span><div class="what">${s.who ? `<span class="who who-${esc(s.who.toLowerCase().replace(/\s+/g, '-'))}">${esc(s.who)}</span>` : ''}<p>${esc(s.text)}</p></div>${mapBtn(s.map)}</li>`).join('')}</ol></section>`;
  }).join('');
}

/* ---------- drawers ---------- */
const drawer = (title, body, open = false) => body ? `<details class="drawer"${open ? ' open' : ''}><summary><span>${esc(title)}</span><span class="plus" aria-hidden="true"></span></summary><div class="drawer-body">${body}</div></details>` : '';
const parkingBody = pk => pk ? `<ul class="ledger">${pk.options.map(o => `<li><div><h5>${esc(o.name)}</h5><p>${esc(o.walk)}</p><p class="cost">${esc(o.price)}</p></div><div class="row-actions">${o.url ? ext(o.url, 'Info', 'btn btn-quiet') : ''}${mapBtn(o.map, o.name)}</div></li>`).join('')}</ul>${pk.note ? `<p class="aside">${esc(pk.note)}</p>` : ''}` : '';
const trainBody = t => t ? `<ol class="steps">${t.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol><div class="row-actions">${(t.links || []).map(l => ext(l.url, l.label)).join('')}</div>` : '';

/* ---------- places: one feature, the rest in a grid ---------- */
function places(pl, cover) {
  if (!pl?.items?.length) return '';
  const [first, ...rest] = pl.items;
  const card = (it, feature) => `<article class="place${feature ? ' place-feature' : ''} reveal">${it.photo && it.photo !== cover ? img(it.photo, { sizes: feature ? '(min-width: 760px) 720px, 100vw' : '(min-width: 760px) 350px, 100vw' }) : ''}<div class="place-text">${tags(it.tags)}<h4>${esc(it.name)}</h4><p>${esc(it.text)}</p><div class="row-actions">${it.url ? ext(it.url, 'Website', 'btn btn-quiet') : ''}${it.map ? ext(mapURL(it.map), 'Map', 'btn btn-quiet') : ''}</div></div></article>`;
  return `<section class="block"><h3 class="block-title">${esc(pl.heading)}</h3>${card(first, true)}${rest.length ? `<div class="place-grid">${rest.map(it => card(it, false)).join('')}</div>` : ''}</section>`;
}

/* ---------- food as a menu ---------- */
const allergyMini = `<p class="allergy-mini"><span aria-hidden="true">⚠</span> Seafood allergy: tell every kitchen. Ask about fish sauce, oyster sauce, shrimp paste and stocks.</p>`;
function menu(items, heading, withAllergy = true, intro = '') {
  if (!items?.length) return '';
  return `<section class="block menu-block"><h3 class="block-title">${esc(heading)}</h3>${intro ? `<p class="intro">${esc(intro)}</p>` : ''}${withAllergy ? allergyMini : ''}<ul class="menu">${items.map(it => `<li class="dish">${it.photo ? img(it.photo, { sizes: '88px', cls: 'ph thumb' }) : ''}<div class="dish-text"><div class="dish-head"><h4>${esc(it.name)}</h4>${it.price ? `<span class="price">${esc(it.price)}</span>` : ''}</div><p>${esc(it.text)}</p>${tags(it.tags)}<div class="row-actions">${it.url ? ext(it.url, 'Menu / website', 'btn btn-quiet') : ''}${it.map ? ext(mapURL(it.map), 'Map', 'btn btn-quiet') : ''}</div></div></li>`).join('')}</ul></section>`;
}

/* ---------- companion: schematic map + budget ---------- */
const pins = content.pins;
function miniMap(d) {
  const route = (d.route || []).filter(k => pins[k]);
  const line = route.map(k => `${pins[k].x},${pins[k].y}`).join(' ');
  const dots = Object.entries(pins).map(([k, p]) => {
    const on = route.includes(k);
    return `<g class="mp${on ? ' on' : ''}"><circle cx="${p.x}" cy="${p.y}" r="${on ? 5 : 3}"/>${on ? `<text x="${p.x + (p.dx ?? 8)}" y="${p.y + (p.dy ?? -8)}" text-anchor="${esc(p.anchor || 'start')}">${esc(p.label)}</text>` : ''}</g>`;
  }).join('');
  return `<svg class="minimap" viewBox="0 0 320 170" role="img" aria-label="${esc(`Rough map for ${d.short}: ${route.map(k => pins[k].label).join(' to ')}`)}">
    <path class="sea" d="M300 0 C292 30 306 52 296 78 C290 96 300 112 296 128 C292 146 304 158 300 170 L320 170 L320 0Z"/>
    <path class="harbour" d="M298 104 C280 100 270 106 258 102 C248 99 244 106 234 104 C224 102 214 96 204 96"/>
    <path class="ridge" d="M14 128 l10 -14 l8 9 l9 -13 l11 18"/>
    <polyline class="route" points="${line}"/>${dots}
    <text class="scale" x="8" y="164">Not to scale</text>
  </svg>`;
}
const money = n => `A$${Number.isInteger(n) ? n : n.toFixed(2)}`;
function budget(d) {
  const rows = (d.budget || []).map(b => {
    const amt = b.per === 'check' ? 'Check' : b.from ? `from ${money(b.low)}` : b.low === b.high ? (b.low === 0 ? 'Free' : money(b.low)) : `${money(b.low)}–${money(b.high)}`;
    return `<li><span>${esc(b.label)}</span><span class="amt">${esc(amt)}${b.per !== 'check' && !(b.low === 0 && b.high === 0) ? ` <small>/ ${esc(b.per)}</small>` : ''}</span></li>`;
  }).join('');
  const pp = (d.budget || []).filter(b => b.per === 'person' && !/if you go/i.test(b.label));
  const lo = pp.reduce((s, b) => s + b.low, 0), hi = pp.reduce((s, b) => s + (b.high ?? b.low), 0), from = pp.some(b => b.from);
  const total = pp.length ? `<p class="total"><span>Rough total per person</span><strong>${from ? 'from ' : ''}${money(lo)}${hi !== lo && !from ? `–${money(hi)}` : ''}</strong></p>` : '';
  return `<ul class="budget">${rows}</ul>${total}`;
}
const kit = d => `<div class="kit-day" data-day="${esc(d.id)}"><p class="kit-when">${esc(d.dow)} ${esc(d.num)} · ${esc(d.title)}</p>${miniMap(d)}${budget(d)}</div>`;

/* ---------- day ---------- */
function day(d, i) {
  // never show the same photo twice in a day: the cover and filmstrip skip photos the place cards use
  const placePhotos = new Set((d.places?.items || []).map(it => it.photo).filter(Boolean));
  const free = (d.gallery || []).filter(k => !placePhotos.has(k));
  const cover = free[0] || d.gallery?.[0];
  const more = free.filter(k => k !== cover);
  const film = more.length ? `<div class="film" tabindex="0" role="region" aria-label="${esc(`More photos: ${d.short}`)}">${more.map(k => img(k, { sizes: '(min-width: 760px) 320px, 70vw', cls: 'ph frame' })).join('')}</div>` : '';
  const plan = d.schedule?.length ? `<section class="block plan"><h3 class="visually-hidden">Plan for the day</h3>${moments(d.schedule)}${d.timesNote ? `<p class="aside">${esc(d.timesNote)}</p>` : ''}</section>` : '';
  const opts = d.options ? `<section class="block"><h3 class="block-title">${esc(d.options.heading)}</h3><div class="options">${d.options.items.map((o, n) => `<details class="option"${n === 0 ? ' open' : ''}><summary><span class="opt-name">${esc(o.name)}</span><span class="plus" aria-hidden="true"></span></summary><p class="opt-who">${esc(o.who)}</p>${moments(o.schedule)}${o.note ? `<p class="aside">${esc(o.note)}</p>` : ''}</details>`).join('')}</div></section>` : '';
  const tips = [
    d.places?.note ? drawer('Good to know', `<p>${esc(d.places.note)}</p>`) : '',
    d.train ? drawer(d.train.heading, trainBody(d.train), true) : '',
    d.parking ? drawer(d.parking.heading, parkingBody(d.parking)) : ''
  ].join('');
  return `<article class="day" id="${esc(d.id)}" data-date="${esc(d.date)}" aria-labelledby="${esc(d.id)}-title">
  <header class="opener">
    ${cover ? img(cover, { eager: false, cls: 'ph cover' }) : ''}
    <div class="opener-text reveal">
      <p class="dayline"><span class="num">${esc(d.num)}</span><span class="dow">${esc(d.dow)}<br>Day ${i + 1} of ${content.days.length}</span></p>
      <h2 id="${esc(d.id)}-title">${esc(d.title)}</h2>
    </div>
  </header>
  <div class="day-sticky" aria-hidden="true"><span>${esc(d.dow)} ${esc(d.num)}</span> ${esc(d.title)}</div>
  <div class="day-body">
    <div class="standfirst"><p class="deck">${esc(d.deck)}</p><p>${esc(d.summary)}</p><span class="pace">${esc(d.pace)}</span></div>
    ${film}${plan}${opts}${places(d.places, cover)}
    ${tips ? `<section class="block"><h3 class="block-title">Tips</h3>${tips}</section>` : ''}
    ${menu(d.food, d.foodHeading || 'Food')}${menu(d.treats, d.treatsHeading || 'Treats', false)}
  </div>
</article>`;
}

const hero = photos[content.hero];
const days = content.days.map(day).join('\n');
used.add(content.hero);
const credits = [...used].map(k => { const p = photos[k]; return `<li>${esc(p.alt)} — ${esc(p.credit)}${p.license ? `, ${esc(p.license)}` : ''} ${p.source ? ext(p.source, 'source', 'credit') : ''}</li>`; }).join('');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#13262F">
<title>${esc(content.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="preload" as="image" href="${safeURL(hero.src)}">
<link rel="stylesheet" href="style.css">
<script>document.documentElement.classList.add('js');setTimeout(function(){if(!window.__trip)document.documentElement.classList.remove('js')},2500)</script>
<script defer src="app.js"></script>
</head>
<body>
<a class="skip" href="#main">Skip to the plan</a>
<header class="hero">
  <figure class="hero-ph"><img src="${safeURL(hero.src)}" alt="${esc(hero.alt)}" width="${hero.w}" height="${hero.h}" fetchpriority="high"></figure>
  <div class="hero-text">
    <p class="hero-dates">${esc(content.subtitle)}</p>
    <h1>${esc(content.title)}</h1>
    <p class="hero-tag">${esc(content.tagline)}</p>
    <a class="cue" href="#${esc(content.days[0].id)}"><span>Begin with ${esc(content.days[0].dow)} ${esc(content.days[0].num)}</span><i aria-hidden="true"></i></a>
  </div>
</header>
<nav class="jump" aria-label="Jump to a day"><div class="jump-inner">${content.days.map(d => `<a href="#${esc(d.id)}" data-day="${esc(d.id)}"><b>${esc(d.num)}</b> ${esc(d.dow)}</a>`).join('')}</div></nav>
<main id="main">
  <section class="brief" aria-label="Before you go">
    <div class="home"><p class="home-label">Home base</p><p class="home-addr">${esc(content.home.address)}</p><p class="aside">${esc(content.home.note)}</p>${ext(content.home.map, 'Open in Maps')}</div>
    <dl class="essentials">${content.essentials.map(e => `<div><dt>${esc(e.label)}</dt><dd>${esc(e.value)}</dd></div>`).join('')}</dl>
    <aside class="allergy" role="note"><p class="allergy-title"><span aria-hidden="true">⚠</span> Food & allergy</p><p>${esc(content.foodNote)}</p></aside>
  </section>
  ${days}
  <section class="day near" id="near-home" aria-label="${esc(content.nearHome.heading)}"><div class="day-body">${menu(content.nearHome.items, content.nearHome.heading, true, content.nearHome.intro)}</div></section>
</main>
<aside class="kit" id="kit" aria-label="Map and budget for the day" hidden>
  <button class="kit-toggle" type="button" aria-expanded="false" aria-controls="kit-panel"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/></svg><span>Map &amp; budget</span></button>
  <div class="kit-panel" id="kit-panel">${content.days.map(kit).join('')}<p class="kit-note">Approximate. Prices change, and "Check" means we have no reliable number.</p></div>
</aside>
<footer class="foot"><p>${esc(content.footer)}</p><details><summary>Photo credits</summary><ul>${credits}</ul></details></footer>
</body>
</html>
`;
await writeFile(new URL('index.html', root), html);
console.log(`Built v3 index.html: ${content.days.length} days, ${used.size} photos, ${missing.size} missing.`);
