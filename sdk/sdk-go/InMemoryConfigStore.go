package self

import (
	"context"

)

// GetActionIdFunc is a function type for custom action ID generation
type GetActionIdFunc func(ctx context.Context, userIdentifier string, userDefinedData string) (string, error)

// InMemoryConfigStore provides an in-memory implementation of ConfigStore with custom action ID logic
type InMemoryConfigStore struct {
	configs         map[string]VerificationConfig
	getActionIdFunc GetActionIdFunc
}

// Compile-time check to ensure InMemoryConfigStore implements ConfigStore interface
var _ ConfigStore = (*InMemoryConfigStore)(nil)

// NewInMemoryConfigStore creates a new instance of InMemoryConfigStore
func NewInMemoryConfigStore(getActionIdFunc GetActionIdFunc) *InMemoryConfigStore {
	return &InMemoryConfigStore{
		configs:         make(map[string]VerificationConfig),
		getActionIdFunc: getActionIdFunc,
	}
}

// GetActionId uses the custom function to generate action IDs
func (store *InMemoryConfigStore) GetActionId(ctx context.Context, userIdentifier string, userDefinedData string) (string, error) {
	return store.getActionIdFunc(ctx, userIdentifier, userDefinedData)
}

// SetConfig stores a configuration with the given ID
// Returns true if the configuration was newly created, false if it was updated
func (store *InMemoryConfigStore) SetConfig(ctx context.Context, id string, config VerificationConfig) (bool, error) {
	_, existed := store.configs[id]
	store.configs[id] = config
	return !existed, nil
}

// GetConfig retrieves a configuration by ID
	func (store *InMemoryConfigStore) GetConfig(ctx context.Context, id string) (VerificationConfig, error) {
	config, exists := store.configs[id]
	if !exists {
		return VerificationConfig{}, nil
	}
	return config, nil
}
