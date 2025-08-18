package utils

import (
	"fmt"
	"math"
	"math/big"
	. "self-sdk-go/internal/types"
)

// PublicSignals represents an array of numeric strings, equivalent to snarkjs PublicSignals
// Based on go-circom-prover-verifier and snarkjs type definition: NumericString[]
type PublicSignals []string

// BytesCount maps attestation IDs to their respective byte counts
var BytesCount = map[AttestationId][]int{
	Passport: {31, 31, 31},
	EUCard:   {31, 31, 31, 1},
}

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
