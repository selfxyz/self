#!/bin/sh
set -eu

exec yarn tsx common/scripts/ofac/runOfacAutoUpdate.ts "$@"
