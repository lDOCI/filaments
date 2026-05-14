// Headed debug — open one brand page, log all network, give browser time.
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

const browser = await chromium.launch({
  headless: true,
  args: ['--disable-blink-features=AutomationControlled'],
});
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();

const allResponses = [];
page.on('response', async (resp) => {
  const u = resp.url();
  const ct = resp.headers()['content-type'] || '';
  let body = '';
  try {
    body = await resp.text();
  } catch {}
  allResponses.push({ url: u, status: resp.status(), ct, len: body.length, preview: body.slice(0, 300) });
});

console.error('>> Opening brands/fdplast');
await page.goto('https://3dfilamentprofiles.com/brands/fdplast', { waitUntil: 'networkidle', timeout: 120000 }).catch(e => console.error('!! goto:', e.message));

// Extra wait
await page.waitForTimeout(15000);

const bodyText = await page.evaluate(() => document.body.innerText);
console.error('Body text:', bodyText.slice(0, 1000));
console.error('Body length:', bodyText.length);

// Look at all network responses
console.error('\n=== TOP 20 NETWORK RESPONSES ===');
for (const r of allResponses.filter(r => r.len > 100).slice(0, 30)) {
  console.error(`${r.status} ${r.ct.slice(0,40).padEnd(40)} ${r.len.toString().padStart(8)}b ${r.url.slice(0,100)}`);
}

await writeFile('tmp/debug_responses.json', JSON.stringify(allResponses, null, 2), 'utf8');
console.error(`\nSaved ${allResponses.length} responses to tmp/debug_responses.json`);

await browser.close();
