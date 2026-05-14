// Capture screenshot + DOM of the reference filament details page.
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

const browser = await chromium.launch({
  headless: true,
  args: ['--disable-blink-features=AutomationControlled'],
});
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  viewport: { width: 1440, height: 1600 },
});
const page = await context.newPage();

console.error('>> Opening reference page');
try {
  await page.goto('https://3dfilamentprofiles.com/filament/details/577', {
    waitUntil: 'domcontentloaded', timeout: 90000,
  });
} catch (e) {
  console.error('!! goto:', e.message);
}

// Wait for checkpoint to clear
try {
  await page.waitForFunction(
    () => !document.title.includes('Vercel Security') && document.body.innerText.length > 2000,
    { timeout: 60000 }
  );
} catch {}

await page.waitForTimeout(8000);

// Screenshot the full page
try {
  await page.screenshot({ path: 'tmp/3dfp_reference.png', fullPage: true, timeout: 15000 });
  console.error('>> Screenshot saved');
} catch (e) {
  console.error('!! screenshot:', e.message);
}

// Save HTML
const html = await page.content();
await writeFile('tmp/3dfp_reference.html', html, 'utf8');

// Extract structural info: section headings, layout grid, key elements
const layout = await page.evaluate(() => {
  function describe(el, depth = 0) {
    if (depth > 4) return null;
    const tag = el.tagName.toLowerCase();
    const cls = (el.className || '').toString().slice(0, 80);
    const text = (el.innerText || '').trim().slice(0, 100);
    return { tag, cls, text, children: Array.from(el.children).slice(0, 10).map(c => describe(c, depth + 1)).filter(Boolean) };
  }
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => ({
    tag: h.tagName, text: h.innerText.trim().slice(0, 100)
  }));
  const sections = Array.from(document.querySelectorAll('main > *, [class*="container"] > *, section, article')).slice(0, 30).map(s => ({
    tag: s.tagName.toLowerCase(),
    cls: (s.className || '').toString().slice(0, 60),
    text: (s.innerText || '').trim().slice(0, 200)
  }));
  return { title: document.title, url: location.href, headings, sections };
}).catch(() => null);

await writeFile('tmp/3dfp_reference_layout.json', JSON.stringify(layout, null, 2), 'utf8');
console.error('>> Layout saved');

await browser.close();
