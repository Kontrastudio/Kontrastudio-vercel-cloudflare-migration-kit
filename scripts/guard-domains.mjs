import fs from 'node:fs';
import path from 'node:path';

function fail(message) {
  console.error(`domain guard: ${message}`);
  process.exit(1);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`cannot parse ${file}: ${error.message}`);
  }
}

function host(value, label) {
  if (typeof value !== 'string' || !value.trim()) fail(`${label} must be a hostname`);
  const normalized = value.trim().toLowerCase().replace(/\.$/, '');
  if (normalized.includes('*')) fail(`${label} may not contain a wildcard: ${normalized}`);
  if (normalized.includes('/') || normalized.includes(':')) fail(`${label} must be a bare hostname: ${normalized}`);
  return normalized;
}

const manifestPath = process.argv[2] || process.env.MIGRATION_MANIFEST;
const wranglerPath = process.argv[3] || process.env.WRANGLER_CONFIG;

if (!manifestPath) {
  fail('usage: node scripts/guard-domains.mjs <migration.json> [wrangler.json]');
}

const manifest = readJson(manifestPath);
const apex = host(manifest?.production?.apex, 'production.apex');
const canonical = host(manifest?.production?.canonical, 'production.canonical');
const expected = new Set([apex, canonical]);
const protectedHosts = new Set((manifest.protectedHosts || []).map((value, index) => host(value, `protectedHosts[${index}]`)));

for (const protectedHost of protectedHosts) {
  if (expected.has(protectedHost)) {
    fail(`protected hostname is also a production migration hostname: ${protectedHost}`);
  }
}

if (!wranglerPath) {
  console.log(`domain guard: manifest scope is exact and valid (${[...expected].join(', ')})`);
  process.exit(0);
}

const config = readJson(wranglerPath);
if (!Array.isArray(config.routes)) fail(`${path.basename(wranglerPath)} must define routes[]`);

const seen = new Set();
for (const [index, route] of config.routes.entries()) {
  if (!route || typeof route !== 'object') fail(`routes[${index}] must be an object`);
  const pattern = host(route.pattern, `routes[${index}].pattern`);
  if (route.custom_domain !== true) fail(`${pattern} is not declared as an exact custom domain`);
  if (!expected.has(pattern)) fail(`unexpected production hostname in Worker scope: ${pattern}`);
  if (protectedHosts.has(pattern)) fail(`protected hostname entered Worker scope: ${pattern}`);
  if (seen.has(pattern)) fail(`duplicate Worker hostname: ${pattern}`);
  seen.add(pattern);
}

if (seen.size !== expected.size || [...expected].some((value) => !seen.has(value))) {
  fail(`Worker hostname set must equal manifest production hosts: ${[...expected].join(', ')}`);
}

const serialized = JSON.stringify(config).toLowerCase();
for (const protectedHost of protectedHosts) {
  if (serialized.includes(protectedHost)) fail(`protected hostname appears elsewhere in Worker configuration: ${protectedHost}`);
}
if (serialized.includes('*.')) fail('wildcard hostname syntax appears in Worker configuration');

console.log(`domain guard: Worker scope verified (${[...seen].join(', ')})`);
