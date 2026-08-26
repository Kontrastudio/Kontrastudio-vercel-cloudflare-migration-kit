import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const examples = ['examples/theo.json', 'examples/kontrastudio.json'];

for (const relative of examples) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
  if (!manifest.worker || !manifest.production?.apex || !manifest.production?.canonical) {
    throw new Error(`${relative} is missing required migration scope`);
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'migration-kit-'));
  const wrangler = path.join(tmp, 'wrangler.json');
  fs.writeFileSync(
    wrangler,
    JSON.stringify(
      {
        name: manifest.worker,
        routes: [manifest.production.canonical, manifest.production.apex].map((pattern) => ({
          pattern,
          custom_domain: true
        }))
      },
      null,
      2
    )
  );

  const result = spawnSync(
    process.execPath,
    [path.join(root, 'scripts/guard-domains.mjs'), path.join(root, relative), wrangler],
    { encoding: 'utf8' }
  );

  if (result.status !== 0) {
    throw new Error(`${relative} failed domain guard:\n${result.stderr || result.stdout}`);
  }
}

console.log(`self-test: ${examples.length} migration fixture(s) passed`);
