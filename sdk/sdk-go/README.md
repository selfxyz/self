# Self Protocol Go SDK

A Go SDK for integrating with the Self protocol for privacy-preserving identity verification using zero-knowledge proofs and passport/ID card attestations.

## Installation

```bash
go get github.com/selfxyz/self/sdk/sdk-go@main
```

## Quick Start

### Basic Usage

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/selfxyz/self/sdk/sdk-go"
    "github.com/selfxyz/self/sdk/sdk-go/common"
)

func main() {
    // Create a verification configuration
    config := self.VerificationConfig{
        MinimumAge:        &[]int{18}[0],                    // Require 18+ years
        ExcludedCountries: []common.Country3LetterCode{common.USA}, // Exclude USA
        Ofac:              &[]bool{false}[0],                // Allow OFAC flagged individuals
    }

    // Create a config store
    configStore := self.NewDefaultConfigStore(config)

    // Define allowed attestation types
    allowedIds := map[self.AttestationId]bool{
        self.Passport: true,
        self.EUCard:   true,
    }

    // Initialize the verifier
    verifier, err := self.NewBackendVerifier(
        "my-app-scope",              // Your application scope
        "https://my-app.com",        // Your application endpoint
        false,                       // Use mainnet (true for testnet)
        allowedIds,                  // Allowed attestation types
        configStore,                 // Configuration storage
        self.UserIDTypeHex,         // User identifier type
    )
    if err != nil {
        log.Fatal(err)
    }

    // Verify a proof (these would come from your frontend)
    ctx := context.Background()
    result, err := verifier.Verify(
        ctx,
        "1",              // Attestation ID (passport)
        proof,            // Zero-knowledge proof from frontend
        publicSignals,    // Public signals from frontend
        userContextData,  // User context data from frontend
    )
    if err != nil {
        log.Printf("Verification failed: %v", err)
        return
    }

    // Check verification results
    if result.IsValidDetails.IsValid {
        fmt.Printf("✅ Verification successful!\n")
        fmt.Printf("User ID: %s\n", result.UserData.UserIdentifier)
        fmt.Printf("Age verification: %v\n", result.IsValidDetails.IsMinimumAgeValid)
        fmt.Printf("OFAC verification: %v\n", result.IsValidDetails.IsOfacValid)
        fmt.Printf("Nationality: %s\n", result.DiscloseOutput.Nationality)
    } else {
        fmt.Printf("❌ Verification failed\n")
    }
}
```

## Configuration

### Verification Config

The `VerificationConfig` struct allows you to specify verification requirements:

```go
type VerificationConfig struct {
    MinimumAge        *int                        // Minimum age requirement (nil to disable)
    ExcludedCountries []common.Country3LetterCode // Countries to exclude
    Ofac              *bool                       // OFAC compliance (nil to ignore)
}
```

### Config Storage

Implement the `ConfigStore` interface for custom configuration management:

```go
type ConfigStore interface {
    GetConfig(ctx context.Context, id string) (VerificationConfig, error)
    SetConfig(ctx context.Context, id string, config VerificationConfig) (bool, error)
    GetActionId(ctx context.Context, userIdentifier string, actionId string) (string, error)
}
```

For simple use cases, use `DefaultConfigStore`:

```go
configStore := self.NewDefaultConfigStore(config)
```

For more complex scenarios, implement your own:

```go
type DatabaseConfigStore struct {
    db *sql.DB
}

func (d *DatabaseConfigStore) GetConfig(ctx context.Context, id string) (self.VerificationConfig, error) {
    // Your database logic here
}

func (d *DatabaseConfigStore) SetConfig(ctx context.Context, id string, config self.VerificationConfig) (bool, error) {
    // Your database logic here
}

func (d *DatabaseConfigStore) GetActionId(ctx context.Context, userIdentifier string, actionId string) (string, error) {
    // Your database logic here
}
```

## Attestation Types

The SDK supports two attestation types:

- `self.Passport`: Traditional passport verification
- `self.EUCard`: European ID card verification

## Network Configuration

### Mainnet (Production)
```go
verifier, err := self.NewBackendVerifier(
    scope, endpoint, false, // mockPassport = false for mainnet
    allowedIds, configStore, userIdType,
)
```

### Testnet (Development)
```go
verifier, err := self.NewBackendVerifier(
    scope, endpoint, true, // mockPassport = true for testnet
    allowedIds, configStore, userIdType,
)
```

## User Identifier Types

Choose how user identifiers are formatted:

```go
self.UserIDTypeHex  // Hex format: 0x1234...
self.UserIDTypeUUID // UUID format: 12345678-1234-1234-1234-123456789abc
```

## Country Codes

Use 3-letter ISO country codes for exclusions:

```go
import "github.com/selfxyz/self/sdk/sdk-go/common"

excludedCountries := []common.Country3LetterCode{
    common.USA, // United States
    common.RUS, // Russia
    common.CHN, // China
}
```

## Error Handling

The SDK provides detailed error information through `ConfigMismatchError`:

```go
result, err := verifier.Verify(ctx, attestationId, proof, signals, contextData)
if err != nil {
    if configErr, ok := err.(*self.ConfigMismatchError); ok {
        fmt.Println("Configuration issues:")
        for _, issue := range configErr.Issues {
            fmt.Printf("- %s: %s\n", issue.Type, issue.Message)
        }
    } else {
        fmt.Printf("Other error: %v\n", err)
    }
    return
}
```

## Verification Result

The `VerificationResult` contains comprehensive verification information:

```go
type VerificationResult struct {
    AttestationId          AttestationId         // Type of attestation verified
    IsValidDetails         IsValidDetails        // Validation status details
    ForbiddenCountriesList []string              // List of forbidden countries
    DiscloseOutput         GenericDiscloseOutput // Disclosed identity information
    UserData               UserData              // User-specific data
}

type IsValidDetails struct {
    IsValid           bool // Overall proof validity
    IsMinimumAgeValid bool // Age requirement met
    IsOfacValid       bool // OFAC compliance
}

type GenericDiscloseOutput struct {
    Nullifier     string   // Unique nullifier for this proof
    IssuingState  string   // Country that issued the document
    Name          string   // Full name
    IdNumber      string   // Document ID number
    Nationality   string   // Nationality
    DateOfBirth   string   // Date of birth
    Gender        string   // Gender
    ExpiryDate    string   // Document expiry date
    MinimumAge    string   // Minimum age disclosed
    Ofac          []bool   // OFAC check results
}
```

## Examples

### Age Verification (18+)

```go
config := self.VerificationConfig{
    MinimumAge: &[]int{18}[0],
}
```

### Country Restrictions

```go
config := self.VerificationConfig{
    ExcludedCountries: []common.Country3LetterCode{
        common.USA,
        common.RUS,
        common.IRN,
    },
}
```

### OFAC Compliance

```go
config := self.VerificationConfig{
    Ofac: &[]bool{true}[0], // Require OFAC compliance
}
```

### Combined Requirements

```go
config := self.VerificationConfig{
    MinimumAge:        &[]int{21}[0],
    ExcludedCountries: []common.Country3LetterCode{common.USA},
    Ofac:              &[]bool{true}[0],
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:

- Create an issue in this repository
- Check the [Self Protocol documentation](https://docs.self.id)
- Join our [Discord community](https://discord.gg/selfxyz)
