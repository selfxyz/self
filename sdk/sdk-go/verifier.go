package self

import (
	"context"
	"encoding/hex"
	"fmt"
	"math/big"
	"strconv"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"

	commonUtils "github.com/selfxyz/self/sdk/sdk-go/common"
	bindings "github.com/selfxyz/self/sdk/sdk-go/contracts/bindings"
)

const (
	CELO_MAINNET_RPC_URL = "https://forno.celo.org"
	CELO_TESTNET_RPC_URL = "https://forno.celo-sepolia.celo-testnet.org"

	IDENTITY_VERIFICATION_HUB_ADDRESS         = "0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF"
	IDENTITY_VERIFICATION_HUB_ADDRESS_STAGING = "0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74"
)

// ConfigMismatch represents different types of configuration validation errors
type ConfigMismatch string

const (
	InvalidId                     ConfigMismatch = "InvalidId"
	InvalidUserContextHash        ConfigMismatch = "InvalidUserContextHash"
	InvalidScope                  ConfigMismatch = "InvalidScope"
	InvalidRoot                   ConfigMismatch = "InvalidRoot"
	InvalidAttestationId          ConfigMismatch = "InvalidAttestationId"
	InvalidForbiddenCountriesList ConfigMismatch = "InvalidForbiddenCountriesList"
	InvalidMinimumAge             ConfigMismatch = "InvalidMinimumAge"
	InvalidTimestamp              ConfigMismatch = "InvalidTimestamp"
	InvalidOfac                   ConfigMismatch = "InvalidOfac"
	ConfigNotFound                ConfigMismatch = "ConfigNotFound"
)

// ConfigIssue represents a specific configuration validation issue
type ConfigIssue struct {
	Type    ConfigMismatch `json:"type"`
	Message string         `json:"message"`
}

// ConfigMismatchError represents an error with multiple configuration issues
type ConfigMismatchError struct {
	Issues []ConfigIssue `json:"issues"`
}

func (e *ConfigMismatchError) Error() string {
	var message []string
	for _, issue := range e.Issues {
		message = append(message, fmt.Sprintf("[%s]: %s", issue.Type, issue.Message))
	}
	return strings.Join(message, "\n")
}

// NewConfigMismatchError creates a new ConfigMismatchError with the given issues
func NewConfigMismatchError(issue []ConfigIssue) *ConfigMismatchError {
	return &ConfigMismatchError{Issues: issue}
}

// BackendVerifier handles verification of Self protocol attestations
type BackendVerifier struct {
	scope                           string
	identityVerificationHubContract *bindings.IdentityVerificationHubImpl
	configStorage                   ConfigStore
	provider                        *ethclient.Client
	allowedIDs                      map[AttestationId]bool
	userIdentifierType              UserIDType
}

// NewBackendVerifier creates a new BackendVerifier instance
//
// Parameters:
//   - scope: The verification scope identifier
//   - endpoint: The endpoint URL for scope hashing
//   - mockPassport: Whether to use testnet (staging) contracts
//   - allowedIds: Map of allowed attestation IDs
//   - configStorage: Configuration storage interface implementation
//   - userIdentifierType: Type of user identifier (hex or uuid)
//
// Returns:
//   - A new BackendVerifier instance
//   - An error if initialization fails
func NewBackendVerifier(
	scope string,
	endpoint string,
	mockPassport bool,
	allowedIds map[AttestationId]bool,
	configStorage ConfigStore,
	userIdentifierType UserIDType,
) (*BackendVerifier, error) {
	rpcUrl := CELO_MAINNET_RPC_URL
	hubAddress := IDENTITY_VERIFICATION_HUB_ADDRESS

	if mockPassport {
		rpcUrl = CELO_TESTNET_RPC_URL
		hubAddress = IDENTITY_VERIFICATION_HUB_ADDRESS_STAGING
	}

	provider, err := ethclient.Dial(rpcUrl)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to ethereum client: %v", err)
	}

	// Create the contract binding
	hubContract, err := bindings.NewIdentityVerificationHubImpl(
		common.HexToAddress(hubAddress),
		provider,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create hub contract binding: %v", err)
	}

	hashedScope, err := commonUtils.HashEndpointWithScope(endpoint, scope)
	if err != nil {
		return nil, fmt.Errorf("failed to hash endpoint with scope: %v", err)
	}

	return &BackendVerifier{
		scope:                           hashedScope,
		identityVerificationHubContract: hubContract,
		configStorage:                   configStorage,
		provider:                        provider,
		allowedIDs:                      allowedIds,
		userIdentifierType:              userIdentifierType,
	}, nil
}

