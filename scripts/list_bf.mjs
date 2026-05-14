import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 Chrome',
  viewport: { width: 1440, height: 900 },
});
const page = await ctx.newPage();
await page.goto('https://bestfilament.ru/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2000);

// Find ALL header images and report
const list = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('header img, nav img, [class*="logo"] img, [class*="header"] img, a[class*="logo"] img').forEach(img => {
    const r = img.getBoundingClientRect();
    out.push({
      src: img.currentSrc || img.src,
      alt: img.alt,
      cls: img.className?.toString?.() || '',
      width: r.width, height: r.height, top: r.top
    });
  });
  return out;
});
console.log(JSON.stringify(list, null, 2));
await browser.close();
