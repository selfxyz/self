#!/usr/bin/env bash
# Draft licence scan: writes <out>/sbom.spdx.json and a draft <out>/OSS.md
# for one part of a repo at one git ref. Reads the ref with `git show`,
# never the working tree. It never decides ok/nok; a person fills that in.
#
# Usage:
#   scan.sh <ref> [options]            whole repo; options usually come from scan.args
#   scan.sh <ref> --part app|sdk|contracts|circuits   presets for the parts of selfxyz/self
#
# Inputs (all read at <ref> with git, comma-separated lists allowed):
#   --npm-importer NAMES   pnpm-lock.yaml importers to follow (prod and dev closure)
#   --npm-lock FILES       package-lock.json files
#   --yarn-lock FILE:WS    yarn.lock (berry) and the workspace folders whose
#                          dependencies are the runtime roots
#   --podfile-lock FILE    Podfile.lock
#   --podspec FILES        podspec files (declared pod dependencies)
#   --gradle-files FILES   build.gradle / build.gradle.kts (declared dependencies)
#   --version-catalog FILE gradle/libs.versions.toml for libs.* references
#   --gradle-report FILE   output of ./gradlew :app:dependencies --configuration
#                          releaseRuntimeClasspath (a local file, not read from git);
#                          gives the resolved, transitive list
#   --swift FILES          Package.swift and/or Package.resolved
#   --cargo-lock FILES     Cargo.lock (Cargo.toml next to it gives the dev split)
#   --solidity DIRS        folders of .sol sources: SPDX identifiers per folder
#   --circom DIRS          folders of .circom sources: the packages they include
# Git submodules under --path are always listed.
# Other options:
#   --path DIR             folder the hand-check file listings look at (default: repo)
#   --out DIR              output folder (default oss/, or oss/<part>)
#   --released TEXT        what this commit was released as, for OSS.md
#   --version-text TEXT    version line for OSS.md when no package.json gives it
#   --first-party "a,b"    name prefixes never sent to outside services
#   --curations FILE       licence and "ships" answers established by hand
#                          (default: curations.json next to this script)
#   --csv FILE             also write every dependency as CSV
#   --offline              no licence lookups (cache only)
# Checklist answers and the status are read from checks.json next to this script
# (checks/<part>.json when --part is used).
set -euo pipefail

usage() { sed -n '2,39p' "$0" | sed 's/^# \{0,1\}//'; exit 2; }
[ $# -ge 1 ] || usage
REF=$1; shift
HERE=$(cd "$(dirname "$0")" && pwd)
# Per-repo defaults: scan.args next to this script, one "--flag value" per line.
if [ -f "$HERE/scan.args" ]; then
  ARGS=()
  while IFS= read -r line || [ -n "$line" ]; do
    case $line in ""|\#*) continue ;; esac
    flag=${line%% *}; ARGS+=("$flag")
    [ "$flag" != "$line" ] && ARGS+=("${line#* }")
  done < "$HERE/scan.args"
  set -- "${ARGS[@]}" "$@"
fi
REPO=$(pwd); OUT=""; PART=""; PPATH=""; IMPORTER=""; PODLOCK=""; GRADLE=""
REPORT=""; CUR=""; CSV=""; RELEASED=""; GFILES=""; CATALOG=""; SWIFT=""; PODSPEC=""; NPMLOCK=""; YARNLOCK=""; CARGOLOCK=""; VTEXT=""; SOL=""; CIRCOM=""; FIRST="@selfxyz/,selfxyz,xyz.self"; OFFLINE=0
while [ $# -gt 0 ]; do
  case $1 in
    --part) PART=$2; shift 2 ;;
    --path) PPATH=$2; shift 2 ;;
    --npm-importer) IMPORTER=$2; shift 2 ;;
    --podfile-lock) PODLOCK=$2; shift 2 ;;
    --gradle-file) GRADLE=$2; shift 2 ;;
    --gradle-report) REPORT=$2; shift 2 ;;
    --gradle-files) GFILES=$2; shift 2 ;;
    --version-catalog) CATALOG=$2; shift 2 ;;
    --swift) SWIFT=$2; shift 2 ;;
    --podspec) PODSPEC=$2; shift 2 ;;
    --npm-lock) NPMLOCK=$2; shift 2 ;;
    --yarn-lock) YARNLOCK=$2; shift 2 ;;
    --cargo-lock) CARGOLOCK=$2; shift 2 ;;
    --version-text) VTEXT=$2; shift 2 ;;
    --solidity) SOL=$2; shift 2 ;;
    --circom) CIRCOM=$2; shift 2 ;;
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
  contracts) PPATH=contracts; IMPORTER=contracts; SOL=contracts/contracts ;;
  circuits) PPATH=circuits; IMPORTER=circuits; CIRCOM=circuits/circuits ;;
  "") if [ -n "$PPATH" ]; then PART=$(basename "$PPATH"); else PART=all; PPATH=.; fi ;;
  *) echo "unknown part: $PART" >&2; exit 2 ;;
esac
if [ "$PART" = all ]; then CHECKS="$HERE/checks.json"; else CHECKS="$HERE/checks/$PART.json"; fi
[ -n "$OUT" ] || { if [ "$PART" = all ]; then OUT="$REPO/oss"; else OUT="$REPO/oss/$PART"; fi; }
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

# pnpm-lock.yaml -> JSON with whichever YAML parser is around. Newer pnpm writes
# two YAML documents; the project's own lock is the last one.
if [ -f "$WORK/pnpm-lock.yaml" ] && [ -n "$IMPORTER" ]; then
  if python3 -c 'import yaml' 2>/dev/null; then
    python3 -c 'import sys,yaml,json; json.dump([d for d in yaml.safe_load_all(open(sys.argv[1])) if d][-1], open(sys.argv[2],"w"))' \
      "$WORK/pnpm-lock.yaml" "$WORK/pnpm-lock.json"
  elif command -v ruby >/dev/null; then
    ruby -ryaml -rjson -e 'File.write(ARGV[1], JSON.generate(YAML.load_stream(File.read(ARGV[0])).compact.last))' \
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
  --offline "$OFFLINE" --curations "$CUR" --checks "$CHECKS" --gradle-files "$GFILES" --version-catalog "$CATALOG" --swift "$SWIFT" --podspec "$PODSPEC" --npm-lock "$NPMLOCK" --yarn-lock "$YARNLOCK" --cargo-lock "$CARGOLOCK" --version-text "$VTEXT" --solidity "$SOL" --circom "$CIRCOM" --csv "$CSV" --released "$RELEASED" --repo "$REPO" --repo-name "$NAME"
