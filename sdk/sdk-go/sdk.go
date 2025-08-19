// Package self provides a Go SDK for integrating with the Self protocol for identity verification.
//
// The Self protocol enables privacy-preserving identity verification using zero-knowledge proofs
// and passport/ID card attestations. This SDK provides tools for backend verification of
// Self protocol attestations.
//
// # Basic Usage
//
// To use this SDK, you'll need to:
//
// 1. Create a configuration store (or use the default one)
// 2. Initialize a BackendVerifier
// 3. Call Verify with the proof and public signals
//
// Example:
//
//	import "import "github.com/selfxyz/self/sdk/sdk-go"
//
//	// Create a simple config store
//	config := self.VerificationConfig{
//		MinimumAge: 18, // 18+ verification
//		ExcludedCountries: []self.Country3LetterCode{self.USA}, // Exclude USA
//		Ofac: false, // Allow OFAC flagged individuals
//	}
//	configStore := self.NewDefaultConfigStore(config)
//
//	// Create allowed attestation IDs map
//	allowedIds := map[self.AttestationId]bool{
//		self.Passport: true,
//		self.EUCard:   true,
//	}
//
//	// Initialize the verifier
//	verifier, err := self.NewBackendVerifier(
//		"my-scope",                    // Your application scope
//		"https://my-app.com",         // Your application endpoint
//		false,                        // Use mainnet (true for testnet)
//		allowedIds,                   // Allowed attestation types
//		configStore,                  // Configuration storage
//		self.UserIDTypeHex,          // User identifier type
//	)
//	if err != nil {
//		log.Fatal(err)
//	}
//
//	// Verify a proof (these would come from your frontend)
//	result, err := verifier.Verify(
//		ctx,
//		"1",              // Attestation ID
//		proof,            // Zero-knowledge proof
//		publicSignals,    // Public signals
//		userContextData,  // User context data
//	)
//	if err != nil {
//		// Handle verification error
//		log.Printf("Verification failed: %v", err)
//		return
//	}
//
//	// Check verification results
//	if result.IsValidDetails.IsValid {
//		fmt.Printf("Verification successful for user: %s\n", result.UserData.UserIdentifier)
//		fmt.Printf("Age valid: %v\n", result.IsValidDetails.IsMinimumAgeValid)
//		fmt.Printf("OFAC valid: %v\n", result.IsValidDetails.IsOfacValid)
//	}
//
// # Configuration Storage
//
// The SDK requires a ConfigStore implementation to manage verification configurations.
// You can use the provided DefaultConfigStore for simple use cases, or implement
// your own ConfigStore interface for more complex scenarios:
//
//	type ConfigStore interface {
//		GetConfig(ctx context.Context, id string) (VerificationConfig, error)
//		SetConfig(ctx context.Context, id string, config VerificationConfig) (bool, error)
//		GetActionId(ctx context.Context, userIdentifier string, actionId string) (string, error)
//	}
//
// # Attestation Types
//
// The SDK supports two types of attestations:
//   - Passport: Traditional passport verification
//   - EUCard: European ID card verification
//
// # Network Configuration
//
// The SDK supports both mainnet and testnet deployments:
//   - Mainnet: Uses Celo mainnet contracts for production verification
//   - Testnet: Uses Celo testnet contracts for development and testing
//
// Set mockPassport to true in NewBackendVerifier to use testnet contracts.
package self

// Version of the Self Go SDK
const Version = "1.0.0"