// containsHexChars checks if a string contains hexadecimal characters (a-f)
func containsHexChars(s string) bool {
	for _, char := range s {
		if (char >= 'a' && char <= 'f') || (char >= 'A' && char <= 'F') {
			return true
		}
	}
	return false
}

// Verify performs the verification of attestation with the given proof and signals
//
// Parameters:
//   - ctx: Context for the verification operation
//   - attestationIdInt: Integer representation of the attestation ID
//   - proof: Zero-knowledge proof structure
//   - pubSignals: Public signals from the proof
//   - userContextData: User context data for verification
//
// Returns:
//   - VerificationResult containing all verification details
//   - An error if verification fails or validation issues are found
func (s *BackendVerifier) Verify(
	ctx context.Context,
	attestationIdInt int,
	proof VcAndDiscloseProof,
	pubSignals []string,
	userContextData string,
) (*VerificationResult, error) {

	attestationId := AttestationId(attestationIdInt)
	allowedId, exists := s.allowedIDs[attestationId]
	var issues []ConfigIssue

	if !exists || !allowedId {
		issues = append(issues, ConfigIssue{
			Type:    InvalidId,
			Message: fmt.Sprintf("Attestation ID is not allowed, received: %d", attestationId),
		})
	}

	// Process public signals, adding 0x prefix for hex values if needed
	publicSignals := make([]string, len(pubSignals))
	for i, signal := range pubSignals {
		if len(signal) > 0 && !strings.HasPrefix(signal, "0x") && containsHexChars(signal) {
			publicSignals[i] = "0x" + signal
		} else {
			publicSignals[i] = signal
		}
	}

	attestationIdHex := fmt.Sprintf("%064x", attestationId)
	attestationIdBytes32 := [32]byte{}
	copy(attestationIdBytes32[:], common.FromHex("0x"+attestationIdHex))

	// Check if user context hash matches
	discloseIndices, exists := DiscloseIndices[attestationId]
	if !exists {
		issues = append(issues, ConfigIssue{
			Type:    InvalidAttestationId,
			Message: fmt.Sprintf("Unknown attestation ID: %d", attestationId),
		})
	} else {

		// Get user context hash from circuit
		userContextHashInCircuit := new(big.Int)
		userContextHashInCircuit.SetString(publicSignals[discloseIndices.UserIdentifierIndex], 10)

		// Calculate expected user context hash
		userContextDataBytes, err := hex.DecodeString(userContextData)
		if err != nil {
			issues = append(issues, ConfigIssue{
				Type:    InvalidUserContextHash,
				Message: fmt.Sprintf("Invalid hex string in userContextData: %v", err),
			})
		} else {
			userContextHashStr := CalculateUserIdentifierHash(userContextDataBytes)
			userContextHash := new(big.Int)
			userContextHashStr = strings.TrimPrefix(userContextHashStr, "0x")
			userContextHash.SetString(userContextHashStr, 16)

			if userContextHashInCircuit.Cmp(userContextHash) != 0 {
				issues = append(issues, ConfigIssue{
					Type: InvalidUserContextHash,
					Message: fmt.Sprintf("User context hash does not match with the one in the circuit\nCircuit: %s\nUser context hash: %s",
						userContextHashInCircuit.String(), userContextHash.String()),
				})
			}
		}

		// Check if scope matches
		isValidScope := s.scope == publicSignals[discloseIndices.ScopeIndex]
		if !isValidScope {
			issues = append(issues, ConfigIssue{
				Type: InvalidScope,
				Message: fmt.Sprintf("Scope does not match with the one in the circuit\nCircuit: %s\nScope: %s",
					publicSignals[discloseIndices.ScopeIndex], s.scope),
			})
		}

		// Check the root (reusing pre-calculated attestationIdBytes32)
		registryAddress, err := s.identityVerificationHubContract.Registry(nil, attestationIdBytes32)
		if err != nil || registryAddress == (common.Address{}) {
			issues = append(issues, ConfigIssue{
				Type:    InvalidRoot,
				Message: "Registry contract not found",
			})
		} else {
			registryContract, err := bindings.NewRegistry(registryAddress, s.provider)
			if err != nil {
				issues = append(issues, ConfigIssue{
					Type:    InvalidRoot,
					Message: fmt.Sprintf("Failed to create registry contract binding: %v", err),
				})
			} else {
				merkleRoot := new(big.Int)
				merkleRoot.SetString(publicSignals[discloseIndices.MerkleRootIndex], 10)

				currentRoot, err := registryContract.CheckIdentityCommitmentRoot(nil, merkleRoot)
				if err != nil || !currentRoot {
					issues = append(issues, ConfigIssue{
						Type:    InvalidRoot,
						Message: fmt.Sprintf("Onchain root does not exist, received: %s", publicSignals[discloseIndices.MerkleRootIndex]),
					})
				}
			}
		}

		// Check if attestation id matches
		attestationIdFromCircuit := publicSignals[discloseIndices.AttestationIdIndex]
		if fmt.Sprintf("%d", attestationId) != attestationIdFromCircuit {
			issues = append(issues, ConfigIssue{
				Type:    InvalidAttestationId,
				Message: "Attestation ID does not match with the one in the circuit",
			})
		}
	}

	// Extract user identifier and user defined data from userContextData (declare at function scope for reuse)
	// userContextData format: configId(32 bytes) + userIdentifier(32 bytes) + userDefinedData(rest)
	var userIdentifier, userDefinedData string
	var verificationConfig VerificationConfig
	var configErr error
	var forbiddenCountriesList []string

	// Precompute generic disclose output once and reuse
	genericDiscloseOutput, err := FormatRevealedDataPacked(attestationId, publicSignals)
	if err != nil {
		issues = append(issues, ConfigIssue{
			Type:    InvalidMinimumAge,
			Message: fmt.Sprintf("Error formatting revealed data: %v", err),
		})
	}

	if len(userContextData) < 128 {
		issues = append(issues, ConfigIssue{
			Type:    ConfigNotFound,
			Message: "userContextData too short",
		})
	} else {
		// Extract userIdentifier from bytes 64-128 (32-64 in hex string = 64-128 chars)
		userIdentifierHex := userContextData[64:128]
		userIdentifierBigInt := new(big.Int)
		userIdentifierBigInt.SetString(userIdentifierHex, 16)

		userIdentifier = CastToUserIdentifier(userIdentifierBigInt, s.userIdentifierType)
		userDefinedData = userContextData[128:]

		// Get config ID from storage
		configId, err := s.configStorage.GetActionId(ctx, userIdentifier, userDefinedData)
		if err != nil || configId == "" {
			issues = append(issues, ConfigIssue{
				Type:    ConfigNotFound,
				Message: "Config Id not found",
			})
		} else {
			// Get verification config
			verificationConfig, configErr = s.configStorage.GetConfig(ctx, configId)

			// Check for GetConfig error first
			if configErr != nil {
				issues = append(issues, ConfigIssue{
					Type:    ConfigNotFound,
					Message: fmt.Sprintf("Config not found for %s", configId),
				})
			}

			// Check if returned config is empty/invalid (like TypeScript's finally block)
			if s.isEmptyVerificationConfig(verificationConfig) {
				issues = append(issues, ConfigIssue{
					Type:    ConfigNotFound,
					Message: fmt.Sprintf("Config not found for %s", configId),
				})
			}

			// Only proceed with validations if no error and config is not empty
			if configErr == nil && !s.isEmptyVerificationConfig(verificationConfig) {
				forbiddenCountriesList, genericDiscloseOutput, _ = s.validateWithConfig(attestationId, verificationConfig, publicSignals, discloseIndices, genericDiscloseOutput, &issues)
			}
		}
	}

	// If there are validation issues, return them
	if len(issues) > 0 {
		return nil, NewConfigMismatchError(issues)
	}

	isProofValid := false

	// Use the pre-calculated attestationIdBytes32 from above
	verifierAddress, err := s.identityVerificationHubContract.DiscloseVerifier(nil, attestationIdBytes32)
	if err != nil || verifierAddress == (common.Address{}) {
		return nil, fmt.Errorf("verifier contract not found")
	}

	var verifierContract *bindings.Verifier
	var aadhaarVerifierContract *bindings.AadhaarVerifier

	if attestationId == Aadhaar {
		aadhaarVerifierContract, err = bindings.NewAadhaarVerifier(verifierAddress, s.provider)
		if err != nil {
			return nil, fmt.Errorf("aadhaar verifier contract not found")
		}
	} else {
		verifierContract, err = bindings.NewVerifier(verifierAddress, s.provider)
		if err != nil {
			return nil, fmt.Errorf("verifier contract not found")
		}
	}

	// Convert string proof fields to *big.Int
	a0, ok := new(big.Int).SetString(proof.A[0], 10)
	if !ok {
		return nil, fmt.Errorf("invalid proof.A[0]: %s", proof.A[0])
	}
	a1, ok := new(big.Int).SetString(proof.A[1], 10)
	if !ok {
		return nil, fmt.Errorf("invalid proof.A[1]: %s", proof.A[1])
	}
	b00, ok := new(big.Int).SetString(proof.B[0][0], 10)
	if !ok {
		return nil, fmt.Errorf("invalid proof.B[0][0]: %s", proof.B[0][0])
	}
	b01, ok := new(big.Int).SetString(proof.B[0][1], 10)
	if !ok {
		return nil, fmt.Errorf("invalid proof.B[0][1]: %s", proof.B[0][1])
	}
	b10, ok := new(big.Int).SetString(proof.B[1][0], 10)
	if !ok {
		return nil, fmt.Errorf("invalid proof.B[1][0]: %s", proof.B[1][0])
	}
	b11, ok := new(big.Int).SetString(proof.B[1][1], 10)
	if !ok {
		return nil, fmt.Errorf("invalid proof.B[1][1]: %s", proof.B[1][1])
	}
	c0, ok := new(big.Int).SetString(proof.C[0], 10)
	if !ok {
		return nil, fmt.Errorf("invalid proof.C[0]: %s", proof.C[0])
	}
	c1, ok := new(big.Int).SetString(proof.C[1], 10)
	if !ok {
		return nil, fmt.Errorf("invalid proof.C[1]: %s", proof.C[1])
	}

	// Convert proof format: swaps B coordinates [proof.b[0][1], proof.b[0][0]]
	bFormatted := [2][2]*big.Int{
		{b01, b00}, // Swap first pair
		{b11, b10}, // Swap second pair
	}

	// Convert proof format: swaps B coordinates [proof.b[0][1], proof.b[0][0]]
	aFormatted := [2]*big.Int{a0, a1}
	cFormatted := [2]*big.Int{c0, c1}

	var publicSignalLength int
	if attestationId == Aadhaar {
		publicSignalLength = 19
	} else {
		publicSignalLength = 21
	}

	publicSignalsArray := make([]*big.Int, publicSignalLength)
	for i, signal := range publicSignals {
		if i >= publicSignalLength {
			break
		}
		signalBigInt := new(big.Int)
		if strings.HasPrefix(signal, "0x") {
			signalBigInt.SetString(signal, 0)
		} else {
			signalBigInt.SetString(signal, 10)
		}
		publicSignalsArray[i] = signalBigInt
	}

	for i := len(publicSignals); i < publicSignalLength; i++ {
		publicSignalsArray[i] = big.NewInt(0)
	}

	// Call appropriate verifier based on attestation type
	var isValid bool
	if attestationId == Aadhaar {
		var aadhaarSignals [19]*big.Int
		copy(aadhaarSignals[:], publicSignalsArray)
		isValid, err = aadhaarVerifierContract.VerifyProof(nil, aFormatted, bFormatted, cFormatted, aadhaarSignals)
	} else {
		var regularSignals [21]*big.Int
		copy(regularSignals[:], publicSignalsArray)
		isValid, err = verifierContract.VerifyProof(nil, aFormatted, bFormatted, cFormatted, regularSignals)
	}

	if err != nil {
		isProofValid = false
	} else {
		isProofValid = isValid
	}

	if forbiddenCountriesList == nil {
		discloseIndices, exists = DiscloseIndices[attestationId]
		if exists {
			forbiddenCountriesListPacked := make([]string, 4)
			for i := 0; i < 4; i++ {
				forbiddenCountriesListPacked[i] = publicSignals[discloseIndices.ForbiddenCountriesListPackedIndex+i]
			}
			forbiddenCountriesList = UnpackForbiddenCountriesList(forbiddenCountriesListPacked)
		}
	}

	// Calculate cumulative OFAC: true if any OFAC check is enabled
	cumulativeOfac := false
	for _, ofacCheck := range genericDiscloseOutput.Ofac {
		if ofacCheck {
			cumulativeOfac = true
			break
		}
	}

	isOfacValid := false
	if configErr == nil && verificationConfig.Ofac {
		isOfacValid = cumulativeOfac
	}

	return &VerificationResult{
		AttestationId: attestationId,
		IsValidDetails: IsValidDetails{
			IsValid:           isProofValid,
			IsMinimumAgeValid: true,
			IsOfacValid:       isOfacValid,
		},
		ForbiddenCountriesList: forbiddenCountriesList,
		DiscloseOutput:         genericDiscloseOutput,
		UserData: UserData{
			UserIdentifier:  userIdentifier,
			UserDefinedData: userDefinedData,
		},
	}, nil
}

