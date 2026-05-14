// Modal form for submitting a measured spool weight.
// Renders into <dialog data-contribute>.
import { submitContribution, isConfigured } from '../lib/contribute.js';
import { t } from '../lib/i18n.js';

export function openContribute(filament) {
  let dlg = document.querySelector('[data-contribute]');
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.className = 'contribute';
    dlg.setAttribute('data-contribute', '');
    document.body.appendChild(dlg);
  }
  dlg.innerHTML = renderShell(filament);
  if (!dlg.open) dlg.showModal();
  bind(dlg, filament);
}

function renderShell(f) {
  const isWeightKnown = f.spoolWeight != null;
  return `
    <div class="contribute__inner">
      <button class="sheet__close" data-c-close aria-label="Close">×</button>

      <header class="contribute__head">
        <h3>${t('contribute.title')}</h3>
        <p class="sub">
          <strong>${escapeHTML(f.manufacturer)}</strong> ·
          ${escapeHTML(f.material)} · ${f.netWeight} г · Ø ${f.diameter} мм
          ${isWeightKnown ? `· <span class="contribute__current">${t('contribute.currentWeight')}: <strong>${f.spoolWeight} г</strong></span>` : ''}
        </p>
      </header>

      <form class="contribute__form" data-c-form>
        <label class="contribute__field">
          <span>${t('contribute.weight')} *</span>
          <input type="number" name="weight" min="1" max="5000" step="0.1" required autofocus inputmode="decimal" placeholder="например, 215" />
        </label>

        <label class="contribute__field">
          <span>${t('contribute.photo')}</span>
          <input type="file" name="photo" accept="image/*" capture="environment" />
          <small>${t('contribute.photoHint')}</small>
        </label>

        <label class="contribute__field">
          <span>${t('contribute.nick')}</span>
          <input type="text" name="nick" maxlength="100" placeholder="${t('contribute.nickPh')}" />
        </label>

        <label class="contribute__field">
          <span>${t('contribute.comment')}</span>
          <textarea name="comment" rows="2" maxlength="500" placeholder="${t('contribute.commentPh')}"></textarea>
        </label>

        <div class="contribute__foot">
          <p class="contribute__note">${t('contribute.note')}</p>
          <div class="contribute__actions">
            <button type="button" class="contribute__btn contribute__btn--ghost" data-c-close>${t('contribute.cancel')}</button>
            <button type="submit" class="contribute__btn contribute__btn--primary" data-c-submit>
              ${t('contribute.submit')}
            </button>
          </div>
        </div>

        <div class="contribute__status" data-c-status hidden></div>
      </form>
    </div>
  `;
}

function bind(dlg, filament) {
  const closeBtns = dlg.querySelectorAll('[data-c-close]');
  closeBtns.forEach(b => b.addEventListener('click', () => dlg.close()));
  dlg.addEventListener('click', e => {
    if (e.target === dlg) dlg.close();
  }, { once: true });

  const form = dlg.querySelector('[data-c-form]');
  const status = dlg.querySelector('[data-c-status]');
  const submitBtn = dlg.querySelector('[data-c-submit]');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!isConfigured()) {
      status.hidden = false;
      status.className = 'contribute__status contribute__status--err';
      status.textContent = t('contribute.notConfigured');
      return;
    }
    const fd = new FormData(form);
    const weight = fd.get('weight');
    const comment = fd.get('comment') || '';
    const nick = fd.get('nick') || '';
    const photoFile = fd.get('photo');

    submitBtn.disabled = true;
    submitBtn.textContent = t('contribute.sending');
    status.hidden = true;

    try {
      await submitContribution(filament, { weight, comment, nick, photoFile });
      status.hidden = false;
      status.className = 'contribute__status contribute__status--ok';
      status.textContent = t('contribute.thanks');
      form.querySelector('input[name="weight"]').value = '';
      form.querySelector('input[name="photo"]').value = '';
      form.querySelector('textarea[name="comment"]').value = '';
      submitBtn.textContent = t('contribute.submit');
      submitBtn.disabled = false;
    } catch (err) {
      status.hidden = false;
      status.className = 'contribute__status contribute__status--err';
      status.textContent = `${t('contribute.failed')}: ${err.message || err}`;
      submitBtn.textContent = t('contribute.submit');
      submitBtn.disabled = false;
    }
  });
}

function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
