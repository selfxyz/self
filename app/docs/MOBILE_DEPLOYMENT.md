# Mobile Deployment Guide

This guide covers the automated mobile deployment pipeline for iOS and Android apps.

## 🚀 Quick Start

### Automatic Deployments

Deployments happen automatically when PRs are merged:

- **Merge to `dev`** → Deploy to internal testing
- **Merge to `main`** → Deploy to production

To skip deployment, add `[skip-deploy]` to your PR title or add the `no-deploy` label.

### Manual Deployments

1. Go to [Actions](../../../actions) → "Mobile App Deployments"
2. Click "Run workflow"
3. Select options:
   - Platform: ios / android / both
   - Test mode: Check to build without uploading
   - Deployment track: internal / production
   - Version bump: build / patch / minor / major

## 📋 How It Works

### Branch Strategy

```
main (production)
  ↑
  └── dev (internal testing)
        ↑
        └── feature/* (no auto-deploy)
```

### Version Management

Versions are controlled by PR labels:

- `version:major` - Bump major version (1.0.0 → 2.0.0)
- `version:minor` - Bump minor version (1.0.0 → 1.1.0)
- `version:patch` - Bump patch version (1.0.0 → 1.0.1) [default for main]
- No label on dev - Only increment build number

### Deployment Tracks

| Branch | Track | iOS Target | Android Target |
|--------|-------|------------|----------------|
| dev | internal | TestFlight Internal | Play Store Internal |
| main | production | App Store | Play Store Production |

## 🏗️ Architecture

### Workflows

1. **`mobile-deploy.yml`** - Main deployment workflow
   - Handles both manual and automated deployments
   - Builds and uploads to app stores
   - Creates git tags for production releases

2. **`mobile-deploy-auto.yml`** - PR merge trigger
   - Detects merged PRs
   - Determines deployment parameters
   - Calls main deployment workflow

### Version Storage

- `app/version.json` - Tracks build numbers
- `app/package.json` - Semantic version
- Native files auto-sync during build

### Caching Strategy

Build times are optimized with caching:
- Yarn dependencies
- Ruby gems
- CocoaPods (iOS)
- Gradle (Android)
- Android NDK

Average build times with cache: iOS ~15min, Android ~10min

## 🔧 Configuration

### Required Secrets

#### iOS
- `IOS_APP_IDENTIFIER` - Bundle ID
- `IOS_TEAM_ID` - Apple Team ID
- `IOS_CONNECT_KEY_ID` - App Store Connect API Key ID
- `IOS_CONNECT_ISSUER_ID` - API Key Issuer ID
- `IOS_CONNECT_API_KEY_BASE64` - API Key (base64)
- `IOS_DIST_CERT_BASE64` - Distribution certificate
- `IOS_PROV_PROFILE_BASE64` - Provisioning profile
- `IOS_P12_PASSWORD` - Certificate password

#### Android
- `ANDROID_PACKAGE_NAME` - Package name
- `ANDROID_KEYSTORE` - Keystore file (base64)
- `ANDROID_KEYSTORE_PASSWORD` - Keystore password
- `ANDROID_KEY_ALIAS` - Key alias
- `ANDROID_KEY_PASSWORD` - Key password
- `ANDROID_PLAY_STORE_JSON_KEY` - Service account key

#### Notifications
- `SLACK_API_TOKEN` - For deployment notifications
- `SLACK_CHANNEL_ID` - Channel for build uploads

### Environment Variables

Set in workflow files:
```yaml
NODE_VERSION: 18
RUBY_VERSION: 3.2
JAVA_VERSION: 17
ANDROID_API_LEVEL: 35
ANDROID_NDK_VERSION: 27.0.12077973
```

## 🏷️ Git Tags & Releases

### Automatic Tags (Production Only)

When deploying to production, creates:
- `v2.5.5` - Main version tag
- `v2.5.5-ios-148` - iOS with build number
- `v2.5.5-android-82` - Android with build number

### GitHub Releases

Automatically created for production deployments with:
- Changelog from commits
- Build information
- Links to app stores

## 🚨 Troubleshooting

### Common Issues

#### "Play Store upload failed: Insufficient permissions"
The service account needs permissions in Google Play Console. The build file is saved locally and can be uploaded manually.

#### Cache not working
- Check if lock files changed (`yarn.lock`, `Gemfile.lock`)
- Cache keys include version numbers that can be bumped
- First build on new branch may be slower

#### iOS build fails with provisioning profile error
- Ensure secrets are up to date
- Check certificate expiration
- Verify bundle ID matches

#### Version conflicts
- `version.json` tracks the source of truth
- Always higher than store versions
- Automatically incremented each build

### Build Failures

1. Check the workflow logs in GitHub Actions
2. Look for the specific error in the failed step
3. Most issues are related to:
   - Expired certificates/profiles
   - Missing secrets
   - Network timeouts (retry usually helps)

## 📊 Monitoring

### Slack Notifications

Successful deployments post to Slack with:
- Platform and version info
- Download links for the builds
- Deployment track (internal/production)

### Deployment History

View all deployments:
1. Go to [Actions](../../../actions)
2. Filter by workflow: "Mobile App Deployments"
3. Check run history and logs

## 🔐 Security

- All secrets are stored in GitHub Secrets
- Certificates are base64 encoded
- Build artifacts are uploaded to Slack (private channel)
- Production deployments only from protected branches

## 🛠️ Maintenance

### Updating Workflows

1. Test changes with `test_mode: true`
2. Use `workflow_dispatch` for manual testing
3. Monitor first automated run carefully

### Cache Busting

If builds are failing due to cache issues:
1. Increment cache version in workflow:
   ```yaml
   GH_CACHE_VERSION: v2  # Increment this
   ```

### Certificate Renewal

Before certificates expire:
1. Generate new certificates/profiles
2. Update GitHub Secrets
3. Test with manual deployment first

---

For local development and manual release processes, see [`app/README.md`](../app/README.md)