// validateWithConfig performs config-based validations (forbidden countries, minimum age, timestamp, OFAC)
// Returns the computed values for reuse in return value construction
func (s *BackendVerifier) validateWithConfig(
	attestationId AttestationId,
	verificationConfig VerificationConfig,
	publicSignals []string,
	discloseIndices DiscloseIndicesEntry,
	genericDiscloseOutput GenericDiscloseOutput,
	issues *[]ConfigIssue,
) ([]string, GenericDiscloseOutput, error) {
	forbiddenCountriesListPacked := make([]string, 4)
	for i := 0; i < 4; i++ {
		forbiddenCountriesListPacked[i] = publicSignals[discloseIndices.ForbiddenCountriesListPackedIndex+i]
	}

	forbiddenCountriesList := UnpackForbiddenCountriesList(forbiddenCountriesListPacked)

	// Check if all config excluded countries are in the circuit's forbidden list
	isForbiddenCountryListValid := true
	for _, country := range verificationConfig.ExcludedCountries {
		found := false
		for _, circuitCountry := range forbiddenCountriesList {
			if string(country) == circuitCountry {
				found = true
				break
			}
		}
		if !found {
			isForbiddenCountryListValid = false
			break
		}
	}

	if !isForbiddenCountryListValid {
		*issues = append(*issues, ConfigIssue{
			Type: InvalidForbiddenCountriesList,
			Message: fmt.Sprintf("Forbidden countries list in config does not match with the one in the circuit\nCircuit: %s\nConfig: %v",
				strings.Join(forbiddenCountriesList, ", "), verificationConfig.ExcludedCountries),
		})
	}

	if verificationConfig.MinimumAge != 0 {
		configMinAge := verificationConfig.MinimumAge
		circuitMinAge := genericDiscloseOutput.MinimumAge

		circuitMinAgeInt := 0
		if circuitMinAge != "00" {
			fmt.Sscanf(circuitMinAge, "%d", &circuitMinAgeInt)
		}

		isMinimumAgeValid := configMinAge == circuitMinAgeInt || circuitMinAge == "00"
		if !isMinimumAgeValid {
			*issues = append(*issues, ConfigIssue{
				Type: InvalidMinimumAge,
				Message: fmt.Sprintf("Minimum age in config does not match with the one in the circuit\nCircuit: %s\nConfig: %d",
					circuitMinAge, configMinAge),
			})
		}
	}

	s.validateTimestamp(attestationId, publicSignals, discloseIndices, issues)

	return forbiddenCountriesList, genericDiscloseOutput, nil
}

