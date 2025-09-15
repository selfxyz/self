package self

import (
	"github.com/selfxyz/self/sdk/sdk-go/common"
)

// AttestationId represents the type for attestation identifiers
type AttestationId int

// VcAndDiscloseProof represents the zero-knowledge proof structure
type VcAndDiscloseProof struct {
	A [2]string    `json:"a"`
	B [2][2]string `json:"b"`
	C [2]string    `json:"c"`
}

// VerificationConfig represents the configuration for verification
type VerificationConfig struct {
	MinimumAge        int                         `json:"minimumAge,omitempty"`
	ExcludedCountries []common.Country3LetterCode `json:"excludedCountries,omitempty"`
	Ofac              bool                        `json:"ofac,omitempty"`
}

// IsValidDetails contains the validation results
type IsValidDetails struct {
	IsValid           bool `json:"isValid"`
	IsMinimumAgeValid bool `json:"isMinimumAgeValid"`
	IsOfacValid       bool `json:"isOfacValid"`
}

// UserData contains user-specific data
type UserData struct {
	UserIdentifier  string `json:"userIdentifier"`
	UserDefinedData string `json:"userDefinedData"`
}

// GenericDiscloseOutput contains the disclosed information from verification
type GenericDiscloseOutput struct {
	Nullifier                    string   `json:"nullifier"`
	ForbiddenCountriesListPacked []string `json:"forbiddenCountriesListPacked"`
	IssuingState                 string   `json:"issuingState"`
	Name                         string   `json:"name"`
	IdNumber                     string   `json:"idNumber"`
	Nationality                  string   `json:"nationality"`
	DateOfBirth                  string   `json:"dateOfBirth"`
	Gender                       string   `json:"gender"`
	ExpiryDate                   string   `json:"expiryDate"`
	MinimumAge                   string   `json:"minimumAge"`
	Ofac                         []bool   `json:"ofac"`
}

// VerificationResult represents the complete result of a verification
type VerificationResult struct {
	AttestationId          AttestationId         `json:"attestationId"`
	IsValidDetails         IsValidDetails        `json:"isValidDetails"`
	ForbiddenCountriesList []string              `json:"forbiddenCountriesList"`
	DiscloseOutput         GenericDiscloseOutput `json:"discloseOutput"`
	UserData               UserData              `json:"userData"`
}

// UserIDType represents the type of user identifier
type UserIDType string

const (
	UserIDTypeHex  UserIDType = "hex"
	UserIDTypeUUID UserIDType = "uuid"
)
