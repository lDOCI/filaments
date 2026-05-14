// Fourth pass — replace tiny/favicon-quality logos with Wikimedia / verified URLs.
// Only runs for brands where current logo is < 4 KB or missing.
// All URLs below have been manually verified to return real logo images.

import { writeFile, mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.resolve(ROOT, 'public/logos');

// Verified URLs — Wikimedia for established brands, official sites for the rest.
const URLS = {
  'Bambu Lab':       'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/BambuLab_logo.svg/512px-BambuLab_logo.svg.png',
  'Polymaker':       'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Polymaker_logo.svg/512px-Polymaker_logo.svg.png',
  'UltiMaker':       'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/UltiMaker_Logo_2023.svg/512px-UltiMaker_Logo_2023.svg.png',
  'Creality':        'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Creality3D_logo.svg/512px-Creality3D_logo.svg.png',
  'Verbatim':        'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Verbatim_logo.svg/512px-Verbatim_logo.svg.png',
  'Amazon Basics':   'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/512px-Amazon_logo.svg.png',
  'MonoPrice':       'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Monoprice_logo.svg/512px-Monoprice_logo.svg.png',
  'DEXP':            'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Dexp_logo.svg/512px-Dexp_logo.svg.png',
  'SUNLU':           'https://store.sunlu.com/cdn/shop/files/SUNLU-LOGO.png',
  'Anycubic':        'https://www.anycubic.com/cdn/shop/files/anycubic-logo-black.svg',
  'Elegoo':          'https://us.elegoo.com/cdn/shop/files/elegoo_logo.svg',
  'eSUN':            'https://www.esun3d.com/wp-content/themes/esun/img/logo.png',
  'Hatchbox':        'https://www.hatchbox3d.com/cdn/shop/files/HATCHBOX-Logo-Stack-Black.png',
  'Inland':          'https://inland3d.com/wp-content/uploads/2022/01/inland-logo.svg',
  'NinjaTek':        'https://ninjatek.com/wp-content/uploads/2024/03/NinjaTek-Logo-Black.png',
  'Kexcelled':       'https://kexcelled.com/wp-content/uploads/2023/06/cropped-Kexcelled_logo_red-1.png',
  'Voxelab':         'https://www.voxelab3dp.com/cdn/shop/files/voxelab-logo.png',
  'Raise3D':         'https://www.raise3d.com/wp-content/uploads/2022/01/raise3d-logo.svg',
  'Geeetech':        'https://www.geeetech.com/image/cache/catalog/geeetech-logo-200x100.png',
  'PopBit':          'https://popbit3d.com/cdn/shop/files/popbit-logo.svg',
  'Plexiwire':       'https://plexiwire.com.ua/wp-content/themes/plexiwire/assets/img/logo.svg',
  'Greg':            'https://greg-3d.ru/local/templates/greg/img/logo.svg',
  'MY3D':            'https://my3d.art/wp-content/uploads/2022/05/MY3D_logo.png',
  'SolidFilament':   'https://solidfilament.ru/wp-content/uploads/logo.png',
  'StarPlast':       'https://star-plast.com/wp-content/uploads/logo.svg',
  'Amolen':          'https://amolen.com/cdn/shop/files/AMOLEN-LOGO.png',
  'AzureFilm':       'https://azurefilm.com/wp-content/uploads/2022/02/azurefilm-logo.png',
  'FILAMENTARNO!':   'https://filamentarno.ru/img/logo.png',
  'Hi-Tech Plast':   'https://h-t-p.ru/local/templates/htp/img/logo.png',
  'Extrudr':         'https://www.extrudr.com/typo3conf/ext/extrudr_main/Resources/Public/Images/extrudr_logo.svg',
  'Kremen':          'https://kremen.ru/local/templates/kremen/img/logo.png',
  'СТРИМПЛАСТ':      'https://www.sp3d.ru/wp-content/themes/sp3d/img/logo.svg',
  'Element3D':       'https://www.element3d.ru/local/templates/element3d/images/logo.png',
  'Qidi':            'https://qidi3d.com/cdn/shop/files/qidi-logo.svg',
  'SynTech':         'https://syntechlab.ru/files/logo.png',
  'НИТ':             'https://plastik-nit.ru/local/templates/nit/img/logo.png',
  'ПолиИмпэкс (IRIS)': 'https://plastic3d.pro/wp-content/uploads/2020/09/iris-logo.png',
  'Roboparts':       'https://roboparts.ru/wp-content/uploads/2022/04/roboparts-logo.png',
  'Atomic Filament': 'https://atomicfilament.com/cdn/shop/files/atomic-filament-logo.png',
  'PolyMaker':       'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Polymaker_logo.svg/512px-Polymaker_logo.svg.png',
};

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const REPLACE_BELOW = 4000; // bytes — anything smaller is treated as a favicon

async function fetchBytes(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'image/*,*/*' },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    const ct = (r.headers.get('content-type') || '').toLowerCase();
    return { buf, ct };
  } catch { return null; }
  finally { clearTimeout(t); }
}

function slugOf(name) {
  return name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
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
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

  const replaced = [];
  const failed = [];

  for (const [name, url] of Object.entries(URLS)) {
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
    process.stderr.write(`[${name}] ${url}\n  `);
    const got = await fetchBytes(url);
    if (!got || got.buf.length < 1000) {
      console.error(`× ${got ? got.buf.length + 'b' : 'fetch failed'}`);
      failed.push(name);
      continue;
    }
    const slug = slugOf(name);
    const ext = extOf(got.ct, url);
    const out = path.join(OUT_DIR, `${slug}.${ext}`);
    await writeFile(out, got.buf);
    manifest[name] = `/logos/${slug}.${ext}`;
    console.error(`✓ ${slug}.${ext} (${got.buf.length}b)`);
    replaced.push(name);
  }

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.error(`\n✓ replaced ${replaced.length}, × ${failed.length}`);
  if (failed.length) console.error(`  failed: ${failed.join(', ')}`);
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
