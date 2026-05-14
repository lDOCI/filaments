// Filter chips: render + entrance animation. Selection is wired up in main.js.
import { animate, stagger } from '../lib/animate.js';
import { t, onLang } from '../lib/i18n.js';

export function buildFilters({ data, state }) {
  const groups = document.querySelectorAll('[data-filter-group]');
  groups.forEach(group => {
    const key = group.dataset.filterGroup;
    const host = group.querySelector('[data-chip-host]');
    host.innerHTML = '';
    const values = Array.from(new Set(data.map(d => d[key]))).sort();

    addChip(host, 'all', t('all'), state[key] === 'all');
    values.forEach(v => {
      const count = data.filter(d => d[key] === v).length;
      addChip(host, v, `${v}<span class="chip__count">${count}</span>`, state[key] === v);
    });

    const chips = host.querySelectorAll('.chip');
    animate(chips, {
      opacity: [0, 1],
      y: [10, 0],
      duration: 500,
      delay: stagger(30),
      ease: 'outExpo'
    });
  });
}

function addChip(host, val, label, active) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip' + (active ? ' is-active' : '');
  b.dataset.val = val;
  b.innerHTML = label;
  // Visual bounce on click — selection state handled in main.js.
  b.addEventListener('click', () => {
    animate(b, { scale: [1, 1.08, 1], duration: 480, ease: 'outElastic(1, .6)' });
  });
  host.appendChild(b);
}

onLang(() => {
  document.querySelectorAll('.chip[data-val="all"]').forEach(c => {
    c.textContent = t('all');
  });
});
