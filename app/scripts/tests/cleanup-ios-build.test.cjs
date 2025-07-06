const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { describe, it } = require('node:test');
const assert = require('node:assert');

const SCRIPT = path.join(__dirname, '../cleanup-ios-build.sh');

describe('cleanup-ios-build.sh', () => {
  it('resets pbxproj and reapplies versions', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cleanup-test-'));
    const projectName = 'MyApp';
    const iosDir = path.join(tmp, 'ios', `${projectName}.xcodeproj`);
    fs.mkdirSync(iosDir, { recursive: true });
    const pbxPath = path.join(iosDir, 'project.pbxproj');
    fs.writeFileSync(
      pbxPath,
      'CURRENT_PROJECT_VERSION = 1;\nMARKETING_VERSION = 1.0.0;\n',
    );

    const cwd = process.cwd();
    process.chdir(tmp);
    execSync('git init -q');
    execSync('git config user.email "test@example.com"');
    execSync('git config user.name "Test"');
    execSync(`git add ${pbxPath}`);
    execSync('git commit -m init -q');

    fs.writeFileSync(
      pbxPath,
      'CURRENT_PROJECT_VERSION = 2;\nMARKETING_VERSION = 2.0.0;\nSomeArtifact = 123;\n',
    );

    execSync(`IOS_PROJECT_NAME=${projectName} bash ${SCRIPT}`);
    process.chdir(cwd);

    const result = fs.readFileSync(pbxPath, 'utf8');
    assert(result.includes('CURRENT_PROJECT_VERSION = 2;'));
    assert(result.includes('MARKETING_VERSION = 2.0.0;'));
    assert(!result.includes('SomeArtifact'));
  });
});
