package main

import (
	"context"
	"fmt"
	"log"
	"sync"

	self "github.com/self/sdk"
	"github.com/self/sdk/common"
)

// CustomConfigStore implements a more sophisticated config store
type CustomConfigStore struct {
	configs map[string]self.VerificationConfig
	mutex   sync.RWMutex
}

// NewCustomConfigStore creates a new custom config store
func NewCustomConfigStore() *CustomConfigStore {
	return &CustomConfigStore{
		configs: make(map[string]self.VerificationConfig),
	}
}

// GetConfig retrieves a configuration by ID
func (c *CustomConfigStore) GetConfig(ctx context.Context, id string) (self.VerificationConfig, error) {
	c.mutex.RLock()
	defer c.mutex.RUnlock()

	config, exists := c.configs[id]
	if !exists {
		// Return default config for unknown IDs
		return self.VerificationConfig{
			MinimumAge: &[]int{18}[0],
			Ofac:       &[]bool{true}[0],
		}, nil
	}
	return config, nil
}

// SetConfig stores a configuration with the given ID
func (c *CustomConfigStore) SetConfig(ctx context.Context, id string, config self.VerificationConfig) (bool, error) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	_, existed := c.configs[id]
	c.configs[id] = config
	return !existed, nil
}

// GetActionId returns a custom action ID based on user data
func (c *CustomConfigStore) GetActionId(ctx context.Context, userIdentifier string, userDefinedData string) (string, error) {
	// In a real implementation, you might:
	// - Query a database
	// - Generate IDs based on user data
	// - Apply business logic

	// For this example, we'll create a simple mapping
	if len(userDefinedData) > 10 {
		return "premium-user-config", nil
	}
	return "standard-user-config", nil
}

func main() {
	fmt.Println(" Custom Configuration Store Example")

	// Create custom config store
	configStore := NewCustomConfigStore()

	// Set up different configurations for different user types
	ctx := context.Background()

	// Standard user config (basic verification)
	standardConfig := self.VerificationConfig{
		MinimumAge: &[]int{18}[0],
		Ofac:       &[]bool{true}[0],
	}
	configStore.SetConfig(ctx, "standard-user-config", standardConfig)

	// Premium user config (more restrictive)
	premiumConfig := self.VerificationConfig{
		MinimumAge:        &[]int{21}[0],
		ExcludedCountries: []common.Country3LetterCode{common.RUS, common.IRN},
		Ofac:              &[]bool{true}[0],
	}
	configStore.SetConfig(ctx, "premium-user-config", premiumConfig)

	// Define allowed attestation types
	allowedIds := map[self.AttestationId]bool{
		self.Passport: true,
		self.EUCard:   true,
	}

	// Initialize the verifier
	verifier, err := self.NewBackendVerifier(
		"custom-config-app",
		"https://my-premium-app.com",
		true, // Use testnet
		allowedIds,
		configStore,
		self.UserIDTypeUUID, // Use UUID format for user IDs
	)
	if err != nil {
		log.Fatalf("Failed to create verifier: %v", err)
	}

	fmt.Println(" Verifier with custom config store initialized!")

	// Demonstrate different configurations
	fmt.Println("\n Configuration Examples:")

	// Test standard user config
	standardConfigResult, _ := configStore.GetConfig(ctx, "standard-user-config")
	fmt.Printf("Standard users (min age: %d, OFAC: %v)\n",
		*standardConfigResult.MinimumAge, *standardConfigResult.Ofac)

	// Test premium user config
	premiumConfigResult, _ := configStore.GetConfig(ctx, "premium-user-config")
	fmt.Printf("Premium users (min age: %d, excluded countries: %v, OFAC: %v)\n",
		*premiumConfigResult.MinimumAge, premiumConfigResult.ExcludedCountries, *premiumConfigResult.Ofac)

	// Demonstrate action ID generation
	fmt.Println("\n Action ID Examples:")

	shortData := "basic"
	actionId1, _ := configStore.GetActionId(ctx, "user123", shortData)
	fmt.Printf("Short user data '%s' → Action ID: %s\n", shortData, actionId1)

	longData := "premium-user-with-extended-data"
	actionId2, _ := configStore.GetActionId(ctx, "user456", longData)
	fmt.Printf("Long user data '%s' → Action ID: %s\n", longData, actionId2)

	fmt.Println("\n Ready for verification with custom configuration logic!")

	_ = verifier // Suppress unused variable warning
}
