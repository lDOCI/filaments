// Final aggressive Playwright pass — increase timeout, scroll, look at any visible image
// near the page top-left that's small-ish (typical logo size).
import { chromium } from 'playwright';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.resolve(ROOT, 'public/logos');

const SITES = {
  'НИТ':              'https://plastik-nit.ru/',
  'SynTech':          'https://syntechlab.ru/',
  'Roboparts':        'https://roboparts.ru/',
  'MonoPrice':        'https://www.monoprice.com/',
  'Voxelab':          'https://www.voxelab3dp.com/',
  'NinjaTek':         'https://ninjatek.com/',
  'Kexcelled':        'https://kexcelled.com/',
  'Geeetech':         'https://www.geeetech.com/',
  'PopBit':           'https://popbit3d.com/',
  'Kremen':           'https://kremen.ru/',
  'СТРИМПЛАСТ':       'https://www.sp3d.ru/',
  'MY3D':             'https://my3d.art/',
  'SolidFilament':    'https://solidfilament.ru/',
  'ПолиИмпэкс (IRIS)': 'https://plastic3d.pro/',
};

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

async function pickAnyLogo(page) {
  return page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('img, svg image'));
    function score(el) {
      const r = el.getBoundingClientRect();
      if (r.width < 24 || r.height < 12 || r.top > 250 || r.top < -5) return -1;
      // Skip giant banners
      if (r.width > 600) return -1;
      const cls = (el.className?.toString?.() || '').toLowerCase();
      const alt = (el.alt || '').toLowerCase();
      const src = (el.currentSrc || el.src || el.href?.baseVal || '').toLowerCase();
      let s = 0;
      if (cls.includes('logo')) s += 30;
      if (cls.includes('brand')) s += 20;
      if (alt.includes('logo')) s += 25;
      if (src.includes('logo')) s += 20;
      if (src.includes('brand')) s += 10;
      // Prefer SVG
      if (src.endsWith('.svg')) s += 10;
      // Position weight: closer to top-left = better
      s += Math.max(0, 30 - r.top / 5);
      s += Math.max(0, 20 - r.left / 20);
      // Reasonable logo size
      if (r.width >= 60 && r.width <= 350 && r.height >= 16 && r.height <= 100) s += 15;
      return s;
    }
    let best = null, bestScore = 0;
    for (const el of all) {
      const sc = score(el);
      if (sc > bestScore) {
        const u = el.currentSrc || el.src || el.href?.baseVal || '';
        if (u && !u.startsWith('data:')) {
          best = u;
          bestScore = sc;
        }
      }
    }
    return best;
  });
}

async function downloadInBrowser(page, url) {
  return page.evaluate(async (u) => {
    try {
      const r = await fetch(u, { credentials: 'include' });
      if (!r.ok) return null;
      const buf = await r.arrayBuffer();
      const ct = r.headers.get('content-type') || '';
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
    args: ['--disable-blink-features=AutomationControlled', '--ignore-certificate-errors'],
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'ru-RU',
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  for (const [name, site] of Object.entries(SITES)) {
    process.stderr.write(`[${name}] ${site}\n`);
    try {
      await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch (e) {
      console.error(`  ! goto: ${e.message.slice(0, 80)}`);
      continue;
    }
    try {
      await page.waitForFunction(() => document.body.innerText.length > 500, { timeout: 15000 });
    } catch {}
    await page.waitForTimeout(2000);

    let logo = null;
    try { logo = await pickAnyLogo(page); } catch {}
    if (!logo) {
      console.error(`  × no candidate`);
      continue;
    }
    console.error(`  → ${logo}`);
    const got = await downloadInBrowser(page, logo);
    if (!got || got.len < 800) {
      console.error(`  × download ${got ? got.len + 'b' : 'failed'}`);
      continue;
    }
    const slug = slugOf(name);
    const ext = extOf(got.ct, logo);
    const out = path.join(OUT_DIR, `${slug}.${ext}`);
    await writeFile(out, Buffer.from(got.b64, 'base64'));
    manifest[name] = `/logos/${slug}.${ext}`;
    console.error(`  ✓ ${slug}.${ext} (${got.len}b)`);
  }

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  await browser.close();
  console.error(`\nManifest: ${Object.keys(manifest).length} brands`);
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
