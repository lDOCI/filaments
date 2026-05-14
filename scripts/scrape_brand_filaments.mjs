// Scrape per-brand filaments from 3dfilamentprofiles.com — capture XHR/fetch responses.
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../tmp');

const BRANDS_TO_FETCH = process.env.BRANDS
  ? process.env.BRANDS.split(',')
  : [
      'fdplast', 'нит', 'bestfilament', 'mako', 'plexiwire-ua', 'rec',
      'syntech', 'dexp', 'exoflex', '3dplast', 'tiger3d', 'filamentarno',
      '3d-best-q', 'semdon', 'infinitri', 'unitak3d', 'hiprecy',
      '3dfinity', 'infill', 'janit', 'my3d', '3d-best', 'precision-maker',
    ];

async function fetchBrand(page, slug) {
  const url = `https://3dfilamentprofiles.com/brands/${encodeURIComponent(slug)}`;
  console.error(`\n>> ${url}`);

  // Capture all XHR/fetch responses
  const captured = [];
  const handler = async (resp) => {
    const u = resp.url();
    const ct = (resp.headers()['content-type'] || '').toLowerCase();
    // We want API/JSON responses
    if (ct.includes('json') || u.includes('/api/') || u.includes('rest') ||
        u.includes('supabase') || u.includes('rsc')) {
      try {
        const body = await resp.text();
        if (body.length > 50 && body.length < 2_000_000) {
          captured.push({ url: u, status: resp.status(), ct, body });
        }
      } catch {}
    }
  };
  page.on('response', handler);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch (e) {
    console.error(`   !! goto: ${e.message.slice(0, 80)}`);
  }

  // Wait for checkpoint to clear
  try {
    await page.waitForFunction(
      () => !document.title.includes('Vercel Security'),
      { timeout: 45000 }
    );
  } catch {}

  // Wait for actual filament content to appear in DOM, or just give it 25s
  let domSize = 0;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000);
    const text = await page.evaluate(() => document.body.innerText.length);
    if (text > domSize + 500) {
      domSize = text;
      i = 0; // reset — still growing
    } else if (text > 3000) {
      // Content present and stable
      break;
    }
  }
  // Scroll to trigger lazy loads
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(3000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(2000);

  // Try to extract table rows from DOM
  const dom = await page.evaluate(() => {
    const tables = [];
    document.querySelectorAll('table').forEach((t) => {
      const headers = Array.from(t.querySelectorAll('thead th')).map((h) => h.innerText.trim());
      const rows = [];
      t.querySelectorAll('tbody tr').forEach((tr) => {
        rows.push(Array.from(tr.querySelectorAll('td')).map((td) => td.innerText.trim()));
      });
      tables.push({ headers, rows });
    });
    return { title: document.title, url: location.href, bodyLen: document.body.innerText.length, tables };
  });

  page.off('response', handler);

  const html = await page.content();
  const safe = slug.replace(/[^a-z0-9-]/gi, '_');
  await writeFile(path.join(OUT_DIR, `3dfp_brand_${safe}.html`), html, 'utf8');
  await writeFile(path.join(OUT_DIR, `3dfp_brand_${safe}_dom.json`), JSON.stringify(dom, null, 2), 'utf8');
  // Save captured responses
  await writeFile(
    path.join(OUT_DIR, `3dfp_brand_${safe}_xhr.json`),
    JSON.stringify(captured.map(c => ({ url: c.url, status: c.status, ct: c.ct, len: c.body.length })), null, 2),
    'utf8'
  );
  const interesting = captured.filter(c => c.body.includes('filament') || c.body.includes('spool'));
  if (interesting.length) {
    await writeFile(
      path.join(OUT_DIR, `3dfp_brand_${safe}_xhr_bodies.txt`),
      interesting.map(c => `===== ${c.status} ${c.ct} ${c.url} =====\n${c.body}\n`).join('\n'),
      'utf8'
    );
  }
  console.error(`   rows: ${dom.tables.reduce((a, t) => a + t.rows.length, 0)} | xhr: ${captured.length} | interesting: ${interesting.length} | bodyLen: ${dom.bodyLen}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
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

  for (const slug of BRANDS_TO_FETCH) {
    try {
      await fetchBrand(page, slug);
    } catch (e) {
      console.error(`!! ${slug} failed: ${e.message}`);
    }
  }

  await browser.close();
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
