#!/bin/bash
# SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

# Simple release script for manual version bumping and tagging
# Usage: ./release.sh [major|minor|patch]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the app directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from app directory${NC}"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}Error: You have uncommitted changes. Please commit or stash them first.${NC}"
    exit 1
fi

# Get version bump type
BUMP_TYPE=${1:-patch}
if [[ ! "$BUMP_TYPE" =~ ^(major|minor|patch)$ ]]; then
    echo -e "${RED}Error: Invalid version bump type. Use: major, minor, or patch${NC}"
    exit 1
fi

echo -e "${YELLOW}🚀 Starting release process...${NC}"
echo "Version bump type: $BUMP_TYPE"

# Get current version
CURRENT_VERSION=$(cat package.json | jq -r .version)
echo "Current version: $CURRENT_VERSION"

# Bump version using existing script
echo -e "\n${YELLOW}1. Bumping version...${NC}"
node scripts/version.cjs bump $BUMP_TYPE

# Get new version
NEW_VERSION=$(cat package.json | jq -r .version)
echo -e "${GREEN}✅ Version bumped: $CURRENT_VERSION → $NEW_VERSION${NC}"

# Sync native versions
echo -e "\n${YELLOW}2. Syncing native versions...${NC}"
cd .. # Go to workspace root for Fastlane
bundle exec fastlane ios sync_version
bundle exec fastlane android sync_version
cd app # Back to app directory

# Generate changelog
echo -e "\n${YELLOW}3. Generating changelog...${NC}"
./scripts/generate-changelog.sh
echo -e "${GREEN}✅ Changelog generated${NC}"

# Stage all version-related files
echo -e "\n${YELLOW}4. Committing changes...${NC}"
git add package.json version.json RELEASE_NOTES.md
git add ios/Self.xcodeproj/project.pbxproj ios/OpenPassport/Info.plist
git add android/app/build.gradle

# Create commit
git commit -m "chore: release v${NEW_VERSION}

- Bump version from ${CURRENT_VERSION} to ${NEW_VERSION}
- Update iOS and Android native versions
- Sync build numbers across platforms"

echo -e "${GREEN}✅ Changes committed${NC}"

# Create tags
echo -e "\n${YELLOW}5. Creating git tags...${NC}"
git tag -a "v${NEW_VERSION}" -m "Release ${NEW_VERSION}"
echo -e "${GREEN}✅ Created tag: v${NEW_VERSION}${NC}"

# Summary
echo -e "\n${GREEN}🎉 Release prepared successfully!${NC}"
echo -e "\nNext steps:"
echo -e "  1. Review the changes: ${YELLOW}git show HEAD${NC}"
echo -e "  2. Push to remote: ${YELLOW}git push && git push --tags${NC}"
echo -e "  3. Deploy via GitHub Actions (will happen automatically on merge to main)"

# Ask if user wants to push now
echo -e "\n${YELLOW}Push changes and tags now? (y/N)${NC}"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    git push && git push --tags
    echo -e "${GREEN}✅ Pushed to remote!${NC}"
    echo -e "\n🚀 Release v${NEW_VERSION} is ready for deployment!"
else
    echo -e "${YELLOW}Changes not pushed. Run 'git push && git push --tags' when ready.${NC}"
fi
