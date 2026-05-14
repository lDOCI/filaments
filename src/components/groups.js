// Card grid grouped by manufacturer.
import { animate, stagger, flip } from '../lib/animate.js';
import { t, onLang } from '../lib/i18n.js';

const FMT = new Intl.NumberFormat('ru-RU');

export function renderGroups({ rows, sortKey, onCardClick }) {
  const host = document.querySelector('[data-groups]');
  if (!host) return;
  host.innerHTML = '';

  if (!rows.length) {
    host.innerHTML = `<div class="empty">${t('empty')}</div>`;
    return;
  }

  // Group by manufacturer; keep manufacturer order by appearance in `rows`.
  const groupMap = new Map();
  rows.forEach(r => {
    if (!groupMap.has(r.manufacturer)) groupMap.set(r.manufacturer, []);
    groupMap.get(r.manufacturer).push(r);
  });

  // Sort cards INSIDE each group by current sortKey (except when sorting by manufacturer).
  if (sortKey && sortKey !== 'manufacturer') {
    for (const arr of groupMap.values()) {
      arr.sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey];
        if (typeof av === 'number' && typeof bv === 'number') return av - bv;
        return String(av).localeCompare(String(bv), 'ru');
      });
    }
  }

  const frag = document.createDocumentFragment();
  for (const [brand, items] of groupMap) {
    const sec = document.createElement('section');
    sec.className = 'group';
    sec.dataset.brand = brand;

    const header = document.createElement('header');
    header.className = 'group__head';
    header.innerHTML = `
      <h3 class="group__name">${escapeHTML(brand)}</h3>
      <span class="group__meta">${items.length} · ${escapeHTML(items[0].country)}</span>
    `;
    sec.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'cards';

    items.forEach(f => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'card' + (f.spoolWeight == null ? ' card--no-data' : '');
      card.dataset.id = f.id;
      const spoolBlock = f.spoolWeight == null
        ? `<div class="card__spool card__spool--empty">
             <span class="card__spool-label">${t('card.spool')}</span>
             <span class="card__no-data">${t('card.noData')}</span>
           </div>`
        : `<div class="card__spool">
             <span class="card__spool-label">${t('card.spool')}</span>
             <span class="card__spool-num">${FMT.format(f.spoolWeight)}<span class="u">г</span></span>
           </div>`;
      const family = f.materialFamily || f.material;
      const showOriginal = f.material && f.material !== family;
      card.innerHTML = `
        <div class="card__top">
          <span class="card__material">${escapeHTML(family)}</span>
          <span class="card__net">${FMT.format(f.netWeight)}<span class="u">г</span></span>
        </div>
        ${showOriginal ? `<div class="card__subtype">${escapeHTML(f.material)}</div>` : ''}
        <div class="card__title">${escapeHTML(shortName(f))}</div>
        ${spoolBlock}
        <div class="card__foot">
          <span class="dia">Ø ${f.diameter}</span>
        </div>
      `;
      card.addEventListener('click', () => onCardClick(f));
      grid.appendChild(card);
    });

    sec.appendChild(grid);
    frag.appendChild(sec);
  }
  host.appendChild(frag);
}

export function animateGroupsIn() {
  const groups = document.querySelectorAll('.group');
  animate(groups, {
    opacity: [0, 1],
    y: [16, 0],
    duration: 600,
    delay: stagger(60),
    ease: 'outExpo'
  });
  const cards = document.querySelectorAll('.card');
  animate(cards, {
    opacity: [0, 1],
    y: [10, 0],
    duration: 500,
    delay: stagger(15, { start: 100 }),
    ease: 'outExpo'
  });
}

export async function reorderInPlace(getOrderedRows) {
  const cards = Array.from(document.querySelectorAll('.cards .card'));
  if (!cards.length) return;
  const idOrder = getOrderedRows().map(r => r.id);
  const idIndex = new Map(idOrder.map((id, i) => [id, i]));
  // Group cards by parent for FLIP within each grid (so animation doesn't cross groups).
  const byParent = new Map();
  cards.forEach(c => {
    const p = c.parentElement;
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p).push(c);
  });

  const promises = [];
  for (const [parent, list] of byParent) {
    const sorted = [...list].sort((a, b) => (idIndex.get(a.dataset.id) ?? 0) - (idIndex.get(b.dataset.id) ?? 0));
    promises.push(flip(list, () => {
      sorted.forEach(n => parent.appendChild(n));
    }));
  }
  await Promise.all(promises);
}

function shortName(f) {
  // The reference name often duplicates the brand; trim it.
  const n = (f.name || '').replace(new RegExp('^' + escapeRe(f.manufacturer) + '\\s*', 'i'), '').trim();
  return n || `${f.material} ${f.netWeight}г`;
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

onLang(() => {
  document.querySelectorAll('.card__spool-label').forEach(n => n.textContent = t('card.spool'));
});
