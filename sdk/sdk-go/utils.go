package self

import (
	"crypto/sha256"
	"fmt"
	"math"
	"math/big"
	"regexp"
	"strings"

	"github.com/selfxyz/self/sdk/sdk-go/common"
	"golang.org/x/crypto/ripemd160"
)

// Constants for attestation types
const (
	Passport AttestationId = 1
	EUCard   AttestationId = 2
	Aadhaar  AttestationId = 3
)

// DiscloseIndicesEntry defines the indices for different data fields in the public signals
type DiscloseIndicesEntry struct {
	RevealedDataPackedIndex           int
	ForbiddenCountriesListPackedIndex int
	NullifierIndex                    int
	AttestationIdIndex                int
	MerkleRootIndex                   int
	CurrentDateIndex                  int
	NamedobSmtRootIndex               int
	NameyobSmtRootIndex               int
	ScopeIndex                        int
	UserIdentifierIndex               int
	PassportNoSmtRootIndex            int
}

// DiscloseIndices maps attestation IDs to their respective index configurations
var DiscloseIndices = map[AttestationId]DiscloseIndicesEntry{
	Passport: {
		RevealedDataPackedIndex:           0,
		ForbiddenCountriesListPackedIndex: 3,
		NullifierIndex:                    7,
		AttestationIdIndex:                8,
		MerkleRootIndex:                   9,
		CurrentDateIndex:                  10,
		NamedobSmtRootIndex:               17,
		NameyobSmtRootIndex:               18,
		ScopeIndex:                        19,
		UserIdentifierIndex:               20,
		PassportNoSmtRootIndex:            16,
	},
	EUCard: {
		RevealedDataPackedIndex:           0,
		ForbiddenCountriesListPackedIndex: 4,
		NullifierIndex:                    8,
		AttestationIdIndex:                9,
		MerkleRootIndex:                   10,
		CurrentDateIndex:                  11,
		NamedobSmtRootIndex:               17,
		NameyobSmtRootIndex:               18,
		ScopeIndex:                        19,
		UserIdentifierIndex:               20,
		PassportNoSmtRootIndex:            99,
	},
	Aadhaar: {
		RevealedDataPackedIndex:           2,
		ForbiddenCountriesListPackedIndex: 6,
		NullifierIndex:                    0,
		AttestationIdIndex:                10,
		MerkleRootIndex:                   16,
		CurrentDateIndex:                  11,
		NamedobSmtRootIndex:               14,
		NameyobSmtRootIndex:               15,
		ScopeIndex:                        17,
		UserIdentifierIndex:               18,
		PassportNoSmtRootIndex:            99,
	},
}

// Field names for revealed data
const (
	IssuingState string = "issuingState"
	Name         string = "name"
	IdNumber     string = "idNumber"
	Nationality  string = "nationality"
	DateOfBirth  string = "dateOfBirth"
	Gender       string = "gender"
	ExpiryDate   string = "expiryDate"
	OlderThan    string = "olderThan"
	Ofac         string = "ofac"
)

// RevealedDataIndicesEntry defines the start and end indices for different data fields
type RevealedDataIndicesEntry struct {
	IssuingStateStart int
	IssuingStateEnd   int
	NameStart         int
	NameEnd           int
	IdNumberStart     int
	IdNumberEnd       int
	NationalityStart  int
	NationalityEnd    int
	DateOfBirthStart  int
	DateOfBirthEnd    int
	GenderStart       int
	GenderEnd         int
	ExpiryDateStart   int
	ExpiryDateEnd     int
	OlderThanStart    int
	OlderThanEnd      int
	OfacStart         int
	OfacEnd           int
}

