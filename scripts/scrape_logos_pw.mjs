// Final pass — use Playwright to bypass anti-bot protection on the brands
// where simple fetch fails (Bambu, Polymaker, Creality, etc.).
// For each missing/tiny brand: open the home page, find the header logo image,
// download the actual binary.

import { chromium } from 'playwright';
import { writeFile, readFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.resolve(ROOT, 'public/logos');

// Brand → home URL we should open to extract the logo from
const SITES = {
  'Bambu Lab':       'https://us.store.bambulab.com/',
  'Polymaker':       'https://shop.polymaker.com/',
  'Creality':        'https://www.creality.com/',
  'Hatchbox':        'https://www.hatchbox3d.com/',
  'UltiMaker':       'https://ultimaker.com/',
  'Anycubic':        'https://www.anycubic.com/',
  'Elegoo':          'https://us.elegoo.com/',
  'eSUN':            'https://www.esun3d.com/',
  'SUNLU':           'https://store.sunlu.com/',
  'Voxelab':         'https://www.voxelab3dp.com/',
  'NinjaTek':        'https://ninjatek.com/',
  'MonoPrice':       'https://www.monoprice.com/',
  'Kexcelled':       'https://kexcelled.com/',
  'Geeetech':        'https://www.geeetech.com/',
  'Raise3D':         'https://www.raise3d.com/',
  'PopBit':          'https://popbit3d.com/',
  'Inland':          'https://inland3d.com/',
  'Plexiwire':       'https://plexiwire.com.ua/',
  'StarPlast':       'https://star-plast.com/',
  'Kremen':          'https://kremen.ru/',
  'Element3D':       'https://www.element3d.ru/',
  'Hi-Tech Plast':   'https://h-t-p.ru/',
  'СТРИМПЛАСТ':      'https://www.sp3d.ru/',
  'Qidi':            'https://qidi3d.com/',
  'Extrudr':         'https://www.extrudr.com/',
  'AzureFilm':       'https://azurefilm.com/',
  'Amolen':          'https://amolen.com/',
};

const REPLACE_BELOW = 4000;

function slugOf(name) {
  return name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
}
function extOf(ct, url) {
  if (!ct) ct = '';
  if (ct.includes('svg')) return 'svg';
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg';
  const m = String(url).split('?')[0].match(/\.(svg|png|webp|jpe?g|ico|gif)$/i);
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'png';
}

async function pickLogoFromPage(page) {
  // Try to find the header logo URL.
  return page.evaluate(() => {
    function visible(el) {
      const r = el.getBoundingClientRect();
      return r.width > 20 && r.height > 12 && r.top < 200;
    }
    function score(el) {
      const cls = (el.className?.toString?.() || '').toLowerCase();
      const alt = (el.alt || '').toLowerCase();
      const src = (el.currentSrc || el.src || '').toLowerCase();
      let s = 0;
      if (cls.includes('logo')) s += 10;
      if (cls.includes('brand')) s += 6;
      if (alt.includes('logo')) s += 8;
      if (src.includes('logo')) s += 6;
      const r = el.getBoundingClientRect();
      // Prefer wider images near the top-left
      if (r.top < 120) s += 4;
      if (r.left < 300) s += 2;
      // Prefer SVG/PNG
      if (src.endsWith('.svg')) s += 5;
      if (src.endsWith('.png')) s += 3;
      // Very wide ratio is usually a logo
      if (r.width > 60 && r.width < 400 && r.height > 16 && r.height < 120) s += 3;
      return s;
    }
    const imgs = Array.from(document.querySelectorAll('header img, nav img, [class*="header"] img, [class*="logo"] img, .site-header img, a[class*="logo"] img'));
    const candidates = imgs.filter(visible).filter(i => (i.currentSrc || i.src));
    if (!candidates.length) return null;
    candidates.sort((a, b) => score(b) - score(a));
    const best = candidates[0];
    return best.currentSrc || best.src;
  });
}

async function downloadInBrowser(page, url) {
  // Use the page's own fetch so cookies + referer are correct.
  return page.evaluate(async (u) => {
    try {
      const r = await fetch(u, { credentials: 'include' });
      if (!r.ok) return null;
      const buf = await r.arrayBuffer();
      const ct = r.headers.get('content-type') || '';
      // To return binary we encode as base64
      const bytes = new Uint8Array(buf);
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return { b64: btoa(bin), ct, len: bytes.length };
    } catch { return null; }
  }, url);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const manifestPath = path.join(ROOT, 'data/logos.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
  });
  const page = await context.newPage();

  const ok = [];
  const fail = [];

  for (const [name, site] of Object.entries(SITES)) {
    // Skip if already has good logo
    const cur = manifest[name];
    if (cur) {
      try {
        const sz = (await stat(path.join(ROOT, 'public', cur))).size;
        if (sz >= REPLACE_BELOW) {
          process.stderr.write(`[skip ${name}] current ${sz}b ≥ ${REPLACE_BELOW}b\n`);
          continue;
        }
      } catch {}
    }
    process.stderr.write(`[${name}] ${site}\n`);

    try {
      await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 45000 });
    } catch (e) {
      console.error(`  ! goto: ${e.message.slice(0, 80)}`);
    }
    try {
      await page.waitForFunction(
        () => !document.title.includes('Vercel Security') && document.body.innerText.length > 500,
        { timeout: 30000 }
      );
    } catch {}
    await page.waitForTimeout(2500);

    let logoUrl = null;
    try { logoUrl = await pickLogoFromPage(page); } catch {}
    if (!logoUrl) {
      console.error(`  × no logo found in DOM`);
      fail.push(name);
      continue;
    }
    console.error(`  → ${logoUrl}`);

    const got = await downloadInBrowser(page, logoUrl);
    if (!got || got.len < 800) {
      console.error(`  × download failed${got ? ` (${got.len}b)` : ''}`);
      fail.push(name);
      continue;
    }
    const slug = slugOf(name);
    const ext = extOf(got.ct, logoUrl);
    const out = path.join(OUT_DIR, `${slug}.${ext}`);
    const buf = Buffer.from(got.b64, 'base64');
    await writeFile(out, buf);
    manifest[name] = `/logos/${slug}.${ext}`;
    console.error(`  ✓ ${slug}.${ext} (${got.len}b)`);
    ok.push(name);
  }

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  await browser.close();

  console.error(`\n=== Playwright pass ===`);
  console.error(`✓ ${ok.length}, × ${fail.length}`);
  if (fail.length) console.error(`failed: ${fail.join(', ')}`);
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
