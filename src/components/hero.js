// Hero: per-character stagger + numeric counters.
import { animate, stagger } from '../lib/animate.js';
import { onLang } from '../lib/i18n.js';

function splitChars(host) {
  const text = host.textContent;
  host.textContent = '';
  for (const ch of text) {
    const span = document.createElement('span');
    span.className = 'char';
    span.textContent = ch === ' ' ? ' ' : ch;
    host.appendChild(span);
  }
  return Array.from(host.querySelectorAll('.char'));
}

export function animateHero() {
  const titleHost = document.querySelector('[data-split-text] [data-i18n="hero.title"]')
    || document.querySelector('[data-split-text]');
  if (titleHost) {
    const chars = splitChars(titleHost);
    animate(chars, {
      y: [{ from: 60, to: 0 }],
      opacity: [{ from: 0, to: 1 }],
      filter: [{ from: 'blur(10px)', to: 'blur(0px)' }],
      delay: stagger(28),
      duration: 900,
      ease: 'outExpo'
    });
  }

  const eyebrow = document.querySelector('.hero__eyebrow');
  const lede = document.querySelector('.hero__lede');
  if (eyebrow) animate(eyebrow, { opacity: [0, 1], y: [10, 0], duration: 800, delay: 200, ease: 'outExpo' });
  if (lede) animate(lede, { opacity: [0, 1], y: [16, 0], duration: 900, delay: 500, ease: 'outExpo' });

  // Re-split on language change so animation re-runs on new text.
  onLang(() => {
    requestAnimationFrame(() => {
      const t = document.querySelector('[data-split-text] [data-i18n="hero.title"]')
        || document.querySelector('[data-split-text]');
      if (!t) return;
      // Restore as plain text first
      t.textContent = t.textContent;
      const chars = splitChars(t);
      animate(chars, {
        y: [{ from: 30, to: 0 }],
        opacity: [{ from: 0, to: 1 }],
        filter: [{ from: 'blur(6px)', to: 'blur(0px)' }],
        delay: stagger(20),
        duration: 600,
        ease: 'outExpo'
      });
    });
  });
}

export function animateCounters(counts) {
  const nodes = document.querySelectorAll('[data-counter]');
  const order = ['records', 'brands', 'materials'];
  nodes.forEach((node, i) => {
    const key = order[i];
    const target = counts[key] ?? 0;
    node.dataset.target = String(target);
    const obj = { n: 0 };
    animate(obj, {
      n: target,
      round: 1,
      duration: 1400,
      delay: 400 + i * 100,
      ease: 'outExpo',
      onUpdate: () => { node.textContent = obj.n; }
    });
  });
}
