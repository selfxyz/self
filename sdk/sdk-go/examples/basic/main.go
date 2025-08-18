package main

import (
	"context"
	"fmt"
	"log"

	self "github.com/selfxyz/self/sdk/sdk-go"
	common "github.com/selfxyz/self/sdk/sdk-go/common"
)

func main() {
	// Example: Basic age verification (18+) with country restrictions

	// Create a verification configuration
	config := self.VerificationConfig{
		MinimumAge:        &[]int{18}[0],                           // Require 18+ years
		ExcludedCountries: []common.Country3LetterCode{common.USA}, // Exclude USA
		Ofac:              &[]bool{false}[0],                       // Allow OFAC flagged individuals
	}

	// Create a config store
	configStore := self.NewDefaultConfigStore(config)

	// Define allowed attestation types
	allowedIds := map[self.AttestationId]bool{
		self.Passport: true,
		self.EUCard:   true,
	}

	// Initialize the verifier for testnet
	verifier, err := self.NewBackendVerifier(
		"example-app",         // Your application scope
		"https://example.com", // Your application endpoint
		true,                  // Use testnet for this example
		allowedIds,            // Allowed attestation types
		configStore,           // Configuration storage
		self.UserIDTypeHex,    // User identifier type (hex format)
	)
	if err != nil {
		log.Fatalf("Failed to create verifier: %v", err)
	}

	fmt.Println(" Self Protocol verifier initialized successfully!")
	fmt.Println("Configuration:")
	fmt.Printf("  - Minimum age: %d\n", *config.MinimumAge)
	fmt.Printf("  - Excluded countries: %v\n", config.ExcludedCountries)
	fmt.Printf("  - OFAC compliance required: %v\n", *config.Ofac)
	fmt.Println("  - Network: Testnet")
	fmt.Println("  - Allowed attestations: Passport, EU Card")

	// In a real application, you would receive these from your frontend
	// This is just to show the structure
	fmt.Println("\n Example verification call:")
	fmt.Println("verifier.Verify(ctx, attestationId, proof, publicSignals, userContextData)")

	// Example of how to handle verification (with mock data structure)
	ctx := context.Background()

	// Note: In a real app, you'd get these from your frontend
	exampleAttestationId := "1" // Passport

	fmt.Printf("\n Ready to verify attestation ID: %s\n", exampleAttestationId)
	fmt.Println("Waiting for proof data from frontend...")

	// Example error handling
	fmt.Println("\n Error handling example:")
	fmt.Println("if configErr, ok := err.(*self.ConfigMismatchError); ok {")
	fmt.Println("    for _, issue := range configErr.Issues {")
	fmt.Println("        fmt.Printf(\"Issue: %s - %s\\n\", issue.Type, issue.Message)")
	fmt.Println("    }")
	fmt.Println("}")

	// Example successful verification result handling
	fmt.Println("\n Successful verification result structure:")
	fmt.Println("result.IsValidDetails.IsValid           // Overall proof validity")
	fmt.Println("result.IsValidDetails.IsMinimumAgeValid // Age requirement met")
	fmt.Println("result.IsValidDetails.IsOfacValid       // OFAC compliance")
	fmt.Println("result.UserData.UserIdentifier          // User identifier")
	fmt.Println("result.DiscloseOutput.Name              // Disclosed name")
	fmt.Println("result.DiscloseOutput.Nationality       // Nationality")
	fmt.Println("result.DiscloseOutput.DateOfBirth       // Date of birth")

	_ = ctx      // Suppress unused variable warning
	_ = verifier // Suppress unused variable warning
}