// RevealedDataIndices maps attestation IDs to their data field indices
var RevealedDataIndices = map[AttestationId]RevealedDataIndicesEntry{
	Passport: {
		IssuingStateStart: 2,
		IssuingStateEnd:   4,
		NameStart:         5,
		NameEnd:           43,
		IdNumberStart:     44,
		IdNumberEnd:       52,
		NationalityStart:  54,
		NationalityEnd:    56,
		DateOfBirthStart:  57,
		DateOfBirthEnd:    62,
		GenderStart:       64,
		GenderEnd:         64,
		ExpiryDateStart:   65,
		ExpiryDateEnd:     70,
		OlderThanStart:    88,
		OlderThanEnd:      89,
		OfacStart:         90,
		OfacEnd:           92,
	},
	EUCard: {
		IssuingStateStart: 2,
		IssuingStateEnd:   4,
		NameStart:         60,
		NameEnd:           89,
		IdNumberStart:     5,
		IdNumberEnd:       13,
		NationalityStart:  45,
		NationalityEnd:    47,
		DateOfBirthStart:  30,
		DateOfBirthEnd:    35,
		GenderStart:       37,
		GenderEnd:         37,
		ExpiryDateStart:   38,
		ExpiryDateEnd:     43,
		OlderThanStart:    90,
		OlderThanEnd:      91,
		OfacStart:         92,
		OfacEnd:           93,
	},
	Aadhaar: {
		IssuingStateStart: 81,
		IssuingStateEnd:   111,
		NameStart:         9,
		NameEnd:           70,
		IdNumberStart:     71,
		IdNumberEnd:       74,
		NationalityStart:  999,
		NationalityEnd:    999,
		DateOfBirthStart:  1,
		DateOfBirthEnd:    8,
		GenderStart:       0,
		GenderEnd:         0,
		ExpiryDateStart:   999,
		ExpiryDateEnd:     999,
		OlderThanStart:    118,
		OlderThanEnd:      118,
		OfacStart:         116,
		OfacEnd:           117,
	},
}

// AllIds contains all valid attestation IDs
var AllIds = map[AttestationId]bool{
	Passport: true,
	EUCard:   true,
	Aadhaar:  true,
}

// BytesCount maps attestation IDs to their respective byte counts
var BytesCount = map[AttestationId][]int{
	Passport: {31, 31, 31},
	EUCard:   {31, 31, 31, 1},
	Aadhaar:  {31, 31, 31, 26},
}

// trimU0000 filters out null characters (\u0000) from a slice of strings
func trimU0000(unpackedReveal []string) []string {
	var result []string
	for _, value := range unpackedReveal {
		if value != "\u0000" {
			result = append(result, value)
		}
	}
	return result
}

// UnpackForbiddenCountriesList unpacks a list of packed forbidden country codes into an array of 3-character country codes.
//
// Parameters:
//   - forbiddenCountriesListPacked: A slice of packed strings representing forbidden countries
//
// Returns:
//   - A slice of 3-character country codes extracted from the packed input
func UnpackForbiddenCountriesList(forbiddenCountriesListPacked []string) []string {
	// Unpack the revealed data using the unpackReveal function
	unpacked := common.UnpackReveal(forbiddenCountriesListPacked, "id")
	trimmed := trimU0000(unpacked)

	var countries []string

	// Join all trimmed strings to work with characters
	joined := strings.Join(trimmed, "")

	// Extract 3-character country codes
	for i := 0; i < len(joined); i += 3 {
		if i+3 <= len(joined) {
			countryCode := joined[i : i+3]
			if len(countryCode) == 3 {
				countries = append(countries, countryCode)
			}
		}
	}

	return countries
}

// CastToUserIdentifier converts a big integer to user identifier string based on the specified type
func CastToUserIdentifier(bigInt *big.Int, userIdType UserIDType) string {
	switch userIdType {
	case UserIDTypeHex:
		return CastToAddress(bigInt)
	case UserIDTypeUUID:
		return CastToUUID(bigInt)
	default:
		return bigInt.String()
	}
}

// CastToAddress converts big integer to hex address format (0x + 40 hex chars)
func CastToAddress(bigInt *big.Int) string {
	hexStr := bigInt.Text(16) // Convert to hex without 0x prefix
	// Pad to 40 characters (20 bytes = 40 hex chars)
	if len(hexStr) < 40 {
		hexStr = fmt.Sprintf("%040s", hexStr)
	}
	return "0x" + hexStr
}

// CastToUUID converts big integer to UUID format
func CastToUUID(bigInt *big.Int) string {
	hexStr := bigInt.Text(16) // Convert to hex without 0x prefix
	// Pad to 32 characters
	if len(hexStr) < 32 {
		hexStr = fmt.Sprintf("%032s", hexStr)
	}
	// Format as UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
	return fmt.Sprintf("%s-%s-%s-%s-%s",
		hexStr[0:8], hexStr[8:12], hexStr[12:16], hexStr[16:20], hexStr[20:32])
}

