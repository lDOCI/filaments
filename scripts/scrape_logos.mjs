// Scrape brand logos directly from each manufacturer's website.
// Strategy per site (priority order):
//   1. <link rel="apple-touch-icon"> with size >= 120 (highest quality usually)
//   2. <meta property="og:image">
//   3. <link rel="icon"> with sizes >= 64
//   4. inline <svg> inside <header> / .header / .logo
//   5. <img class~="logo"> inside header
//   6. /favicon.ico (last resort, but skipped if Clearbit knows the domain better)
//
// Saves to public/logos/<slug>.<ext>. Slug is built from manufacturer name.

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.resolve(ROOT, 'public/logos');

const filaments = JSON.parse(readFileSync(path.join(ROOT, 'data/filaments.json'), 'utf8'));

// Group by manufacturer; pick the first website link
const sites = new Map();
for (const f of filaments) {
  const w = f.links?.website;
  if (w && !sites.has(f.manufacturer)) {
    sites.set(f.manufacturer, w);
  }
}

function slugOf(name) {
  return name.toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchText(url, timeout = 15000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html,*/*' },
      signal: ctrl.signal,
      redirect: 'follow',
    });
    if (!r.ok) return null;
    return await r.text();
  } catch { return null; }
  finally { clearTimeout(timer); }
}

async function fetchBytes(url, timeout = 20000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'image/*,*/*' },
      signal: ctrl.signal,
      redirect: 'follow',
    });
    if (!r.ok) return null;
    const buf = await r.arrayBuffer();
    const ct = (r.headers.get('content-type') || '').toLowerCase();
    return { buf: Buffer.from(buf), ct };
  } catch { return null; }
  finally { clearTimeout(timer); }
}

function extOf(ct, url) {
  if (ct.includes('svg')) return 'svg';
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg';
  if (ct.includes('icon') || ct.includes('x-icon')) return 'ico';
  // Fall back to URL extension
  const m = String(url).split('?')[0].match(/\.(svg|png|webp|jpe?g|ico|gif)$/i);
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'png';
}

function abs(base, href) {
  try { return new URL(href, base).toString(); } catch { return null; }
}

// Extract candidate logo URLs from HTML, ranked best-first.
function extractCandidates(html, baseUrl) {
  const cands = [];

  // 1. apple-touch-icon (always 120px+ in modern sites)
  for (const m of html.matchAll(/<link[^>]+rel=["']?(?:apple-touch-icon[^"']*)["']?[^>]*>/gi)) {
    const tag = m[0];
    const href = (tag.match(/href=["']([^"']+)["']/i) || [])[1];
    const sizes = (tag.match(/sizes=["']([^"']+)["']/i) || [])[1] || '180x180';
    const sz = parseInt(sizes, 10) || 180;
    if (href) cands.push({ url: abs(baseUrl, href), score: sz, source: 'apple-touch-icon' });
  }

  // 2. og:image
  for (const m of html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi)) {
    cands.push({ url: abs(baseUrl, m[1]), score: 100, source: 'og:image' });
  }
  // also in reverse attr order
  for (const m of html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/gi)) {
    cands.push({ url: abs(baseUrl, m[1]), score: 100, source: 'og:image' });
  }

  // 3. <link rel="icon"> with sizes
  for (const m of html.matchAll(/<link[^>]+rel=["']?(?:icon|shortcut icon)["']?[^>]*>/gi)) {
    const tag = m[0];
    const href = (tag.match(/href=["']([^"']+)["']/i) || [])[1];
    const sizes = (tag.match(/sizes=["']([^"']+)["']/i) || [])[1] || '32x32';
    const sz = parseInt(sizes, 10) || 32;
    const isSvg = /\.svg($|\?)/i.test(href || '') || sizes === 'any';
    if (href) cands.push({
      url: abs(baseUrl, href),
      score: isSvg ? 200 : sz, // SVG icons are usually full-quality logos, prefer them
      source: isSvg ? 'svg-icon' : 'icon',
    });
  }

  // 4. <img> in header / .logo class
  // Find header/logo container, then take first img inside
  const headerMatch = html.match(/<(?:header|nav)[^>]*>([\s\S]{0,3000}?)<\/(?:header|nav)>/i);
  if (headerMatch) {
    const inner = headerMatch[1];
    for (const m of inner.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)) {
      const url = abs(baseUrl, m[1]);
      const tag = m[0].toLowerCase();
      const looksLikeLogo = /logo|brand|header/.test(tag) || /logo|brand/.test(m[1].toLowerCase());
      cands.push({
        url,
        score: looksLikeLogo ? 90 : 40,
        source: looksLikeLogo ? 'header-logo-img' : 'header-img',
      });
    }
  }
  // Class-based logo image anywhere
  for (const m of html.matchAll(/<img[^>]*class=["'][^"']*(?:logo|brand)[^"']*["'][^>]*>/gi)) {
    const src = (m[0].match(/src=["']([^"']+)["']/i) || [])[1];
    if (src) cands.push({ url: abs(baseUrl, src), score: 85, source: 'class-logo-img' });
  }

  // Dedupe and sort by score desc
  const seen = new Set();
  return cands
    .filter(c => c.url && !c.url.startsWith('data:') && !seen.has(c.url) && (seen.add(c.url), true))
    .sort((a, b) => b.score - a.score);
}

async function tryLogo(name, site) {
  const slug = slugOf(name);
  console.error(`\n[${slug}] ${site}`);

  const html = await fetchText(site);
  if (!html) {
    console.error(`  ! site unreachable`);
    return null;
  }

  const candidates = extractCandidates(html, site);
  if (!candidates.length) {
    console.error(`  ! no logo candidates found`);
    return null;
  }
  console.error(`  ${candidates.length} candidates, trying top...`);

  for (const c of candidates.slice(0, 5)) {
    console.error(`  → [${c.source} ${c.score}] ${c.url}`);
    const got = await fetchBytes(c.url);
    if (!got) { console.error(`    ! fetch failed`); continue; }
    if (got.buf.length < 200) { console.error(`    ! too small (${got.buf.length}b)`); continue; }
    if (got.buf.length > 800_000) { console.error(`    ! too big (${got.buf.length}b)`); continue; }
    const ext = extOf(got.ct, c.url);
    const out = path.join(OUT_DIR, `${slug}.${ext}`);
    await writeFile(out, got.buf);
    console.error(`    ✓ saved ${slug}.${ext} (${got.buf.length}b)`);
    return { slug, ext, source: c.source, bytes: got.buf.length };
  }

  console.error(`  ! all candidates failed`);
  return null;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const list = Array.from(sites.entries());
  console.error(`Scraping ${list.length} brand sites…`);

  const results = [];
  // Run sequentially to avoid hammering CDNs / hitting rate limits
  for (const [name, site] of list) {
    const r = await tryLogo(name, site);
    results.push({ name, site, ok: !!r, ...r });
  }

  // Summary + manifest
  const ok = results.filter(r => r.ok);
  const fail = results.filter(r => !r.ok);
  console.error(`\n=== DONE ===`);
  console.error(`✓ ${ok.length}/${list.length} logos saved`);
  console.error(`× ${fail.length} failed`);
  if (fail.length) console.error(`  ${fail.map(f => f.name).join(', ')}`);

  // Manifest mapping manufacturer → logo path
  const manifest = {};
  for (const r of ok) manifest[r.name] = `/logos/${r.slug}.${r.ext}`;
  await writeFile(
    path.join(ROOT, 'data/logos.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
  console.error(`Manifest → data/logos.json`);
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
