#!/bin/sh
set -e
if [ -z "$1" ]; then
  echo "usage: pnpm secret <NAME>" >&2
  exit 1
fi
if [ -f .secret ]; then
  CLOUDFLARE_API_TOKEN="$(cat .secret)"
  export CLOUDFLARE_API_TOKEN
fi
exec wrangler secret put "$1"