// CalculateUserIdentifierHash generates a deterministic user identifier hash from the provided context data.
//
// The function computes a SHA-256 hash of the input buffer, then applies a RIPEMD-160 hash to the result.
// The final output is a hexadecimal string, left-padded with zeros to 40 characters and prefixed with "0x".
//
// Parameters:
//   - userContextData: The byte slice containing user context data to hash
//
// Returns:
//   - A 40-character hexadecimal user identifier string prefixed with "0x"
func CalculateUserIdentifierHash(userContextData []byte) string {
	// Compute SHA-256 hash
	sha256Hasher := sha256.New()
	sha256Hasher.Write(userContextData)
	sha256Hash := sha256Hasher.Sum(nil)

	// Compute RIPEMD-160 hash of the SHA-256 hash
	ripemdHasher := ripemd160.New()
	ripemdHasher.Write(sha256Hash)
	ripemdHash := ripemdHasher.Sum(nil)

	hexString := fmt.Sprintf("%x", ripemdHash)

	// Pad with leading zeros to ensure 40 hex chars
	if len(hexString) < 40 {
		hexString = fmt.Sprintf("%040s", hexString)
	}

	return "0x" + hexString
}

// PublicSignals represents an array of numeric strings, equivalent to snarkjs PublicSignals
type PublicSignals []string

// GetRevealedDataPublicSignalsLength returns the number of public signals containing
// revealed data for the specified attestation ID.
//
// Returns an error if the attestation ID is not supported.
//
// Parameters:
//   - attestationId: The attestation ID for which to determine the number of revealed data public signals
//
// Returns:
//   - The number of public signals corresponding to revealed data
//   - An error if the attestation ID is invalid
func GetRevealedDataPublicSignalsLength(attestationId AttestationId) (int, error) {
	switch attestationId {
	case Passport:
		return int(93 / 31), nil
	case EUCard:
		return int(math.Ceil(94.0 / 31.0)), nil
	case Aadhaar:
		return int(math.Ceil(119.0 / 31.0)), nil
	default:
		return 0, fmt.Errorf("invalid attestation ID: %d", attestationId)
	}
}

// GetRevealedDataBytes extracts and returns the revealed data bytes from the public signals
// for a given attestation ID.
//
// Iterates over the relevant public signals, unpacks each into its constituent bytes according
// to the attestation's byte structure, and accumulates all revealed bytes into a single array.
//
// Parameters:
//   - attestationId: The attestation ID specifying the format of revealed data
//   - publicSignals: The array of public signals containing packed revealed data
//
// Returns:
//   - An array of bytes representing the revealed data for the specified attestation
//   - An error if the attestation ID is invalid or if there's an issue processing the signals
func GetRevealedDataBytes(attestationId AttestationId, publicSignals PublicSignals) ([]int, error) {
	// Get the length of revealed data public signals
	length, err := GetRevealedDataPublicSignalsLength(attestationId)
	if err != nil {
		return nil, err
	}

	// Get the disclose indices for this attestation ID
	discloseIndices, exists := DiscloseIndices[attestationId]
	if !exists {
		return nil, fmt.Errorf("disclose indices not found for attestation ID: %d", attestationId)
	}

	// Get the bytes count for this attestation ID
	bytesCount, exists := BytesCount[attestationId]
	if !exists {
		return nil, fmt.Errorf("bytes count not found for attestation ID: %d", attestationId)
	}

	var bytes []int

	for i := 0; i < length; i++ {
		signalIndex := discloseIndices.RevealedDataPackedIndex + i

		publicSignal := new(big.Int)
		publicSignal, success := publicSignal.SetString(publicSignals[signalIndex], 10)
		if !success {
			return nil, fmt.Errorf("failed to parse public signal at index %d: %s", signalIndex, publicSignals[signalIndex])
		}

		// Extract bytes from the public signal
		for j := 0; j < bytesCount[i]; j++ {
			// Extract the least significant byte (equivalent to publicSignal & 0xffn)
			byteVal := new(big.Int)
			byteVal.And(publicSignal, big.NewInt(0xff))
			bytes = append(bytes, int(byteVal.Int64()))

			publicSignal.Rsh(publicSignal, 8)
		}
	}

	return bytes, nil
}

