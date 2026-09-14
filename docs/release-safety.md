# Release Safety

V1.4.2 introduces a release-safety gate for the TFT CN Companion.

## Invariants

1. Related file changes are assembled into one Git tree and one commit before the branch ref moves. Vercel should never receive a half-finished pair such as a component without its CSS module.
2. Every PR must pass `verify:data`, `verify:meta`, `verify:ui`, `verify:release`, the Next.js production build, and a production-server smoke test.
3. Smoke tests cover the core workflow (`/`, `/opening`, `/compare`, `/focus`, `/review`, `/builder`) plus `/api/health`, the PWA manifest and service worker.
4. `app/error.tsx`, `app/global-error.tsx`, and `app/not-found.tsx` provide user-facing recovery instead of a blank or broken page.
5. `/api/health` is intentionally independent of remote Riot requests so deployment health can be separated from third-party data availability.

## Release sequence

- Build all related changes locally or in one atomic Git tree.
- Run `npm run release:check`.
- Push the complete commit to a feature branch.
- Require GitHub CI and Vercel Preview to be green.
- Merge with squash only after both are green.
- Confirm the production Vercel deployment and run the production health/smoke checks.
- If production fails, keep the previous production deployment available for rollback.

Do not push intermediate dependency states to a branch connected to Vercel.
