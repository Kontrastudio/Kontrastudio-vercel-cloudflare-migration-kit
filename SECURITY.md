# Security policy

This project is infrastructure migration tooling. Mistakes in hostname scope, credential handling or rollback assumptions can affect live production services even when the scripts themselves contain no conventional application vulnerability.

## Reporting

Please report security-sensitive issues privately through GitHub's security reporting facilities when available rather than opening a public issue with live credentials, account identifiers or exploitable production details.

## Credential model

- Migration manifests must never contain API tokens, account secrets or private keys.
- CI credentials belong in the target repository/account secret store.
- Scripts should avoid printing secret-bearing environment variables.
- A migration should request the narrowest permissions required for its current stage.

## Production-scope model

- Exact hostnames are the default and currently supported production mode.
- Wildcard hostnames are rejected.
- Sibling services should be listed as protected hosts and verified before and after cutover.
- DNS rollback values should be recorded before a production hostname is changed.
- A candidate deployment is not production merely because its build or deploy command succeeded.

If a proposed feature weakens any of these defaults, it should be treated as a security-sensitive design change.
