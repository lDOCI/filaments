import filaments from '../data/filaments.json';
import { initI18n, t, setLang, getLang } from './lib/i18n.js';
import { animate } from './lib/animate.js';
import { animateHero, animateCounters } from './components/hero.js';
import { renderGroups, animateGroupsIn, reorderInPlace } from './components/groups.js';
import { buildFilters } from './components/filters.js';
import { initCalc } from './components/calc.js';
import { openSheet } from './components/sheet.js';

// --------- State ---------
const state = {
  sortKey: 'manufacturer',
  filters: { materialFamily: 'all', country: 'all' },
  query: ''
};

// Build a brand-ordering map by mean spoolWeight or alphabetic, depending on sortKey.
function brandOrder(rows, sortKey) {
  const groups = new Map();
  rows.forEach(r => {
    if (!groups.has(r.manufacturer)) groups.set(r.manufacturer, []);
    groups.get(r.manufacturer).push(r);
  });
  const arr = Array.from(groups.entries());
  if (sortKey === 'manufacturer') {
    arr.sort(([a], [b]) => a.localeCompare(b, 'ru'));
  } else if (sortKey === 'spoolWeight' || sortKey === 'netWeight') {
    arr.sort(([, a], [, b]) => mean(a, sortKey) - mean(b, sortKey));
  } else if (sortKey === 'material') {
    // group brands by most-common material then alphabetical
    arr.sort(([, a], [, b]) => modeStr(a, 'material').localeCompare(modeStr(b, 'material'), 'ru'));
  }
  return arr;
}
function mean(arr, k) { return arr.reduce((s, x) => s + x[k], 0) / arr.length; }
function modeStr(arr, k) {
  const c = {};
  arr.forEach(x => c[x[k]] = (c[x[k]] || 0) + 1);
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0];
}

function visibleRows() {
  let rows = filaments.filter(f => {
    if (state.filters.materialFamily !== 'all' && f.materialFamily !== state.filters.materialFamily) return false;
    if (state.filters.country !== 'all' && f.country !== state.filters.country) return false;
    if (state.query) {
      const q = state.query.toLowerCase();
      const hay = `${f.manufacturer} ${f.material} ${f.name}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  // Order rows so renderGroups produces brands in correct order.
  const ordered = brandOrder(rows, state.sortKey);
  return ordered.flatMap(([, items]) => items);
}

function refresh() {
  renderGroups({ rows: visibleRows(), sortKey: state.sortKey, onCardClick: openSheet });
}

// --------- Boot ---------
initI18n();

// Stats
const stats = {
  records: filaments.length,
  brands: new Set(filaments.map(f => f.manufacturer)).size,
  materials: new Set(filaments.map(f => f.material)).size
};

animateHero();
animateCounters(stats);

// Initial card grid + entrance
renderGroups({ rows: visibleRows(), sortKey: state.sortKey, onCardClick: openSheet });
animateGroupsIn();

// Filters
buildFilters({ data: filaments, state: state.filters });
// After filter change, the chip handler in buildFilters mutates state and calls onChange,
// but it does NOT re-render the catalog by itself — wire that here.
document.querySelectorAll('[data-filter-group]').forEach(group => {
  const key = group.dataset.filterGroup;
  group.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    state.filters[key] = chip.dataset.val;
    group.querySelectorAll('.chip').forEach(c => c.classList.toggle('is-active', c === chip));
    refresh();
    animateGroupsIn();
  });
});

// Calc — initialised inside its modal; opens on sidebar CTA
initCalc(filaments);
const calcModal = document.querySelector('[data-calc-modal]');
document.querySelector('[data-calc-open]')?.addEventListener('click', () => calcModal?.showModal());
document.querySelector('[data-calc-close]')?.addEventListener('click', () => calcModal?.close());
calcModal?.addEventListener('click', e => { if (e.target === calcModal) calcModal.close(); });

// Sort buttons
document.querySelectorAll('.sort-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.classList.contains('is-active')) return;
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.toggle('is-active', b === btn));
    state.sortKey = btn.dataset.sort;
    refresh();
    animateGroupsIn();
  });
});

// Search
const search = document.querySelector('[data-search]');
search?.addEventListener('input', e => {
  state.query = e.target.value;
  refresh();
  animateGroupsIn();
});

// Theme toggle (radial reveal)
const themeBtn = document.querySelector('[data-theme-toggle]');
themeBtn?.addEventListener('click', e => {
  const current = document.documentElement.dataset.theme
    || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';
  const x = e.clientX, y = e.clientY;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  if (document.startViewTransition) {
    document.documentElement.style.setProperty('--reveal-x', `${x}px`);
    document.documentElement.style.setProperty('--reveal-y', `${y}px`);
    const transition = document.startViewTransition(() => {
      document.documentElement.dataset.theme = next;
    });
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 600, easing: 'cubic-bezier(.2,.6,.2,1)', pseudoElement: '::view-transition-new(root)' }
      );
    });
  } else {
    document.documentElement.dataset.theme = next;
  }
  localStorage.setItem('theme', next);
});
const savedTheme = localStorage.getItem('theme');
if (savedTheme) document.documentElement.dataset.theme = savedTheme;

// Language toggle
document.querySelector('[data-lang-toggle]')?.addEventListener('click', () => {
  setLang(getLang() === 'ru' ? 'en' : 'ru');
  // Refresh table cells with translated labels
  refresh();
});
