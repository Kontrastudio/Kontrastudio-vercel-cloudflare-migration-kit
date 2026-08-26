# Kontrastudio Vercel → Cloudflare Migration Kit

Production-safe migration tooling for moving existing Next.js sites from Vercel to Cloudflare Workers without treating “the build passed” as proof that production is equivalent.

The kit is built around four ideas:

1. **Audit before adaptation** — identify Vercel-specific behavior, runtime assumptions, environment requirements and protected hostnames before changing infrastructure.
2. **Candidate before cutover** — deploy to an independent `workers.dev` candidate and verify it before touching production DNS.
3. **Behavioral equivalence** — compare routes, redirects, selected headers, SEO, assets and safe API behavior between the existing production deployment and the candidate.
4. **Rollback-aware cutover** — treat hostname changes as explicit stages, preserve the previous DNS values, and verify protected sibling services after every production change.

## Status

`v0.1-dev` — being extracted from two real migrations:

- a multilingual Next.js personal site with middleware redirects, API routes and SEO checks;
- the Kontrastudio public site, including an embedded Sanity Studio and inquiry API.

The repository is intentionally conservative. It does **not** promise one-click migration for every Vercel project and it never assumes that arbitrary DNS changes are safe.

## Migration state machine

```text
AUDITED
  ↓
PREPARED
  ↓
CANDIDATE_DEPLOYED
  ↓
CANDIDATE_VERIFIED
  ↓
WWW_CUTOVER
  ↓
WWW_VERIFIED
  ↓
APEX_CUTOVER
  ↓
PRODUCTION_VERIFIED
  ↓
ROLLBACK_HELD
  ↓
MIGRATION_COMPLETE
```

A project may use a different hostname order, but skipping verification gates should be an explicit decision rather than an accident.

## Project manifest

Target repositories describe site-specific facts in a small manifest. The generic tooling should not guess these values.

```json
{
  "$schema": "https://raw.githubusercontent.com/Kontrastudio/Kontrastudio-vercel-cloudflare-migration-kit/main/migration.schema.json",
  "worker": "example-site",
  "source": {
    "production": "https://www.example.com"
  },
  "production": {
    "apex": "example.com",
    "canonical": "www.example.com"
  },
  "protectedHosts": [
    "app.example.com"
  ],
  "verify": {
    "routes": ["/", "/about", "/contact", "/robots.txt", "/sitemap.xml"],
    "redirects": [
      {
        "url": "https://example.com/about?probe=1",
        "status": 308,
        "location": "https://www.example.com/about?probe=1"
      }
    ]
  }
}
```

## Current tools

- `scripts/guard-domains.mjs` — rejects wildcard or unexpected production hostnames and protects sibling services.
- `scripts/verify-equivalence.mjs` — compares source and candidate HTTP behavior while ignoring platform-specific noise.
- `migration.schema.json` — machine-readable migration manifest contract.
- `examples/` — real-world-shaped manifests used as regression fixtures.

## Safety model

The migration kit should fail closed around production scope:

- exact hostnames only;
- no `*.example.com` wildcard unless explicitly supported by a future reviewed mode;
- protected sibling hosts are never added to the migrating Worker;
- secrets remain in the target CI/account and are not stored in manifests;
- DNS rollback values are recorded before cutover;
- production is not declared migrated until the public hostname is independently verified.

## Adapter policy

The kit does not assume one Cloudflare adapter for every Next.js version. Cloudflare currently recommends vinext for new/current compatible Next.js applications, while existing or older applications may require a pinned OpenNext adapter. Adapter selection is therefore part of the audit result rather than a hard-coded global default.

## License

MIT.
