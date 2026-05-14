// Open a few brand cards and snapshot the sheet with logo
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
const page = await ctx.newPage();

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);

// Click into "Bambu Lab" group, first card
for (const brand of ['Bambu Lab', 'Polymaker', 'Bestfilament', 'eSUN', 'StarPlast']) {
  const card = await page.$(`[data-id^="${brand.toLowerCase().replace(/[^a-z0-9]/g, '_')}"]`);
  if (!card) {
    // try heading-based locator
    const h = await page.$(`text="${brand}"`);
    if (h) {
      const card2 = await h.evaluateHandle(el => el.closest('.group')?.querySelector('.card'));
      if (card2) { await card2.click(); }
    }
    continue;
  }
  await card.click();
  await page.waitForTimeout(2000);
  const file = `tmp/sheet_${brand.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
  await page.screenshot({ path: file });
  console.log('saved', file);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
}

await browser.close();
