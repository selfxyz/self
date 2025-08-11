#!/bin/bash
# SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

# Simple changelog generator that creates release notes from git history
# Usage: ./generate-changelog.sh [from_tag] [to_tag]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get tags
FROM_TAG=${1:-$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")}
TO_TAG=${2:-HEAD}

if [ -z "$FROM_TAG" ]; then
    echo "No previous tag found. Generating changelog from beginning..."
    FROM_TAG=$(git rev-list --max-parents=0 HEAD)
fi

echo -e "${YELLOW}Generating changelog from $FROM_TAG to $TO_TAG...${NC}"

# Get current version from package.json
VERSION=$(cat package.json | jq -r .version 2>/dev/null || echo "Unknown")
DATE=$(date +"%Y-%m-%d")

# Start changelog
CHANGELOG="## Release v${VERSION} (${DATE})\n\n"

# Group commits by type
FEATURES=""
FIXES=""
CHORES=""
OTHER=""

# Process commits
while IFS= read -r line; do
    HASH=$(echo "$line" | cut -d' ' -f1)
    MESSAGE=$(echo "$line" | cut -d' ' -f2-)

    # Skip merge commits
    if [[ "$MESSAGE" =~ ^Merge ]]; then
        continue
    fi

    # Categorize commits
    if [[ "$MESSAGE" =~ ^feat ]]; then
        FEATURES="${FEATURES}- ${MESSAGE}\n"
    elif [[ "$MESSAGE" =~ ^fix ]]; then
        FIXES="${FIXES}- ${MESSAGE}\n"
    elif [[ "$MESSAGE" =~ ^chore ]]; then
        CHORES="${CHORES}- ${MESSAGE}\n"
    else
        OTHER="${OTHER}- ${MESSAGE}\n"
    fi
done < <(git log --oneline --no-merges ${FROM_TAG}..${TO_TAG})

# Build changelog sections
if [ -n "$FEATURES" ]; then
    CHANGELOG="${CHANGELOG}### 🚀 Features\n${FEATURES}\n"
fi

if [ -n "$FIXES" ]; then
    CHANGELOG="${CHANGELOG}### 🐛 Bug Fixes\n${FIXES}\n"
fi

if [ -n "$CHORES" ]; then
    CHANGELOG="${CHANGELOG}### 🔧 Maintenance\n${CHORES}\n"
fi

if [ -n "$OTHER" ]; then
    CHANGELOG="${CHANGELOG}### 📝 Other Changes\n${OTHER}\n"
fi

# Add deployment info
CHANGELOG="${CHANGELOG}### 📱 Deployment Info\n"
CHANGELOG="${CHANGELOG}- iOS Build: $(cat version.json | jq -r .ios.build)\n"
CHANGELOG="${CHANGELOG}- Android Build: $(cat version.json | jq -r .android.build)\n"

# Output to file
echo -e "$CHANGELOG" > RELEASE_NOTES.md
echo -e "${GREEN}✅ Changelog generated in RELEASE_NOTES.md${NC}"

# Also output to console
echo -e "\n${YELLOW}Release Notes:${NC}"
echo -e "$CHANGELOG"
