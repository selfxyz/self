#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
# SPDX-License-Identifier: BUSL-1.1
# NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

"""Ensure workflows can be force-triggered via ``.github/CI_FORCE_RUN``.

Run after adding a new workflow file (or after bulk-editing existing ones) so
that modifying ``.github/CI_FORCE_RUN`` triggers every path-filtered workflow.
This script:
1) Injects the sentinel into every ``paths:`` block.
2) Verifies ``check_changes`` diff allowlists also include the sentinel.

Usage:
  python3 scripts/ci/add-force-run-sentinel.py            # write missing sentinels
  python3 scripts/ci/add-force-run-sentinel.py --check    # exit 1 if any missing
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys

REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
WORKFLOWS = REPO_ROOT / ".github" / "workflows"
SENTINEL_LINE = '      - ".github/CI_FORCE_RUN"'
SENTINEL_TOKEN = ".github/CI_FORCE_RUN"

# Matches a ``paths:`` block and the list items beneath it. Captures the
# block so we can decide whether to inject the sentinel.
PATHS_BLOCK = re.compile(
    r"^(?P<indent>[ \t]*)paths:\s*\n(?P<body>(?:\1[ \t]+-[^\n]*\n)+)",
    re.MULTILINE,
)
CHECK_CHANGES_BLOCK = re.compile(
    r"^  check_changes:\n(?P<body>(?:(?: {4}|\t).*\n|\n)*)",
    re.MULTILINE,
)
GREP_QE_PATTERN = re.compile(r"""grep\s+-qE\s+(["'])(?P<expr>.+?)\1""")


def patch(text: str) -> tuple[str, int]:
    inserts = 0

    def repl(match: re.Match[str]) -> str:
        nonlocal inserts
        body = match.group("body")
        if ".github/CI_FORCE_RUN" in body:
            return match.group(0)
        inserts += 1
        return match.group(0) + SENTINEL_LINE + "\n"

    return PATHS_BLOCK.sub(repl, text), inserts


def has_sentinel_pattern(expr: str) -> bool:
    return SENTINEL_TOKEN in expr.replace("\\", "")


def missing_check_changes_sentinel(text: str) -> bool:
    for block in CHECK_CHANGES_BLOCK.finditer(text):
        body = block.group("body")
        if "CHANGED_FILES" not in body:
            continue
        grep_exprs = [m.group("expr") for m in GREP_QE_PATTERN.finditer(body)]
        if not grep_exprs:
            continue
        if any(has_sentinel_pattern(expr) for expr in grep_exprs):
            continue
        return True
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Report missing sentinels and exit non-zero without writing.",
    )
    args = parser.parse_args()

    touched = 0
    missing_paths: list[pathlib.Path] = []
    missing_check_changes: list[pathlib.Path] = []
    for wf in sorted(WORKFLOWS.glob("*.yml")):
        original = wf.read_text()
        updated, inserts = patch(original)
        if missing_check_changes_sentinel(original):
            missing_check_changes.append(wf)
        if not inserts:
            continue
        if args.check:
            missing_paths.append(wf)
            continue
        wf.write_text(updated)
        touched += 1
        print(f"{wf.relative_to(REPO_ROOT)}: +{inserts} sentinel(s)")

    if args.check:
        if missing_paths:
            print("Missing '.github/CI_FORCE_RUN' in paths: of these workflows:")
            for wf in missing_paths:
                print(f"  - {wf.relative_to(REPO_ROOT)}")
        if missing_check_changes:
            print(
                "Missing '.github/CI_FORCE_RUN' in check_changes allowlist of these workflows:"
            )
            for wf in missing_check_changes:
                print(f"  - {wf.relative_to(REPO_ROOT)}")
        if missing_paths or missing_check_changes:
            print(
                "Run `python3 scripts/ci/add-force-run-sentinel.py` to fix.",
                file=sys.stderr,
            )
            return 1
        print(
            "OK: every paths-filtered workflow and check_changes allowlist covers '.github/CI_FORCE_RUN'."
        )
        return 0

    print(f"Done. Updated {touched} workflow file(s).")
    if missing_check_changes:
        print(
            "Warning: Some check_changes allowlists do not include '.github/CI_FORCE_RUN':",
            file=sys.stderr,
        )
        for wf in missing_check_changes:
            print(f"  - {wf.relative_to(REPO_ROOT)}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
