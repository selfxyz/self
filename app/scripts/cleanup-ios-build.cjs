#!/usr/bin/env node
// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectName = process.env.IOS_PROJECT_NAME || 'Self';
const pbxproj = path.join('ios', `${projectName}.xcodeproj`, 'project.pbxproj');

if (!fs.existsSync(pbxproj)) {
  console.error(`Project file not found: ${pbxproj}`);
  process.exit(1);
}

const original = fs.readFileSync(pbxproj, 'utf8');
const marketingMatch = original.match(/MARKETING_VERSION = ([^;]+);/);
const currentMatch = original.match(/CURRENT_PROJECT_VERSION = ([^;]+);/);

if (!marketingMatch?.[1] || !currentMatch?.[1]) {
  console.error(`Failed to extract version information from ${pbxproj}`);
  process.exit(1);
}

const marketing = marketingMatch[1];
const current = currentMatch[1];

try {
  execSync(`git checkout -- "${pbxproj}"`, { stdio: 'inherit' });
} catch {
  console.error(`Failed to checkout ${pbxproj}`);
  process.exit(1);
}

let content = fs.readFileSync(pbxproj, 'utf8');
content = content.replace(
  /MARKETING_VERSION = [^;]+;/,
  `MARKETING_VERSION = ${marketing};`,
);
content = content.replace(
  /CURRENT_PROJECT_VERSION = [^;]+;/,
  `CURRENT_PROJECT_VERSION = ${current};`,
);
fs.writeFileSync(pbxproj, content);

console.log(`Reset ${pbxproj}`);
