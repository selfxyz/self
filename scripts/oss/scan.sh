#!/usr/bin/env bash
# Draft licence scan: writes <out>/sbom.spdx.json and a draft <out>/OSS.md
# for one part of a repo at one git ref. Reads the ref with `git show`,
# never the working tree. It never decides ok/nok; a person fills that in.
#
# Usage:
#   scan.sh <ref> --part app [--out DIR] [--repo DIR] [--gradle-report FILE]
#   scan.sh <ref> --path DIR [--npm-importer NAME] [--podfile-lock FILE]
#                 [--gradle-file FILE] [--out DIR] [--repo DIR]
#
# --gradle-report FILE  output of
#     ./gradlew :app:dependencies --configuration releaseRuntimeClasspath
#   Without it only the dependencies declared in --gradle-file are listed.
# --npm-importer accepts a comma-separated list of pnpm importers.
# --curations FILE      licence and "ships" answers a person has established
#                       (default: curations.json next to this script)
# --csv FILE            also write every dependency as CSV
# Checklist answers are read from checks/<part>.json next to this script.
# --released TEXT       what this commit was released as, for OSS.md
# --first-party "a,b"   name prefixes never sent to outside services
#                       (default "@selfxyz/,selfxyz,xyz.self"; workspace packages,
#                       git dependencies and non-trunk pods are always skipped)
# --offline             no licence lookups (cache only)
set -euo pipefail

usage() { sed -n '2,23p' "$0" | sed 's/^# \{0,1\}//'; exit 2; }
[ $# -ge 1 ] || usage
REF=$1; shift
REPO=$(pwd); OUT=""; PART=""; PPATH=""; IMPORTER=""; PODLOCK=""; GRADLE=""
REPORT=""; CUR=""; CSV=""; RELEASED=""; FIRST="@selfxyz/,selfxyz,xyz.self"; OFFLINE=0
while [ $# -gt 0 ]; do
  case $1 in
    --part) PART=$2; shift 2 ;;
    --path) PPATH=$2; shift 2 ;;
    --npm-importer) IMPORTER=$2; shift 2 ;;
    --podfile-lock) PODLOCK=$2; shift 2 ;;
    --gradle-file) GRADLE=$2; shift 2 ;;
    --gradle-report) REPORT=$2; shift 2 ;;
    --first-party) FIRST=$2; shift 2 ;;
    --curations) CUR=$2; shift 2 ;;
    --released) RELEASED=$2; shift 2 ;;
    --csv) CSV=$2; shift 2 ;;
    --repo) REPO=$2; shift 2 ;;
    --out) OUT=$2; shift 2 ;;
    --offline) OFFLINE=1; shift ;;
    *) usage ;;
  esac
done

# Presets for the parts of selfxyz/self. Add sdk / contracts / circuits here.
case $PART in
  app) PPATH=app; IMPORTER=app; PODLOCK=app/ios/Podfile.lock
       GRADLE=app/android/app/build.gradle ;;
  sdk) PPATH=sdk; IMPORTER=sdk/core,common,sdk/qrcode,sdk/qrcode-angular,sdk/sdk-common ;;
  "") [ -n "$PPATH" ] || usage; PART=$(basename "$PPATH") ;;
  *) echo "unknown part: $PART" >&2; exit 2 ;;
esac
[ -n "$OUT" ] || OUT="$REPO/oss/$PART"
HERE=$(cd "$(dirname "$0")" && pwd)
[ -n "$CUR" ] || CUR="$HERE/curations.json"

SHA=$(git -C "$REPO" rev-parse --verify "$REF^{commit}")
WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT
show() { git -C "$REPO" show "$SHA:$1" > "$2" 2>/dev/null || rm -f "$2"; }

show pnpm-lock.yaml "$WORK/pnpm-lock.yaml"
show .gitmodules "$WORK/gitmodules"
[ -n "$PODLOCK" ] && show "$PODLOCK" "$WORK/Podfile.lock"
[ -n "$GRADLE" ] && show "$GRADLE" "$WORK/build.gradle"
git -C "$REPO" ls-tree -r "$SHA" > "$WORK/tree.txt"
[ -n "$REPORT" ] && cp "$REPORT" "$WORK/gradle-report.txt"

# pnpm-lock.yaml -> JSON with whichever YAML parser is around.
if [ -f "$WORK/pnpm-lock.yaml" ] && [ -n "$IMPORTER" ]; then
  if python3 -c 'import yaml' 2>/dev/null; then
    python3 -c 'import sys,yaml,json; json.dump(yaml.safe_load(open(sys.argv[1])), open(sys.argv[2],"w"))' \
      "$WORK/pnpm-lock.yaml" "$WORK/pnpm-lock.json"
  elif command -v ruby >/dev/null; then
    ruby -ryaml -rjson -e 'File.write(ARGV[1], JSON.generate(YAML.load_file(ARGV[0])))' \
      "$WORK/pnpm-lock.yaml" "$WORK/pnpm-lock.json"
  else
    echo "need PyYAML or ruby to read pnpm-lock.yaml" >&2; exit 1
  fi
fi

mkdir -p "$OUT"
NAME=$(git -C "$REPO" remote get-url origin 2>/dev/null | sed -E 's#.*/##; s#\.git$##')
[ -n "$NAME" ] || NAME=$(basename "$(git -C "$REPO" rev-parse --show-toplevel)")
python3 -I "$HERE/scan_lib.py" \
  --work "$WORK" --out "$OUT" --ref "$REF" --sha "$SHA" --part "$PART" \
  --path "$PPATH" --importer "$IMPORTER" --first-party "$FIRST" \
  --offline "$OFFLINE" --curations "$CUR" --checks "$HERE/checks/$PART.json" --csv "$CSV" --released "$RELEASED" --repo "$REPO" --repo-name "$NAME"
