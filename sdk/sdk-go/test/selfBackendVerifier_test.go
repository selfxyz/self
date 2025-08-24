package selfBackendVerifier

import (
	"context"
	"encoding/hex"
	"fmt"
	"math/big"
	"strings"
	"testing"

	self "github.com/selfxyz/self/sdk/sdk-go"
	common "github.com/selfxyz/self/sdk/sdk-go/common"
)

// MockConfigStore implements ConfigStore interface for testing
type MockConfigStore struct {
	configs   map[string]self.VerificationConfig
	actionIds map[string]string
}

func (m *MockConfigStore) GetConfig(ctx context.Context, id string) (self.VerificationConfig, error) {
	if config, exists := m.configs[id]; exists {
		return config, nil
	}
	return self.VerificationConfig{}, nil
}

func (m *MockConfigStore) SetConfig(ctx context.Context, id string, config self.VerificationConfig) (bool, error) {
	if m.configs == nil {
		m.configs = make(map[string]self.VerificationConfig)
	}
	m.configs[id] = config
	return true, nil
}

func (m *MockConfigStore) GetActionId(ctx context.Context, userIdentifier string, actionId string) (string, error) {
	key := userIdentifier + actionId
	if configId, exists := m.actionIds[key]; exists {
		return configId, nil
	}
	return "", nil
}

// Real proof data from Self app generation
var testProof = self.VcAndDiscloseProof{
	A: [2]string{
		"19978035591559142190701827820645990013414633793180672686938226685776304489564",
		"5729195691952204724157922378821526527130089592215448275678040621795037604051",
	},
	B: [2][2]string{
		{
			"11751985993692270888240656856501733091634778410910150825443605743432104365496",
			"4452136363546266459130979435587765558483594623092208966946297079596510893605",
		},
		{
			"3810657409440735818003229201852551662656469950107499750244154014975554267923",
			"10470222606272472527954481346783037896628046865041659088202192358643101806862",
		},
	},
	C: [2]string{
		"15884364794774631813944040023461646992309624876334078534233455116862274883339",
		"20393368791665166818799823852194418481289576790771157544865526424140268474306",
	},
}

var testPublicSignals = []string{
	"0",
	"88695642300982331844063832786964092168707990538423248083901435067469135872",
	"5917645764266387229099807922771871753544163856784761583567435202615",
	"4936272",
	"0",
	"0",
	"0",
	"13444167391765850209653844241387268774183214285042803350347364004811481522835",
	"1",
	"3128220823265944096261447595696332812503333375431456287926106302900687520341",
	"2",
	"5",
	"0",
	"8",
	"1",
	"2",
	"17359956125106148146828355805271472653597249114301196742546733002427978706344",
	"7420120618403967585712321281997181302561301414016003514649937965499789236588",
	"16836358042995742879630198413873414945978677264752036026400967422611478610995",
	"13934606664243914063643606771911468856671016933765586820821710153612586828695",
	"333950092602874832043713879344132078365835356296",
}

// Helper function to convert big integer to UUID format (matching the main implementation)
func castToUUID(bigInt *big.Int) string {
	hexStr := bigInt.Text(16) // Convert to hex without 0x prefix
	// Pad to 32 characters (16 bytes = 32 hex chars)
	if len(hexStr) < 32 {
		hexStr = fmt.Sprintf("%032s", hexStr)
	}
	// Format as UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
	return fmt.Sprintf("%s-%s-%s-%s-%s",
		hexStr[0:8], hexStr[8:12], hexStr[12:16], hexStr[16:20], hexStr[20:32])
}

// Helper function to create test verification config
func createTestVerificationConfig() self.VerificationConfig {
	return self.VerificationConfig{
		MinimumAge:        18,
		ExcludedCountries: []common.Country3LetterCode{"PRK"},
		Ofac:              false,
	}
}

// Helper function to create real user context data from Self playground
func createTestUserContextData() string {
	// Real userContextData from Self app generation that matches the proof
	// Format: destChainId(32 bytes) + userIdentifier(32 bytes) + userDefinedData
	// This is the ACTUAL data used to generate the test proof
	return "000000000000000000000000000000000000000000000000000000000000a4ec0000000000000000000000000000000057843deaacba4fe9bdcccc6e3c356d0168656c6c6f2066726f6d2074686520706c617967726f756e64"
}

// Helper function to extract user identifier from real userContextData
func extractUserIdentifierFromContextData(userContextData string) string {
	// Real format: destChainId(32 bytes) + userIdentifier(32 bytes) + userDefinedData
	// userIdentifier is at bytes 32-64 (hex chars 64-128)
	if len(userContextData) < 128 {
		return ""
	}
	userIdentifierHex := userContextData[64:128] // Extract userIdentifier hex
	userIdentifierBigInt := new(big.Int)
	userIdentifierBigInt.SetString(userIdentifierHex, 16)

	// Convert to address format (0x + 40 hex chars) - matching UserIDTypeHex
	hexStr := userIdentifierBigInt.Text(16)
	if len(hexStr) < 40 {
		hexStr = fmt.Sprintf("%040s", hexStr)
	}
	return "0x" + hexStr
}

// Helper function to extract user defined data from real userContextData
func extractUserDefinedDataFromContextData(userContextData string) string {
	// userDefinedData starts at byte 64 (hex char 128)
	if len(userContextData) < 128 {
		return ""
	}
	userDefinedDataHex := userContextData[128:] // Everything after userIdentifier
	userDefinedDataBytes, err := hex.DecodeString(userDefinedDataHex)
	if err != nil {
		return ""
	}
	return string(userDefinedDataBytes)
}

