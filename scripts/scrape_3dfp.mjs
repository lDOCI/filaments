// Scrape 3dfilamentprofiles.com using Playwright (passes the Vercel checkpoint)
// Captures the React Server Components stream and extracts filaments + brands.
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../tmp');

async function captureRSC(page, urlPath) {
  // Listen for the RSC response. Next.js sends it as text/x-component.
  const buffers = [];
  page.on('response', async (resp) => {
    const ct = (resp.headers()['content-type'] || '').toLowerCase();
    if (ct.includes('text/x-component') || ct.includes('text/plain') || ct.includes('text/html')) {
      try {
        const body = await resp.text();
        if (body.length > 1000) {
          buffers.push({ url: resp.url(), status: resp.status(), body, ct });
        }
      } catch {}
    }
  });

  console.error(`>> Navigating to ${urlPath}`);
  try {
    await page.goto('https://3dfilamentprofiles.com' + urlPath, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
  } catch (e) {
    console.error(`!! goto failed: ${e.message} — continuing with whatever loaded`);
  }

  // Wait for the Vercel checkpoint to clear and main content to render.
  console.error('>> Waiting for content (max 60s)...');
  try {
    await page.waitForFunction(
      () => !document.title.includes('Vercel Security') && document.body.innerText.length > 1000,
      { timeout: 60000 }
    );
  } catch (e) {
    console.error('!! Timed out waiting for content; will proceed anyway');
  }

  // Give the page extra time to fetch any client-side data.
  await page.waitForTimeout(3000);

  // Try to scroll a bit to trigger any lazy lists.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);

  return buffers;
}

async function extractDOMTable(page) {
  // Read whatever rendered table data we can from the DOM.
  return page.evaluate(() => {
    const rows = [];
    document.querySelectorAll('table').forEach((t) => {
      const headers = Array.from(t.querySelectorAll('thead th, thead td')).map(
        (h) => h.innerText.trim()
      );
      t.querySelectorAll('tbody tr').forEach((tr) => {
        const cells = Array.from(tr.querySelectorAll('td')).map((td) => td.innerText.trim());
        if (cells.length) rows.push({ headers, cells });
      });
    });
    // Also try common card layouts
    const cards = [];
    document.querySelectorAll('[data-filament], [data-brand], a[href*="/filaments/"], a[href*="/brands/"]').forEach((el) => {
      cards.push({ text: el.innerText.trim().slice(0, 400), href: el.href || '' });
    });
    return { rows, cards, title: document.title, url: location.href };
  });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
  });
  const page = await context.newPage();

  for (const [resource, slug] of [
    ['filaments', '/filaments'],
    ['brands', '/brands'],
    ['materials', '/materials'],
  ]) {
    console.error(`\n=== ${resource} ===`);
    try {
      const buffers = await captureRSC(page, slug);
      const dom = await extractDOMTable(page);

      await writeFile(
        path.join(OUT_DIR, `3dfp_${resource}_dom.json`),
        JSON.stringify(dom, null, 2),
        'utf8'
      );
      const html = await page.content();
      await writeFile(path.join(OUT_DIR, `3dfp_${resource}.html`), html, 'utf8');
      await writeFile(
        path.join(OUT_DIR, `3dfp_${resource}_net.txt`),
        buffers.map((b) => `\n===== ${b.status} ${b.ct} ${b.url} =====\n${b.body}`).join('\n'),
        'utf8'
      );
      try {
        await page.screenshot({ path: path.join(OUT_DIR, `3dfp_${resource}.png`), fullPage: true, timeout: 5000 });
      } catch {}
      console.error(`>> Saved ${dom.rows.length} table rows + ${dom.cards.length} cards + ${buffers.length} network responses`);
    } catch (e) {
      console.error(`!! ${resource} failed: ${e.message}`);
    }
  }

  await browser.close();
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
