// Third pass — use Brandfetch's CDN by domain. They serve high-quality SVG/PNG
// for thousands of brands, no API key needed for direct CDN reads.
// URL pattern: https://cdn.brandfetch.io/<domain>/w/512/h/512/symbol?c=1id...
// Falls back to: https://cdn.brandfetch.io/<domain>

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.resolve(ROOT, 'public/logos');

// Brand → domain (when site URL doesn't match the canonical brand domain).
// Most sites just use their own domain — these are corrections.
const DOMAINS = {
  'Bambu Lab':       'bambulab.com',
  'Polymaker':       'polymaker.com',
  'Creality':        'creality.com',
  'Hatchbox':        'hatchbox3d.com',
  'UltiMaker':       'ultimaker.com',
  'Inland':          'microcenter.com',
  'Amazon Basics':   'amazon.com',
  'MonoPrice':       'monoprice.com',
  'NinjaTek':        'ninjatek.com',
  'Kexcelled':       'kexcelled.com',
  'Voxelab':         'voxelab3dp.com',
  'Raise3D':         'raise3d.com',
  'Geeetech':        'geeetech.com',
  'PopBit':          'popbit3d.com',
  'Plexiwire':       'plexiwire.com.ua',
  'Greg':            'greg-3d.ru',
  'Element3D':       'element3d.ru',
  'DEXP':            'dns-shop.ru',         // DEXP brand sold via DNS
  'MY3D':            'my3d.art',
  'R-filament':      'r-filament.ru',
  'SolidFilament':   'solidfilament.com',
  'Некрасовский полимер': 'nekrasovskiy-polimer.ru',
  'Царь3D':          'tsar3d.ru',
  '123 3D':          '123-3d.ru',
};

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchBytes(url) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'image/*,*/*' },
      redirect: 'follow',
    });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    const ct = (r.headers.get('content-type') || '').toLowerCase();
    return { buf, ct };
  } catch { return null; }
}

function slugOf(name) {
  return name.toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}
function extOf(ct) {
  if (ct.includes('svg')) return 'svg';
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg';
  return 'png';
}

async function tryBrandfetch(domain) {
  // Brandfetch direct CDN: returns highest quality logo for the domain.
  const urls = [
    `https://cdn.brandfetch.io/${domain}/w/512/h/512`,
    `https://cdn.brandfetch.io/${domain}`,
  ];
  for (const u of urls) {
    const got = await fetchBytes(u);
    if (got && got.buf.length > 500 && /image|svg/.test(got.ct)) return got;
  }
  return null;
}

async function tryClearbit(domain) {
  const got = await fetchBytes(`https://logo.clearbit.com/${domain}?size=512`);
  if (got && got.buf.length > 500 && /image|svg/.test(got.ct)) return got;
  return null;
}

async function tryGoogleFav(domain) {
  // Largest sized favicon Google can serve
  const got = await fetchBytes(`https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=256`);
  if (got && got.buf.length > 500) return got;
  return null;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const manifestPath = path.join(ROOT, 'data/logos.json');
  let manifest = {};
  try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); } catch {}

  const results = { ok: [], fail: [] };
  for (const [name, domain] of Object.entries(DOMAINS)) {
    if (manifest[name]) {
      console.error(`[${name}] already in manifest, skip`);
      continue;
    }
    process.stderr.write(`[${name}] ${domain}\n`);

    let got = await tryBrandfetch(domain);
    let from = 'brandfetch';
    if (!got) { got = await tryClearbit(domain); from = 'clearbit'; }
    if (!got) { got = await tryGoogleFav(domain); from = 'google-fav'; }

    if (!got) {
      console.error(`  × all sources failed`);
      results.fail.push(name);
      continue;
    }
    const slug = slugOf(name);
    const ext = extOf(got.ct);
    const out = path.join(OUT_DIR, `${slug}.${ext}`);
    await writeFile(out, got.buf);
    manifest[name] = `/logos/${slug}.${ext}`;
    console.error(`  ✓ ${from} → ${slug}.${ext} (${got.buf.length}b)`);
    results.ok.push(name);
  }

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.error(`\n✓ ${results.ok.length}, × ${results.fail.length}`);
  if (results.fail.length) console.error(`failed: ${results.fail.join(', ')}`);
  console.error(`Manifest: ${Object.keys(manifest).length} entries`);
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
