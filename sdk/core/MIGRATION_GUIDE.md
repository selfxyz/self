# Identity Verification Hub Migration Guide: V1 to V2

This guide helps you migrate from Identity Verification Hub V1 to V2 using the migration-focused adapter.

## 🎯 Overview

The migration adapter provides a smooth transition path from V1 to V2 with:

- **Automatic version detection**
- **Migration guidance and validation**
- **Backward compatibility during transition**
- **Step-by-step migration utilities**

## 📋 Migration Checklist

### Pre-Migration

- [ ] Review breaking changes
- [ ] Check V2 availability on your network
- [ ] Test migration in staging environment
- [ ] Update error handling for V2 error types
- [ ] Plan attestation ID strategy

### During Migration

- [ ] Deploy V2 implementation
- [ ] Update contract references
- [ ] Migrate verification calls
- [ ] Update registration calls
- [ ] Configure V2 verification settings

### Post-Migration

- [ ] Test all verification flows
- [ ] Update documentation
- [ ] Monitor for issues
- [ ] Remove V1 fallbacks

## 🚀 Quick Start

### 1. Check Current Version

```typescript
import { getMigrationReport } from '@selfxyz/core';

const report = await getMigrationReport(contractAddress, publicClient);
console.log('Current version:', report.currentVersion);
console.log('Can migrate:', report.canMigrate);
console.log('Migration steps:', report.migrationInfo.migrationSteps);
```

### 2. Use Migration-Focused Adapter

```typescript
import { createHubAdapterWithValidation } from '@selfxyz/core';

const hub = await createHubAdapterWithValidation(contractAddress, publicClient, {
  validateMigration: true,
  showWarnings: true,
});

// Get migration guidance
const migrationInfo = hub.getMigrationInfo();
console.log('Migration steps:', migrationInfo.migrationSteps);
```

### 3. Validate Migration Readiness

```typescript
import { HubMigrationUtils } from '@selfxyz/core';

const readiness = HubMigrationUtils.validateMigrationReadiness(hub, 'v2');
if (!readiness.ready) {
  console.warn('Migration issues:', readiness.issues);
}
```

## 🔄 Migration Examples

### Before (V1)

```typescript
// V1 verification
const result = await hub.verifyVcAndDisclose(proof);

// V1 registration
await hub.registerPassportCommitment(registerCircuitVerifierId, registerCircuitProof);
```

### After (V2)

```typescript
// V2 verification
await hub.verify(baseVerificationInput, userContextData);

// V2 registration
await hub.registerPassportCommitment(
  attestationId, // New parameter
  registerCircuitVerifierId,
  registerCircuitProof
);
```

### During Migration (Adapter)

```typescript
// Works with both V1 and V2 automatically
const hub = await createHubAdapter(contractAddress, publicClient);

// Automatically uses correct method based on version
if (hub.version === 'v1') {
  const result = await hub.verifyVcAndDisclose(proof);
} else {
  await hub.verify(baseVerificationInput, userContextData);
}
```

## ⚠️ Breaking Changes

### Method Signature Changes

| V1 Method                               | V2 Method                                            | Changes                  |
| --------------------------------------- | ---------------------------------------------------- | ------------------------ |
| `verifyVcAndDisclose(proof)`            | `verify(input, context)`                             | Completely new interface |
| `registerPassportCommitment(id, proof)` | `registerCommitment(attestationId, id, proof)`       | Added attestationId      |
| `registerDscKeyCommitment(id, proof)`   | `registerDscKeyCommitment(attestationId, id, proof)` | Added attestationId      |

### Configuration Changes

| V1                       | V2                                   |
| ------------------------ | ------------------------------------ |
| Hardcoded parameters     | Configurable verification configs    |
| Single registry/verifier | Per-attestation registries/verifiers |
| Simple error handling    | Enhanced error types                 |

## 🛠️ Migration Utilities

### Version Detection

```typescript
import { supportsV2 } from '@selfxyz/core';

const isV2 = await supportsV2(contractAddress, publicClient);
```