func TestSelfBackendVerifier_Verify_WithUUIDUserIDType(t *testing.T) {
	userContextData := createTestUserContextData()

	// Extract the actual values that will be used for config lookup
	extractedUserIdentifier := extractUserIdentifierFromContextData(userContextData)
	extractedUserDefinedData := extractUserDefinedDataFromContextData(userContextData)

	// Get the hex-encoded version of userDefinedData (as used by the main verifier)
	extractedUserDefinedDataHex := userContextData[128:] // This is the hex string version

	t.Logf("UserContextData: %s", userContextData)
	t.Logf("Extracted UserIdentifier: %s", extractedUserIdentifier)
	t.Logf("Extracted UserDefinedData (decoded): %s", extractedUserDefinedData)
	t.Logf("Extracted UserDefinedData (hex): %s", extractedUserDefinedDataHex)

	// Convert userIdentifier to UUID format since we're using UserIDTypeUUID
	userIdentifierBigInt := new(big.Int)
	userIdentifierHex := extractedUserIdentifier[2:] // Remove 0x prefix
	userIdentifierBigInt.SetString(userIdentifierHex, 16)
	userIdentifierUUID := castToUUID(userIdentifierBigInt)
	t.Logf("UserIdentifier in UUID format: %s", userIdentifierUUID)
	t.Logf("Mock key will be: '%s'", userIdentifierUUID+extractedUserDefinedDataHex)

	mockConfigStore := &MockConfigStore{
		configs: map[string]self.VerificationConfig{
			"test-config-id": createTestVerificationConfig(),
		},
		actionIds: map[string]string{
			// Use UUID format + hex-encoded userDefinedData for the lookup key since we're using UserIDTypeUUID
			userIdentifierUUID + extractedUserDefinedDataHex: "test-config-id",
		},
	}

	allowedIds := map[self.AttestationId]bool{
		self.AttestationId(1): true,
		self.AttestationId(2): true,
	}

	verifier, err := self.NewBackendVerifier(
		"self-playground",
		"https://playground.self.xyz/api/verify",
		false,
		allowedIds,
		mockConfigStore,
		self.UserIDTypeUUID,
	)

	if err != nil {
		t.Fatalf("Failed to create verifier: %v", err)
	}

	ctx := context.Background()

	// Try to verify with valid attestation ID 1
	result, err := verifier.Verify(
		ctx,
		1, // Valid ID
		testProof,
		testPublicSignals,
		userContextData,
	)

	// Log detailed results for debugging
	if err != nil {
		t.Logf("Verification failed: %v", err)
		// Check if it's a ConfigMismatchError or contract-related error
		if configErr, ok := err.(*self.ConfigMismatchError); ok {
			t.Logf("Config validation issues found:")
			for i, issue := range configErr.Issues {
				t.Logf("  Issue %d: %s - %s", i+1, issue.Type, issue.Message)
			}
		}
	}
	if result != nil {
		t.Logf("Got verification result: %+v", result)
	}
}

func TestUserContextHashValidation(t *testing.T) {
	userContextData := createTestUserContextData()

	// Decode the hex string to bytes (like the Go code does)
	userContextDataBytes, err := hex.DecodeString(userContextData)
	if err != nil {
		t.Fatalf("Failed to decode userContextData: %v", err)
	}

	// Calculate the hash using the same method as the verifier
	userContextHashStr := self.CalculateUserIdentifierHash(userContextDataBytes)
	t.Logf("Calculated userContextHash: %s", userContextHashStr)

	// The public signals should contain this hash at the userIdentifierIndex
	// For attestationId 1, userIdentifierIndex is 20 (from constants.go)
	if len(testPublicSignals) > 20 {
		circuitHash := testPublicSignals[20]
		t.Logf("Circuit userContextHash: %s", circuitHash)

		// Convert calculated hash to big.Int for comparison (remove 0x prefix)
		calculatedHashBigInt := new(big.Int)
		hashForParsing := strings.TrimPrefix(userContextHashStr, "0x")
		calculatedHashBigInt.SetString(hashForParsing, 16)

		// Convert circuit hash string to big.Int for comparison
		circuitHashBigInt := new(big.Int)
		circuitHashBigInt.SetString(circuitHash, 10)

		if calculatedHashBigInt.Cmp(circuitHashBigInt) == 0 {
			t.Logf("✅ UserContextHash matches!")
		} else {
			t.Logf("❌ UserContextHash mismatch!")
			t.Logf("Expected: %s", calculatedHashBigInt.String())
			t.Logf("Got: %s", circuitHash)
		}
	}

	t.Logf("Real UserContextData format validation:")
	t.Logf("  Total length: %d chars (%d bytes)", len(userContextData), len(userContextData)/2)
	t.Logf("  DestChainId: %s (Celo testnet: 42220)", userContextData[0:64])
	t.Logf("  UserIdentifier: %s", userContextData[64:128])
	t.Logf("  UserDefinedData (hex): %s", userContextData[128:])

	// Decode and show the user defined data
	if len(userContextData) > 128 {
		userDefinedDataBytes, err := hex.DecodeString(userContextData[128:])
		if err == nil {
			t.Logf("  UserDefinedData (decoded): '%s'", string(userDefinedDataBytes))
		}
	}
}
