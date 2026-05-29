#!/bin/bash
set -e

REPO_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$REPO_DIR"

pnpm install

cd app
pnpm clean:build
pnpm clean:ios
pnpm clean:xcode
pnpm clean:android-deps
pnpm clean:ruby
pnpm clean:node
cd ..

pnpm install
pnpm --filter @selfxyz/mobile-app run install-app
