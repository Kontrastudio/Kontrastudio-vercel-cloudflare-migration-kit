import dns from 'node:dns/promises';
import fs from 'node:fs';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function resolveOrEmpty(fn) {
  try {
    return await fn();
  } catch {
    return [];
  }
}

async function captureHost(host) {
  const [a, aaaa, cname] = await Promise.all([
    resolveOrEmpty(() => dns.resolve4(host)),
    resolveOrEmpty(() => dns.resolve6(host)),
    resolveOrEmpty(() => dns.resolveCname(host))
  ]);

  const url = `https://${host}/`;
  let http;

  try {
    const response = await fetch(url, {
      redirect: 'manual',
      headers: { 'user-agent': 'kontrastudio-vercel-cloudflare-migration-kit/0.1' }
    });

    http = {
      url,
      status: response.status,
      location: response.headers.get('location'),
      server: response.headers.get('server'),
      cfRay: response.headers.get('cf-ray'),
      vercelId: response.headers.get('x-vercel-id'),
      contentType: response.headers.get('content-type')
    };
  } catch (error) {
    http = {
      url,
      error: error instanceof Error ? error.message : String(error)
    };
  }

  return {
    host,
    dns: { a, aaaa, cname },
    http
  };
}

const manifestPath = process.argv[2] || process.env.MIGRATION_MANIFEST;
const outputPath = process.argv[3] || null;

if (!manifestPath) {
  console.error('usage: node scripts/capture-baseline.mjs <migration.json> [output.json]');
  process.exit(2);
}

const manifest = readJson(manifestPath);
const hosts = [...new Set([
  manifest.production?.apex,
  manifest.production?.canonical,
  ...(manifest.protectedHosts || [])
].filter(Boolean))];

if (!hosts.length) {
  throw new Error('manifest does not define any production/protected hostnames');
}

const snapshot = {
  schemaVersion: 1,
  capturedAt: new Date().toISOString(),
  manifest: manifestPath,
  sourceProduction: manifest.source?.production || null,
  hosts: []
};

for (const host of hosts) {
  snapshot.hosts.push(await captureHost(host));
}

const json = `${JSON.stringify(snapshot, null, 2)}\n`;

if (outputPath) {
  fs.writeFileSync(outputPath, json);
  console.error(`baseline capture: wrote ${hosts.length} host(s) to ${outputPath}`);
} else {
  process.stdout.write(json);
}