### Migration Report

```typescript
import { getMigrationReport } from '@selfxyz/core';

const report = await getMigrationReport(contractAddress, publicClient);
console.log('Current version:', report.currentVersion);
console.log('Breaking changes:', report.migrationInfo.breakingChanges);
console.log('New features:', report.migrationInfo.newFeatures);
```

### Validation

```typescript
import { HubMigrationUtils } from '@selfxyz/core';

const readiness = HubMigrationUtils.validateMigrationReadiness(hub, 'v2');
if (readiness.ready) {
  console.log('Ready to migrate!');
} else {
  console.warn('Issues found:', readiness.issues);
}
```

## 🔧 Configuration Migration

### V1 Configuration

```typescript
// V1 had hardcoded parameters in the contract
const hub = new HubV1Adapter(contract, publicClient);
```

### V2 Configuration

```typescript
// V2 uses configurable verification configs
const config = {
  // Your verification configuration
};

const configId = await hub.setVerificationConfigV2(config);
```

## 🚨 Error Handling Migration

### V1 Error Handling

```typescript
try {
  await hub.verifyVcAndDisclose(proof);
} catch (error) {
  // Simple error handling
  console.error('Verification failed:', error.message);
}
```

### V2 Error Handling

```typescript
import { HubVersionError, HubMigrationError } from '@selfxyz/core';

try {
  await hub.verify(baseVerificationInput, userContextData);
} catch (error) {
  if (error instanceof HubVersionError) {
    console.error('Version-specific error:', error.operation);
  } else if (error instanceof HubMigrationError) {
    console.error('Migration required:', error.migrationSteps);
  } else {
    console.error('Verification failed:', error.message);
  }
}
```

## 📊 Migration Progress Tracking

### Check Migration Status

```typescript
const hub = await createHubAdapter(contractAddress, publicClient);

console.log('Version:', hub.version);
console.log('Is legacy:', hub.isLegacy);
console.log('Can migrate to V2:', hub.canMigrateToV2());

if (hub.version === 'v1') {
  const migrationPath = hub.getV2MigrationPath();
  console.log('Migration steps:', migrationPath);
}
```

### Monitor Migration Warnings

```typescript
// The adapter automatically logs migration warnings
const hub = await createHubAdapterWithValidation(contractAddress, publicClient, {
  showWarnings: true,
});

// Warnings will appear in console:
// [Migration Notice] Using V1 hub at 0x... Consider migrating to V2 for new features.
```

## 🎯 Best Practices

### 1. Gradual Migration

- Start with non-critical flows
- Test thoroughly in staging
- Monitor for issues
- Migrate critical flows last

### 2. Error Handling

- Update error handling for V2 error types
- Add migration-specific error handling
- Log migration warnings appropriately

### 3. Testing

- Test all verification flows with V2
- Verify attestation ID handling
- Test error scenarios
- Validate configuration migration

### 4. Documentation

- Update API documentation
- Document breaking changes
- Provide migration examples
- Update error handling guides

## 🆘 Troubleshooting

### Common Issues

#### "V1 does not support the new verify method"

**Solution**: Use `verifyVcAndDisclose()` for V1 or migrate to V2.

#### "V2 requires attestationId"

**Solution**: Add attestationId parameter to registration calls.

#### "Migration validation failed"

**Solution**: Review the validation issues and address them before migrating.

#### "V2 not available on current network"

**Solution**: Deploy V2 implementation first or use V1 until V2 is available.

### Getting Help

1. Check the migration report for specific guidance
2. Review breaking changes in the migration info
3. Use validation utilities to identify issues
4. Test in staging environment first
5. Monitor console warnings for migration guidance

## 📚 Additional Resources

- [V2 API Documentation](./API.md)
- [Breaking Changes Guide](./BREAKING_CHANGES.md)
- [Configuration Guide](./CONFIGURATION.md)
- [Error Handling Guide](./ERROR_HANDLING.md)