// FormatRevealedDataPacked extracts and formats revealed data from public signals
func FormatRevealedDataPacked(attestationID AttestationId, publicSignals PublicSignals) (GenericDiscloseOutput, error) {
	revealedDataPacked, err := GetRevealedDataBytes(attestationID, publicSignals)

	if err != nil {
		return GenericDiscloseOutput{}, err
	}

	discloseIndices, exists := DiscloseIndices[attestationID]
	if !exists {
		return GenericDiscloseOutput{}, fmt.Errorf("disclose indices not found for attestation ID: %d", attestationID)
	}

	// Convert revealedDataPacked ([]int) to byte array for string operations
	revealedDataPackedBytes := make([]byte, len(revealedDataPacked))
	for i, b := range revealedDataPacked {
		revealedDataPackedBytes[i] = byte(b)
	}

	// Get revealed data indices for this attestation ID
	revealedDataIndices, exists := RevealedDataIndices[attestationID]
	if !exists {
		return GenericDiscloseOutput{}, fmt.Errorf("revealed data indices not found for attestation ID: %d", attestationID)
	}

	// Extract nullifier
	nullifier := publicSignals[discloseIndices.NullifierIndex]

	// Extract forbidden countries list packed
	fcStartIndex := discloseIndices.ForbiddenCountriesListPackedIndex
	forbiddenCountriesListPacked := publicSignals[fcStartIndex : fcStartIndex+4]

	// Extract issuing state
	issuingState := string(revealedDataPackedBytes[revealedDataIndices.IssuingStateStart : revealedDataIndices.IssuingStateEnd+1])

	// Extract name with cleaning (equivalent to regex replacements and trim)
	nameRaw := string(revealedDataPackedBytes[revealedDataIndices.NameStart : revealedDataIndices.NameEnd+1])
	name := cleanName(nameRaw)

	// Extract ID number
	idNumber := string(revealedDataPackedBytes[revealedDataIndices.IdNumberStart : revealedDataIndices.IdNumberEnd+1])

	// Extract nationality
	nationality := ""
	if attestationID == Aadhaar {
		nationality = "IND"
	} else {
		nationality = string(revealedDataPackedBytes[revealedDataIndices.NationalityStart : revealedDataIndices.NationalityEnd+1])
	}

	// Extract date of birth
	var dateOfBirth string
	if attestationID == Aadhaar {
		dobBytes := revealedDataPackedBytes[revealedDataIndices.DateOfBirthStart : revealedDataIndices.DateOfBirthEnd+1]
		var dobStrings []string
		for _, b := range dobBytes {
			dobStrings = append(dobStrings, fmt.Sprintf("%d", int(b)))
		}
		dateOfBirth = strings.Join(dobStrings, "")
	} else {
		dateOfBirth = string(revealedDataPackedBytes[revealedDataIndices.DateOfBirthStart : revealedDataIndices.DateOfBirthEnd+1])
	}

	// Extract gender
	gender := string(revealedDataPackedBytes[revealedDataIndices.GenderStart : revealedDataIndices.GenderEnd+1])

	// Extract expiry date
	var expiryDate string
	if attestationID == Aadhaar {
		expiryDate = "UNAVAILABLE"
	} else {
		expiryDate = string(revealedDataPackedBytes[revealedDataIndices.ExpiryDateStart : revealedDataIndices.ExpiryDateEnd+1])
	}

	// Extract minimum age (olderThan)
	var minimumAge string
	if attestationID == Aadhaar {
		firstByte := revealedDataPackedBytes[revealedDataIndices.OlderThanStart]
		minimumAge = fmt.Sprintf("%02d", int(firstByte))
	} else {
		minimumAge = string(revealedDataPackedBytes[revealedDataIndices.OlderThanStart : revealedDataIndices.OlderThanEnd+1])
	}

	// Extract OFAC data and convert to boolean array
	ofacBytes := revealedDataPackedBytes[revealedDataIndices.OfacStart : revealedDataIndices.OfacEnd+1]
	ofac := make([]bool, len(ofacBytes))
	for i, b := range ofacBytes {
		ofac[i] = !(b != 0)
	}

	if len(ofac) < 3 {
		ofac = append([]bool{false}, ofac...)
	}

	// Return the structured output
	return GenericDiscloseOutput{
		Nullifier:                    nullifier,
		ForbiddenCountriesListPacked: forbiddenCountriesListPacked,
		IssuingState:                 removeNullBytes(issuingState),
		Name:                         removeNullBytes(name),
		IdNumber:                     idNumber,
		Nationality:                  nationality,
		DateOfBirth:                  dateOfBirth,
		Gender:                       gender,
		ExpiryDate:                   expiryDate,
		MinimumAge:                   minimumAge,
		Ofac:                         ofac,
	}, nil
}

// removeNullBytes removes null bytes (\x00) from a string
func removeNullBytes(str string) string {
	return strings.ReplaceAll(str, "\x00", "")
}

// cleanName cleans the name string equivalent to the TypeScript regex operations
// .replace(/([A-Z])<+([A-Z])/g, '$1 $2').replace(/</g, ").trim()
func cleanName(nameRaw string) string {
	// Replace pattern ([A-Z])<+([A-Z]) with '$1 $2'
	re1 := regexp.MustCompile(`([A-Z])<+([A-Z])`)
	name := re1.ReplaceAllString(nameRaw, "$1 $2")

	// Replace all remaining '<' characters
	name = strings.ReplaceAll(name, "<", "")

	// Trim whitespace
	name = strings.TrimSpace(name)

	return name
}
