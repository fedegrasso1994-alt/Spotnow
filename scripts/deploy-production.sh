#!/bin/sh
set -eu
# Build and validate before linking: CLI-generated environment files are excluded explicitly.
pnpm test
pnpm typecheck
pnpm build
node scripts/check-release.mjs
cp vercel.static.json dist/vercel.json
cp .vercelignore dist/.vercelignore
pnpm dlx vercel@62.2.0 link --yes --project spot-now --scope fedegrasso1994-1482 --cwd dist
pnpm dlx vercel@62.2.0 deploy --prod --yes --scope fedegrasso1994-1482 --cwd dist --local-config "$PWD/dist/vercel.json"
