import crypto from 'node:crypto';
import fs from 'node:fs';

function fail(message) {
  console.error(`equivalence verifier: ${message}`);
  process.exitCode = 1;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function baseUrl(value, label) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') throw new Error('must use https');
    return url;
  } catch (error) {
    throw new Error(`${label} is invalid: ${error.message}`);
  }
}

function routeUrl(base, route) {
  return new URL(route, base).toString();
}

function normalizedHeader(name, value) {
  if (value == null) return null;
  if (name.toLowerCase() === 'content-type') return value.split(';')[0].trim().toLowerCase();
  return value.trim();
}

function htmlSemantics(html) {
  const pick = (pattern) => html.match(pattern)?.[1]?.trim() || null;
  return {
    title: pick(/<title[^>]*>([\s\S]*?)<\/title>/i),
    canonical: pick(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i)
      || pick(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i),
    robots: pick(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["'][^>]*>/i)
      || pick(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["'][^>]*>/i)
  };
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function snapshot(url, headerNames) {
  const response = await fetch(url, {
    redirect: 'manual',
    headers: { 'user-agent': 'kontrastudio-vercel-cloudflare-migration-kit/0.1' }
  });
  const body = await response.text();
  const headers = Object.fromEntries(
    headerNames.map((name) => [name.toLowerCase(), normalizedHeader(name, response.headers.get(name))])
  );
  const contentType = response.headers.get('content-type') || '';
  return {
    status: response.status,
    location: response.headers.get('location'),
    headers,
    body,
    semantics: contentType.includes('text/html') ? htmlSemantics(body) : null
  };
}

const manifestPath = process.argv[2] || process.env.MIGRATION_MANIFEST;
const targetValue = process.argv[3] || process.env.TARGET_URL;

if (!manifestPath || !targetValue) {
  console.error('usage: node scripts/verify-equivalence.mjs <migration.json> <candidate-base-url>');
  process.exit(2);
}

const manifest = readJson(manifestPath);
const source = baseUrl(manifest.source.production, 'source.production');
const target = baseUrl(targetValue, 'candidate URL');
const routes = manifest.verify?.routes || [];
const exactBodyRoutes = new Set(manifest.verify?.exactBodyRoutes || []);
const headerNames = manifest.verify?.headers || [
  'content-type',
  'content-security-policy',
  'x-content-type-options',
  'referrer-policy',
  'x-frame-options',
  'permissions-policy'
];

if (!routes.length) throw new Error('verify.routes must contain at least one route');

for (const route of routes) {
  const sourceUrl = routeUrl(source, route);
  const targetUrl = routeUrl(target, route);
  const [a, b] = await Promise.all([snapshot(sourceUrl, headerNames), snapshot(targetUrl, headerNames)]);
  let ok = true;

  if (a.status !== b.status) {
    fail(`${route}: status differs (${a.status} source, ${b.status} candidate)`);
    ok = false;
  }

  for (const name of headerNames) {
    const key = name.toLowerCase();
    if (a.headers[key] !== b.headers[key]) {
      fail(`${route}: ${key} differs (${JSON.stringify(a.headers[key])} source, ${JSON.stringify(b.headers[key])} candidate)`);
      ok = false;
    }
  }

  if (a.semantics || b.semantics) {
    for (const key of ['title', 'canonical', 'robots']) {
      if ((a.semantics?.[key] || null) !== (b.semantics?.[key] || null)) {
        fail(`${route}: HTML ${key} differs (${JSON.stringify(a.semantics?.[key] || null)} source, ${JSON.stringify(b.semantics?.[key] || null)} candidate)`);
        ok = false;
      }
    }
  }

  if (exactBodyRoutes.has(route) && sha256(a.body) !== sha256(b.body)) {
    fail(`${route}: exact body differs (${sha256(a.body)} source, ${sha256(b.body)} candidate)`);
    ok = false;
  }

  if (ok) console.log(`✓ ${route}`);
}

for (const redirect of manifest.verify?.redirects || []) {
  const response = await fetch(redirect.url, {
    redirect: 'manual',
    headers: { 'user-agent': 'kontrastudio-vercel-cloudflare-migration-kit/0.1' }
  });
  const location = response.headers.get('location');
  if (response.status !== redirect.status || location !== redirect.location) {
    fail(`redirect ${redirect.url}: expected ${redirect.status} ${redirect.location}, got ${response.status} ${location}`);
  } else {
    console.log(`✓ redirect ${redirect.url}`);
  }
}

if (!process.exitCode) {
  console.log(`equivalence verifier: ${routes.length} route(s) matched ${source.origin} ↔ ${target.origin}`);
}
