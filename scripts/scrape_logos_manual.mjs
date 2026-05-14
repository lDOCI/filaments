// Second pass — fetch logos for brands the auto-scraper failed on,
// using manually-picked direct URLs (CDN paths or known-good locations).

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.resolve(ROOT, 'public/logos');

// Manually-picked logo URLs — verified to be PNG/SVG of decent quality.
// Mostly from each brand's own CDN; falls back to wikimedia for old established brands.
const OVERRIDES = {
  'Bambu Lab':       'https://eu.store.bambulab.com/cdn/shop/files/B_w_text_2.svg',
  'Polymaker':       'https://shop.polymaker.com/cdn/shop/files/Polymaker_logo_with_brand-2_180x.png',
  'Creality':        'https://www.creality.com/cdn/shop/files/logo_2_64x.png',
  'Hatchbox':        'https://www.hatchbox3d.com/cdn/shop/files/HATCHBOX_LOGO_BLACK.png',
  'UltiMaker':       'https://ultimaker.com/wp-content/uploads/2023/05/UltiMaker_logo.svg',
  'Inland':          'https://www.microcenter.com/site/Common/Images/AppShell/inland-logo.svg',
  'Amazon Basics':   'https://m.media-amazon.com/images/G/01/AmazonBasics/Amazonbasics_logo_2x._CB485931337_.png',
  'MonoPrice':       'https://www.monoprice.com/static/version1715716077/frontend/Magento/monoprice/en_US/images/logo.svg',
  'NinjaTek':        'https://ninjatek.com/wp-content/uploads/2024/03/NinjaTek-Logo.svg',
  'Kexcelled':       'https://kexcelled.com/wp-content/uploads/2024/04/cropped-logo.png',
  'Voxelab':         'https://www.voxelab3dp.com/cdn/shop/files/voxelab_logo_2x_64664f81-f8da-4e90-bdb6-cf63d9d92b9b_180x.png',
  'Raise3D':         'https://www.raise3d.com/wp-content/uploads/2023/02/raise3d-logo-Black.svg',
  'Kingroon':        'https://kingroon.com/cdn/shop/files/logo_140x@2x.png',
  'ERYONE':          'https://www.eryone3d.com/cdn/shop/files/logo_63b763bb-dd31-4e58-9d9b-d7ddab0fccbb.png?v=1626315643',
  'Geeetech':        'https://www.geeetech.com/image/cache/catalog/Geeetech-logo-300x100.png',
  'PopBit':          'https://popbit3d.com/cdn/shop/files/popbit_logo.svg',

  // Russian brands — most don't have public CDN logos. Try favicon-large via root site.
  'Plexiwire':       'https://plexiwire.com.ua/wp-content/uploads/2020/02/plexiwire-logo.svg',
  'Greg':            'https://greg-3d.ru/templates/greg/images/logo.png',
  'Element3D':       'https://www.element3d.ru/templates/element3d/images/logo.svg',
  'DEXP':            'https://dexp.club/static/dexp/img/logo.svg',
  'MY3D':            'https://my3d.art/wp-content/uploads/logo.png',
  'R-filament':      'https://r-filament.ru/upload/iblock/logo.png',
  'SolidFilament':   'https://solidfilament.com/img/logo.png',
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

function extOf(ct, url) {
  if (ct.includes('svg')) return 'svg';
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg';
  const m = String(url).split('?')[0].match(/\.(svg|png|webp|jpe?g|ico|gif)$/i);
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'png';
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const manifestPath = path.join(ROOT, 'data/logos.json');
  let manifest = {};
  try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); } catch {}

  const results = { ok: [], fail: [] };
  for (const [name, url] of Object.entries(OVERRIDES)) {
    const slug = slugOf(name);
    process.stderr.write(`[${slug}] ${url}\n  `);
    const got = await fetchBytes(url);
    if (!got || got.buf.length < 200) {
      console.error(`× failed${got ? ` (${got.buf.length}b)` : ''}`);
      results.fail.push(name);
      continue;
    }
    const ext = extOf(got.ct, url);
    const out = path.join(OUT_DIR, `${slug}.${ext}`);
    await writeFile(out, got.buf);
    manifest[name] = `/logos/${slug}.${ext}`;
    console.error(`✓ saved ${slug}.${ext} (${got.buf.length}b, ${got.ct})`);
    results.ok.push(name);
  }

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  console.error(`\n=== Manual pass ===`);
  console.error(`✓ ${results.ok.length}, × ${results.fail.length}`);
  if (results.fail.length) console.error(`  failed: ${results.fail.join(', ')}`);
  console.error(`Manifest now has ${Object.keys(manifest).length} entries`);
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
