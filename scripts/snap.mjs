// Snapshot the local dev site for visual verification
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });

// Light theme
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 }, colorScheme: 'light' });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'tmp/site_light.png', fullPage: false });
}

// Dark theme
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'tmp/site_dark.png', fullPage: false });
}

await browser.close();
console.log('saved tmp/site_light.png and tmp/site_dark.png');
