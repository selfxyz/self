#!/usr/bin/env node
// Reset Xcode project after local fastlane builds

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const projectName = process.env.IOS_PROJECT_NAME || 'Self';
const pbxproj = path.join('ios', `${projectName}.xcodeproj`, 'project.pbxproj');

if (!fs.existsSync(pbxproj)) {
  console.error(`Project file not found: ${pbxproj}`);
  process.exit(1);
}

const fileContent = fs.readFileSync(pbxproj, 'utf8');
const marketingMatch = fileContent.match(/MARKETING_VERSION = ([^;]+);/);
const currentMatch = fileContent.match(/CURRENT_PROJECT_VERSION = ([^;]+);/);

if (!marketingMatch?.[1] || !currentMatch?.[1]) {
  console.error(`Failed to extract version information from ${pbxproj}`);
  process.exit(1);
}

const marketingVersion = marketingMatch[1];
const currentVersion = currentMatch[1];

try {
  execSync(`git checkout -- "${pbxproj}"`, { stdio: 'ignore' });
} catch {
  // ignore git errors, handled by file existence above
}

let resetContent = fs.readFileSync(pbxproj, 'utf8');
resetContent = resetContent.replace(/MARKETING_VERSION = [^;]+;/, `MARKETING_VERSION = ${marketingVersion};`);
resetContent = resetContent.replace(/CURRENT_PROJECT_VERSION = [^;]+;/, `CURRENT_PROJECT_VERSION = ${currentVersion};`);
fs.writeFileSync(pbxproj, resetContent);

console.log(`Reset ${pbxproj}`);
