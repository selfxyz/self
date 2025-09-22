package common

import (
	//"fmt"
	"math/big"
	// "regexp"
	// "strings"

	// "github.com/consensys/gnark-crypto/ecc/bn254/fr"
	// "github.com/consensys/gnark-crypto/ecc/bn254/fr/poseidon2"
)

// unpackReveal unpacks revealed data from packed format
func UnpackReveal(revealedDataPacked interface{}, idType string) []string {
	// Convert input to string slice
	var packedArray []string
	switch v := revealedDataPacked.(type) {
	case string:
		packedArray = []string{v}
	case []string:
		packedArray = v
	default:
		return []string{}
	}

	var bytesCount []int
	if idType == "passport" {
		bytesCount = []int{31, 31, 31}
	} else { // "id"
		bytesCount = []int{31, 31, 31, 31}
	}

	var bytesArray []int64

	for index, element := range packedArray {
		bytes := 31
		if index < len(bytesCount) {
			bytes = bytesCount[index]
		}

		elementBigInt := new(big.Int)
		elementBigInt.SetString(element, 10)

		byteMask := big.NewInt(255) // 0xFF

		// Extract bytes from the big integer
		for byteIndex := 0; byteIndex < bytes; byteIndex++ {
			// Right shift by (byteIndex * 8) bits and mask with 0xFF
			shifted := new(big.Int).Rsh(elementBigInt, uint(byteIndex*8))
			byteValue := new(big.Int).And(shifted, byteMask)
			bytesArray = append(bytesArray, byteValue.Int64())
		}
	}

	// Convert bytes to characters
	var result []string
	for _, byteVal := range bytesArray {
		result = append(result, string(rune(byteVal)))
	}

	return result
}
