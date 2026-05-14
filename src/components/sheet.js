// Detail sheet with line-draw SVG of the spool.
import { animate, timeline } from '../lib/animate.js';
import { t } from '../lib/i18n.js';
import { openContribute } from './contribute-form.js';
import { renderBrandLogo } from '../lib/logo.js';

export function openSheet(f) {
  const dlg = document.querySelector('[data-sheet]');
  const body = document.querySelector('[data-sheet-body]');
  if (!dlg || !body) return;

  body.innerHTML = render(f);
  dlg.showModal();

  // Mount brand logo (clearbit → favicon → letter fallback)
  const logoHost = body.querySelector('[data-brand-logo]');
  if (logoHost) logoHost.appendChild(renderBrandLogo(f));

  // Entrance: props stagger
  const props = body.querySelectorAll('.sheet__prop');
  animate(props, { opacity: [0, 1], y: [8, 0], duration: 500, delay: (_, i) => i * 35, ease: 'outExpo' });

  // Contribute button
  body.querySelector('[data-contribute-trigger]')?.addEventListener('click', () => {
    openContribute(f);
  });

  const onClose = () => {
    dlg.removeEventListener('click', backdrop);
    document.querySelector('[data-sheet-close]')?.removeEventListener('click', closeIt);
  };
  function closeIt() { dlg.close(); onClose(); }
  function backdrop(e) { if (e.target === dlg) closeIt(); }
  dlg.addEventListener('click', backdrop);
  document.querySelector('[data-sheet-close]')?.addEventListener('click', closeIt);
}

function render(f) {
  const links = f.links || {};
  const linkChip = (url, label) => url
    ? `<a class="sheet__link" href="${escapeAttr(url)}" target="_blank" rel="noopener">${label} ↗</a>`
    : '';
  const hasWeight = f.spoolWeight != null;
  const heroNum = hasWeight
    ? `<div class="sheet__heroNum">
         <div>
           <div class="sheet__heroNum-label">${t('sheet.spool')}</div>
         </div>
         <span class="sheet__heroNum-value">${f.spoolWeight}</span>
         <span class="sheet__heroNum-unit">г</span>
       </div>`
    : `<div class="sheet__heroNum sheet__heroNum--empty">
         <div>
           <div class="sheet__heroNum-label">${t('sheet.spool')}</div>
         </div>
         <span class="sheet__heroNum-value">${t('card.noData')}</span>
       </div>`;
  return `
    <div class="sheet__left">
      <div>
        <h3>${escapeHTML(f.manufacturer)}</h3>
        <p class="sub">
          ${escapeHTML(f.materialFamily || f.material)}${f.material && f.materialFamily !== f.material ? ` · ${escapeHTML(f.material)}` : ''}
          · ${f.netWeight} г · Ø ${f.diameter} мм
        </p>
      </div>

      <div class="brand-logo-host" data-brand-logo></div>

      ${heroNum}

      <div>
        <h4>${t('sheet.links')}</h4>
        <div class="sheet__links">
          ${linkChip(links.website, 'Сайт')}
          ${linkChip(links.ozon, 'Ozon')}
          ${linkChip(links.wb, 'WB')}
          ${linkChip(links.ali, 'Ali')}
        </div>
      </div>
    </div>

    <div class="sheet__right">
      <div>
        <h4>${t('sheet.material')}</h4>
        <div class="sheet__props">
          <div class="sheet__prop"><span>${t('sheet.net')}</span><span>${f.netWeight} г</span></div>
          <div class="sheet__prop"><span>${t('sheet.spool')}</span><span>${hasWeight ? f.spoolWeight + ' г' : '—'}</span></div>
          <div class="sheet__prop"><span>${t('sheet.gross')}</span><span>${hasWeight ? f.grossWeight + ' г' : '—'}</span></div>
          <div class="sheet__prop"><span>${t('sheet.dia')}</span><span>${f.diameter} мм</span></div>
          <div class="sheet__prop"><span>${t('sheet.density')}</span><span>${f.density} г/см³</span></div>
          <div class="sheet__prop"><span>${t('sheet.country')}</span><span>${escapeHTML(f.country)}</span></div>
        </div>
      </div>

      ${!hasWeight ? `
        <div class="sheet__help">
          <h4>${t('sheet.helpTitle')}</h4>
          <p>${t('sheet.helpText')}</p>
          <button class="contribute__btn contribute__btn--primary" type="button" data-contribute-trigger>
            ${t('sheet.helpCta')}
          </button>
        </div>
      ` : `
        <button class="contribute__btn contribute__btn--ghost contribute__btn--small" type="button" data-contribute-trigger>
          ${t('sheet.contributeQuiet')}
        </button>
      `}
    </div>
  `;
}

function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function escapeAttr(s) { return escapeHTML(s); }
