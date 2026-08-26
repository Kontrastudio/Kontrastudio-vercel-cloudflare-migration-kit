# Baseline-first verification and candidate boundaries

A hosting migration should preserve **observed production behavior**, not an unverified assumption about what the application or platform intended to do.

## Production observation wins

Capture the live source before adapting it:

- status codes and redirect destinations;
- cookies that affect routing;
- selected security and content headers;
- canonical/robots behavior;
- public runtime configuration that is intentionally exposed to clients;
- protected sibling-host health;
- exact DNS values required for rollback.

If the source application contains a 308 redirect but the live Vercel hostname returns 307 because a platform-level redirect happens first, the migration baseline is 307. A hosting migration is not the right moment to silently redesign that behavior.

Intentional behavior changes should be a separate, explicit change after migration equivalence is established.

## What a `workers.dev` candidate can prove

An isolated candidate can strongly verify the canonical application surface without touching production DNS:

- routes and status codes;
- route-level redirects;
- security headers;
- HTML semantics such as title/canonical/robots;
- static assets;
- safe API probes;
- embedded tools such as a CMS Studio;
- runtime boot correctness on Cloudflare Workers.

This is the main `CANDIDATE_VERIFIED` gate.

## What a `workers.dev` candidate cannot honestly prove

Hostname-specific behavior that only exists when Cloudflare serves the real hostname cannot be declared proven merely because a candidate Worker exists. Typical examples include:

- apex → `www` behavior driven by the request Host;
- custom-domain TLS issuance;
- interactions with existing DNS records;
- Cloudflare Access or routing attached to sibling hostnames.

Verify hostname-dependent application logic locally with a synthetic Host header before cutover, then verify it again against the real public hostname immediately after the exact custom domain is attached.

## Staged implication

For a conventional apex + `www` site:

1. capture source and rollback baseline;
2. deploy an isolated candidate;
3. prove canonical-site equivalence on `workers.dev`;
4. verify protected sibling hosts;
5. move `www` first and verify it publicly;
6. move apex only after `www` is green;
7. verify apex redirect semantics on the real hostname;
8. recheck protected sibling hosts;
9. retain rollback until the migration is stable.

A verifier should report these states separately. `CANDIDATE_DEPLOYED`, `CANDIDATE_VERIFIED`, `WWW_CUTOVER`, and `PRODUCTION_VERIFIED` are not synonyms.