// validateTimestamp checks if the circuit timestamp is within acceptable range (not too old, not in future)
func (s *BackendVerifier) validateTimestamp(
	attestationId AttestationId,
	publicSignals []string,
	discloseIndices DiscloseIndicesEntry,
	issues *[]ConfigIssue,
) {
	// Extract timestamp components from circuit (YYMMDD format)
	currentDateIndex := discloseIndices.CurrentDateIndex

	var circuitTimestampYy []int
	var circuitTimestampMm []int
	var circuitTimestampDd []int

	if attestationId == Aadhaar {
		// For Aadhaar: split string digits and convert to numbers
		yyStr := publicSignals[currentDateIndex]
		for _, char := range yyStr {
			if digit, err := strconv.Atoi(string(char)); err == nil {
				circuitTimestampYy = append(circuitTimestampYy, digit)
			}
		}

		mmStr := publicSignals[currentDateIndex+1]
		for _, char := range mmStr {
			if digit, err := strconv.Atoi(string(char)); err == nil {
				circuitTimestampMm = append(circuitTimestampMm, digit)
			}
		}

		ddStr := publicSignals[currentDateIndex+2]
		for _, char := range ddStr {
			if digit, err := strconv.Atoi(string(char)); err == nil {
				circuitTimestampDd = append(circuitTimestampDd, digit)
			}
		}
	} else {
		// For other attestation types: use individual signals as digits
		yy1, _ := strconv.Atoi(publicSignals[currentDateIndex])
		yy2, _ := strconv.Atoi(publicSignals[currentDateIndex+1])
		circuitTimestampYy = []int{2, 0, yy1, yy2}

		mm1, _ := strconv.Atoi(publicSignals[currentDateIndex+2])
		mm2, _ := strconv.Atoi(publicSignals[currentDateIndex+3])
		circuitTimestampMm = []int{mm1, mm2}

		dd1, _ := strconv.Atoi(publicSignals[currentDateIndex+4])
		dd2, _ := strconv.Atoi(publicSignals[currentDateIndex+5])
		circuitTimestampDd = []int{dd1, dd2}
	}

	yearStr := ""
	for _, digit := range circuitTimestampYy {
		yearStr += strconv.Itoa(digit)
	}
	year, _ := strconv.Atoi(yearStr)

	monthStr := ""
	for _, digit := range circuitTimestampMm {
		monthStr += strconv.Itoa(digit)
	}
	month, _ := strconv.Atoi(monthStr)

	dayStr := ""
	for _, digit := range circuitTimestampDd {
		dayStr += strconv.Itoa(digit)
	}
	day, _ := strconv.Atoi(dayStr)

	// Create circuit timestamp
	// Note: TypeScript subtracts 1 from month because JS Date is 0-indexed (0=Jan)
	// Go time.Month is 1-indexed (1=Jan), so we use month directly
	circuitTimestamp := time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)
	currentTimestamp := time.Now().UTC()

	// Check if timestamp is more than 1 day in the future
	oneDayAhead := currentTimestamp.Add(24 * time.Hour)
	if circuitTimestamp.After(oneDayAhead) {
		*issues = append(*issues, ConfigIssue{
			Type:    InvalidTimestamp,
			Message: "Circuit timestamp is in the future",
		})
	}

	// Check if timestamp is more than 1 day in the past (using end-of-day logic)
	// Add 23 hours + 59 minutes + 59 seconds to circuit timestamp (matching TypeScript logic)
	circuitTimestampEOD := circuitTimestamp.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
	oneDayAgo := currentTimestamp.Add(-24 * time.Hour)
	if circuitTimestampEOD.Before(oneDayAgo) {
		*issues = append(*issues, ConfigIssue{
			Type:    InvalidTimestamp,
			Message: "Circuit timestamp is too old",
		})
	}
}

// isEmptyVerificationConfig checks if a VerificationConfig is empty/invalid
func (s *BackendVerifier) isEmptyVerificationConfig(config VerificationConfig) bool {
	return config.MinimumAge == 0 &&
		len(config.ExcludedCountries) == 0 &&
		!config.Ofac
}
