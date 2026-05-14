// Brand logo resolver:
//   1. data/logos.json — pre-scraped logos saved to /logos/<slug>.<ext>
//   2. Letter avatar — always works, generated locally
//
// Logos are baked at build time by scripts/scrape_logos*.mjs.

import logoManifest from '../../data/logos.json';

function initials(name) {
  if (!name) return '?';
  const cleaned = String(name).replace(/[!?.()/\\]+/g, ' ').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
const PALETTE = [
  { bg: '#fff4b0', fg: '#1a1500' },
  { bg: '#e8e0ff', fg: '#1f0d5b' },
  { bg: '#d6f0ff', fg: '#003a5b' },
  { bg: '#ffd9d0', fg: '#5b1500' },
  { bg: '#d6f5e1', fg: '#0d3a1f' },
  { bg: '#f0e0d6', fg: '#3a1f0d' },
  { bg: '#e0d0ff', fg: '#2a0d5b' },
  { bg: '#ffe5d0', fg: '#5b2a0d' },
];

export function renderBrandLogo(filament) {
  const wrap = document.createElement('div');
  wrap.className = 'brand-logo';

  const name = filament.manufacturer || '?';
  const init = initials(name);
  const palette = PALETTE[hash(name) % PALETTE.length];

  // Letter fallback always present underneath
  const letter = document.createElement('div');
  letter.className = 'brand-logo__letter';
  letter.style.background = palette.bg;
  letter.style.color = palette.fg;
  letter.textContent = init;
  wrap.appendChild(letter);

  const logoPath = logoManifest[name];
  if (logoPath) {
    const img = document.createElement('img');
    img.className = 'brand-logo__img';
    img.alt = name;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = logoPath;
    img.addEventListener('load', () => { letter.style.opacity = '0'; });
    img.addEventListener('error', () => { img.remove(); });
    wrap.appendChild(img);
  }

  return wrap;
}
