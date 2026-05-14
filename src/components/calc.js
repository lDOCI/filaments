// Remaining-weight calculator.
// UI: one text search (brand+material+name fuzzy), one number input,
//     big animated result numbers.
import { animate } from '../lib/animate.js';
import { t, onLang } from '../lib/i18n.js';

const FMT_INT = new Intl.NumberFormat('ru-RU');

export function initCalc(filaments) {
  const search = document.querySelector('[data-calc-search]');
  const suggest = document.querySelector('[data-calc-suggest]');
  const input = document.querySelector('[data-calc-input]');
  const outG = document.querySelector('[data-result-grams]');
  const outM = document.querySelector('[data-result-meters]');
  const outS = document.querySelector('[data-result-spool]');
  const outD = document.querySelector('[data-result-density]');

  let selected = null;

  function pick(f) {
    selected = f;
    search.value = `${f.manufacturer} · ${f.material} · ${f.netWeight}г`;
    suggest.hidden = true;
    if (f.spoolWeight == null) {
      outS.textContent = t('card.noData');
      outS.classList.add('is-empty');
    } else {
      outS.textContent = `${FMT_INT.format(f.spoolWeight)} г`;
      outS.classList.remove('is-empty');
    }
    outD.textContent = `${f.density} г/см³`;
    localStorage.setItem('calc.lastId', f.id);
    compute();
    input.focus();
  }

  function renderSuggest(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      suggest.hidden = true;
      return;
    }
    const matches = filaments
      .filter(f => `${f.manufacturer} ${f.material} ${f.name}`.toLowerCase().includes(q))
      .slice(0, 8);
    if (!matches.length) {
      suggest.hidden = true;
      return;
    }
    suggest.innerHTML = matches
      .map(f => `
        <button class="suggest__item${f.spoolWeight == null ? ' suggest__item--no-data' : ''}" data-id="${f.id}">
          <span class="suggest__brand">${escapeHTML(f.manufacturer)}</span>
          <span class="suggest__mid">${escapeHTML(f.material)} · ${FMT_INT.format(f.netWeight)}г</span>
          <span class="suggest__right">${f.spoolWeight == null ? t('card.noData') : FMT_INT.format(f.spoolWeight) + ' г'}</span>
        </button>
      `).join('');
    suggest.hidden = false;
    suggest.querySelectorAll('.suggest__item').forEach(btn => {
      btn.addEventListener('mousedown', e => {
        e.preventDefault(); // keep focus on search
        const f = filaments.find(x => x.id === btn.dataset.id);
        if (f) pick(f);
      });
    });
  }

  function compute() {
    if (!selected) {
      outG.textContent = '—';
      outM.textContent = '—';
      return;
    }
    if (selected.spoolWeight == null) {
      outG.textContent = '—';
      outM.textContent = '—';
      return;
    }
    const raw = parseFloat(input.value);
    if (!isFinite(raw) || raw <= 0) {
      outG.textContent = '—';
      outM.textContent = '—';
      return;
    }
    const grams = Math.max(0, raw - selected.spoolWeight);
    const r_cm = (selected.diameter / 10) / 2;
    const area_cm2 = Math.PI * r_cm * r_cm;
    const volume_cm3 = grams / selected.density;
    const meters = (volume_cm3 / area_cm2) / 100;

    tweenNumber(outG, grams, 0);
    tweenNumber(outM, meters, 1);
    flash(outG);
    flash(outM);
  }

  search.addEventListener('input', e => {
    selected = null;
    renderSuggest(e.target.value);
  });
  search.addEventListener('focus', e => {
    if (e.target.value) renderSuggest(e.target.value);
  });
  search.addEventListener('blur', () => setTimeout(() => suggest.hidden = true, 150));
  input.addEventListener('input', compute);

  // Restore last selection
  const lastId = localStorage.getItem('calc.lastId');
  if (lastId) {
    const f = filaments.find(x => x.id === lastId);
    if (f) pick(f);
  }

  onLang(() => {/* labels swap via [data-i18n] */});
}

function tweenNumber(node, target, decimals) {
  const start = parseFloat(String(node.textContent).replace(',', '.').replace('—', '')) || 0;
  const obj = { n: start };
  animate(obj, {
    n: target,
    duration: 500,
    ease: 'outExpo',
    onUpdate: () => {
      node.textContent = decimals
        ? obj.n.toFixed(decimals)
        : FMT_INT.format(Math.round(obj.n));
    }
  });
}

function flash(node) {
  node.classList.add('is-flash');
  clearTimeout(node._flashT);
  node._flashT = setTimeout(() => node.classList.remove('is-flash'), 400);
}

function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
