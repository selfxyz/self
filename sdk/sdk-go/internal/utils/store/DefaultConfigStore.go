package store

import (
	"context"
	"self-sdk-go/internal/types"
)

type DefaultConfigStore struct {
	config types.VerificationConfig
}

// Compile-time check to ensure DefaultConfigStore implements ConfigStore interface
var _ ConfigStore = (*DefaultConfigStore)(nil)

func NewDefaultConfigStore(config types.VerificationConfig) *DefaultConfigStore {
	return &DefaultConfigStore{
		config: config,
	}
}

func (store *DefaultConfigStore) GetConfig(ctx context.Context, id string) (types.VerificationConfig, error) {
	return store.config, nil
}

func (store *DefaultConfigStore) SetConfig(ctx context.Context, id string, config types.VerificationConfig) (bool, error) {
	store.config = config
	return true, nil
}

func (store *DefaultConfigStore) GetActionId(ctx context.Context, userIdentifier string, userDefinedData string) (string, error) {
	return "random-id", nil
}
