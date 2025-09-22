package common

import (
	"fmt"
	"math/big"
	"regexp"
	"strings"

	"github.com/iden3/go-iden3-crypto/poseidon"
)

func FlexiblePoseidon(inputs []*big.Int) (*big.Int, error) {
	if len(inputs) == 0 {
		return nil, fmt.Errorf("no inputs provided")
	}

	if len(inputs) > 17 {
		return nil, fmt.Errorf("unsupported number of inputs: %d", len(inputs))
	}

	result, err := poseidon.Hash(inputs)
	if err != nil {
		return nil, fmt.Errorf("poseidon hash failed: %w", err)
	}

	return result, nil
}

// StringToBigInt converts a string to a big.Int by treating each character as a byte
// Validates input contains only ASCII characters and doesn't exceed 31 bytes
func StringToBigInt(str string) (*big.Int, error) {
	// Validate input contains only ASCII characters (0-127)
	for _, char := range str {
		if char > 127 {
			return nil, fmt.Errorf("input must contain only ASCII characters (0-127)")
		}
	}

	result := big.NewInt(0)
	for i := 0; i < len(str); i++ {
		// Shift left by 8 bits and add the character code
		result.Lsh(result, 8)
		result.Add(result, big.NewInt(int64(str[i])))
	}

	// Check size limit (31 bytes = 248 bits)
	maxValue := new(big.Int)
	maxValue.Lsh(big.NewInt(1), 248)
	maxValue.Sub(maxValue, big.NewInt(1))

	if result.Cmp(maxValue) > 0 {
		return nil, fmt.Errorf("resulting BigInt exceeds maximum size of 31 bytes")
	}

	return result, nil
}

// FormatEndpoint removes protocol and path from URL, keeping only the domain
func FormatEndpoint(endpoint string) string {
	if endpoint == "" {
		return ""
	}

	// Remove protocol (http:// or https://)
	re := regexp.MustCompile(`^https?://`)
	formatted := re.ReplaceAllString(endpoint, "")

	// Split by '/' and take only the first part (domain)
	parts := strings.Split(formatted, "/")
	return parts[0]
}

// HashEndpointWithScope implements the hashEndpointWithScope function from TypeScript
func HashEndpointWithScope(endpoint, scope string) (string, error) {
	formattedEndpoint := FormatEndpoint(endpoint)

	// Split endpoint into 31-character chunks (different from ts)
	var endpointChunks []string
	remaining := formattedEndpoint
	for len(remaining) > 0 {
		// Take up to 31 characters (safe slicing)
		if len(remaining) > 31 {
			chunk := remaining[:31]
			endpointChunks = append(endpointChunks, chunk)
			remaining = remaining[31:]
		} else {
			endpointChunks = append(endpointChunks, remaining)
			remaining = ""
		}
	}

	if len(endpointChunks) > 16 {
		return "", fmt.Errorf("endpoint must be less than 496 characters")
	}

	chunkedEndpointBigInts := make([]*big.Int, len(endpointChunks))
	for i, chunk := range endpointChunks {
		bigInt, err := StringToBigInt(chunk)
		if err != nil {
			return "", fmt.Errorf("failed to convert chunk to BigInt: %w", err)
		}
		chunkedEndpointBigInts[i] = bigInt
	}

	endpointHash, err := FlexiblePoseidon(chunkedEndpointBigInts)
	if err != nil {
		return "", fmt.Errorf("failed to hash endpoint chunks: %w", err)
	}


	scopeBigInt, err := StringToBigInt(scope)
	if err != nil {
		return "", fmt.Errorf("failed to convert scope to BigInt: %w", err)
	}

	finalResult, err := poseidon.Hash([]*big.Int{endpointHash, scopeBigInt})
	if err != nil {
		return "", fmt.Errorf("failed to hash endpoint with scope: %w", err)
	}

	return finalResult.String(), nil
}
