package self

import (
	"context"
)

// ConfigStore interface defines methods for storing and retrieving verification configurations
type ConfigStore interface {
	// GetConfig retrieves a verification configuration by ID
	GetConfig(ctx context.Context, id string) (VerificationConfig, error)
	// SetConfig stores a verification configuration with the given ID
	SetConfig(ctx context.Context, id string, config VerificationConfig) (bool, error)
	// GetActionId retrieves the action ID for a given user identifier and user-defined data
	GetActionId(ctx context.Context, userIdentifier string, actionId string) (string, error)
}

// DefaultConfigStore provides a simple in-memory implementation of ConfigStore
type DefaultConfigStore struct {
	config VerificationConfig
}

// NewDefaultConfigStore creates a new DefaultConfigStore with the given configuration
func NewDefaultConfigStore(config VerificationConfig) *DefaultConfigStore {
	return &DefaultConfigStore{
		config: config,
	}
}

// GetConfig returns the stored configuration
func (store *DefaultConfigStore) GetConfig(ctx context.Context, id string) (VerificationConfig, error) {
	return store.config, nil
}

// SetConfig updates the stored configuration
	func (store *DefaultConfigStore) SetConfig(ctx context.Context, id string, config VerificationConfig) (bool, error) {
	store.config = config
	return true, nil
}

// GetActionId returns a default action ID
func (store *DefaultConfigStore) GetActionId(ctx context.Context, userIdentifier string, userDefinedData string) (string, error) {
	return "random-id", nil
}
