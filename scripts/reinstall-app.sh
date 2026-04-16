#!/bin/bash
set -e

REPO_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$REPO_DIR"

yarn install

cd app
yarn clean:build
yarn clean:ios
yarn clean:xcode
yarn clean:android-deps
yarn clean:ruby
yarn clean:node
cd ..

yarn install
yarn workspace @selfxyz/mobile-app run install-app
